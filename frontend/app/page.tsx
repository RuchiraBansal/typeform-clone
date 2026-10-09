
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";


const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type FormItem = {
  id: number;
  title: string;
  slug: string;
  questions: number;
  responses: number;
  published: boolean;
};

export default function Home() {
  const [forms, setForms] = useState<FormItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadForms = useCallback(async () => {
    try {
      setError("");

      const response = await fetch(`${API_URL}/api/forms`);

      if (!response.ok) {
        throw new Error("Could not load forms from the server.");
      }

      const data: FormItem[] = await response.json();
      setForms(data);
    } catch {
      setError(
        "Unable to connect to the backend. Make sure FastAPI is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadForms();
  }, [loadForms]);

  async function apiRequest(
    path: string,
    method: string,
    body?: object
  ) {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: body
        ? { "Content-Type": "application/json" }
        : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const detail = data?.detail;

      throw new Error(
        typeof detail === "string"
          ? detail
          : detail
            ? JSON.stringify(detail)
            : "Something went wrong."
      );
    }

    return response.status === 204 ? null : response.json();
  }

  async function createForm() {
    const title = window.prompt(
      "What would you like to call your form?",
      "Untitled form"
    );

    if (title === null) return;

    if (!title.trim()) {
      setNotice("Please enter a form title.");
      return;
    }

    try {
      await apiRequest("/api/forms", "POST", {
        title: title.trim(),
      });
      setNotice("Form created successfully.");
      await loadForms();
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Could not create form."
      );
    }
  }

  async function renameForm(form: FormItem) {
    const title = window.prompt("Enter your form name:", form.title);

    if (title === null) return;

    if (!title.trim()) {
      setNotice("Form title cannot be empty.");
      return;
    }

    try {
      await apiRequest(`/api/forms/${form.id}`, "PATCH", {
        title: title.trim(),
      });
      setNotice("Form renamed successfully.");
      await loadForms();
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Could not rename form."
      );
    }
  }

  async function togglePublish(form: FormItem) {
    try {
      const updated = await apiRequest(
        `/api/forms/${form.id}/publish`,
        "PATCH"
      );

      setNotice(
        updated.published
          ? "Form published successfully."
          : "Form unpublished successfully."
      );

      await loadForms();
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Could not update form."
      );
    }
  }

  async function duplicateForm(form: FormItem) {
    try {
      await apiRequest(`/api/forms/${form.id}/duplicate`, "POST");
      setNotice("Form duplicated successfully.");
      await loadForms();
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Could not duplicate form."
      );
    }
  }

  async function deleteForm(form: FormItem) {
    if (!window.confirm(`Delete "${form.title}" permanently?`)) {
      return;
    }

    try {
      await apiRequest(`/api/forms/${form.id}`, "DELETE");
      setNotice("Form deleted successfully.");
      await loadForms();
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Could not delete form."
      );
    }
  }

  const filteredForms = forms.filter((form) =>
    form.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#191919]">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-gray-200 bg-white p-6 md:block">
        <div className="mb-12 text-2xl font-bold tracking-tight">
          typeform<span className="text-purple-600">.</span>
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Workspace
        </p>

        <nav className="space-y-2">
          <Link
            href="/"
            className="block rounded-lg bg-purple-50 px-4 py-3 font-medium text-purple-700"
          >
            ◫ &nbsp; Forms
          </Link>

          <div className="rounded-lg px-4 py-3 text-gray-500">
            ▤ &nbsp; Results
          </div>

          <div className="rounded-lg px-4 py-3 text-gray-500">
            ⚙ &nbsp; Settings
          </div>
        </nav>

        <div className="absolute bottom-6 left-6 right-6 rounded-xl bg-gray-50 p-4">
          <p className="font-medium">Your workspace</p>
          <p className="mt-1 text-sm text-gray-500">Free plan</p>
        </div>
      </aside>

      <section className="px-5 py-8 md:ml-60 md:px-12 md:py-12">
        <header className="mb-12 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm text-gray-500">
              Workspace / Forms
            </p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Your forms
            </h1>
            <p className="mt-2 text-gray-500">
              Create something worth asking.
            </p>
          </div>

          <button
            onClick={() => void createForm()}
            className="rounded-full bg-purple-600 px-6 py-3 font-medium text-white transition hover:bg-purple-700"
          >
            + Create a form
          </button>
        </header>

        {notice && (
          <div
            role="status"
            className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-100 bg-purple-50 p-4 text-sm text-purple-800"
          >
            <span>{notice}</span>
            <button
              onClick={() => setNotice("")}
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl bg-red-50 p-4 text-red-700"
          >
            {error}
            <button
              onClick={() => {
                setLoading(true);
                void loadForms();
              }}
              className="ml-3 underline"
            >
              Retry
            </button>
          </div>
        )}

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">All forms</h2>
            <p className="mt-1 text-sm text-gray-500">
              {forms.length} forms in your workspace
            </p>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search forms..."
            aria-label="Search forms"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-purple-400 md:w-64"
          />
        </div>

        {loading ? (
          <p className="py-12 text-center text-gray-500">
            Loading your forms...
          </p>
        ) : filteredForms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <h3 className="text-lg font-semibold">
              {search ? "No forms found" : "Your workspace is ready"}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {search
                ? "Try another search."
                : "Create your first form to get started."}
            </p>

            {!search && (
              <button
                onClick={() => void createForm()}
                className="mt-5 rounded-full bg-purple-600 px-5 py-3 text-white hover:bg-purple-700"
              >
                + Create your first form
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredForms.map((form) => (
              <article
                key={form.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-xl text-purple-700">
                    ◫
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      form.published
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {form.published ? "Published" : "Draft"}
                  </span>
                </div>

                <h3 className="truncate text-lg font-semibold">
                  {form.title}
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  {form.questions} questions · {form.responses} responses
                </p>

                <div className="mt-6 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                  <Link
                    href={`/forms/${form.id}/edit`}
                    className="rounded-lg bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
                  >
                    Edit
                  </Link>

                  <Link
                    href={`/forms/${form.id}/results`}
                    className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Results
                  </Link>

                  <button
                    onClick={() => void renameForm(form)}
                    className="rounded-lg bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
                  >
                    Rename
                  </button>

                  <button
                    onClick={() => void togglePublish(form)}
                    className="rounded-lg bg-purple-50 px-3 py-2 text-sm text-purple-700 hover:bg-purple-100"
                  >
                    {form.published ? "Unpublish" : "Publish"}
                  </button>

                  <button
                    onClick={() => void duplicateForm(form)}
                    className="rounded-lg bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
                  >
                    Duplicate
                  </button>

                  <button
                    onClick={() => void deleteForm(form)}
                    className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
