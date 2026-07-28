"use client";

import { useState } from "react";
import type { QuestionType } from "@/generated/prisma/enums";
import type { QuestionInput } from "@/app/actions/builder";
import type { OptionDef } from "@/lib/dynamic-schema";

const TYPE_LABEL: Record<QuestionType, string> = {
  SHORT_TEXT: "Texto corto",
  LONG_TEXT: "Texto largo",
  NUMBER: "Número",
  SINGLE_SELECT: "Selección única",
  MULTI_SELECT: "Selección múltiple",
  DATE: "Fecha",
  CHECKBOX: "Casilla",
};

const NEEDS_OPTIONS: QuestionType[] = ["SINGLE_SELECT", "MULTI_SELECT"];

export type QuestionEditorInitial = {
  type: QuestionType;
  label: string;
  helpText: string;
  required: boolean;
  options: OptionDef[];
  validation: Record<string, unknown>;
};

export function QuestionEditorDialog({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial: QuestionEditorInitial;
  onSave: (data: QuestionInput) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [type, setType] = useState<QuestionType>(initial.type);
  const [label, setLabel] = useState(initial.label);
  const [helpText, setHelpText] = useState(initial.helpText);
  const [required, setRequired] = useState(initial.required);
  const [options, setOptions] = useState<OptionDef[]>(initial.options);
  const [validation, setValidation] = useState<Record<string, unknown>>(initial.validation);

  function setV(key: string, value: unknown) {
    setValidation((v) => ({ ...v, [key]: value === "" ? undefined : value }));
  }

  function addOption() {
    setOptions((o) => [...o, { id: crypto.randomUUID(), label: "" }]);
  }
  function moveOption(index: number, dir: -1 | 1) {
    setOptions((o) => {
      const next = [...o];
      const target = index + dir;
      if (target < 0 || target >= next.length) return o;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function removeOption(index: number) {
    setOptions((o) => o.filter((_, i) => i !== index));
  }

  function save() {
    onSave({
      type,
      label,
      helpText,
      required,
      options: NEEDS_OPTIONS.includes(type) ? options.filter((o) => o.label.trim()) : undefined,
      validation,
    });
  }

  const canSave = label.trim().length >= 2 && (!NEEDS_OPTIONS.includes(type) || options.some((o) => o.label.trim()));

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50">
      <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold">{initial.label ? "Editar pregunta" : "Nueva pregunta"}</h3>

        <label className="space-y-1.5 block">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Pregunta</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
        </label>

        <label className="space-y-1.5 block">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
            Texto de ayuda (opcional)
          </span>
          <input
            value={helpText}
            onChange={(e) => setHelpText(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
        </label>

        <label className="space-y-1.5 block">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Tipo</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as QuestionType)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm"
          >
            {Object.entries(TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="w-4 h-4 accent-violet-600"
          />
          Obligatoria
        </label>

        {(type === "SHORT_TEXT" || type === "LONG_TEXT") && (
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 block text-xs">
              <span className="text-neutral-400">Mín. caracteres</span>
              <input
                type="number"
                min={0}
                defaultValue={(validation.minLength as number) ?? ""}
                onChange={(e) => setV("minLength", e.target.value ? Number(e.target.value) : "")}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5"
              />
            </label>
            <label className="space-y-1 block text-xs">
              <span className="text-neutral-400">Máx. caracteres</span>
              <input
                type="number"
                min={0}
                defaultValue={(validation.maxLength as number) ?? ""}
                onChange={(e) => setV("maxLength", e.target.value ? Number(e.target.value) : "")}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5"
              />
            </label>
          </div>
        )}

        {type === "NUMBER" && (
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 block text-xs">
              <span className="text-neutral-400">Mínimo</span>
              <input
                type="number"
                defaultValue={(validation.min as number) ?? ""}
                onChange={(e) => setV("min", e.target.value ? Number(e.target.value) : "")}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5"
              />
            </label>
            <label className="space-y-1 block text-xs">
              <span className="text-neutral-400">Máximo</span>
              <input
                type="number"
                defaultValue={(validation.max as number) ?? ""}
                onChange={(e) => setV("max", e.target.value ? Number(e.target.value) : "")}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5"
              />
            </label>
            <label className="flex items-center gap-2 text-xs col-span-2">
              <input
                type="checkbox"
                defaultChecked={Boolean(validation.integer)}
                onChange={(e) => setV("integer", e.target.checked || "")}
                className="w-4 h-4 accent-violet-600"
              />
              Solo números enteros
            </label>
          </div>
        )}

        {NEEDS_OPTIONS.includes(type) && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Opciones</span>
            {options.map((opt, i) => (
              <div key={opt.id} className="flex items-center gap-1">
                <input
                  value={opt.label}
                  onChange={(e) =>
                    setOptions((o) => o.map((x, xi) => (xi === i ? { ...x, label: e.target.value } : x)))
                  }
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
                />
                <button type="button" onClick={() => moveOption(i, -1)} className="text-neutral-500 px-1">
                  ↑
                </button>
                <button type="button" onClick={() => moveOption(i, 1)} className="text-neutral-500 px-1">
                  ↓
                </button>
                <button type="button" onClick={() => removeOption(i)} className="text-red-400 px-1">
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={addOption} className="text-xs text-violet-400 hover:underline">
              + Añadir opción
            </button>

            {type === "MULTI_SELECT" && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="space-y-1 block text-xs">
                  <span className="text-neutral-400">Mín. selección</span>
                  <input
                    type="number"
                    min={0}
                    defaultValue={(validation.minSelected as number) ?? ""}
                    onChange={(e) => setV("minSelected", e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5"
                  />
                </label>
                <label className="space-y-1 block text-xs">
                  <span className="text-neutral-400">Máx. selección</span>
                  <input
                    type="number"
                    min={0}
                    defaultValue={(validation.maxSelected as number) ?? ""}
                    onChange={(e) => setV("maxSelected", e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5"
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {type === "CHECKBOX" && (
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              defaultChecked={Boolean(validation.mustBeTrue)}
              onChange={(e) => setV("mustBeTrue", e.target.checked || "")}
              className="w-4 h-4 accent-violet-600"
            />
            Debe marcarse obligatoriamente para poder enviar (ej. &quot;Acepto las normas&quot;)
          </label>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-neutral-400 hover:text-neutral-200 px-3 py-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave || saving}
            className="bg-violet-600 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
