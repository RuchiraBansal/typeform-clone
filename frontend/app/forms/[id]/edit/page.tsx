
"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import type { DragEndEvent } from "@dnd-kit/core";

import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

const API = "http://127.0.0.1:8000";

const questionTypes = [
  { value: "short_text", label: "Short text" },
  { value: "long_text", label: "Long text" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "dropdown", label: "Dropdown" },
  { value: "email", label: "Email" },
  { value: "number", label: "Number" },
  { value: "yes_no", label: "Yes / No" },
  { value: "rating", label: "Rating" },
];

type Question = {
  id?: number;
  title: string;
  question_type: string;
  description: string;
  required: boolean;
  position: number;
  options: string[];
};

type FormData = {
  id: number;
  title: string;
  slug: string;
  published: boolean;
  questions: Question[];
};

function createQuestion(): Question {
  return {
    title: "Your question",
    question_type: "short_text",
    description: "",
    required: true,
    position: 0,
    options: ["Option 1", "Option 2"],
  };
}

function getQuestionKey(question: Question, index: number) {
  return question.id ?? `question-${index}`;
}

function SortableQuestion({
  question,
  index,
  selected,
  onSelect,
}: {
  question: Question;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: getQuestionKey(question, index),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 1 : 0,
  };

  const questionType =
    questionTypes.find((type) => type.value === question.question_type)
      ?.label ?? "Question";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`mb-2 flex items-stretch overflow-hidden rounded-xl border transition-colors ${
        selected
          ? "border-purple-400 bg-purple-50"
          : "border-gray-200 bg-white hover:bg-gray-50"
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder question ${index + 1}`}
        title="Drag to reorder"
        className="touch-none cursor-grab px-3 text-xl text-gray-400 hover:bg-purple-100 hover:text-purple-700 active:cursor-grabbing"
      >
        ⠿
      </button>

      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 py-3 pr-3 text-left"
      >
        <span className="text-xs text-gray-500">
          {index + 1}. {questionType}
        </span>

        <p className="mt-1 truncate font-medium">
          {question.title || "Untitled question"}
        </p>
      </button>
    </div>
  );
}

