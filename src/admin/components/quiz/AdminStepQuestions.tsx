import { useState, useEffect } from 'react';
import { StepQuestions } from '../../../faculty/components/quiz/StepQuestions';
import { cn } from '../../../faculty/lib/utils'; // Adjust import path

export function AdminStepQuestions({ data, questions, setQuestions, quizId }: any) {
    // We need to manage two sets of questions if both modes are enabled
    const modes = data.settings?.modes || ['practice'];
    const isMultiMode = modes.includes('practice') && modes.includes('mock_test');

    const [activeTab, setActiveTab] = useState<'practice' | 'mock'>(() => {
        if (!isMultiMode && modes.includes('mock_test')) return 'mock';
        return 'practice';
    });


    // Filter questions by tag for display, but we need to sync back to the main list
    // This is tricky because StepQuestions expects a simple list.
    // Better approach: Maintain the main list in AdminQuizCreate, but here we filter what we pass to StepQuestions
    // and when StepQuestions updates, we merge it back.

    // However, StepQuestions is distinct. Let's try to simulate separate storage in the parent if possible, 
    // or just filter here.

    // Actually, AdminQuizCreate holds `questions` state. 
    // Let's assume `questions` objects have a `tags` property.

    // If we haven't migrated existing questions, they have no tags.
    // We treat untagged as 'practice' default or 'shared' if we wanted, but request is "separate".

    const [practiceQuestions, setPracticeQuestions] = useState<any[]>([]);
    const [mockQuestions, setMockQuestions] = useState<any[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize local split state from parent state on mount
    useEffect(() => {
        if (!isInitialized) {
            const p = questions.filter((q: any) => !q.tags || q.tags.includes('practice')); // Default to practice if no tags
            const m = questions.filter((q: any) => q.tags?.includes('mock_test'));
            setPracticeQuestions(p);
            setMockQuestions(m);
            setIsInitialized(true);
        }
    }, [questions, isInitialized]);

    // Sync back to parent whenever local states change
    useEffect(() => {
        if (isInitialized) {
            // Tag them before sending back
            const pTagged = practiceQuestions.map(q => ({ ...q, tags: ['practice'] }));
            const mTagged = mockQuestions.map(q => ({ ...q, tags: ['mock_test'] }));

            // If strictly separate, just concat.
            setQuestions([...pTagged, ...mTagged]);
        }
    }, [practiceQuestions, mockQuestions, isInitialized, setQuestions]);



    if (!isMultiMode) {
        // If single mode, just pass through but ensure tagging happens on save (handled by parent or here)
        // Actually easier to just use the logic above but hide tabs.
        // Wait, if only 'mock_test' is selected, we should default to that.
        // Let's keep using the tabs logic but force the active tab.
    }

    // Effect for activeTab removed as it is now initialized lazily.

    return (
        <div className="space-y-6">
            {isMultiMode && (
                <div className="flex space-x-1 bg-surface p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('practice')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            activeTab === 'practice'
                                ? "bg-white dark:bg-neutral-800 text-primary shadow-sm"
                                : "text-muted hover:text-text"
                        )}
                    >
                        Practice Questions
                        <span className="ml-2 bg-neutral-100 dark:bg-neutral-900 px-1.5 py-0.5 rounded-full text-xs">
                            {practiceQuestions.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('mock')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            activeTab === 'mock'
                                ? "bg-white dark:bg-neutral-800 text-primary shadow-sm"
                                : "text-muted hover:text-text"
                        )}
                    >
                        Mock Test Questions
                        <span className="ml-2 bg-neutral-100 dark:bg-neutral-900 px-1.5 py-0.5 rounded-full text-xs">
                            {mockQuestions.length}
                        </span>
                    </button>
                </div>
            )}

            <div className={cn("transition-opacity duration-200", isMultiMode ? "mt-4" : "")}>
                {activeTab === 'practice' ? (
                    <div className="space-y-2">
                        {isMultiMode && <h3 className="text-lg font-medium text-text">Practice Set</h3>}
                        <StepQuestions
                            questions={practiceQuestions}
                            setQuestions={setPracticeQuestions}
                            quizId={quizId}
                        />
                    </div>
                ) : (
                    <div className="space-y-2">
                        {isMultiMode && <h3 className="text-lg font-medium text-text">Mock Test Set</h3>}
                        <StepQuestions
                            questions={mockQuestions}
                            setQuestions={setMockQuestions}
                            quizId={quizId}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
