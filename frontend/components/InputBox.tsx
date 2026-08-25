"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

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
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            maxLength={MAX_LENGTH}
            placeholder={placeholder}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 pr-16 text-sm leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {input.length > 0 && (
            <span
              className={`absolute bottom-2.5 right-3 text-[11px] tabular-nums pointer-events-none ${
                nearLimit ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {input.length}/{MAX_LENGTH}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleSend}
            disabled={disabled || !input.trim()}
            className="rounded-2xl h-11 px-5 font-semibold"
          >
            Send
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mt-2">
        <p className="text-[11px] text-muted-foreground">
          <kbd className="px-1 py-0.5 rounded border border-border bg-muted font-sans">
            Enter
          </kbd>{" "}
          to send ·{" "}
          <kbd className="px-1 py-0.5 rounded border border-border bg-muted font-sans">
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
            className="text-xs text-muted-foreground hover:text-foreground h-7 rounded-full"
          >
            Skip question ⏭
          </Button>
        )}
      </div>
    </div>
  );
}
