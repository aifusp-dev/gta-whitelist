"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { QuestionRow, type QuestionRowData } from "./QuestionRow";

export type SectionData = {
  id: string;
  title: string;
  description: string | null;
  questions: QuestionRowData[];
};

export function SectionCard({
  section,
  otherSections,
  onEditSectionTitle,
  onArchiveSection,
  onMoveQuestionToSection,
  onAddQuestion,
  onEditQuestion,
  onArchiveQuestion,
}: {
  section: SectionData;
  otherSections: { id: string; title: string }[];
  onEditSectionTitle: (title: string) => void;
  onArchiveSection: () => void;
  onMoveQuestionToSection: (questionId: string, targetSectionId: string) => void;
  onAddQuestion: () => void;
  onEditQuestion: (questionId: string) => void;
  onArchiveQuestion: (questionId: string) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(section.title);

  const sortable = useSortable({ id: section.id, data: { type: "section" as const } });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.4 : 1,
  };

  // Zona de drop para cuando la sección está vacía (sin preguntas donde "aterrizar").
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `section-drop-${section.id}`,
    data: { type: "section-container" as const, sectionId: section.id },
  });

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5 space-y-4"
    >
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          {...sortable.attributes}
          {...sortable.listeners}
          className="text-neutral-600 hover:text-neutral-300 cursor-grab active:cursor-grabbing touch-none"
          aria-label="Arrastrar para reordenar sección"
        >
          <GripVertical size={18} />
        </button>

        {editingTitle ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              setEditingTitle(false);
              if (title.trim() && title !== section.title) onEditSectionTitle(title.trim());
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="flex-1 bg-neutral-950 border border-violet-500/60 rounded-lg px-2.5 py-1 font-heading font-semibold outline-none"
          />
        ) : (
          <h3
            className="flex-1 font-heading font-semibold text-lg cursor-text"
            onClick={() => setEditingTitle(true)}
          >
            {section.title}
          </h3>
        )}

        <button
          type="button"
          onClick={onArchiveSection}
          className="text-xs text-red-400/80 hover:text-red-400 transition-colors"
        >
          Eliminar sección
        </button>
      </div>

      <div ref={setDroppableRef} className="space-y-2 pl-[26px] min-h-[2.5rem]">
        <SortableContext items={section.questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
          {section.questions.length === 0 && (
            <p className="text-xs text-neutral-600 italic">Suelta preguntas aquí o añade una nueva.</p>
          )}
          {section.questions.map((q) => (
            <QuestionRow
              key={q.id}
              question={q}
              sectionId={section.id}
              otherSections={otherSections}
              onMoveToSection={(targetSectionId) => onMoveQuestionToSection(q.id, targetSectionId)}
              onEdit={() => onEditQuestion(q.id)}
              onArchive={() => onArchiveQuestion(q.id)}
            />
          ))}
        </SortableContext>
        <button
          type="button"
          onClick={onAddQuestion}
          className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
        >
          + Añadir pregunta
        </button>
      </div>
    </div>
  );
}
