"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { QuestionType } from "@/generated/prisma/enums";
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

export type QuestionRowData = {
  id: string;
  type: QuestionType;
  label: string;
  helpText: string | null;
  required: boolean;
  options: OptionDef[] | null;
};

export function QuestionRow({
  question,
  sectionId,
  otherSections,
  onMoveToSection,
  onEdit,
  onArchive,
}: {
  question: QuestionRowData;
  sectionId: string;
  otherSections: { id: string; title: string }[];
  onMoveToSection: (targetSectionId: string) => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
    data: { type: "question" as const, sectionId },
  });

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-3.5 py-2.5 bg-neutral-950/60 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-neutral-600 hover:text-neutral-300 cursor-grab active:cursor-grabbing touch-none shrink-0"
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical size={16} />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">
          {question.label}
          {question.required && <span className="text-amber-400 ml-1">*</span>}
        </p>
        <span className="inline-block mt-0.5 text-[11px] font-medium text-violet-300/80 bg-violet-500/10 rounded-full px-2 py-0.5">
          {TYPE_LABEL[question.type]}
        </span>
      </div>

      {otherSections.length > 0 && (
        <select
          onChange={(e) => {
            if (e.target.value) onMoveToSection(e.target.value);
            e.target.value = "";
          }}
          defaultValue=""
          className="bg-neutral-950 border border-neutral-800 rounded-md px-2 py-1 text-xs text-neutral-400"
        >
          <option value="" disabled>
            Mover a...
          </option>
          {otherSections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      )}

      <button
        type="button"
        onClick={onEdit}
        className="text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
      >
        Editar
      </button>
      <button
        type="button"
        onClick={onArchive}
        className="text-xs font-medium text-red-400/80 hover:text-red-400 transition-colors"
      >
        Eliminar
      </button>
    </div>
  );
}
