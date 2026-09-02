import React, { useEffect } from 'react';
import { Calendar, Clock, Lock } from 'lucide-react';
import { Input } from '../../../faculty/components/ui/Input';
import { Card } from '../../../faculty/components/ui/Card';

export function AdminStepSchedule({ data, update, questions = [] }: any) {
    // Auto-calculate duration if timePerQuestion is present
    useEffect(() => {
        const sec = Number(data.settings?.timePerQuestion);
        const qCount = Array.isArray(questions) ? questions.length : 0;
        if (sec > 0 && qCount > 0) {
            const calculatedMinutes = Math.ceil((qCount * sec) / 60);
            if ((data.settings?.duration || data.durationMinutes) !== calculatedMinutes) {
                update({
                    durationMinutes: calculatedMinutes,
                    settings: {
                        ...data.settings,
                        duration: calculatedMinutes
                    }
                });
            }
        }
    }, [questions.length, data.settings?.timePerQuestion]);

    const handleTimePerQuestionChange = (val: string | number) => {
        const sec = val === '' ? 0 : Number(val);
        const qCount = Array.isArray(questions) ? questions.length : 0;
        const newSettings = { ...data.settings, timePerQuestion: sec };

        if (sec > 0 && qCount > 0) {
            const calculatedMinutes = Math.ceil((qCount * sec) / 60);
            update({
                durationMinutes: calculatedMinutes,
                settings: {
                    ...newSettings,
                    duration: calculatedMinutes
                }
            });
        } else {
            update({
                settings: newSettings
            });
        }
    };

    const handleDurationChange = (val: string | number) => {
        const min = val === '' ? 0 : Number(val);
        update({
            durationMinutes: min,
            settings: {
                ...data.settings,
                duration: min
            }
        });
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-text">Schedule</h2>
                <p className="text-sm text-muted">Configure when this quiz is available.</p>
            </div>

            <Card className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text flex items-center">
                            <Calendar className="mr-2 h-4 w-4" /> Start Date & Time
                        </label>
                        <Input
                            type="datetime-local"
                            value={
                                data.scheduledAt
                                    ? new Date(new Date(data.scheduledAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
                                    : ''
                            }
                            onChange={(e) => {
                                const val = e.target.value;
                                update({ scheduledAt: val ? new Date(val).toISOString() : null });
                            }}
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text flex items-center justify-between">
                                <span className="flex items-center">
                                    <Clock className="mr-2 h-4 w-4 text-primary" /> Time per Question (seconds)
                                </span>
                            </label>
                            <Input
                                type="number"
                                placeholder="e.g. 30, 45, 60"
                                value={data.settings?.timePerQuestion || ''}
                                onChange={(e) => handleTimePerQuestionChange(e.target.value)}
                            />
                            <p className="text-[11px] text-muted">Entering seconds per question auto-calculates total test duration.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text flex items-center justify-between">
                                <span className="flex items-center">
                                    <Clock className="mr-2 h-4 w-4 text-primary" /> Duration (minutes)
                                </span>
                                {Number(data.settings?.timePerQuestion) > 0 && (
                                    <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">Auto-calculated</span>
                                )}
                            </label>
                            <Input
                                type="number"
                                placeholder="e.g. 30"
                                value={data.durationMinutes || data.settings?.duration || ''}
                                onChange={(e) => handleDurationChange(e.target.value)}
                            />
                            <p className="text-[11px] text-muted">Total test time allocated for all questions.</p>
                        </div>
                    </div>
                </div>

                {Number(data.settings?.timePerQuestion) > 0 && (
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs text-primary font-medium flex items-center justify-between">
                        <span>
                            ⚡ <strong>Auto-Calculated Duration:</strong> {questions.length || 0} question{(questions.length || 0) === 1 ? '' : 's'} × {data.settings.timePerQuestion}s = {questions.length > 0 ? `${Math.ceil((questions.length * Number(data.settings.timePerQuestion)) / 60)} mins (${questions.length * Number(data.settings.timePerQuestion)}s total)` : '0 mins'}
                        </span>
                        {questions.length === 0 && (
                            <span className="text-muted text-[11px] italic">(Total test duration in minutes will update automatically when questions are added)</span>
                        )}
                    </div>
                )}

                <div className="pt-6 border-t border-neutral-300 dark:border-neutral-600">
                    <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-700 dark:text-orange-300">
                        <Lock className="h-5 w-5" />
                        <div>
                            <h4 className="font-medium text-sm">Restricted Access</h4>
                            <p className="text-xs mt-1 opacity-80">
                                This quiz will differ based on the selected mode ({data.settings?.modes?.map((m: string) => m === 'mock_test' ? 'Mock Test' : 'Practice').join(' & ') || 'None'}).
                            </p>
                        </div>
                    </div>
                </div>

                {/* Removed Access Code, Shareable Link, and Proctoring sections */}
            </Card>
        </div>
    );
}
