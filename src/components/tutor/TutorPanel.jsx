import { useEffect, useRef, useState } from "react";
import { usePersistentState } from "../../lib/persistence";
import {
  appendTutorMessage,
  extractTutorFaReferences,
  hydrateTutorHistory,
  TUTOR_HISTORY_STORAGE_KEY
} from "../../lib/tutor";
import { askTutor } from "../../services/tutorAgent";

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function TutorMessage({ message }) {
  const references = extractTutorFaReferences(message.text);

  return (
    <article
      className={classNames(
        "rounded-[22px] border px-4 py-3",
        message.role === "user"
          ? "border-teal/30 bg-teal/10"
          : "border-white/10 bg-white/5"
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.2em] text-mist">
        {message.role === "user" ? "You" : "Tutor"}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-100">{message.text}</p>

      {references.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {references.map((reference) => (
            <span
              key={reference.key}
              className="rounded-full border border-amber/30 bg-amber/10 px-3 py-1 text-xs text-amber"
            >
              FA pp. {reference.startPage}-{reference.endPage}
              {reference.systems.length ? ` · ${reference.systems.join(" / ")}` : ""}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default function TutorPanel({ apiKey, open, onClose }) {
  const [history, setHistory] = usePersistentState(
    TUTOR_HISTORY_STORAGE_KEY,
    () => [],
    hydrateTutorHistory
  );
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [history, open, submitting]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const question = draft.trim();

    if (!question || submitting) {
      return;
    }

    const userMessage = {
      role: "user",
      text: question,
      timestamp: new Date().toISOString()
    };
    const nextHistory = appendTutorMessage(history, userMessage);

    setHistory(nextHistory);
    setDraft("");
    setError("");
    setSubmitting(true);

    try {
      const text = await askTutor(question, apiKey, nextHistory.slice(0, -1));
      setHistory((current) =>
        appendTutorMessage(current, {
          role: "model",
          text,
          timestamp: new Date().toISOString()
        })
      );
    } catch (submissionError) {
      setError(submissionError.message || "Tutor request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function clearConversation() {
    setHistory([]);
    setError("");
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />

      <aside className="tutor-panel-shell">
        <section className="tutor-panel">
          <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div>
              <p className="war-display text-base uppercase tracking-[0.24em] text-teal">
                USMLE Tutor
              </p>
              <p className="mt-1 text-sm text-mist">Powered by Gemini</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="button-secondary rounded-full px-3 py-2 text-xs"
                onClick={clearConversation}
              >
                Clear
              </button>
              <button
                type="button"
                className="button-secondary rounded-full px-3 py-2 text-xs"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {history.length ? (
              history.map((message, index) => (
                <TutorMessage key={`${message.timestamp}-${index}`} message={message} />
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-white/10 bg-white/5 px-4 py-5 text-sm leading-7 text-mist">
                Ask about mechanisms, differentiators, or why a UWorld answer choice is right.
              </div>
            )}

            {submitting ? (
              <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 text-sm text-mist">
                Tutor is building the explanation...
              </div>
            ) : null}
          </div>

          <footer className="border-t border-white/10 px-5 py-4">
            {error ? (
              <div className="mb-3 rounded-2xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
                {error}
              </div>
            ) : null}

            <form className="space-y-3" onSubmit={handleSubmit}>
              <textarea
                ref={inputRef}
                className="field min-h-24 resize-none"
                placeholder="Ask a question..."
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSubmit(event);
                  }
                }}
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.18em] text-mist">
                  Key Concept -&gt; Mechanism -&gt; Clinical Correlation
                </p>
                <button type="submit" className="button-primary" disabled={submitting}>
                  Send
                </button>
              </div>
            </form>
          </footer>
        </section>
      </aside>
    </>
  );
}
