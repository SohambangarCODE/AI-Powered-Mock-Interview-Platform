"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizontal, SkipForward } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 4000;

interface InputBoxProps {
  onSend: (message: string) => void;
  onSkip?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function InputBox({
  onSend,
  onSkip,
  disabled,
  placeholder = "Type your answer… be specific and use examples",
}: InputBoxProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Interview answers are paragraphs, so the box grows with the answer instead
  // of scrolling a single line.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const nearLimit = input.length > MAX_LENGTH * 0.9;

  return (
    <div className="p-4">
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            maxLength={MAX_LENGTH}
            placeholder={placeholder}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 pr-16 text-sm leading-relaxed shadow-xs transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          {input.length > 0 && (
            <span
              className={cn(
                "tnum pointer-events-none absolute right-3 bottom-2.5 text-[11px]",
                nearLimit ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {input.length}/{MAX_LENGTH}
            </span>
          )}
        </div>

        <Button
          size="lg"
          onClick={handleSend}
          disabled={disabled || !input.trim()}
        >
          <SendHorizontal aria-hidden />
          Send
        </Button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-sans">
            Enter
          </kbd>{" "}
          to send ·{" "}
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-sans">
            Shift + Enter
          </kbd>{" "}
          for a new line
        </p>
        {onSkip && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            disabled={disabled}
            className="text-muted-foreground hover:text-foreground"
          >
            <SkipForward aria-hidden />
            Skip question
          </Button>
        )}
      </div>
    </div>
  );
}
