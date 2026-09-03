import { Input } from '../ui/Input';
import { Sparkles, Key, Bot } from 'lucide-react';

export function StepMetadata({ data, update }: any) {
    const isOriginals = data.type === 'originals' || data.settings?.category?.toUpperCase() === 'ORIGINALS' || data.settings?.category?.toUpperCase() === 'PROBLE ORIGINALS';

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-text">Quiz Details</h2>
                <p className="text-sm text-muted">Basic information about the assessment.</p>
            </div>

            <div className="space-y-4">
                <Input
                    label="Quiz Title"
                    placeholder="e.g. Midterm Examination Fall 2024"
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
                                        update({ settings: { ...data.settings, allowedDomain: 'srmist.edu.in' } }); // Default
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
            </div>
        </div>
    );
}
