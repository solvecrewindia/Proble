import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { 
    Sparkles, Key, Bot, Layers, Users, Mail, CheckCircle2, 
    Search, Trash2, Hash, BookOpen, AlertCircle, ArrowRight, 
    HelpCircle, Code2, ListOrdered
} from 'lucide-react';
import { cn } from '../../lib/utils';

// SRMIST student class list provided for live coding exams
const SRMIST_CLASS_EMAILS = [
    "pp1480@srmist.edu.in", "kr7949@srmist.edu.in", "gr3323@srmist.edu.in", "lk4885@srmist.edu.in",
    "sm1398@srmist.edu.in", "vs0214@srmist.edu.in", "as6545@srmist.edu.in", "ls1881@srmist.edu.in",
    "ms0541@srmist.edu.in", "tv2157@srmist.edu.in", "mm6377@srmist.edu.in", "pd2935@srmist.edu.in",
    "ub6511@srmist.edu.in", "ns1921@srmist.edu.in", "ar1113@srmist.edu.in", "gs4466@srmist.edu.in",
    "nv4942@srmist.edu.in", "ss9414@srmist.edu.in", "sj5726@srmist.edu.in", "sk4206@srmist.edu.in",
    "sb4582@srmist.edu.in", "nn8173@srmist.edu.in", "sl2827@srmist.edu.in", "ab7083@srmist.edu.in",
    "vb6028@srmist.edu.in", "as0267@srmist.edu.in", "lt9886@srmist.edu.in", "mh3040@srmist.edu.in",
    "hs7408@srmist.edu.in", "pj5088@srmist.edu.in", "gd1628@srmist.edu.in", "mn6742@srmist.edu.in",
    "vj0234@srmist.edu.in", "mh3277@srmist.edu.in", "tm7648@srmist.edu.in", "as1249@srmist.edu.in",
    "mb9299@srmist.edu.in", "cj9122@srmist.edu.in", "ar4764@srmist.edu.in", "ma8546@srmist.edu.in",
    "as8900@srmist.edu.in", "py1922@srmist.edu.in", "yt0479@srmist.edu.in", "na8288@srmist.edu.in",
    "sb5608@srmist.edu.in", "hj1830@srmist.edu.in", "aa5147@srmist.edu.in", "vp0519@srmist.edu.in",
    "ps8473@srmist.edu.in", "du3796@srmist.edu.in", "md9539@srmist.edu.in", "au3887@srmist.edu.in",
    "nb3358@srmist.edu.in", "jb4335@srmist.edu.in", "aa4617@srmist.edu.in", "nn2287@srmist.edu.in",
    "mb5486@srmist.edu.in", "pk8447@srmist.edu.in", "ag8389@srmist.edu.in", "ma8053@srmist.edu.in",
    "ts2682@srmist.edu.in", "em2424@srmist.edu.in"
];

