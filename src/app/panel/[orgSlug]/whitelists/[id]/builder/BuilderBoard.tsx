"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  createSection,
  updateSection,
  archiveSection,
  reorderSections,
  createQuestion,
  updateQuestion,
  archiveQuestion,
  reorderQuestions,
  moveQuestionToSection,
  type QuestionInput,
} from "@/app/actions/builder";
import { SectionCard, type SectionData } from "./SectionCard";
import { QuestionRow, type QuestionRowData } from "./QuestionRow";
import { QuestionEditorDialog, type QuestionEditorInitial } from "./QuestionEditorDialog";

type DialogState = { sectionId: string; questionId: string | null } | null;

const EMPTY_INITIAL: QuestionEditorInitial = {
  type: "SHORT_TEXT",
  label: "",
  helpText: "",
  required: false,
  options: [],
  validation: {},
};

export function BuilderBoard({ whitelistId, sections }: { whitelistId: string; sections: SectionData[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [saving, setSaving] = useState(false);

  const [sectionOrder, setSectionOrder] = useState<string[]>(() => sections.map((s) => s.id));
  const [questionsBySection, setQuestionsBySection] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(sections.map((s) => [s.id, s.questions.map((q) => q.id)]))
  );
  const [activeDrag, setActiveDrag] = useState<
    { type: "section"; section: SectionData } | { type: "question"; question: QuestionRowData } | null
  >(null);

  // Resincroniza el estado local (usado para el arrastre optimista) cada vez
  // que llegan datos frescos del servidor (tras router.refresh()).
  useEffect(() => {
    setSectionOrder(sections.map((s) => s.id));
    setQuestionsBySection(Object.fromEntries(sections.map((s) => [s.id, s.questions.map((q) => q.id)])));
  }, [sections]);

  const sectionsById = useMemo(() => Object.fromEntries(sections.map((s) => [s.id, s])), [sections]);
  const questionsById = useMemo(
    () => Object.fromEntries(sections.flatMap((s) => s.questions).map((q) => [q.id, q])),
    [sections]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function refresh() {
    startTransition(() => router.refresh());
  }

  function containerOf(id: string): string | undefined {
    return Object.keys(questionsBySection).find((secId) => questionsBySection[secId].includes(id));
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data?.type === "section") {
      setActiveDrag({ type: "section", section: sectionsById[event.active.id as string] });
    } else if (data?.type === "question") {
      setActiveDrag({ type: "question", question: questionsById[event.active.id as string] });
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.data.current?.type !== "question") return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const overData = over.data.current;

    const fromSection = containerOf(activeId);
    const toSection =
      overData?.type === "section-container"
        ? (overData.sectionId as string)
        : overData?.type === "question"
          ? containerOf(overId)
          : undefined;

    if (!fromSection || !toSection || fromSection === toSection) return;

    setQuestionsBySection((prev) => {
      const fromIds = prev[fromSection].filter((id) => id !== activeId);
      const toIds = [...prev[toSection]];
      const overIndex = toIds.indexOf(overId);
      const insertAt = overIndex >= 0 ? overIndex : toIds.length;
      toIds.splice(insertAt, 0, activeId);
      return { ...prev, [fromSection]: fromIds, [toSection]: toIds };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;

    if (active.data.current?.type === "section") {
      const oldIndex = sectionOrder.indexOf(active.id as string);
      const newIndex = sectionOrder.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      const next = arrayMove(sectionOrder, oldIndex, newIndex);
      setSectionOrder(next);
      startTransition(async () => {
        await reorderSections(whitelistId, next);
        refresh();
      });
      return;
    }

    if (active.data.current?.type === "question") {
      const activeId = active.id as string;
      const overId = over.id as string;
      const section = containerOf(activeId);
      if (!section) return;

      const ids = questionsBySection[section];
      const oldIndex = ids.indexOf(activeId);
      const overIndex = ids.indexOf(overId);
      const newIndex = overIndex >= 0 ? overIndex : ids.length - 1;

      const originalSection = sections.find((s) => s.questions.some((q) => q.id === activeId))?.id;

      if (oldIndex !== newIndex) {
        const next = arrayMove(ids, oldIndex, newIndex);
        setQuestionsBySection((prev) => ({ ...prev, [section]: next }));
        startTransition(async () => {
          if (originalSection && originalSection !== section) {
            await moveQuestionToSection(activeId, section, newIndex);
          } else {
            await reorderQuestions(section, next);
          }
          refresh();
        });
      } else if (originalSection && originalSection !== section) {
        startTransition(async () => {
          await moveQuestionToSection(activeId, section, newIndex);
          refresh();
        });
      }
    }
  }

  function addSection() {
    if (!newSectionTitle.trim()) return;
    const title = newSectionTitle.trim();
    setNewSectionTitle("");
    startTransition(async () => {
      await createSection(whitelistId, title);
      refresh();
    });
  }

  function openCreateQuestion(sectionId: string) {
    setDialog({ sectionId, questionId: null });
  }
  function openEditQuestion(sectionId: string, questionId: string) {
    setDialog({ sectionId, questionId });
  }

  function saveQuestion(data: QuestionInput) {
    if (!dialog) return;
    setSaving(true);
    startTransition(async () => {
      if (dialog.questionId) {
        await updateQuestion(dialog.questionId, data);
      } else {
        await createQuestion(dialog.sectionId, data);
      }
      setSaving(false);
      setDialog(null);
      refresh();
    });
  }

  const editingQuestion = dialog?.questionId ? questionsById[dialog.questionId] : null;
  const dialogInitial: QuestionEditorInitial | null = dialog
    ? editingQuestion
      ? {
          type: editingQuestion.type,
          label: editingQuestion.label,
          helpText: editingQuestion.helpText ?? "",
          required: editingQuestion.required,
          options: editingQuestion.options ?? [],
          validation: {},
        }
      : EMPTY_INITIAL
    : null;

  const labelFor = (id: string) => {
    const bareId = id.startsWith("section-drop-") ? id.replace("section-drop-", "") : id;
    return sectionsById[bareId]?.title ?? questionsById[bareId]?.label ?? "una zona";
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Empezaste a arrastrar "${labelFor(active.id as string)}".`,
    onDragOver: ({ active, over }) =>
      over
        ? `"${labelFor(active.id as string)}" está ahora sobre "${labelFor(over.id as string)}".`
        : `"${labelFor(active.id as string)}" ya no está sobre una zona válida.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `"${labelFor(active.id as string)}" se soltó sobre "${labelFor(over.id as string)}".`
        : `"${labelFor(active.id as string)}" se soltó fuera de una zona válida.`,
    onDragCancel: ({ active }) => `Se canceló el arrastre de "${labelFor(active.id as string)}".`,
  };

  return (
    <DndContext
      sensors={sensors}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "Para reordenar, presiona espacio o intro. Usa las flechas para mover el elemento y espacio o intro de nuevo para soltarlo. Escape para cancelar.",
        },
      }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
          {sectionOrder.map((sectionId) => {
            const base = sectionsById[sectionId];
            if (!base) return null;
            const section: SectionData = {
              ...base,
              questions: (questionsBySection[sectionId] ?? []).map((qid) => questionsById[qid]).filter(Boolean),
            };
            return (
              <SectionCard
                key={section.id}
                section={section}
                otherSections={sectionOrder
                  .filter((id) => id !== sectionId)
                  .map((id) => ({ id, title: sectionsById[id]?.title ?? "" }))}
                onEditSectionTitle={(title) => {
                  startTransition(async () => {
                    await updateSection(section.id, { title });
                    refresh();
                  });
                }}
                onArchiveSection={() => {
                  if (!confirm(`¿Eliminar la sección "${section.title}" y sus preguntas?`)) return;
                  startTransition(async () => {
                    await archiveSection(section.id);
                    refresh();
                  });
                }}
                onMoveQuestionToSection={(qid, targetSectionId) => {
                  setQuestionsBySection((prev) => ({
                    ...prev,
                    [sectionId]: prev[sectionId].filter((id) => id !== qid),
                    [targetSectionId]: [...prev[targetSectionId], qid],
                  }));
                  startTransition(async () => {
                    await moveQuestionToSection(qid, targetSectionId, questionsBySection[targetSectionId]?.length ?? 0);
                    refresh();
                  });
                }}
                onAddQuestion={() => openCreateQuestion(section.id)}
                onEditQuestion={(qid) => openEditQuestion(section.id, qid)}
                onArchiveQuestion={(qid) => {
                  if (!confirm("¿Eliminar esta pregunta?")) return;
                  startTransition(async () => {
                    await archiveQuestion(qid);
                    refresh();
                  });
                }}
              />
            );
          })}
        </SortableContext>

        <div className="flex gap-2 pt-1">
          <input
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSection()}
            placeholder="Título de nueva sección (ej. Datos personales)"
            className="flex-1 bg-neutral-900/70 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
          />
          <button
            type="button"
            onClick={addSection}
            disabled={!newSectionTitle.trim()}
            className="bg-neutral-800 hover:bg-neutral-700 rounded-xl px-4 text-sm font-heading font-semibold transition-colors disabled:opacity-50"
          >
            + Sección
          </button>
        </div>

        {dialog && dialogInitial && (
          <QuestionEditorDialog
            initial={dialogInitial}
            saving={saving}
            onClose={() => setDialog(null)}
            onSave={saveQuestion}
          />
        )}
      </div>

      <DragOverlay>
        {activeDrag?.type === "section" && (
          <div className="border border-neutral-700 rounded-xl p-4 bg-neutral-950 shadow-xl font-semibold">
            {activeDrag.section.title}
          </div>
        )}
        {activeDrag?.type === "question" && (
          <div className="shadow-xl rounded-lg">
            <QuestionRow
              question={activeDrag.question}
              sectionId=""
              otherSections={[]}
              onMoveToSection={() => {}}
              onEdit={() => {}}
              onArchive={() => {}}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
