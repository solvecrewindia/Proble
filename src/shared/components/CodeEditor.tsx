import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Copy, Check, RotateCcw, Code2, Play, Sparkles, Terminal, FileCode, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CodeEditorAnnotation {
    line: number;
    label: string;
    sublabel?: string;
    type?: 'info' | 'todo' | 'color' | 'hint';
    color?: string;
}

interface CodeEditorProps {
    value: string;
    onChange: (value: string) => void;
    language?: string;
    readOnly?: boolean;
    disabled?: boolean;
    fileName?: string;
    breadcrumbs?: string[];
    onReset?: () => void;
    showReset?: boolean;
    onRun?: () => void;
    isRunning?: boolean;
    runButtonText?: string;
    allPassed?: boolean;
    annotations?: CodeEditorAnnotation[];
    className?: string;
    minHeight?: string;
}

// Tokenize Python / TypeScript code into colored syntax spans
function tokenizeLine(lineText: string): React.ReactNode[] {
    if (!lineText) return [' '];

    const tokens: React.ReactNode[] = [];
    let remaining = lineText;
    let keyIdx = 0;

    // Regex for syntax highlighting
    const regex = /(#.*$)|(\bdef\s+[a-zA-Z_]\w*)|(\bclass\s+[a-zA-Z_]\w*)|(f?["'](?:\\.|[^"'\\])*["'])|(\b(?:import|from|as|def|return|if|elif|else|for|in|while|pass|break|continue|try|except|finally|raise|with|lambda|global|and|or|not|is|None|True|False|async|await)\b)|(\b(?:sys|math|print|len|sum|range|float|int|str|list|dict|set|tuple|round|min|max|abs|open|input|enumerate|zip|map|filter|split|strip|splitlines|read|append|stdin|stdout)\b)|(#[0-9a-fA-F]{3,8}\b)|(\b\d+(?:\.\d+)?\b)|([=+\-*/%<>!&|^~:]+)|([a-zA-Z_]\w*)|(\s+)|(.)/g;

    let match;
    while ((match = regex.exec(lineText)) !== null) {
        const [
            full,
            comment,
            funcDef,
            classDef,
            stringLit,
            keyword,
            builtin,
            hexColor,
            numberLit,
            operator,
            identifier,
            whitespace,
            other
        ] = match;

        if (comment) {
            const isTodo = comment.includes('TODO');
            tokens.push(
                <span
                    key={keyIdx++}
                    className={cn(
                        "italic",
                        isTodo ? "text-amber-400 font-bold bg-amber-500/10 px-1 rounded" : "text-neutral-500 dark:text-neutral-400"
                    )}
                >
                    {comment}
                </span>
            );
        } else if (funcDef) {
            const parts = funcDef.split(/\s+/);
            tokens.push(
                <span key={keyIdx++}>
                    <span className="text-pink-400 font-semibold">{parts[0]}</span>
                    {' '}
                    <span className="text-yellow-300 font-bold">{parts[1]}</span>
                </span>
            );
        } else if (classDef) {
            const parts = classDef.split(/\s+/);
            tokens.push(
                <span key={keyIdx++}>
                    <span className="text-pink-400 font-semibold">{parts[0]}</span>
                    {' '}
                    <span className="text-cyan-300 font-bold">{parts[1]}</span>
                </span>
            );
        } else if (stringLit) {
            tokens.push(
                <span key={keyIdx++} className="text-emerald-400">
                    {stringLit}
                </span>
            );
        } else if (keyword) {
            tokens.push(
                <span key={keyIdx++} className="text-pink-400 font-semibold">
                    {keyword}
                </span>
            );
        } else if (builtin) {
            tokens.push(
                <span key={keyIdx++} className="text-cyan-400">
                    {builtin}
                </span>
            );
        } else if (hexColor) {
            // Hex color code with preview swatch (like in user screenshot!)
            tokens.push(
                <span key={keyIdx++} className="inline-flex items-center gap-1 text-purple-300 font-mono">
                    <span
                        className="inline-block w-2.5 h-2.5 rounded-full border border-white/20 shrink-0 shadow-sm"
                        style={{ backgroundColor: hexColor }}
                    />
                    <span>{hexColor}</span>
                </span>
            );
        } else if (numberLit) {
            tokens.push(
                <span key={keyIdx++} className="text-amber-300 font-mono">
                    {numberLit}
                </span>
            );
        } else if (operator) {
            tokens.push(
                <span key={keyIdx++} className="text-sky-300">
                    {operator}
                </span>
            );
        } else if (identifier) {
            tokens.push(
                <span key={keyIdx++} className="text-neutral-200">
                    {identifier}
                </span>
            );
        } else if (whitespace) {
            tokens.push(
                <span key={keyIdx++}>{whitespace}</span>
            );
        } else {
            tokens.push(
                <span key={keyIdx++} className="text-neutral-300">{other}</span>
            );
        }
    }

    return tokens.length > 0 ? tokens : [' '];
}

export function CodeEditor({
    value,
    onChange,
    language = 'python',
    readOnly = false,
    disabled = false,
    fileName = 'solution.py',
    breadcrumbs,
    onReset,
    showReset = true,
    onRun,
    isRunning = false,
    runButtonText = 'Run & Test Code',
    allPassed = false,
    annotations = [],
    className,
    minHeight = '340px'
}: CodeEditorProps) {
    const [copied, setCopied] = useState(false);
    const [cursorPosition, setCursorPosition] = useState({ line: 1, col: 1 });
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const highlightRef = useRef<HTMLDivElement>(null);
    const gutterRef = useRef<HTMLDivElement>(null);

    // Compute lines array
    const lines = useMemo(() => value.split('\n'), [value]);
    const lineCount = Math.max(1, lines.length);

    // Sync scroll between textarea, syntax highlight layer, and line number gutter
    const handleScroll = useCallback(() => {
        if (!textareaRef.current) return;
        const { scrollTop, scrollLeft } = textareaRef.current;
        if (highlightRef.current) {
            highlightRef.current.scrollTop = scrollTop;
            highlightRef.current.scrollLeft = scrollLeft;
        }
        if (gutterRef.current) {
            gutterRef.current.scrollTop = scrollTop;
        }
    }, []);

    // Update cursor position line & col
    const updateCursor = useCallback(() => {
        if (!textareaRef.current) return;
        const selStart = textareaRef.current.selectionStart || 0;
        const textUpToCursor = value.slice(0, selStart);
        const currentLines = textUpToCursor.split('\n');
        const curLine = currentLines.length;
        const curCol = currentLines[currentLines.length - 1].length + 1;
        setCursorPosition({ line: curLine, col: curCol });
    }, [value]);

    // Handle indentation, tabs, enter key, and auto-pairs
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (readOnly || disabled) return;
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        // 1. Tab Key: Insert 4 spaces or indent
        if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
                // Un-indent current line
                const lineStart = value.lastIndexOf('\n', start - 1) + 1;
                const lineEnd = value.indexOf('\n', start);
                const currentLine = value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd);
                if (currentLine.startsWith('    ')) {
                    const newValue = value.slice(0, lineStart) + currentLine.slice(4) + value.slice(lineEnd === -1 ? value.length : lineEnd);
                    onChange(newValue);
                    setTimeout(() => {
                        textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, start - 4);
                    }, 0);
                }
            } else {
                // Indent 4 spaces
                const newValue = value.slice(0, start) + '    ' + value.slice(end);
                onChange(newValue);
                setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = start + 4;
                }, 0);
            }
            return;
        }

        // 2. Enter Key: Auto-indent to match previous line indentation
        if (e.key === 'Enter') {
            e.preventDefault();
            const lineStart = value.lastIndexOf('\n', start - 1) + 1;
            const currentLine = value.slice(lineStart, start);
            const match = currentLine.match(/^(\s*)/);
            let indent = match ? match[1] : '';

            // If line ends with ':' (Python block), add 4 spaces
            if (currentLine.trimEnd().endsWith(':')) {
                indent += '    ';
            }

            const newValue = value.slice(0, start) + '\n' + indent + value.slice(end);
            onChange(newValue);
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + 1 + indent.length;
                handleScroll();
            }, 0);
            return;
        }

        // 3. Auto-close pairs: (), [], {}, "", ''
        const pairs: Record<string, string> = {
            '(': ')',
            '[': ']',
            '{': '}',
            '"': '"',
            "'": "'"
        };

        if (pairs[e.key] && start === end) {
            e.preventDefault();
            const closeChar = pairs[e.key];
            const newValue = value.slice(0, start) + e.key + closeChar + value.slice(end);
            onChange(newValue);
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + 1;
            }, 0);
            return;
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Auto-discover annotations if none passed: Look for # TODO lines
    const resolvedAnnotations = useMemo(() => {
        if (annotations && annotations.length > 0) return annotations;

        const autoList: CodeEditorAnnotation[] = [];
        lines.forEach((l, idx) => {
            if (l.includes('# TODO:')) {
                const text = l.split('# TODO:')[1]?.trim() || 'Write logic here';
                autoList.push({
                    line: idx + 1,
                    label: text.slice(0, 45) + (text.length > 45 ? '...' : ''),
                    type: 'todo'
                });
            }
        });
        return autoList;
    }, [annotations, lines]);

    const activeBreadcrumb = breadcrumbs || ['src', fileName, `line ${cursorPosition.line}`];

    return (
        <div className={cn(
            "flex flex-col rounded-2xl overflow-hidden border border-neutral-800 bg-[#0d1117] shadow-2xl transition-all",
            className
        )}>
            {/* VS Code Window Title Bar & Tabs */}
            <div className="bg-[#161b22] border-b border-neutral-800/80 px-3 py-2 flex items-center justify-between select-none">
                {/* Left: Window Controls + Tab */}
                <div className="flex items-center gap-3">
                    {/* macOS Dots */}
                    <div className="flex items-center gap-1.5 px-1">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
                        <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
                    </div>

                    {/* Active File Tab */}
                    <div className="flex items-center gap-2 px-3 py-1 bg-[#0d1117] border-t-2 border-t-primary border-x border-neutral-800/80 rounded-t-lg text-xs font-mono text-neutral-200">
                        <span className="text-yellow-400 font-bold">🐍</span>
                        <span className="font-semibold">{fileName}</span>
                        <span className="text-[10px] text-neutral-500 hover:text-neutral-300 cursor-pointer ml-1">×</span>
                    </div>
                </div>

                {/* Right Action Icons */}
                <div className="flex items-center gap-1.5">
                    {showReset && onReset && (
                        <button
                            type="button"
                            onClick={onReset}
                            disabled={disabled || readOnly}
                            title="Reset to starter code"
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors disabled:opacity-40 flex items-center gap-1 text-xs"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span className="text-[11px] hidden sm:inline">Reset</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleCopy}
                        title="Copy code"
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors flex items-center gap-1 text-xs"
                    >
                        {copied ? (
                            <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-[11px] text-emerald-400">Copied</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="text-[11px] hidden sm:inline">Copy</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Breadcrumbs Row */}
            <div className="bg-[#11151d] px-4 py-1.5 border-b border-neutral-800/60 flex items-center justify-between text-[11px] font-mono text-neutral-400">
                <div className="flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-primary" />
                    {activeBreadcrumb.map((crumb, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <span className="text-neutral-600">›</span>}
                            <span className={cn(
                                i === activeBreadcrumb.length - 1 ? "text-neutral-200 font-semibold" : "text-neutral-400 hover:text-neutral-300"
                            )}>
                                {crumb}
                            </span>
                        </React.Fragment>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold font-mono">
                        Python 3.10
                    </span>
                </div>
            </div>

            {/* Editor Body: Gutter + Syntax Layer + Textarea + Floating Annotations */}
            <div
                className="relative flex font-mono text-xs md:text-sm bg-[#0d1117] overflow-hidden"
                style={{ minHeight }}
            >
                {/* Line Numbers Gutter */}
                <div
                    ref={gutterRef}
                    className="w-12 md:w-14 py-3 bg-[#0d1117] text-neutral-600 select-none text-right pr-3 font-mono text-xs md:text-sm leading-6 shrink-0 border-r border-neutral-800/80 overflow-hidden"
                >
                    {Array.from({ length: lineCount }).map((_, i) => {
                        const lineNum = i + 1;
                        const isCurrent = lineNum === cursorPosition.line;
                        const hasAnnotation = resolvedAnnotations.some(a => a.line === lineNum);

                        return (
                            <div
                                key={lineNum}
                                className={cn(
                                    "transition-colors flex items-center justify-end gap-1",
                                    isCurrent ? "text-neutral-200 font-bold" : "hover:text-neutral-400",
                                    hasAnnotation && "text-amber-400 font-semibold"
                                )}
                            >
                                {hasAnnotation && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                                )}
                                <span>{lineNum}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Code Workspace with Background Highlighting & Foreground Input */}
                <div className="relative flex-1 overflow-hidden">
                    {/* Background Syntax Highlight Overlay */}
                    <div
                        ref={highlightRef}
                        className="absolute inset-0 p-3 font-mono text-xs md:text-sm leading-6 pointer-events-none overflow-hidden whitespace-pre font-normal text-neutral-300 select-none"
                    >
                        {lines.map((line, i) => {
                            const isCurrent = (i + 1) === cursorPosition.line;
                            const annot = resolvedAnnotations.find(a => a.line === (i + 1));

                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        "min-h-[1.5rem] relative flex items-center",
                                        isCurrent && "bg-neutral-800/25 rounded"
                                    )}
                                >
                                    <span className="inline-block">{tokenizeLine(line)}</span>

                                    {/* Inlay Connector Line & Floating Tooltip Pill (matching user screenshot!) */}
                                    {annot && (
                                        <div className="ml-4 inline-flex items-center gap-2 pointer-events-auto select-none opacity-90 hover:opacity-100 transition-opacity">
                                            {/* Connector Line */}
                                            <div className="w-6 h-[1px] bg-neutral-600" />
                                            {/* Annotation Badge Pill */}
                                            <div className={cn(
                                                "px-2.5 py-0.5 rounded-md text-[11px] font-mono flex items-center gap-1.5 shadow-md border",
                                                annot.type === 'todo'
                                                    ? "bg-pink-600/90 text-white border-pink-500/40"
                                                    : "bg-neutral-800 text-neutral-200 border-neutral-700"
                                            )}>
                                                <Sparkles className="w-3 h-3 text-white" />
                                                <span className="font-semibold">{annot.label}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Foreground Transparent Editable Textarea */}
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => {
                            onChange(e.target.value);
                            updateCursor();
                        }}
                        onKeyDown={handleKeyDown}
                        onKeyUp={updateCursor}
                        onClick={updateCursor}
                        onScroll={handleScroll}
                        disabled={disabled}
                        readOnly={readOnly}
                        spellCheck="false"
                        autoCapitalize="off"
                        autoComplete="off"
                        autoCorrect="off"
                        className="absolute inset-0 w-full h-full p-3 font-mono text-xs md:text-sm leading-6 bg-transparent text-transparent caret-white resize-none outline-none border-none whitespace-pre overflow-auto font-normal selection:bg-primary/30"
                    />
                </div>
            </div>

            {/* Bottom Status Bar & Action Controls */}
            <div className="bg-[#161b22] border-t border-neutral-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-neutral-400 select-none">
                {/* Left: Cursor position, encoding, spaces */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-primary" />
                        <span className="font-semibold text-neutral-300">Ln {cursorPosition.line}, Col {cursorPosition.col}</span>
                    </div>
                    <span className="hidden sm:inline">Spaces: 4</span>
                    <span className="hidden sm:inline">UTF-8</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        Python 3
                    </span>
                </div>

                {/* Right: Run Code Button */}
                {onRun && (
                    <div className="flex items-center gap-2">
                        {allPassed && (
                            <span className="hidden sm:flex items-center gap-1 text-emerald-400 text-xs font-bold font-sans">
                                <CheckCircle2 className="w-3.5 h-3.5" /> All Tests Passed!
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={onRun}
                            disabled={isRunning || disabled}
                            className={cn(
                                "px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer",
                                isRunning
                                    ? "bg-neutral-800 text-neutral-400 cursor-not-allowed"
                                    : allPassed
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            )}
                        >
                            {isRunning ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Running...</span>
                                </>
                            ) : (
                                <>
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    <span>{runButtonText}</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
