import React from 'react';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

export function StepMetadata({ data, update }: any) {
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

                {/* Anti-Cheat & Retakes configuration */}
                <div className="flex items-center space-x-4">
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
                </div>
            </div>
        </div>
    );
}
