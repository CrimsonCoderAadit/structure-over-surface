"use client";

import { useRef } from "react";

export default function CodeInput({
  value,
  onChange,
  onSubmit,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    onChange(text);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-xs text-text-faint">source.py</p>
        <button
          onClick={() => fileRef.current?.click()}
          className="font-mono text-xs text-text-dim hover:text-text transition-colors"
        >
          Upload file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".py,text/x-python,text/plain"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        placeholder="def example(n):\n    if n <= 1:\n        return n\n    return example(n - 1) + example(n - 2)"
        className="flex-1 min-h-[280px] resize-none bg-surface border border-border-color px-4 py-3 font-mono text-sm text-text leading-relaxed focus:outline-none focus:border-edge-structural"
      />

      <button
        onClick={onSubmit}
        disabled={loading || !value.trim()}
        className="mt-4 font-mono text-sm border border-border-color px-4 py-2.5 hover:border-edge-structural hover:text-edge-structural transition-colors disabled:opacity-40 disabled:hover:border-border-color disabled:hover:text-text"
      >
        {loading ? "Parsing…" : "Classify"}
      </button>
    </div>
  );
}
