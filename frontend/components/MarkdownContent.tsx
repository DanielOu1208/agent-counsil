'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { cn } from '@/lib/utils';

interface MarkdownContentProps {
  children: string;
  className?: string;
}

/**
 * Future-proof rich text renderer supporting:
 * - Markdown (bold, italic, lists, links, etc.)
 * - GFM extensions (tables, strikethrough, task lists)
 * - LaTeX math (inline $...$ and block $$...$$)
 *
 * Safety: disables raw HTML injection by default.
 */
export function MarkdownContent({ children, className }: MarkdownContentProps) {
  return (
    <div className={cn('markdown-content', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        // Security: disallow raw HTML by default
        skipHtml={true}
        components={{
        // Style paragraphs to match existing muted text style
        p: ({ children }) => (
          <p className="text-sm text-muted-foreground leading-relaxed mb-3 last:mb-0">
            {children}
          </p>
        ),
        // Headings
        h1: ({ children }) => (
          <h1 className="text-lg font-semibold text-foreground mb-2 mt-4 first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-semibold text-foreground mb-2 mt-3 first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold text-foreground mb-1 mt-2 first:mt-0">
            {children}
          </h3>
        ),
        // Code blocks - wrap for scrollability
        pre: ({ children }) => (
          <pre className="bg-muted/50 border border-border rounded-md p-3 overflow-x-auto text-xs my-2">
            {children}
          </pre>
        ),
        // Inline code
        code: ({ className, children, ...props }) => {
          // Check if this is inline code (no language class) or code block
          const isInline = !className;
          if (isInline) {
            return (
              <code className="bg-muted/50 px-1.5 py-0.5 rounded text-xs font-mono text-foreground" {...props}>
                {children}
              </code>
            );
          }
          return (
            <code className={cn('font-mono', className)} {...props}>
              {children}
            </code>
          );
        },
        // Links - open in new tab for safety
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {children}
          </a>
        ),
        // Lists
        ul: ({ children }) => (
          <ul className="list-disc list-inside text-sm text-muted-foreground mb-3 space-y-1">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside text-sm text-muted-foreground mb-3 space-y-1">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="text-sm text-muted-foreground">{children}</li>
        ),
        // Blockquote
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic text-muted-foreground my-2">
            {children}
          </blockquote>
        ),
        // Tables
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="min-w-full text-sm border border-border">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted/50">{children}</thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-border">{children}</tbody>
        ),
        tr: ({ children }) => (
          <tr className="border-b border-border last:border-0">{children}</tr>
        ),
        th: ({ children }) => (
          <th className="px-2 py-1 text-left text-xs font-semibold text-foreground">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-2 py-1 text-xs text-muted-foreground">{children}</td>
        ),
        // Horizontal rule
        hr: () => <hr className="border-border my-3" />,
        // Strong and emphasis
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-muted-foreground">{children}</em>
        ),
      }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}