export default function EditForm({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [form, setForm] = useState<FormData | null>(null);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    let cancelled = false;

    async function loadForm() {
      try {
        setError("");

        const response = await fetch(`${API}/api/forms/${id}`);

        if (!response.ok) {
          throw new Error("Could not load this form.");
        }

        const data = await response.json();

        if (cancelled) return;

        setForm({
          ...data,
          questions: (data.questions ?? []).map(
            (question: Question, index: number) => ({
              ...question,
              description: question.description ?? "",
              options: Array.isArray(question.options)
                ? question.options
                : [],
              position: question.position ?? index,
            })
          ),
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to connect to the backend."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadForm();

    return () => {
      cancelled = true;
    };
  }, [id]);

  function updateForm(changes: Partial<FormData>) {
    setForm((current) =>
      current ? { ...current, ...changes } : current
    );
  }

  function updateQuestion(
    index: number,
    changes: Partial<Question>
  ) {
    if (!form) return;

    const questions = [...form.questions];

    questions[index] = {
      ...questions[index],
      ...changes,
    };

    updateForm({ questions });
    setMessage("");
  }

  function addQuestion() {
    if (!form) return;

    const questions = [
      ...form.questions,
      {
        ...createQuestion(),
        position: form.questions.length,
      },
    ];

    updateForm({ questions });
    setSelected(questions.length - 1);
    setMessage("");
  }

  function deleteQuestion(index: number) {
    if (!form) return;

    const questions = form.questions.filter((_, i) => i !== index);

    updateForm({
      questions: questions.map((question, position) => ({
        ...question,
        position,
      })),
    });

    setSelected(
      questions.length === 0
        ? 0
        : Math.max(0, Math.min(index, questions.length - 1))
    );

    setMessage("");
  }

  function reorderQuestions(oldIndex: number, newIndex: number) {
    if (!form) return;

    if (
      oldIndex < 0 ||
      newIndex < 0 ||
      oldIndex >= form.questions.length ||
      newIndex >= form.questions.length ||
      oldIndex === newIndex
    ) {
      return;
    }

    const questions = [...form.questions];
    const [movedQuestion] = questions.splice(oldIndex, 1);

    questions.splice(newIndex, 0, movedQuestion);

    updateForm({
      questions: questions.map((question, position) => ({
        ...question,
        position,
      })),
    });

    setSelected(newIndex);
    setMessage("");
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id || !form) return;

    const oldIndex = form.questions.findIndex(
      (question, index) =>
        getQuestionKey(question, index) === active.id
    );

    const newIndex = form.questions.findIndex(
      (question, index) =>
        getQuestionKey(question, index) === over.id
    );

    reorderQuestions(oldIndex, newIndex);
  }

  function moveQuestion(index: number, direction: number) {
    reorderQuestions(index, index + direction);
  }

  async function saveForm() {
    if (!form || saving) return;

    if (!form.title.trim()) {
      setMessage("Please enter a form title.");
      return;
    }

    if (form.questions.some((question) => !question.title.trim())) {
      setMessage("Every question must have a title.");
      return;
    }

    if (
      form.questions.some(
        (question) =>
          ["multiple_choice", "dropdown"].includes(
            question.question_type
          ) &&
          question.options.filter((option) => option.trim()).length < 2
      )
    ) {
      setMessage(
        "Multiple choice and dropdown questions need at least two non-empty options."
      );
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const titleResponse = await fetch(`${API}/api/forms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title.trim() }),
      });

      if (!titleResponse.ok) {
        const result = await titleResponse.json().catch(() => null);

        throw new Error(
          typeof result?.detail === "string"
            ? result.detail
            : "Could not save the form title."
        );
      }

      const questionsResponse = await fetch(
        `${API}/api/forms/${id}/questions`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questions: form.questions.map((question, position) => ({
              ...question,
              title: question.title.trim(),
              description: question.description.trim(),
              options: question.options,
              position,
            })),
          }),
        }
      );

      const result = await questionsResponse.json().catch(() => null);

      if (!questionsResponse.ok) {
        throw new Error(
          typeof result?.detail === "string"
            ? result.detail
            : "Could not save questions."
        );
      }

      setForm((current) =>
        current
          ? {
              ...current,
              questions: current.questions.map(
                (question, position) => ({
                  ...question,
                  position,
                })
              ),
            }
          : current
      );

      setMessage("All changes saved successfully.");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Something went wrong while saving."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        Loading your form...
      </main>
    );
  }

  if (!form) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] p-10">
        <p role="alert" className="mb-4 text-red-600">
          {error || "Form not found."}
        </p>

        <button
          onClick={() => router.push("/")}
          className="rounded-full bg-purple-600 px-5 py-3 text-white"
        >
          Back to forms
        </button>
      </main>
    );
  }

  const active = form.questions[selected];

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#191919]">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-4">
        <button
          onClick={() => router.push("/")}
          className="text-sm text-gray-600 hover:text-purple-700"
        >
          ← All forms
        </button>

        <input
          value={form.title}
          onChange={(event) =>
            updateForm({ title: event.target.value })
          }
          aria-label="Form title"
          className="w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 font-semibold outline-none focus:border-purple-400"
        />

        <button
          onClick={() => void saveForm()}
          disabled={saving}
          className="rounded-full bg-purple-600 px-5 py-2.5 font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </header>

      <div className="grid min-h-[calc(100vh-73px)] lg:grid-cols-[250px_minmax(0,1fr)_290px]">
        {/* Question list */}
        <aside className="border-r border-gray-200 bg-white p-4">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold">Content</h2>

            <span className="text-sm text-gray-500">
              {form.questions.length}
            </span>
          </div>

          <p className="mb-3 text-xs text-gray-400">
            Drag ⠿ to reorder questions
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={form.questions.map((question, index) =>
                getQuestionKey(question, index)
              )}
              strategy={verticalListSortingStrategy}
            >
              {form.questions.map((question, index) => (
                <SortableQuestion
                  key={getQuestionKey(question, index)}
                  question={question}
                  index={index}
                  selected={selected === index}
                  onSelect={() => setSelected(index)}
                />
              ))}
            </SortableContext>
          </DndContext>

          <button
            onClick={addQuestion}
            className="mt-2 w-full rounded-xl border border-dashed border-purple-300 p-3 text-purple-700 hover:bg-purple-50"
          >
            + Add question
          </button>
        </aside>

        {/* Question editor */}
        <section className="p-5 md:p-10">
          <div className="mx-auto max-w-2xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {active
                  ? `QUESTION ${selected + 1} OF ${form.questions.length}`
                  : "NO QUESTIONS YET"}
              </span>

              {active && (
                <button
                  onClick={() => deleteQuestion(selected)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Delete question
                </button>
              )}
            </div>

            {active ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-10">
                <label className="mb-2 block text-sm font-medium">
                  Question title
                </label>

                <textarea
                  value={active.title}
                  onChange={(event) =>
                    updateQuestion(selected, {
                      title: event.target.value,
                    })
                  }
                  rows={2}
                  placeholder="Write your question..."
                  className="mb-5 w-full resize-y rounded-xl border border-gray-200 p-4 text-xl outline-none focus:border-purple-400"
                />

                <label className="mb-2 block text-sm font-medium">
                  Description / help text
                </label>

                <input
                  value={active.description}
                  onChange={(event) =>
                    updateQuestion(selected, {
                      description: event.target.value,
                    })
                  }
                  placeholder="Add a description (optional)"
                  className="mb-7 w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-purple-400"
                />

                <div className="border-t border-gray-100 pt-6">
                  <p className="mb-3 text-sm font-medium">
                    Answer preview
                  </p>

                  {active.question_type === "long_text" ? (
                    <textarea
                      disabled
                      placeholder="Long text answer..."
                      className="w-full rounded-xl border border-gray-200 p-4"
                    />
                  ) : active.question_type === "multiple_choice" ||
                    active.question_type === "dropdown" ? (
                    <div className="space-y-2">
                      {active.options.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            value={option}
                            onChange={(event) => {
                              const options = [...active.options];
                              options[index] = event.target.value;

                              updateQuestion(selected, { options });
                            }}
                            aria-label={`Option ${index + 1}`}
                            className="min-w-0 flex-1 rounded-lg border border-gray-200 p-3"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              updateQuestion(selected, {
                                options: active.options.filter(
                                  (_, i) => i !== index
                                ),
                              })
                            }
                            disabled={active.options.length <= 2}
                            aria-label={`Remove option ${index + 1}`}
                            className="px-3 text-red-600 disabled:opacity-30"
                          >
                            ✕
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() =>
                          updateQuestion(selected, {
                            options: [
                              ...active.options,
                              `Option ${active.options.length + 1}`,
                            ],
                          })
                        }
                        className="text-sm text-purple-700 hover:underline"
                      >
                        + Add option
                      </button>
                    </div>
                  ) : active.question_type === "yes_no" ? (
                    <div className="flex gap-3">
                      <span className="rounded-lg border px-5 py-3">
                        Yes
                      </span>
                      <span className="rounded-lg border px-5 py-3">
                        No
                      </span>
                    </div>
                  ) : active.question_type === "rating" ? (
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((number) => (
                        <span
                          key={number}
                          className="rounded-lg border px-4 py-3"
                        >
                          {number}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <input
                      disabled
                      placeholder={
                        active.question_type === "email"
                          ? "name@example.com"
                          : active.question_type === "number"
                            ? "Enter a number..."
                            : "Type your answer..."
                      }
                      className="w-full rounded-xl border border-gray-200 p-4"
                    />
                  )}
                </div>

                <div className="mt-8 flex flex-wrap gap-2 border-t border-gray-100 pt-5">
                  <button
                    onClick={() => moveQuestion(selected, -1)}
                    disabled={selected === 0}
                    className="rounded-lg bg-gray-100 px-4 py-2 disabled:opacity-40"
                  >
                    ↑ Move up
                  </button>

                  <button
                    onClick={() => moveQuestion(selected, 1)}
                    disabled={selected === form.questions.length - 1}
                    className="rounded-lg bg-gray-100 px-4 py-2 disabled:opacity-40"
                  >
                    ↓ Move down
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
                <h2 className="text-xl font-semibold">
                  Start with a question
                </h2>

                <p className="mt-2 text-gray-500">
                  Add your first question to begin building your form.
                </p>

                <button
                  onClick={addQuestion}
                  className="mt-5 rounded-full bg-purple-600 px-5 py-3 text-white"
                >
                  + Add question
                </button>
              </div>
            )}

            {message && (
              <p
                role="status"
                className="mt-5 break-words rounded-xl border border-gray-200 bg-white p-4 text-sm"
              >
                {message}
              </p>
            )}

            {error && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        </section>

        {/* Question settings */}
        <aside className="border-l border-gray-200 bg-white p-5">
          <h2 className="mb-6 font-semibold">Question settings</h2>

          {active ? (
            <>
              <label className="mb-2 block text-sm font-medium">
                Question type
              </label>

              <select
                value={active.question_type}
                onChange={(event) =>
                  updateQuestion(selected, {
                    question_type: event.target.value,
                    options:
                      active.options.length > 0
                        ? active.options
                        : ["Option 1", "Option 2"],
                  })
                }
                className="mb-6 w-full rounded-xl border border-gray-200 bg-white p-3 outline-none focus:border-purple-400"
              >
                {questionTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              <label className="flex items-center justify-between gap-3 border-t border-gray-100 py-5">
                <span>
                  <span className="block font-medium">
                    Required question
                  </span>
                  <span className="text-sm text-gray-500">
                    Respondents must answer
                  </span>
                </span>

                <input
                  type="checkbox"
                  checked={active.required}
                  onChange={(event) =>
                    updateQuestion(selected, {
                      required: event.target.checked,
                    })
                  }
                  className="h-4 w-4 accent-purple-600"
                />
              </label>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              Select a question to edit its settings.
            </p>
          )}

          <div className="mt-5 rounded-xl bg-gray-50 p-4">
            <p className="font-medium">Form overview</p>

            <p className="mt-2 text-sm text-gray-500">
              {form.questions.length} questions
            </p>

            <p className="mt-1 text-sm text-gray-500">
              {form.published ? "Published" : "Draft"}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
