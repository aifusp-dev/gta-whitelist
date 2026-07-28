"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitApplication } from "@/app/actions/applications";
import { useAutosaveField, type AutosaveStatus } from "./useAutosaveField";
import type { QuestionType, ApplicationStatus } from "@/generated/prisma/enums";
import type { OptionDef } from "@/lib/dynamic-schema";

export type QuestionForForm = {
  id: string;
  type: QuestionType;
  label: string;
  helpText: string | null;
  required: boolean;
  options: OptionDef[] | null;
};

export type SectionForForm = {
  id: string;
  title: string;
  description: string | null;
  questions: QuestionForForm[];
};

const STATUS_TEXT: Record<ApplicationStatus, string> = {
  IN_PROGRESS: "En progreso",
  SUBMITTED: "Enviada — a la espera de revisión",
  IN_REVIEW: "En revisión",
  INTERVIEW: "Te han citado a entrevista",
  APPROVED: "¡Aprobada!",
  REJECTED: "No aprobada",
};

function StatusDot({ status }: { status: AutosaveStatus }) {
  if (status === "idle") return null;
  const text = { saving: "Guardando…", saved: "Guardado", error: "No se pudo guardar" }[status];
  const color = { saving: "text-neutral-500", saved: "text-green-500", error: "text-red-400" }[status];
  return <span className={`text-xs ${color}`}>{text}</span>;
}

function QuestionField({
  applicationId,
  question,
  initialValue,
  readOnly,
  error,
  onPending,
  onFlushed,
}: {
  applicationId: string;
  question: QuestionForForm;
  initialValue: unknown;
  readOnly: boolean;
  error?: string;
  onPending: (questionId: string, value: unknown) => void;
  onFlushed: (questionId: string) => void;
}) {
  const { value, onChange, onBlur, status } = useAutosaveField(applicationId, question.id, initialValue, {
    readOnly,
    onPending,
    onFlushed,
  });

  const inputClass =
    "w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-500 disabled:opacity-60";

  return (
    <div id={`q-${question.id}`} className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm">
          {question.label}
          {question.required && <span className="text-amber-400 ml-1">*</span>}
        </label>
        <StatusDot status={status} />
      </div>
      {question.helpText && <p className="text-xs text-neutral-500">{question.helpText}</p>}

      {question.type === "SHORT_TEXT" && (
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={readOnly}
          className={inputClass}
        />
      )}

      {question.type === "LONG_TEXT" && (
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={readOnly}
          rows={4}
          className={inputClass}
        />
      )}

      {question.type === "NUMBER" && (
        <input
          type="number"
          value={value === null || value === undefined ? "" : (value as number | string)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          onBlur={onBlur}
          disabled={readOnly}
          className={inputClass}
        />
      )}

      {question.type === "DATE" && (
        <input
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={readOnly}
          className={inputClass}
        />
      )}

      {question.type === "SINGLE_SELECT" && (
        <div className="space-y-1.5">
          {(question.options ?? []).map((opt) => (
            <label key={opt.id} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={question.id}
                checked={value === opt.id}
                onChange={() => onChange(opt.id)}
                onBlur={onBlur}
                disabled={readOnly}
                className="accent-violet-600"
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}

      {question.type === "MULTI_SELECT" && (
        <div className="space-y-1.5">
          {(question.options ?? []).map((opt) => {
            const arr = Array.isArray(value) ? (value as string[]) : [];
            const checked = arr.includes(opt.id);
            return (
              <label key={opt.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked ? [...arr, opt.id] : arr.filter((id) => id !== opt.id);
                    onChange(next);
                  }}
                  onBlur={onBlur}
                  disabled={readOnly}
                  className="accent-violet-600"
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      )}

      {question.type === "CHECKBOX" && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            onBlur={onBlur}
            disabled={readOnly}
            className="accent-violet-600"
          />
          Confirmo
        </label>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function ApplicationForm({
  applicationId,
  status,
  sections,
  initialAnswers,
}: {
  applicationId: string;
  status: ApplicationStatus;
  sections: SectionForForm[];
  initialAnswers: Record<string, unknown>;
}) {
  const router = useRouter();
  const readOnly = status !== "IN_PROGRESS";

  const pendingRef = useRef<Map<string, unknown>>(new Map());
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const onPending = useCallback((questionId: string, value: unknown) => {
    pendingRef.current.set(questionId, value);
    setDirtyIds((prev) => (prev.has(questionId) ? prev : new Set(prev).add(questionId)));
  }, []);

  const onFlushed = useCallback((questionId: string) => {
    pendingRef.current.delete(questionId);
    setDirtyIds((prev) => {
      if (!prev.has(questionId)) return prev;
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
  }, []);

  useEffect(() => {
    function handleBeforeUnload() {
      if (pendingRef.current.size === 0) return;
      const answers = Array.from(pendingRef.current.entries()).map(([questionId, value]) => ({
        questionId,
        value,
      }));
      const blob = new Blob([JSON.stringify({ applicationId, answers })], { type: "application/json" });
      navigator.sendBeacon("/api/answers/flush", blob);
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [applicationId]);

  const allQuestions = useMemo(() => sections.flatMap((s) => s.questions), [sections]);

  async function handleSubmit() {
    setSubmitError(null);
    setFieldErrors({});
    setSubmitting(true);
    const res = await submitApplication(applicationId);
    setSubmitting(false);

    if (res && "error" in res && res.error) {
      setSubmitError(res.error);
      if (res.fieldErrors) {
        setFieldErrors(res.fieldErrors);
        const firstId = Object.keys(res.fieldErrors)[0];
        document.getElementById(`q-${firstId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    router.refresh();
  }

  const canSubmit = !readOnly && !submitting && dirtyIds.size === 0;

  return (
    <div className="space-y-10">
      {readOnly && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm">
          Estado: <span className="font-semibold">{STATUS_TEXT[status]}</span>
        </div>
      )}

      {sections.map((section) => (
        <div key={section.id} className="space-y-4">
          <div>
            <h2 className="font-semibold">{section.title}</h2>
            {section.description && <p className="text-xs text-neutral-500">{section.description}</p>}
          </div>
          <div className="space-y-5">
            {section.questions.map((q) => (
              <QuestionField
                key={q.id}
                applicationId={applicationId}
                question={q}
                initialValue={initialAnswers[q.id]}
                readOnly={readOnly}
                error={fieldErrors[q.id]}
                onPending={onPending}
                onFlushed={onFlushed}
              />
            ))}
          </div>
        </div>
      ))}

      {allQuestions.length === 0 && (
        <p className="text-sm text-neutral-500">Esta whitelist todavía no tiene preguntas configuradas.</p>
      )}

      {!readOnly && (
        <div className="space-y-2 pt-4 border-t border-neutral-800">
          {submitError && <p className="text-sm text-red-400">{submitError}</p>}
          {dirtyIds.size > 0 && (
            <p className="text-xs text-neutral-500">Guardando cambios pendientes…</p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={canSubmit === false}
            className="w-full bg-violet-600 font-semibold rounded-lg px-4 py-3 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "Enviar postulación"}
          </button>
        </div>
      )}
    </div>
  );
}
