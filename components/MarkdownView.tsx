"use client";

import React from "react";

interface MarkdownViewProps {
  content: string;
  className?: string;
}

/**
 * Minimalist, safe, and clean Markdown renderer for personal notes.
 * Supports: Headers (#, ##, ###), Code blocks (```), Inline code, Bold, Lists, Quotes, and Links.
 */
export function MarkdownView({ content, className = "" }: MarkdownViewProps) {
  if (!content) return null;

  const lines = content.split("\n");
  const renderedElements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeBlockLang = "";

  const renderInline = (text: string): React.ReactNode => {
    // Process markdown links [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(renderFormatting(text.substring(lastIndex, match.index)));
      }
      parts.push(
        <a
          key={`link-${match.index}`}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-black dark:text-white underline decoration-zinc-400 hover:decoration-black dark:hover:decoration-white font-medium"
        >
          {match[1]}
        </a>
      );
      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(renderFormatting(text.substring(lastIndex)));
    }

    return parts.length > 0 ? parts : renderFormatting(text);
  };

  const renderFormatting = (text: string): React.ReactNode => {
    // Simple inline parser for `code` and **bold**
    const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return tokens.map((token, i) => {
      if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-2xs"
          >
            {token.slice(1, -1)}
          </code>
        );
      }
      if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
        return (
          <strong key={i} className="font-bold text-black dark:text-white">
            {token.slice(2, -2)}
          </strong>
        );
      }
      return token;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        renderedElements.push(
          <div
            key={`code-${i}`}
            className="my-3 p-3.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-mono text-xs overflow-x-auto text-zinc-800 dark:text-zinc-200"
          >
            <pre className="whitespace-pre">{codeBlockLines.join("\n")}</pre>
          </div>
        );
        inCodeBlock = false;
        codeBlockLines = [];
        codeBlockLang = "";
      } else {
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3);
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Headings
    if (line.startsWith("# ")) {
      renderedElements.push(
        <h1 key={i} className="text-base font-bold text-black dark:text-white mt-3 mb-1">
          {renderInline(line.slice(2))}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      renderedElements.push(
        <h2 key={i} className="text-sm font-bold text-black dark:text-white mt-2.5 mb-1">
          {renderInline(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      renderedElements.push(
        <h3 key={i} className="text-xs font-bold text-black dark:text-white mt-2 mb-0.5">
          {renderInline(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith("- [ ] ")) {
      renderedElements.push(
        <div key={i} className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 my-1">
          <input type="checkbox" readOnly checked={false} className="h-3.5 w-3.5 rounded border-zinc-300 pointer-events-none accent-black dark:accent-white" />
          <span>{renderInline(line.slice(6))}</span>
        </div>
      );
    } else if (line.startsWith("- [x] ") || line.startsWith("- [X] ")) {
      renderedElements.push(
        <div key={i} className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 line-through my-1">
          <input type="checkbox" readOnly checked={true} className="h-3.5 w-3.5 rounded border-zinc-300 pointer-events-none accent-black dark:accent-white" />
          <span>{renderInline(line.slice(6))}</span>
        </div>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      renderedElements.push(
        <li key={i} className="ml-4 list-disc text-xs text-zinc-700 dark:text-zinc-300 my-0.5">
          {renderInline(line.slice(2))}
        </li>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)/);
      renderedElements.push(
        <li key={i} className="ml-4 list-decimal text-xs text-zinc-700 dark:text-zinc-300 my-0.5">
          {renderInline(match ? match[2] : line)}
        </li>
      );
    } else if (line.startsWith("> ")) {
      renderedElements.push(
        <blockquote
          key={i}
          className="my-2 pl-3 border-l-2 border-zinc-400 dark:border-zinc-600 text-xs italic text-zinc-600 dark:text-zinc-400"
        >
          {renderInline(line.slice(2))}
        </blockquote>
      );
    } else if (line.trim() === "") {
      renderedElements.push(<div key={i} className="h-2" />);
    } else {
      renderedElements.push(
        <p key={i} className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed my-0.5">
          {renderInline(line)}
        </p>
      );
    }
  }

  // Close any unclosed code block
  if (inCodeBlock && codeBlockLines.length > 0) {
    renderedElements.push(
      <div
        key="code-unclosed"
        className="my-3 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-mono text-xs overflow-x-auto text-zinc-800 dark:text-zinc-200"
      >
        <pre className="whitespace-pre">{codeBlockLines.join("\n")}</pre>
      </div>
    );
  }

  return <div className={`space-y-0.5 ${className}`}>{renderedElements}</div>;
}
