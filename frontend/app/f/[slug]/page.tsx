
"use client";

import { use, useCallback, useEffect, useState } from "react";


const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Question = {
  id: number;
  title: string;
  question_type: string;
  description?: string | null;
  required: boolean;
  options?: string[] | string | null;
  position?: number;
};

type PublicForm = {
  id: number;
  title: string;
  slug: string;
  published?: boolean;
  questions: Question[];
};

export default function PublicFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const [form, setForm] = useState<PublicForm | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");

  const loadForm = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API}/api/public/forms/${encodeURIComponent(slug)}`
      );

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "This form could not be found."
            : "Could not load this form."
        );
      }

      const data: PublicForm = await response.json();
      setForm(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load this form."
      );
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void loadForm();
  }, [loadForm]);

  function getOptions(question: Question): string[] {
    const raw = question.options;

    if (Array.isArray(raw)) {
      return raw.map(String);
    }

    if (typeof raw === "string" && raw.trim()) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {
        return raw
          .split(",")
          .map((option) => option.trim())
          .filter(Boolean);
      }
    }

    return [];
  }

  function updateAnswer(questionId: number, value: string) {
    setAnswers((previous) => ({ ...previous, [questionId]: value }));
    setValidationError("");
    setError("");
  }

  function validateQuestion(question: Question): boolean {
    const answer = answers[question.id] ?? "";

    if (question.required && !answer.trim()) {
      setValidationError("Please answer this required question.");
      return false;
    }

    if (
      question.question_type === "email" &&
      answer.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer.trim())
    ) {
      setValidationError("Please enter a valid email address.");
      return false;
    }

    if (
      question.question_type === "number" &&
      answer.trim() &&
      !Number.isFinite(Number(answer))
    ) {
      setValidationError("Please enter a valid number.");
      return false;
    }

    setValidationError("");
    return true;
  }

  function nextQuestion() {
    if (!form) return;

    const question = form.questions[currentIndex];

    if (!question || !validateQuestion(question)) return;

    setCurrentIndex((index) =>
      Math.min(index + 1, form.questions.length - 1)
    );
  }

  function formatApiError(detail: unknown): string {
    if (typeof detail === "string") return detail;

    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (typeof item === "string") return item;

          if (item && typeof item === "object") {
            const entry = item as Record<string, unknown>;
            const message =
              typeof entry.msg === "string"
                ? entry.msg
                : JSON.stringify(entry);
            const location = Array.isArray(entry.loc)
              ? entry.loc.join(" → ")
              : "";

            return location ? `${location}: ${message}` : message;
          }

          return String(item);
        })
        .join("; ");
    }

    if (detail && typeof detail === "object") {
      return JSON.stringify(detail);
    }

    return "Your response could not be submitted. Please try again.";
  }

  async function submitForm() {
    if (!form || submitting) return;

    for (let index = 0; index < form.questions.length; index++) {
      const question = form.questions[index];

      if (!validateQuestion(question)) {
        setCurrentIndex(index);
        return;
      }
    }

    // Send answers as a dictionary keyed by question ID.
    const payload = {
      answers: Object.fromEntries(
        form.questions.map((question) => [
          String(question.id),
          answers[question.id] ?? "",
        ])
      ),
    };

    try {
      setSubmitting(true);
      setError("");

      const response = await fetch(
        `${API}/api/public/forms/${encodeURIComponent(slug)}/responses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(
          formatApiError(result?.detail ?? result?.message ?? null)
        );
      }

      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while submitting your response."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] p-6">
        <p className="text-gray-500">Loading your form...</p>
      </main>
    );
  }

  if (!form) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] p-6">
        <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold">Form unavailable</h1>
          <p role="alert" className="mt-3 break-words text-gray-600">
            {error || "Could not load this form."}
          </p>
          <a href="/" className="mt-6 inline-block text-purple-700 underline">
            Back to workspace
          </a>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] p-6">
        <div className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white px-8 py-14 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-3xl text-green-600">
            ✓
          </div>
          <h1 className="mt-6 text-3xl font-semibold">Thank you!</h1>
          <p className="mt-3 text-gray-600">
            Your response has been submitted successfully.
          </p>
          <p className="mt-2 text-sm text-gray-400">
            You can close this page now.
          </p>
        </div>
      </main>
    );
  }

  if (form.questions.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] p-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="text-xl font-semibold">{form.title}</h1>
          <p className="mt-3 text-gray-500">
            This form does not have any questions yet.
          </p>
        </div>
      </main>
    );
  }

  const question = form.questions[currentIndex];
  const totalQuestions = form.questions.length;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  function renderQuestionInput(item: Question) {
    const value = answers[item.id] ?? "";
    const options = getOptions(item);

    const inputClass =
      "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100";

    switch (item.question_type) {
      case "short_text":
        return (
          <input
            type="text"
            value={value}
            onChange={(event) => updateAnswer(item.id, event.target.value)}
            placeholder="Type your answer here..."
            className={inputClass}
          />
        );

      case "long_text":
        return (
          <textarea
            value={value}
            onChange={(event) => updateAnswer(item.id, event.target.value)}
            placeholder="Type your answer here..."
            rows={5}
            className={inputClass}
          />
        );

      case "email":
        return (
          <input
            type="email"
            value={value}
            onChange={(event) => updateAnswer(item.id, event.target.value)}
            placeholder="name@example.com"
            className={inputClass}
          />
        );

      case "number":
        return (
          <input
            type="number"
            value={value}
            onChange={(event) => updateAnswer(item.id, event.target.value)}
            placeholder="Enter a number"
            className={inputClass}
          />
        );

      case "multiple_choice":
        return (
          <div className="space-y-3">
            {options.map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                  value === option
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 hover:border-purple-300"
                }`}
              >
                <input
                  type="radio"
                  name={`question-${item.id}`}
                  value={option}
                  checked={value === option}
                  onChange={() => updateAnswer(item.id, option)}
                  className="h-4 w-4 accent-purple-600"
                />
                <span>{option}</span>
              </label>
            ))}
            {options.length === 0 && (
              <p className="text-sm text-red-600">
                This question has no answer options.
              </p>
            )}
          </div>
        );

      case "dropdown":
        return (
          <select
            value={value}
            onChange={(event) => updateAnswer(item.id, event.target.value)}
            className={inputClass}
          >
            <option value="">Choose an option</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case "yes_no":
        return (
          <div className="grid grid-cols-2 gap-3">
            {["Yes", "No"].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => updateAnswer(item.id, option)}
                className={`rounded-xl border p-4 font-medium transition ${
                  value === option
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-gray-200 hover:border-purple-300"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        );

      case "rating":
        return (
          <div className="flex flex-wrap gap-3">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => updateAnswer(item.id, String(rating))}
                aria-label={`Rate ${rating} out of 5`}
                className={`flex h-12 w-12 items-center justify-center rounded-xl border text-lg font-semibold transition ${
                  value === String(rating)
                    ? "border-purple-600 bg-purple-600 text-white"
                    : "border-gray-200 bg-white hover:border-purple-400"
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(event) => updateAnswer(item.id, event.target.value)}
            placeholder="Type your answer here..."
            className={inputClass}
          />
        );
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#191919]">
      <header className="border-b border-gray-200 bg-white px-5 py-5 md:px-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <span className="text-lg font-bold tracking-tight">
            forms<span className="text-purple-600">.</span>
          </span>
          <span className="text-sm text-gray-500">
            {currentIndex + 1} of {totalQuestions}
          </span>
        </div>
      </header>

      <div className="h-1 w-full bg-gray-200">
        <div
          className="h-full bg-purple-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <section className="mx-auto max-w-3xl px-5 py-10 md:py-16">
        <div className="mb-8">
          <p className="text-sm font-medium text-purple-700">CUSTOMER FORM</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            {form.title}
          </h1>
          <p className="mt-3 text-gray-500">
            Please answer the following questions. Required questions are marked with *.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 break-words rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-10">
          <div className="mb-8">
            <p className="text-sm text-gray-400">
              QUESTION {currentIndex + 1} OF {totalQuestions}
            </p>

            <h2 className="mt-4 text-xl font-semibold md:text-2xl">
              {question.title}
              {question.required && (
                <span className="ml-1 text-purple-600">*</span>
              )}
            </h2>

            {question.description && (
              <p className="mt-3 whitespace-pre-wrap text-gray-500">
                {question.description}
              </p>
            )}
          </div>

          {renderQuestionInput(question)}

          {validationError && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {validationError}
            </p>
          )}

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-6">
            <button
              type="button"
              onClick={() => {
                setValidationError("");
                setCurrentIndex((index) => Math.max(0, index - 1));
              }}
              disabled={currentIndex === 0 || submitting}
              className="rounded-full border border-gray-200 px-5 py-3 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Back
            </button>

            {currentIndex < totalQuestions - 1 ? (
              <button
                type="button"
                onClick={nextQuestion}
                className="rounded-full bg-purple-600 px-6 py-3 font-medium text-white transition hover:bg-purple-700"
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void submitForm()}
                disabled={submitting}
                className="rounded-full bg-purple-600 px-6 py-3 font-medium text-white transition hover:bg-purple-700 disabled:cursor-wait disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit response"}
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Your response will be recorded when you submit this form.
        </p>
      </section>
    </main>
  );
}
