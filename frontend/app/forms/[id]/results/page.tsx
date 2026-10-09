
"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";


const API_URL = "https://typeform-clone-1-38gy.onrender.com";


type ResponseItem = {
  id: number;
  submitted_at: string | null;
};

type ResponsesData = {
  form_id: number;
  form_title: string;
  total_responses: number;
  responses: ResponseItem[];
};

type AnswerItem = {
  question_id: number;
  question: string;
  question_type: string;
  answer: string;
};

type ResponseDetails = {
  id: number;
  form_title: string;
  submitted_at: string | null;
  answers: AnswerItem[];
};

type AnswerCount = {
  answer: string;
  count: number;
};

type QuestionAnalytics = {
  question_id: number;
  question: string;
  question_type: string;
  total_answers: number;
  counts: AnswerCount[];
  average_rating: number | null;
};

export default function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [data, setData] = useState<ResponsesData | null>(null);
  const [selected, setSelected] = useState<ResponseDetails | null>(null);
  const [analytics, setAnalytics] = useState<QuestionAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadResponses = useCallback(async () => {
    setLoading(true);

    try {
      setError("");

      const response = await fetch(`${API}/api/forms/${id}/responses`);

      if (!response.ok) {
        throw new Error("Could not load responses.");
      }

      const responseData: ResponsesData = await response.json();
      setData(responseData);

      // Load the answers for every submission to calculate analytics.
      const details = await Promise.all(
        responseData.responses.map(async (item) => {
          const result = await fetch(
            `${API}/api/forms/${id}/responses/${item.id}`
          );

          if (!result.ok) {
            throw new Error("Could not load answers for analytics.");
          }

          return (await result.json()) as ResponseDetails;
        })
      );

      const questions = new Map<number, QuestionAnalytics>();

      for (const submission of details) {
        for (const answer of submission.answers ?? []) {
          const value = answer.answer?.trim();

          // Ignore blank answers in the analytics.
          if (!value) continue;

          if (!questions.has(answer.question_id)) {
            questions.set(answer.question_id, {
              question_id: answer.question_id,
              question: answer.question,
              question_type: answer.question_type,
              total_answers: 0,
              counts: [],
              average_rating: null,
            });
          }

          const question = questions.get(answer.question_id)!;
          question.total_answers += 1;

          // Group identical answers together.
          const existing = question.counts.find(
            (item) => item.answer === value
          );

          if (existing) {
            existing.count += 1;
          } else {
            question.counts.push({
              answer: value,
              count: 1,
            });
          }
        }
      }

      const calculated = Array.from(questions.values()).map((question) => {
        question.counts.sort((a, b) => b.count - a.count);

        if (question.question_type === "rating") {
          const numericAnswers = question.counts.flatMap((item) => {
            const value = Number(item.answer);

            return Number.isFinite(value) && item.answer !== ""
              ? Array(item.count).fill(value)
              : [];
          });

          question.average_rating =
            numericAnswers.length > 0
              ? numericAnswers.reduce((sum, value) => sum + value, 0) /
                numericAnswers.length
              : null;
        }

        return question;
      });

      setAnalytics(calculated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load responses."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadResponses();
  }, [loadResponses]);

  async function openResponse(responseId: number) {
    try {
      setError("");

      const response = await fetch(
        `${API}/api/forms/${id}/responses/${responseId}`
      );

      if (!response.ok) {
        throw new Error("Could not load this response.");
      }

      setSelected(await response.json());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load response."
      );
    }
  }

  function formatDate(value: string | null) {
    if (!value) return "Date unavailable";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "Date unavailable"
      : date.toLocaleString();
  }

  function formatPercentage(count: number, total: number) {
    if (total === 0) return "0%";
    return `${Math.round((count / total) * 100)}%`;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] p-10">
        Loading responses and analytics...
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] p-8">
        <p role="alert" className="mb-4 text-red-600">
          {error || "Form not found."}
        </p>
        <Link href="/" className="text-purple-700 underline">
          Back to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#191919]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-5 md:px-12">
        <div>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-purple-700"
          >
            ← All forms
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">
            {data.form_title}
          </h1>
          <p className="mt-1 text-sm text-gray-500">Form results</p>
        </div>

        <Link
          href={`/forms/${id}/edit`}
          className="rounded-full bg-purple-600 px-5 py-3 text-white hover:bg-purple-700"
        >
          Edit form
        </Link>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-10 md:px-8">
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl bg-red-50 p-4 text-red-700"
          >
            {error}
          </div>
        )}

        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <p className="text-sm text-gray-500">Total responses</p>
            <p className="mt-2 text-4xl font-semibold">
              {data.total_responses}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <p className="text-sm text-gray-500">Questions with answers</p>
            <p className="mt-2 text-4xl font-semibold">
              {analytics.length}
            </p>
            <button
              onClick={() => void loadResponses()}
              className="mt-2 text-sm text-purple-700 hover:underline"
            >
              Refresh results
            </button>
          </div>
        </div>

        {/* Question-level analytics */}
        <section className="mb-10">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">Question Analytics</h2>
            <p className="mt-1 text-sm text-gray-500">
              Explore how people answered each question.
            </p>
          </div>

          {analytics.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
              <h3 className="font-semibold">No analytics available yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Submit the form with some answers to see summaries here.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {analytics.map((question) => (
                <article
                  key={question.question_id}
                  className="rounded-2xl border border-gray-200 bg-white p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{question.question}</h3>
                      <p className="mt-1 text-xs capitalize text-gray-500">
                        {question.question_type.replaceAll("_", " ")}
                      </p>
                    </div>

                    <div className="rounded-xl bg-purple-50 px-3 py-2 text-right">
                      <p className="text-2xl font-semibold text-purple-700">
                        {question.total_answers}
                      </p>
                      <p className="text-xs text-gray-500">
                        Answers received
                      </p>
                    </div>
                  </div>

                  {question.question_type === "rating" &&
                    question.average_rating !== null && (
                      <div className="my-5 rounded-xl bg-amber-50 p-4">
                        <p className="text-sm text-gray-600">
                          Average rating
                        </p>
                        <p className="mt-1 text-3xl font-semibold">
                          {question.average_rating.toFixed(2)}
                        </p>
                      </div>
                    )}

                  <div className="mt-5 space-y-4">
                    {question.counts.map((item) => (
                      <div key={item.answer}>
                        <div className="mb-2 flex items-start justify-between gap-3 text-sm">
                          <span className="break-words">
                            {item.answer}
                          </span>
                          <span className="shrink-0 font-medium text-gray-600">
                            {item.count} (
                            {formatPercentage(
                              item.count,
                              question.total_answers
                            )}
                            )
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-purple-500"
                            style={{
                              width: formatPercentage(
                                item.count,
                                question.total_answers
                              ),
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Individual responses */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-5">
            <h2 className="text-lg font-semibold">Individual responses</h2>
            <p className="mt-1 text-sm text-gray-500">
              Select a submission to view its answers.
            </p>
          </div>

          {data.responses.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="font-semibold">No responses yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Submit your published form to see responses here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.responses.map((item) => (
                <button
                  key={item.id}
                  onClick={() => void openResponse(item.id)}
                  className={`flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left hover:bg-purple-50 ${
                    selected?.id === item.id ? "bg-purple-50" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium">Response #{item.id}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {formatDate(item.submitted_at)}
                    </p>
                  </div>
                  <span className="text-sm text-purple-700">
                    View answers →
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {selected && (
          <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">
                  Response #{selected.id}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Submitted {formatDate(selected.submitted_at)}
                </p>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="rounded-lg bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
              >
                Close
              </button>
            </div>

            {selected.answers.length === 0 ? (
              <p className="text-gray-500">
                No answers were stored for this response.
              </p>
            ) : (
              <div className="space-y-5">
                {selected.answers.map((answer) => (
                  <div
                    key={answer.question_id}
                    className="rounded-xl bg-gray-50 p-5"
                  >
                    <p className="font-medium">{answer.question}</p>
                    <p className="mt-2 whitespace-pre-wrap text-gray-600">
                      {answer.answer || "No answer"}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      {answer.question_type.replaceAll("_", " ")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
