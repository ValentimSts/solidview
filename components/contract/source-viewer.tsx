"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { createHighlighter, type Highlighter, type ThemedToken } from "shiki";
import { Button } from "@/components/ui/button";
import type { ContractSource } from "@/types/contract";

const LINE_LIMIT = 1000;

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: ["solidity", "python"],
    }).catch((err) => {
      highlighterPromise = null; // allow retry on next call
      throw err;
    });
  }
  return highlighterPromise;
}

function getShikiLang(language: string): "solidity" | "python" {
  return language === "Vyper" ? "python" : "solidity";
}

function getShikiTheme(resolvedTheme: string | undefined): string {
  return resolvedTheme === "dark" ? "github-dark" : "github-light";
}

function useHighlightedLines(
  code: string,
  language: string,
): ThemedToken[][] | null {
  const { resolvedTheme } = useTheme();
  const [lines, setLines] = useState<ThemedToken[][] | null>(null);

  const shikiLang = getShikiLang(language);
  const shikiTheme = getShikiTheme(resolvedTheme);

  useEffect(() => {
    let cancelled = false;

    getHighlighter().then((highlighter) => {
      if (cancelled) return;
      const { tokens } = highlighter.codeToTokens(code, {
        lang: shikiLang,
        theme: shikiTheme,
      });
      setLines(tokens);
    });

    return () => {
      cancelled = true;
    };
  }, [code, shikiLang, shikiTheme]);

  return lines;
}

interface SourceViewerProps {
  source: ContractSource;
}

export function SourceViewer({ source }: SourceViewerProps) {
  const fileNames = Object.keys(source.files);
  const [activeFile, setActiveFile] = useState(fileNames[0] || "");
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const expanded = expandedFile === activeFile;

  const content = source.files[activeFile] || "";
  const allLines = useMemo(() => content.split("\n"), [content]);
  const totalLines = allLines.length;
  const isTruncated = totalLines > LINE_LIMIT && !expanded;

  const highlightedLines = useHighlightedLines(content, source.language);
  const visibleTokens = useMemo(() => {
    if (!highlightedLines) return null;
    return isTruncated
      ? highlightedLines.slice(0, LINE_LIMIT)
      : highlightedLines;
  }, [highlightedLines, isTruncated]);

  const visibleLines = isTruncated ? allLines.slice(0, LINE_LIMIT) : allLines;

  if (fileNames.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No source code available.
      </p>
    );
  }

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
        <pre className="max-h-[600px] overflow-auto rounded-lg bg-muted font-mono text-sm leading-relaxed">
          <code>
            <table className="w-full border-collapse">
              <tbody>
                {visibleLines.map((line, index) => (
                  <tr key={index} className="hover:bg-muted-foreground/5">
                    <td
                      className="select-none border-r border-border/50 px-3 py-0 text-right align-top text-muted-foreground/60"
                      style={{ minWidth: "3.5rem" }}
                    >
                      {index + 1}
                    </td>
                    <td className="px-4 py-0 whitespace-pre">
                      {visibleTokens?.[index]
                        ? visibleTokens[index].map((token, i) => (
                            <span key={i} style={{ color: token.color }}>
                              {token.content}
                            </span>
                          ))
                        : line}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </code>
        </pre>
        {isTruncated && (
          <div className="flex justify-center border-t border-border/50 bg-muted rounded-b-lg py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedFile(activeFile)}
            >
              Show all {totalLines.toLocaleString()} lines
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