export function StepMetadata({ data, update, questions }: any) {
    const isOriginals = data.type === 'originals' || data.settings?.category?.toUpperCase() === 'ORIGINALS' || data.settings?.category?.toUpperCase() === 'PROBLE ORIGINALS';
    
    // As explicitly requested: Sets section applies only in Live Tests / Coding Tests
    const isLiveTest = data.type === 'live' || Boolean(data.settings?.isLive) || Boolean(data.settings?.isCodingTest);

    // Sets configuration state
    const setsConfig = data.settings?.setsConfig || {};
    const setsEnabled = setsConfig.enabled ?? true;
    const questionsPerStudent = Number(setsConfig.questionsPerStudent) > 0 ? Number(setsConfig.questionsPerStudent) : 2;
    const totalQuestions = Number(setsConfig.totalQuestions) > 0 ? Number(setsConfig.totalQuestions) : (questions && questions.length > 0 ? questions.length : 10);
    const rawEmails = typeof setsConfig.rawEmails === 'string' ? setsConfig.rawEmails : '';

    const [searchTerm, setSearchTerm] = useState('');

    // Extract valid emails from any text
    const extractedEmails = useMemo(() => {
        if (!rawEmails) return [];
        const matches = rawEmails.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        return Array.from(new Set(matches.map(e => e.trim().toLowerCase())));
    }, [rawEmails]);

    // Compute sequential mapping: Student 1 -> Q1-Q2, Student 2 -> Q3-Q4, etc.
    const computedMappings = useMemo(() => {
        if (extractedEmails.length === 0 || questionsPerStudent <= 0 || totalQuestions <= 0) return [];
        const numSets = Math.max(1, Math.ceil(totalQuestions / questionsPerStudent));

        return extractedEmails.map((email, idx) => {
            const setIndex = idx % numSets;
            const startQ = setIndex * questionsPerStudent + 1;
            const endQ = Math.min(totalQuestions, (setIndex + 1) * questionsPerStudent);
            const startIndex = setIndex * questionsPerStudent;
            const endIndex = endQ - 1;
            const setNumber = setIndex + 1;
            const setName = `Set ${setNumber}`;

            return {
                email,
                studentIndex: idx,
                setNumber,
                setName,
                startQuestion: startQ,
                endQuestion: endQ,
                startIndex,
                endIndex,
                questionCount: Math.max(0, endQ - startQ + 1)
            };
        });
    }, [extractedEmails, questionsPerStudent, totalQuestions]);

    // Keep settings in sync whenever inputs change
    const updateSets = (updates: Partial<typeof setsConfig>) => {
        const nextEnabled = updates.enabled !== undefined ? updates.enabled : setsEnabled;
        const nextQPerStudent = updates.questionsPerStudent !== undefined ? Number(updates.questionsPerStudent) : questionsPerStudent;
        const nextTotalQ = updates.totalQuestions !== undefined ? Number(updates.totalQuestions) : totalQuestions;
        const nextRawEmails = updates.rawEmails !== undefined ? updates.rawEmails : rawEmails;

        // Recompute mappings for next state
        const emails = (nextRawEmails.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])
            .map((e: string) => e.trim().toLowerCase());
        const dedupedEmails = Array.from(new Set(emails));
        const numSets = Math.max(1, Math.ceil(nextTotalQ / nextQPerStudent));

        const mappings = dedupedEmails.map((email: string, idx: number) => {
            const setIndex = idx % numSets;
            const startQ = setIndex * nextQPerStudent + 1;
            const endQ = Math.min(nextTotalQ, (setIndex + 1) * nextQPerStudent);
            const startIndex = setIndex * nextQPerStudent;
            const endIndex = endQ - 1;
            const setNumber = setIndex + 1;
            const setName = `Set ${setNumber}`;

            return {
                email,
                studentIndex: idx,
                setNumber,
                setName,
                startQuestion: startQ,
                endQuestion: endQ,
                startIndex,
                endIndex,
                questionCount: Math.max(0, endQ - startQ + 1)
            };
        });

        update({
            settings: {
                ...data.settings,
                isCodingTest: true,
                setsConfig: {
                    enabled: nextEnabled,
                    questionsPerStudent: nextQPerStudent,
                    totalQuestions: nextTotalQ,
                    rawEmails: nextRawEmails,
                    mappings
                }
            }
        });
    };

    // Auto-sync totalQuestions if questions array has actual questions
    useEffect(() => {
        if (questions && questions.length > 0 && questions.length !== totalQuestions) {
            updateSets({ totalQuestions: questions.length });
        }
    }, [questions?.length]);

    // Filter preview list
    const filteredMappings = useMemo(() => {
        if (!searchTerm.trim()) return computedMappings;
        const s = searchTerm.toLowerCase();
        return computedMappings.filter(m => 
            m.email.toLowerCase().includes(s) || 
            m.setName.toLowerCase().includes(s) ||
            String(m.studentIndex + 1).includes(s)
        );
    }, [computedMappings, searchTerm]);

    const numSets = Math.max(1, Math.ceil(totalQuestions / questionsPerStudent));

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-text">Quiz Details</h2>
                <p className="text-sm text-muted">Basic information about the assessment.</p>
            </div>

            <div className="space-y-4">
                <Input
                    label="Quiz Title"
                    placeholder="e.g. SRMIST Live Coding Test Fall 2024"
                    value={data.title || ''}
                    onChange={(e) => update({ title: e.target.value })}
                />

                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text">Description</label>
                    <textarea
                        className="flex min-h-[100px] w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-background px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-text"
                        placeholder="Enter instructions or description..."
                        value={data.description || ''}
                        onChange={(e) => update({ description: e.target.value })}
                    />
                </div>

                {/* Proble Originals Evaluation Mode Selector */}
                {isOriginals && (
                    <div className="p-4 rounded-2xl border-2 border-primary/20 bg-primary/5 dark:bg-primary/10 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-primary text-white shadow-sm">
                                    {data.settings?.useKeywords ? <Key className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-text flex items-center gap-2">
                                        {data.settings?.useKeywords ? 'Manual Keyword Matching' : 'AI Reason Evaluation (Automated)'}
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-primary/20 text-primary">
                                            Proble Originals Only
                                        </span>
                                    </h4>
                                    <p className="text-xs text-muted">
                                        {data.settings?.useKeywords
                                            ? 'Admin provides required keywords per question. System checks if student reasoning contains keywords.'
                                            : 'AI evaluates student answers and reasoning upon test submission, awarding full/half marks. No keywords required.'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-background dark:bg-neutral-800/80 p-1.5 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700">
                                <span className="text-xs font-semibold text-muted">Use Keywords</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.settings?.useKeywords || false}
                                        onChange={(e) => update({
                                            settings: {
                                                ...data.settings,
                                                useKeywords: e.target.checked,
                                                evaluationMode: e.target.checked ? 'keywords' : 'ai'
                                            }
                                        })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>
                        </div>

                        {!data.settings?.useKeywords ? (
                            <div className="flex items-center gap-2 text-[11px] text-primary/80 bg-primary/10 rounded-lg p-2.5 font-medium">
                                <Bot className="w-4 h-4 shrink-0" />
                                <span>AI evaluation is active. In question creation, you do not need to provide keywords. Students will be asked to justify their answers, and AI will evaluate the quality of their explanations.</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg p-2.5 font-medium">
                                <Key className="w-4 h-4 shrink-0" />
                                <span>Keyword mode is active. Remember to specify required keywords for questions in the Questions step.</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Toggles configuration */}
                <div className="flex flex-wrap gap-6 items-center">
                    {/* Allow Retakes - Only for Global Tests */}
                    {data.type !== 'master' && (
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={data.settings?.allowRetake || false}
                                onChange={(e) => update({
                                    settings: { ...data.settings, allowRetake: e.target.checked }
                                })}
                                className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 bg-background text-primary focus:ring-primary"
                            />
                            <span className="text-sm font-medium text-text">Allow Retakes</span>
                        </label>
                    )}

                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={data.settings?.showPercentage ?? true}
                            onChange={(e) => update({
                                settings: { ...data.settings, showPercentage: e.target.checked }
                            })}
                            className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 bg-background text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-text">Show Score/Percentage</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={data.settings?.showAnswers ?? true}
                            onChange={(e) => update({
                                settings: { ...data.settings, showAnswers: e.target.checked }
                            })}
                            className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 bg-background text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-text">Show Correct Answers</span>
                    </label>

                    {/* Organization Restriction */}
                    <div className="space-y-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={!!data.settings?.allowedDomain}
                                onChange={(e) => {
                                    if (!e.target.checked) {
                                        update({ settings: { ...data.settings, allowedDomain: null } });
                                    } else {
                                        update({ settings: { ...data.settings, allowedDomain: 'srmist.edu.in' } });
                                    }
                                }}
                                className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 bg-background text-primary focus:ring-primary"
                            />
                            <span className="text-sm font-medium text-text">Restrict to Organization</span>
                        </label>

                        {data.settings?.allowedDomain && (
                            <div className="ml-6 py-2 px-3 bg-blue-500/10 border border-blue-500/20 rounded-lg animate-in slide-in-from-top-2 duration-200">
                                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                    Restricted to: <span className="font-bold">srmist.edu.in</span>
                                </p>
                                <p className="text-xs text-muted mt-1">Only students with an institutional SRMIST email can join.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* QUESTION SETS SECTION - ONLY IN LIVE TEST / CODING TEST                   */}
                {/* ========================================================================= */}
                {isLiveTest && (
                    <div className="mt-8 pt-6 border-t-2 border-neutral-200 dark:border-neutral-800 space-y-6">
                        {/* Section Card */}
                        <div className="p-6 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-surface to-surface dark:from-primary/10 dark:via-surface dark:to-surface shadow-sm space-y-6">
                            
                            {/* Section Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-700/60">
                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 rounded-xl bg-primary text-white shadow-md">
                                        <Layers className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2.5">
                                            <h3 className="text-lg font-bold text-text">Question Sets (Coding Test)</h3>
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                                                <Code2 className="w-3 h-3" /> Live Test Only
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted mt-0.5">
                                            Divide questions into sets. Student 1 gets Q1–Q2, Student 2 gets Q3–Q4, etc.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-background dark:bg-neutral-800 p-2 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shrink-0">
                                    <span className="text-xs font-bold text-text">Enable Sets</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={setsEnabled}
                                            onChange={(e) => updateSets({ enabled: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>
                            </div>

                            {setsEnabled && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    {/* Grid for Box 1 (Division) and Box 2 (Emails) */}
                                    <div className="grid md:grid-cols-2 gap-6">
                                        
                                        {/* BOX 1: DIVIDE THE QUESTIONS */}
                                        <div className="p-5 rounded-xl bg-surface border border-neutral-200 dark:border-neutral-700 space-y-4 shadow-sm">
                                            <div className="flex items-center gap-2 pb-2 border-b border-neutral-200 dark:border-neutral-700">
                                                <ListOrdered className="w-4 h-4 text-primary" />
                                                <h4 className="text-sm font-bold text-text">1. Divide the Questions</h4>
                                            </div>

                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs font-semibold text-text mb-1 block">
                                                        Questions per Student / Set
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={totalQuestions}
                                                            value={questionsPerStudent}
                                                            onChange={(e) => updateSets({ questionsPerStudent: Math.max(1, parseInt(e.target.value) || 1) })}
                                                            className="w-24 h-10 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-background px-3 text-center font-bold text-base text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                        />
                                                        <span className="text-xs text-muted">questions per person</span>
                                                    </div>
                                                </div>

                                                {/* Preset Quick Chips */}
                                                <div className="flex items-center gap-1.5 pt-1">
                                                    <span className="text-[11px] text-muted">Presets:</span>
                                                    {[1, 2, 3, 4, 5].map((count) => (
                                                        <button
                                                            key={count}
                                                            type="button"
                                                            onClick={() => updateSets({ questionsPerStudent: count })}
                                                            className={cn(
                                                                "px-2.5 py-1 text-xs rounded-lg font-semibold transition-all",
                                                                questionsPerStudent === count
                                                                    ? "bg-primary text-white shadow-sm"
                                                                    : "bg-neutral-100 dark:bg-neutral-800 text-text hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                                            )}
                                                        >
                                                            {count} Q{count > 1 ? 's' : ''}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Total Questions in Quiz */}
                                                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-xs font-semibold text-text">
                                                            Total Quiz Questions
                                                        </label>
                                                        {questions && questions.length > 0 && (
                                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                                Synced from Questions Step ({questions.length})
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            value={totalQuestions}
                                                            onChange={(e) => updateSets({ totalQuestions: Math.max(1, parseInt(e.target.value) || 1) })}
                                                            className="w-24 h-10 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-background px-3 text-center font-bold text-base text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                        />
                                                        <span className="text-xs text-muted">total questions across all sets</span>
                                                    </div>
                                                </div>

                                                {/* Calculated Math Banner */}
                                                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs space-y-1">
                                                    <p className="font-bold text-primary flex items-center gap-1.5">
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                        {totalQuestions} Questions ÷ {questionsPerStudent} per Student = {numSets} Sets Created
                                                    </p>
                                                    <p className="text-[11px] text-muted leading-tight">
                                                        Each set contains {questionsPerStudent} question(s). When mapped sequentially, Student 1 gets Q1–Q{Math.min(totalQuestions, questionsPerStudent)}, Student 2 gets Q{questionsPerStudent + 1}–Q{Math.min(totalQuestions, questionsPerStudent * 2)}, etc.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* BOX 2: ADD THE EMAIL AS TEXT */}
                                        <div className="p-5 rounded-xl bg-surface border border-neutral-200 dark:border-neutral-700 space-y-4 shadow-sm flex flex-col">
                                            <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-700">
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-4 h-4 text-primary" />
                                                    <h4 className="text-sm font-bold text-text">2. Add Student Emails</h4>
                                                </div>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-xs font-bold font-mono",
                                                    extractedEmails.length > 0 
                                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                                                        : "bg-neutral-100 dark:bg-neutral-800 text-muted"
                                                )}>
                                                    {extractedEmails.length} student{extractedEmails.length === 1 ? '' : 's'}
                                                </span>
                                            </div>

                                            <div className="space-y-2 flex-1 flex flex-col">
                                                <textarea
                                                    className="w-full flex-1 min-h-[120px] rounded-xl border border-neutral-300 dark:border-neutral-600 bg-background p-3 text-xs font-mono placeholder:text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-text resize-y custom-scrollbar"
                                                    placeholder="Paste student emails (one per line, comma-separated, or paste registration lists like RA... - email@srmist.edu.in)..."
                                                    value={rawEmails}
                                                    onChange={(e) => updateSets({ rawEmails: e.target.value })}
                                                />

                                                {/* Fast Action Buttons */}
                                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateSets({ rawEmails: SRMIST_CLASS_EMAILS.join('\n') })}
                                                            className="px-2.5 py-1 text-xs rounded-lg font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition-all flex items-center gap-1"
                                                        >
                                                            <Users className="w-3.5 h-3.5" /> Load SRMIST Class (62 Students)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateSets({ 
                                                                rawEmails: SRMIST_CLASS_EMAILS.slice(0, 5).join('\n'),
                                                                questionsPerStudent: 2,
                                                                totalQuestions: 10
                                                            })}
                                                            className="px-2.5 py-1 text-xs rounded-lg font-medium bg-neutral-100 dark:bg-neutral-800 text-text hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                                                        >
                                                            Demo (5 Students / 10 Qs)
                                                        </button>
                                                    </div>

                                                    {rawEmails.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => updateSets({ rawEmails: '' })}
                                                            className="px-2 py-1 text-xs rounded-lg text-red-500 hover:bg-red-500/10 transition-all flex items-center gap-1"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" /> Clear
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* BOX 3: LIVE SETS DISTRIBUTION PREVIEW */}
                                    <div className="p-5 rounded-xl bg-surface border border-neutral-200 dark:border-neutral-700 space-y-4 shadow-sm">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-700">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-primary" />
                                                <h4 className="text-sm font-bold text-text">3. Live Sets Distribution Preview</h4>
                                                <span className="text-xs text-muted">
                                                    ({computedMappings.length} mappings generated)
                                                </span>
                                            </div>

                                            {/* Search Filter for Mapping Preview */}
                                            {computedMappings.length > 5 && (
                                                <div className="relative w-full sm:w-64">
                                                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search student email or set..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-neutral-300 dark:border-neutral-600 bg-background text-text focus:outline-none focus:border-primary"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {computedMappings.length === 0 ? (
                                            <div className="p-8 text-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-850/50 space-y-2">
                                                <Mail className="w-8 h-8 mx-auto text-muted opacity-40" />
                                                <p className="text-sm font-semibold text-text">No student emails added yet</p>
                                                <p className="text-xs text-muted max-w-sm mx-auto">
                                                    Paste student emails in Box 2 or click "Load SRMIST Class" to generate the question set distribution automatically.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {/* Summary Stats Badges */}
                                                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                                                    <span className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
                                                        <Users className="w-3.5 h-3.5" /> {extractedEmails.length} Students
                                                    </span>
                                                    <span className="px-3 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1.5">
                                                        <Layers className="w-3.5 h-3.5" /> {numSets} Sets Created
                                                    </span>
                                                    <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                                                        <Hash className="w-3.5 h-3.5" /> {questionsPerStudent} Questions / Student
                                                    </span>
                                                    <span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                                                        <BookOpen className="w-3.5 h-3.5" /> {totalQuestions} Total Questions
                                                    </span>
                                                </div>

                                                {/* Mapping Table */}
                                                <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden max-h-[360px] overflow-y-auto custom-scrollbar">
                                                    <table className="w-full text-left text-xs border-collapse">
                                                        <thead className="bg-neutral-100 dark:bg-neutral-800 text-muted font-bold sticky top-0 z-10 border-b border-neutral-200 dark:border-neutral-700">
                                                            <tr>
                                                                <th className="py-2.5 px-3 w-14 text-center">#</th>
                                                                <th className="py-2.5 px-4">Student Email</th>
                                                                <th className="py-2.5 px-4">Assigned Set</th>
                                                                <th className="py-2.5 px-4">Question Range</th>
                                                                <th className="py-2.5 px-4 text-right">Question Count</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700/60 bg-surface">
                                                            {filteredMappings.map((m) => (
                                                                <tr key={m.email} className="hover:bg-neutral-50 dark:hover:bg-neutral-850/50 transition-colors">
                                                                    <td className="py-2.5 px-3 text-center font-bold text-muted">
                                                                        {m.studentIndex + 1}
                                                                    </td>
                                                                    <td className="py-2.5 px-4 font-mono font-medium text-text">
                                                                        {m.email}
                                                                    </td>
                                                                    <td className="py-2.5 px-4">
                                                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                                                                            {m.setName}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-2.5 px-4 font-mono font-semibold text-text">
                                                                        Question {m.startQuestion} – {m.endQuestion}
                                                                    </td>
                                                                    <td className="py-2.5 px-4 text-right">
                                                                        <span className="text-muted font-medium">
                                                                            {m.questionCount} {m.questionCount === 1 ? 'question' : 'questions'}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {filteredMappings.length < computedMappings.length && (
                                                    <p className="text-[11px] text-muted text-right">
                                                        Showing {filteredMappings.length} of {computedMappings.length} students
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
