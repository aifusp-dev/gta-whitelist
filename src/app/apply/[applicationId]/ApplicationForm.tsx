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

const STATUS_DOT: Record<ApplicationStatus, string> = {
  IN_PROGRESS: "bg-neutral-500",
  SUBMITTED: "bg-blue-400",
  IN_REVIEW: "bg-amber-400",
  INTERVIEW: "bg-violet-400",
  APPROVED: "bg-green-400",
  REJECTED: "bg-red-400",
};

const fieldInputClass =
  "w-full bg-neutral-900/70 border border-neutral-800 rounded-xl px-4 py-3 text-sm outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 disabled:opacity-60";

function StatusDot({ status }: { status: AutosaveStatus }) {
  if (status === "idle") return null;
  const text = { saving: "Guardando…", saved: "Guardado", error: "No se pudo guardar" }[status];
  const color = { saving: "text-neutral-500", saved: "text-green-500", error: "text-red-400" }[status];
  return <span className={`text-xs font-medium ${color}`}>{text}</span>;
}

function OptionCard({
  label,
  checked,
  ...inputProps
}: {
  label: string;
  checked: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm cursor-pointer transition-colors ${
        checked
          ? "border-violet-500 bg-violet-500/10"
          : "border-neutral-800 bg-neutral-900/50 hover:border-neutral-700"
      } ${inputProps.disabled ? "cursor-default opacity-60" : ""}`}
    >
      <input {...inputProps} checked={checked} className="accent-violet-500 w-4 h-4 shrink-0" />
      {label}
    </label>
  );
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

  return (
    <div id={`q-${question.id}`} className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium">
          {question.label}
          {question.required && <span className="text-amber-400 ml-1">*</span>}
        </label>
        <StatusDot status={status} />
      </div>
      {question.helpText && <p className="text-xs text-neutral-500 -mt-1">{question.helpText}</p>}

      {question.type === "SHORT_TEXT" && (
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={readOnly}
          className={fieldInputClass}
        />
      )}

      {question.type === "LONG_TEXT" && (
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={readOnly}
          rows={4}
          className={fieldInputClass}
        />
      )}

      {question.type === "NUMBER" && (
        <input
          type="number"
          value={value === null || value === undefined ? "" : (value as number | string)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          onBlur={onBlur}
          disabled={readOnly}
          className={fieldInputClass}
        />
      )}

      {question.type === "DATE" && (
        <input
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={readOnly}
          className={fieldInputClass}
        />
      )}

      {question.type === "SINGLE_SELECT" && (
        <div className="space-y-2">
          {(question.options ?? []).map((opt) => (
            <OptionCard
              key={opt.id}
              type="radio"
              name={question.id}
              label={opt.label}
              checked={value === opt.id}
              onChange={() => onChange(opt.id)}
              onBlur={onBlur}
              disabled={readOnly}
            />
          ))}
        </div>
      )}

      {question.type === "MULTI_SELECT" && (
        <div className="space-y-2">
          {(question.options ?? []).map((opt) => {
            const arr = Array.isArray(value) ? (value as string[]) : [];
            const checked = arr.includes(opt.id);
            return (
              <OptionCard
                key={opt.id}
                type="checkbox"
                label={opt.label}
                checked={checked}
                onChange={(e) => {
                  const next = e.target.checked ? [...arr, opt.id] : arr.filter((id) => id !== opt.id);
                  onChange(next);
                }}
                onBlur={onBlur}
                disabled={readOnly}
              />
            );
          })}
        </div>
      )}

      {question.type === "CHECKBOX" && (
        <OptionCard
          type="checkbox"
          label="Confirmo"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          onBlur={onBlur}
          disabled={readOnly}
        />
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
    <div className="space-y-8">
      {readOnly && (
        <div className="flex items-center gap-2.5 bg-neutral-900/60 border border-neutral-800 rounded-xl px-4 py-3 text-sm">
          <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
          <span className="font-heading font-medium">{STATUS_TEXT[status]}</span>
        </div>
      )}

      {sections.map((section) => (
        <div key={section.id} className="bg-neutral-900/30 border border-neutral-800 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="font-heading text-lg font-semibold">{section.title}</h2>
            {section.description && <p className="text-xs text-neutral-500 mt-1">{section.description}</p>}
          </div>
          <div className="space-y-6">
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
        <div className="space-y-2 pt-2">
          {submitError && <p className="text-sm text-red-400">{submitError}</p>}
          {dirtyIds.size > 0 && <p className="text-xs text-neutral-500">Guardando cambios pendientes…</p>}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={canSubmit === false}
            className="w-full bg-violet-600 hover:bg-violet-500 font-heading font-semibold rounded-xl px-4 py-3.5 text-sm transition-colors disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "Enviar postulación"}
          </button>
        </div>
      )}
    </div>
  );
}
