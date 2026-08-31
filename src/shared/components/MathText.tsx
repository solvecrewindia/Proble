import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
    text: string;
    className?: string;
    as?: React.ElementType;
}

// Basic LaTeX document structural parser
const preprocessLatexStructure = (str: string) => {
    if (!str) return '';
    return str
        // Remove document structure
        .replace(/\\documentclass\[.*?\]\{.*?\}/g, '')
        .replace(/\\usepackage(\[.*?\])?\{.*?\}/g, '')
        .replace(/\\begin\{document\}/g, '')
        .replace(/\\end\{document\}/g, '')
        .replace(/\\maketitle/g, '')
        .replace(/\\tableofcontents/g, '')
        .replace(/\\newpage/g, '')
        .replace(/\\title\{.*?\}/g, '')
        .replace(/\\author\{.*?\}/g, '')
        .replace(/\\date\{.*?\}/g, '')
        // Replace sections
        .replace(/\\section\*?\{([^{}]+)\}/g, '<h2 class="text-2xl font-bold mt-8 mb-4 border-b border-neutral-200 dark:border-neutral-800 pb-2">$1</h2>')
        .replace(/\\subsection\*?\{([^{}]+)\}/g, '<h3 class="text-xl font-semibold mt-6 mb-3">$1</h3>')
        // Replace formatting
        .replace(/\\textbf\{([^{}]+)\}/g, '<strong>$1</strong>')
        .replace(/\\textit\{([^{}]+)\}/g, '<em>$1</em>')
        // Replace lists
        .replace(/\\begin\{itemize\}/g, '<ul class="list-disc pl-8 my-4 space-y-2">')
        .replace(/\\end\{itemize\}/g, '</ul>')
        .replace(/\\begin\{enumerate\}/g, '<ol class="list-decimal pl-8 my-4 space-y-2">')
        .replace(/\\end\{enumerate\}/g, '</ol>')
        .replace(/\\item(.*)/g, '<li>$1</li>')
        // Replace alignment
        .replace(/\\begin\{center\}/g, '<div class="text-center my-4">')
        .replace(/\\end\{center\}/g, '</div>')
        // Boxed and text
        .replace(/\\boxed\{([^{}]+)\}/g, '<span class="border border-neutral-300 dark:border-neutral-700 px-2 py-1 rounded">$1</span>')
        // Paragraphs (double newlines)
        .replace(/\n\s*\n/g, '<br/><br/>');
};

/**
 * MathText — renders a string that may contain LaTeX math expressions.
 *
 * Supports:
 *   $$...$$ → block (display) math
 *   $...$   → inline math
 *
 * Anything outside $...$ is rendered as plain text.
 */
export function MathText({ text, className, as: Tag = 'span' }: MathTextProps) {
    const rendered = useMemo(() => {
        if (!text || typeof text !== 'string') return text ?? '';

        // Check for common math starters: $, \[, \(
        if (!text.includes('$') && !text.includes('\\[') && !text.includes('\\(')) {
            // Still run structural parsing
            return null;
        }

        const parts: { type: 'text' | 'math'; content: string; displayMode: boolean }[] = [];
        // Regex that matches $$...$$, $...$, \[...\], \(...\)
        const regex = /\$\$([\s\S]+?)\$\$|\$([^\$\n]+?)\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)/g;

        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(text)) !== null) {
            // Push preceding plain text
            if (match.index > lastIndex) {
                parts.push({ type: 'text', content: text.slice(lastIndex, match.index), displayMode: false });
            }

            const displayContent = match[1] || match[3]; // $$...$$ or \[...\]
            const inlineContent = match[2] || match[4];   // $...$ or \(...\)

            if (displayContent !== undefined) {
                parts.push({ type: 'math', content: displayContent.trim(), displayMode: true });
            } else if (inlineContent !== undefined) {
                parts.push({ type: 'math', content: inlineContent.trim(), displayMode: false });
            }

            lastIndex = regex.lastIndex;
        }

        // Trailing text
        if (lastIndex < text.length) {
            parts.push({ type: 'text', content: text.slice(lastIndex), displayMode: false });
        }

        // If we found no math segments, return null so we just render plain text
        if (parts.every(p => p.type === 'text')) return null;

        return parts;
    }, [text]);

    // Fast path: no math detected — render as plain text
    if (rendered === null) {
        return <Tag className={className} dangerouslySetInnerHTML={{ __html: preprocessLatexStructure(text) }} />;
    }

    // String fallback (empty / non-string)
    if (typeof rendered === 'string') {
        return <Tag className={className}>{rendered}</Tag>;
    }

    return (
        <Tag className={className}>
            {rendered.map((part, i) => {
                if (part.type === 'text') {
                    return <span key={i} dangerouslySetInnerHTML={{ __html: preprocessLatexStructure(part.content) }} />;
                }

                try {
                    const html = katex.renderToString(part.content, {
                        displayMode: part.displayMode,
                        throwOnError: false,
                        strict: false,
                    });

                    return part.displayMode ? (
                        <div
                            key={i}
                            className="katex-display-wrapper my-2"
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    ) : (
                        <span
                            key={i}
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    );
                } catch {
                    // If KaTeX fails to parse, render the raw text
                    return <span key={i}>{part.displayMode ? `$$${part.content}$$` : `$${part.content}$`}</span>;
                }
            })}
        </Tag>
    );
}
