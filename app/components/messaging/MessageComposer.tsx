"use client";

import { useEffect, useRef } from "react";
import type { MessageComposerProps } from "./types";

export default function MessageComposer({
  value,
  onChange,
  onSend,
  disabled = false,
  sending = false,
  placeholder = "Type a message...",
}: MessageComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(
    null
  );

  const isDisabled = disabled || sending;

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      120
    )}px`;
  }, [value]);

  async function handleSubmit() {
    const message = value.trim();

    if (!message || isDisabled) {
      return;
    }

    await onSend();
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white p-3 sm:p-4">
      <div className="mx-auto flex max-w-4xl items-end gap-2 rounded-2xl border border-gray-200 bg-[#FAF8F6] p-2 shadow-sm transition-colors focus-within:border-[#8B1E3F]/40 focus-within:ring-2 focus-within:ring-[#8B1E3F]/10">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled}
          rows={1}
          maxLength={4000}
          aria-label="Message"
          className="max-h-[120px] min-h-[40px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={
            isDisabled || !value.trim()
          }
          aria-label={
            sending ? "Sending message" : "Send message"
          }
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8B1E3F] text-white transition-colors hover:bg-[#64152E] focus:outline-none focus:ring-2 focus:ring-[#8B1E3F]/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              aria-hidden="true"
            />
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                d="M21 3 10.5 13.5M21 3l-6.7 18-3.8-7.5L3 9.7 21 3Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>

      <p className="mx-auto mt-1.5 max-w-4xl px-2 text-[10px] text-gray-400">
        Press Enter to send · Shift + Enter for a new line
      </p>
    </div>
  );
}