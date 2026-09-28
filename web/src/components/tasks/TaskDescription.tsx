import { useRef, useState } from "react";
import Markdown from "react-markdown";

export function TaskDescription({ value }: { value: string }) {
  return (
    <div className="task-description min-w-0 break-words text-sm leading-6 [&_p]:whitespace-pre-wrap [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-100 [&_pre]:p-3 dark:[&_pre]:bg-slate-800 [&_code]:text-xs [&_h1]:text-xl [&_h2]:text-lg [&_h3]:font-semibold [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3">
      <Markdown
        skipHtml
        components={{
          img: ({ alt }) => (
            <span>{alt || "Image"} (see task attachments)</span>
          ),
        }}
      >
        {value}
      </Markdown>
    </div>
  );
}

export function TaskDescriptionInput({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [preview, setPreview] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const format = (before: string, after = "") => {
    const start = textarea.current?.selectionStart ?? value.length;
    const end = textarea.current?.selectionEnd ?? value.length;
    onChange(
      value.slice(0, start) +
        before +
        (value.slice(start, end) || "text") +
        after +
        value.slice(end),
    );
    requestAnimationFrame(() => {
      textarea.current?.focus();
      textarea.current?.setSelectionRange(
        start + before.length,
        start + before.length + (end - start || 4),
      );
    });
  };
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700">
      <div
        className="flex flex-wrap gap-1 border-b border-slate-200 p-2 dark:border-slate-700"
        role="group"
        aria-label="Description formatting"
      >
        {[
          ["Bold", "**", "**"],
          ["Italic", "*", "*"],
          ["Heading", "\n## ", ""],
          ["Bullet list", "\n- ", ""],
          ["Code block", "\n```\n", "\n```"],
        ].map(([label, before, after]) => (
          <button
            key={label}
            type="button"
            disabled={disabled || preview}
            className="rounded px-2 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => format(before, after)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className="ml-auto rounded px-2 py-1 text-xs font-semibold text-blue-600"
          onClick={() => setPreview((p) => !p)}
        >
          {preview ? "Write" : "Preview"}
        </button>
      </div>
      {preview ? (
        <div className="min-h-40 p-3" aria-label="Description preview">
          <TaskDescription value={value || "Nothing to preview yet."} />
        </div>
      ) : (
        <textarea
          ref={textarea}
          id={id}
          className="form-control min-h-40 w-full border-0 text-sm"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Describe the work, expected outcome and acceptance criteria..."
        />
      )}
    </div>
  );
}
