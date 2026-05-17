"use client";

type FileEntry = { path: string; content: string };

type Props = {
  files: FileEntry[];
  isLoading: boolean;
  error: string | null;
  onConfirm: () => void;
  onBack: () => void;
};

export function Step6Confirm({ files, isLoading, error, onConfirm, onBack }: Props) {
  return (
    <div className="space-y-6">
      <p
        className="text-[9px] tracking-widest text-sm-secondary"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ DIRECTORY PREVIEW — {files.length} FILES ]
      </p>

      <div className="border border-sm-border bg-sm-surface max-h-96 overflow-y-auto">
        {files.map((file) => (
          <div key={file.path} className="border-b border-sm-border last:border-b-0 px-4 py-2">
            <span
              className="text-[10px] tracking-wide text-sm-secondary"
              style={{ fontFamily: "var(--font-space-mono, monospace)" }}
            >
              {file.path}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <p
          className="text-[10px] tracking-widest text-sm-accent"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ ERROR: {error.toUpperCase()} ]
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="border border-sm-border px-5 py-2.5 text-[10px] tracking-widest text-sm-secondary hover:border-sm-primary transition-colors disabled:opacity-30"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ ← BACK ]
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="bg-sm-display px-6 py-2.5 text-[10px] tracking-widest text-sm-bg hover:opacity-80 transition-opacity disabled:opacity-30"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          {isLoading ? "[ CREATING SKILL... ]" : "[ CREATE SKILL ]"}
        </button>
      </div>
    </div>
  );
}
