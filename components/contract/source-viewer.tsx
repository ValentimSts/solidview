"use client";

import { useState } from "react";
import type { ContractSource } from "@/types/contract";

interface SourceViewerProps {
  source: ContractSource;
}

export function SourceViewer({ source }: SourceViewerProps) {
  const fileNames = Object.keys(source.files);
  const [activeFile, setActiveFile] = useState(fileNames[0] || "");

  if (fileNames.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No source code available.
      </p>
    );
  }

  const content = source.files[activeFile] || "";

  return (
    <div className="flex flex-col gap-3">
      {fileNames.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b pb-2">
          {fileNames.map((name) => {
            const shortName = name.split("/").pop() || name;
            return (
              <button
                key={name}
                onClick={() => setActiveFile(name)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-mono transition-colors ${
                  activeFile === name
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {shortName}
              </button>
            );
          })}
        </div>
      )}
      <div className="relative">
        <pre className="max-h-[600px] overflow-auto rounded-lg bg-muted p-4 font-mono text-sm leading-relaxed">
          <code>{content}</code>
        </pre>
      </div>
    </div>
  );
}
