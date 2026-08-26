"use client";

import { useEffect, useRef } from "react";
import { TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { difficultyMeta, scoreTone, type ChatMessage } from "@/lib/interview";
import { cn } from "@/lib/utils";

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
    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-6">
      {messages.length === 0 && !isLoading && (
        <div className="flex h-full items-center justify-center text-muted-foreground">
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
          className={cn(
            "rounded-2xl rounded-br-md px-4 py-2.5",
            skipped
              ? "border border-dashed border-border-strong bg-muted/40 text-muted-foreground italic"
              : "bg-primary text-primary-foreground shadow-xs",
          )}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {skipped ? "Skipped this question" : message.content}
          </p>
        </div>
        <p className="mt-1 text-right text-[11px] text-muted-foreground">
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
    ? "border-warning/40 bg-warning/5"
    : isSystem
      ? "border-destructive/40 bg-destructive/5"
      : isQuestion
        ? "border-border bg-card shadow-xs"
        : "border-border bg-muted/40";

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] sm:max-w-[80%]">
        <div className={cn("rounded-2xl rounded-bl-md border px-4 py-3", shell)}>
          {/* Question header: topic + difficulty */}
          {isQuestion && (diff || message.topic) && (
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {diff && (
                <Badge variant="outline" size="sm" className={diff.badge}>
                  {diff.label}
                </Badge>
              )}
              {message.topic && (
                <Badge variant="outline" size="sm">
                  {message.topic}
                </Badge>
              )}
            </div>
          )}

          {/* Feedback header: the 0-10 score for the answer above */}
          {message.kind === "feedback" &&
            message.score !== null &&
            message.score !== undefined && (
              <div className="mb-2 flex items-center gap-2">
                <Badge
                  variant="outline"
                  size="sm"
                  className={cn("tnum font-semibold", tone.badge)}
                >
                  {message.score}/10
                </Badge>
                <span className={cn("text-[11px] font-semibold", tone.text)}>
                  {tone.label}
                </span>
              </div>
            )}

          {isNudge && (
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-warning-foreground">
              <TriangleAlert className="size-3.5" aria-hidden />
              Repeated answer
            </p>
          )}

          <p
            className={cn(
              "text-sm leading-relaxed whitespace-pre-wrap",
              isQuestion
                ? "font-medium text-foreground"
                : isSystem
                  ? "text-destructive"
                  : "text-muted-foreground",
            )}
          >
            {message.content}
          </p>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {formatTimestamp(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

function TypingBubble({ label }: { label: string }) {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-md border border-border bg-muted/40 px-4 py-3">
        <span className="flex items-center gap-1">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
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
