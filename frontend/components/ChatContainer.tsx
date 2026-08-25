"use client";

import { useEffect, useRef } from "react";
import { difficultyMeta, scoreTone, type ChatMessage } from "@/lib/interview";

interface ChatContainerProps {
  messages: ChatMessage[];
  isLoading: boolean;
  /** Shown under the typing indicator so waits don't feel like a hang. */
  loadingLabel?: string;
}

const ChatContainer = ({
  messages,
  isLoading,
  loadingLabel = "Analysing your answer",
}: ChatContainerProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Follow the conversation as it grows — the old version left the newest
  // message off-screen.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4">
      {messages.length === 0 && !isLoading && (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p className="text-sm">Preparing your first question…</p>
        </div>
      )}

      {messages.map((message) =>
        message.isUser ? (
          <AnswerBubble key={message.id} message={message} />
        ) : (
          <AiBubble key={message.id} message={message} />
        ),
      )}

      {isLoading && <TypingBubble label={loadingLabel} />}

      <div ref={bottomRef} />
    </div>
  );
};

function AnswerBubble({ message }: { message: ChatMessage }) {
  const skipped = message.skipped;
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] sm:max-w-[75%]">
        <div
          className={
            skipped
              ? "px-4 py-2.5 rounded-2xl rounded-br-md border border-dashed border-border bg-muted/40 text-muted-foreground italic"
              : "px-4 py-2.5 rounded-2xl rounded-br-md bg-primary text-primary-foreground"
          }
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {skipped ? "Skipped this question" : message.content}
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 text-right">
          {formatTimestamp(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

function AiBubble({ message }: { message: ChatMessage }) {
  const isQuestion = message.kind === "question";
  const isNudge = message.kind === "nudge";
  const isSystem = message.kind === "system";
  const tone = scoreTone(message.score);
  const diff = message.difficulty ? difficultyMeta(message.difficulty) : null;

  const shell = isNudge
    ? "border-amber-500/40 bg-amber-500/5"
    : isSystem
      ? "border-destructive/40 bg-destructive/5"
      : isQuestion
        ? "border-border bg-card"
        : "border-border/60 bg-muted/40";

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] sm:max-w-[80%]">
        <div className={`rounded-2xl rounded-bl-md border px-4 py-3 ${shell}`}>
          {/* Question header: topic + difficulty */}
          {isQuestion && (diff || message.topic) && (
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {diff && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${diff.badge}`}
                >
                  {diff.label}
                </span>
              )}
              {message.topic && (
                <span className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-background text-muted-foreground font-medium">
                  {message.topic}
                </span>
              )}
            </div>
          )}

          {/* Feedback header: the 0-10 score for the answer above */}
          {message.kind === "feedback" &&
            message.score !== null &&
            message.score !== undefined && (
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full border font-bold tabular-nums ${tone.badge}`}
                >
                  {message.score}/10
                </span>
                <span className={`text-[11px] font-semibold ${tone.text}`}>
                  {tone.label}
                </span>
              </div>
            )}

          {isNudge && (
            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mb-1">
              ⚠️ Repeated answer
            </p>
          )}

          <p
            className={`text-sm leading-relaxed whitespace-pre-wrap ${
              isQuestion
                ? "font-medium text-foreground"
                : isSystem
                  ? "text-destructive"
                  : "text-muted-foreground"
            }`}
          >
            {message.content}
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          {formatTimestamp(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

function TypingBubble({ label }: { label: string }) {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md border border-border/60 bg-muted/40 px-4 py-3 flex items-center gap-2.5">
        <span className="flex items-center gap-1">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
        <span className="text-xs text-muted-foreground">{label}…</span>
      </div>
    </div>
  );
}

function formatTimestamp(date: Date) {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default ChatContainer;
