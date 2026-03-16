import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
    text: string;
    className?: string;
    as?: React.ElementType;
}

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

        // Quick check: if there's no $ in the string, skip parsing entirely
        if (!text.includes('$')) return null;

        const parts: { type: 'text' | 'math'; content: string; displayMode: boolean }[] = [];
        // Regex that matches $$...$$ (display) or $...$ (inline)
        // Uses a non-greedy match and ensures we don't match empty $$ pairs
        const regex = /\$\$([\s\S]+?)\$\$|\$([^\$\n]+?)\$/g;

        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(text)) !== null) {
            // Push preceding plain text
            if (match.index > lastIndex) {
                parts.push({ type: 'text', content: text.slice(lastIndex, match.index), displayMode: false });
            }

            const displayContent = match[1]; // $$...$$ capture
            const inlineContent = match[2];   // $...$  capture

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
        return <Tag className={className}>{text}</Tag>;
    }

    // String fallback (empty / non-string)
    if (typeof rendered === 'string') {
        return <Tag className={className}>{rendered}</Tag>;
    }

    return (
        <Tag className={className}>
            {rendered.map((part, i) => {
                if (part.type === 'text') {
                    return <span key={i}>{part.content}</span>;
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
