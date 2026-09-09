import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Copy, Check, RotateCcw, Code2, Play, Sparkles, Terminal, FileCode, CheckCircle2, Sun, Moon, FlaskConical } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme } from '../context/ThemeContext';

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
    testCasesCount?: number;
    editorTheme?: 'auto' | 'light' | 'dark';
}

// Tokenize Python / TypeScript code into theme-aware colored syntax spans
function tokenizeLine(lineText: string, isDark: boolean): React.ReactNode[] {
    if (!lineText) return [' '];

    const tokens: React.ReactNode[] = [];
    let keyIdx = 0;

    // Regex for syntax highlighting
    const regex = /(#.*$)|(\bdef\s+[a-zA-Z_]\w*)|(\bclass\s+[a-zA-Z_]\w*)|(f?["'](?:\\.|[^"'\\])*["'])|(\b(?:import|from|as|def|return|if|elif|else|for|in|while|pass|break|continue|try|except|finally|raise|with|lambda|global|and|or|not|is|None|True|False|async|await)\b)|(\b(?:sys|math|print|len|sum|range|float|int|str|list|dict|set|tuple|round|min|max|abs|open|input|enumerate|zip|map|filter|split|strip|splitlines|read|append|stdin|stdout)\b)|(#[0-9a-fA-F]{3,8}\b)|(\b\d+(?:\.\d+)?\b)|([=+\-*/%<>!&|^~:]+)|([a-zA-Z_]\w*)|(\s+)|(.)/g;

    let match;
    while ((match = regex.exec(lineText)) !== null) {
        const [
            ,
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
                        isTodo
                            ? isDark
                                ? "text-amber-400 font-bold bg-amber-500/15 px-1 rounded"
                                : "text-amber-700 font-bold bg-amber-100/90 px-1 rounded"
                            : isDark
                                ? "text-neutral-500"
                                : "text-slate-400"
                    )}
                >
                    {comment}
                </span>
            );
        } else if (funcDef) {
            const parts = funcDef.split(/\s+/);
            tokens.push(
                <span key={keyIdx++}>
                    <span className={isDark ? "text-pink-400 font-semibold" : "text-indigo-600 font-semibold"}>{parts[0]}</span>
                    {' '}
                    <span className={isDark ? "text-yellow-300 font-bold" : "text-blue-600 font-bold"}>{parts[1]}</span>
                </span>
            );
        } else if (classDef) {
            const parts = classDef.split(/\s+/);
            tokens.push(
                <span key={keyIdx++}>
                    <span className={isDark ? "text-pink-400 font-semibold" : "text-indigo-600 font-semibold"}>{parts[0]}</span>
                    {' '}
                    <span className={isDark ? "text-cyan-300 font-bold" : "text-purple-600 font-bold"}>{parts[1]}</span>
                </span>
            );
        } else if (stringLit) {
            tokens.push(
                <span key={keyIdx++} className={isDark ? "text-emerald-400" : "text-emerald-600"}>
                    {stringLit}
                </span>
            );
        } else if (keyword) {
            tokens.push(
                <span key={keyIdx++} className={isDark ? "text-pink-400 font-semibold" : "text-indigo-600 font-semibold"}>
                    {keyword}
                </span>
            );
        } else if (builtin) {
            tokens.push(
                <span key={keyIdx++} className={isDark ? "text-cyan-400 font-medium" : "text-teal-700 font-medium"}>
                    {builtin}
                </span>
            );
        } else if (hexColor) {
            tokens.push(
                <span key={keyIdx++} className="inline-flex items-center gap-1 font-mono">
                    <span
                        className="inline-block w-2.5 h-2.5 rounded-full border border-black/20 dark:border-white/20 shrink-0 shadow-sm"
                        style={{ backgroundColor: hexColor }}
                    />
                    <span className={isDark ? "text-purple-300" : "text-purple-700"}>{hexColor}</span>
                </span>
            );
        } else if (numberLit) {
            tokens.push(
                <span key={keyIdx++} className={cn("font-mono", isDark ? "text-amber-300" : "text-amber-600")}>
                    {numberLit}
                </span>
            );
        } else if (operator) {
            tokens.push(
                <span key={keyIdx++} className={isDark ? "text-sky-300" : "text-slate-600 font-medium"}>
                    {operator}
                </span>
            );
        } else if (identifier) {
            tokens.push(
                <span key={keyIdx++} className={isDark ? "text-neutral-200" : "text-slate-800"}>
                    {identifier}
                </span>
            );
        } else if (whitespace) {
            tokens.push(
                <span key={keyIdx++}>{whitespace}</span>
            );
        } else {
            tokens.push(
                <span key={keyIdx++} className={isDark ? "text-neutral-300" : "text-slate-700"}>{other}</span>
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
    minHeight = '360px',
    testCasesCount,
    editorTheme = 'auto'
}: CodeEditorProps) {
    const { theme: appTheme } = useTheme();

    // Local theme toggle for editor: defaults to app theme, but student can toggle
    const [localTheme, setLocalTheme] = useState<'light' | 'dark' | null>(null);

    const isDark = useMemo(() => {
        if (localTheme) return localTheme === 'dark';
        if (editorTheme === 'dark') return true;
        if (editorTheme === 'light') return false;
        return appTheme === 'dark';
    }, [localTheme, editorTheme, appTheme]);

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
                const text = l.split('# TODO:')[1]?.trim() || 'Implement solution';
                autoList.push({
                    line: idx + 1,
                    label: text.slice(0, 32) + (text.length > 32 ? '...' : ''),
                    type: 'todo'
                });
            }
        });
        return autoList;
    }, [annotations, lines]);

    const activeBreadcrumb = breadcrumbs || ['assessment', fileName, `Ln ${cursorPosition.line}`];

    return (
        <div
            className={cn(
                "w-full flex flex-col rounded-2xl overflow-hidden transition-colors duration-200 border shadow-md",
                isDark
                    ? "bg-[#0d1219] border-neutral-800 text-neutral-200 shadow-xl"
                    : "bg-white border-border text-slate-900 shadow-sm",
                className
            )}
        >
            {/* Header Toolbar: Aligned with Home UI */}
            <div
                className={cn(
                    "px-4 py-2.5 flex items-center justify-between border-b select-none transition-colors",
                    isDark
                        ? "bg-[#141b24] border-neutral-800/90 text-neutral-300"
                        : "bg-surface-highlight border-border text-slate-700"
                )}
            >
                {/* Left: File Badge & Language */}
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-surface text-xs font-mono font-semibold shadow-xs border-border">
                        <Code2 className="w-3.5 h-3.5 text-primary" />
                        <span className="text-text">{fileName}</span>
                    </div>

                    <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-mono font-bold uppercase tracking-wider">
                        Python 3.10
                    </span>
                </div>

                {/* Right Action Icons: Theme Toggle, Reset, Copy */}
                <div className="flex items-center gap-1.5">
                    {/* Editor Theme Toggle */}
                    <button
                        type="button"
                        onClick={() => setLocalTheme(isDark ? 'light' : 'dark')}
                        title={isDark ? "Switch to light editor" : "Switch to dark editor"}
                        className={cn(
                            "p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1",
                            isDark
                                ? "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/70"
                        )}
                    >
                        {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-primary" />}
                    </button>

                    {showReset && onReset && (
                        <button
                            type="button"
                            onClick={onReset}
                            disabled={disabled || readOnly}
                            title="Reset starter code"
                            className={cn(
                                "px-2 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 flex items-center gap-1.5",
                                isDark
                                    ? "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
                            )}
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline text-[11px]">Reset</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleCopy}
                        title="Copy code"
                        className={cn(
                            "px-2 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5",
                            isDark
                                ? "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
                        )}
                    >
                        {copied ? (
                            <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-[11px] text-emerald-500 font-semibold">Copied</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline text-[11px]">Copy</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Breadcrumb Path Bar */}
            <div
                className={cn(
                    "px-4 py-1.5 border-b flex items-center justify-between text-[11px] font-mono select-none transition-colors",
                    isDark
                        ? "bg-[#10151f] border-neutral-800/60 text-neutral-400"
                        : "bg-slate-50 border-border text-slate-500"
                )}
            >
                <div className="flex items-center gap-1.5 overflow-hidden">
                    <FileCode className="w-3.5 h-3.5 text-primary shrink-0" />
                    {activeBreadcrumb.map((crumb, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <span className="opacity-40">/</span>}
                            <span className={cn(
                                "truncate",
                                i === activeBreadcrumb.length - 1
                                    ? isDark ? "text-neutral-200 font-semibold" : "text-slate-800 font-semibold"
                                    : "opacity-80"
                            )}>
                                {crumb}
                            </span>
                        </React.Fragment>
                    ))}
                </div>

                {testCasesCount !== undefined && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                        <FlaskConical className="w-3 h-3" />
                        <span>{testCasesCount} Test Cases</span>
                    </div>
                )}
            </div>

            {/* Editor Workspace: Gutter + Syntax Layer + Textarea */}
            <div
                className={cn(
                    "relative flex font-mono text-xs md:text-sm overflow-hidden",
                    isDark ? "bg-[#0d1219]" : "bg-white"
                )}
                style={{ minHeight }}
            >
                {/* Line Numbers Gutter */}
                <div
                    ref={gutterRef}
                    className={cn(
                        "w-12 md:w-14 py-3 select-none text-right pr-3 font-mono text-xs md:text-sm leading-6 shrink-0 border-r overflow-hidden transition-colors",
                        isDark
                            ? "bg-[#0d1219] border-neutral-800/80 text-neutral-600"
                            : "bg-[#f8fafc] border-border text-slate-400"
                    )}
                >
                    {Array.from({ length: lineCount }).map((_, i) => {
                        const lineNum = i + 1;
                        const isCurrent = lineNum === cursorPosition.line;
                        const hasAnnotation = resolvedAnnotations.some(a => a.line === lineNum);

                        return (
                            <div
                                key={lineNum}
                                className={cn(
                                    "transition-colors flex items-center justify-end gap-1 h-6",
                                    isCurrent
                                        ? isDark
                                            ? "text-primary font-bold"
                                            : "text-primary font-bold"
                                        : isDark
                                            ? "hover:text-neutral-400"
                                            : "hover:text-slate-600",
                                    hasAnnotation && "text-amber-500 font-semibold"
                                )}
                            >
                                {hasAnnotation && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0" />
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
                        className={cn(
                            "absolute inset-0 p-3 font-mono text-xs md:text-sm leading-6 pointer-events-none overflow-hidden whitespace-pre font-normal select-none",
                            isDark ? "text-neutral-200" : "text-slate-800"
                        )}
                        style={{ tabSize: 4 }}
                    >
                        {lines.map((line, i) => {
                            const isCurrent = (i + 1) === cursorPosition.line;
                            const annot = resolvedAnnotations.find(a => a.line === (i + 1));

                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        "h-6 relative flex items-center justify-between",
                                        isCurrent && (isDark ? "bg-neutral-800/40 rounded" : "bg-primary/5 rounded")
                                    )}
                                >
                                    <span className="inline-block">{tokenizeLine(line, isDark)}</span>

                                    {/* Non-Clipping Inlay Annotation Pill */}
                                    {annot && (
                                        <div className="ml-4 shrink-0 inline-flex items-center gap-1.5 pointer-events-none select-none max-w-[180px] sm:max-w-[240px] truncate">
                                            <div
                                                className={cn(
                                                    "px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center gap-1 border shadow-xs truncate",
                                                    annot.type === 'todo'
                                                        ? isDark
                                                            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                                            : "bg-amber-100 text-amber-800 border-amber-300"
                                                        : isDark
                                                            ? "bg-primary/20 text-primary border-primary/30"
                                                            : "bg-primary/10 text-primary border-primary/20"
                                                )}
                                            >
                                                <Sparkles className="w-2.5 h-2.5 shrink-0" />
                                                <span className="font-semibold truncate">{annot.label}</span>
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
                        style={{ tabSize: 4 }}
                        className={cn(
                            "absolute inset-0 w-full h-full p-3 font-mono text-xs md:text-sm leading-6 bg-transparent text-transparent resize-none outline-none border-none whitespace-pre overflow-auto font-normal selection:bg-primary/25 custom-scrollbar",
                            isDark ? "caret-white" : "caret-slate-900"
                        )}
                    />
                </div>
            </div>

            {/* Bottom Status Bar & Action Controls */}
            <div
                className={cn(
                    "border-t px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono select-none transition-colors",
                    isDark
                        ? "bg-[#141b24] border-neutral-800 text-neutral-400"
                        : "bg-surface-highlight border-border text-slate-600"
                )}
            >
                {/* Left: Cursor position, encoding, spaces */}
                <div className="flex items-center gap-3 md:gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-primary" />
                        <span className={cn("font-semibold", isDark ? "text-neutral-200" : "text-slate-800")}>
                            Ln {cursorPosition.line}, Col {cursorPosition.col}
                        </span>
                    </div>
                    <span className="hidden sm:inline opacity-70">Spaces: 4</span>
                    <span className="hidden sm:inline opacity-70">UTF-8</span>
                    <span className="text-emerald-500 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Python 3
                    </span>
                </div>

                {/* Right: Run Code Button & Pass Notification */}
                {onRun && (
                    <div className="flex items-center gap-2 ml-auto">
                        {allPassed && (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold font-sans">
                                <CheckCircle2 className="w-4 h-4" /> All Passed
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={onRun}
                            disabled={isRunning || disabled}
                            className={cn(
                                "px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                                isRunning
                                    ? "bg-slate-300 dark:bg-neutral-800 text-slate-500 cursor-not-allowed"
                                    : allPassed
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                                        : "bg-primary hover:bg-primary-600 text-white shadow-primary/25"
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
