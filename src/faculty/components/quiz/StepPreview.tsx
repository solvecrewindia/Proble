import React from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { Question } from '../../types';

export function StepPreview({ data, questions }: any) {
    return (
        <div className="space-y-8 max-w-3xl mx-auto">
            <div className="text-center space-y-4">
                <Badge variant="secondary">Preview Mode</Badge>
                <h1 className="text-3xl font-bold text-text">{data.title || 'Untitled Quiz'}</h1>
                <p className="text-muted">{data.description || 'No description provided.'}</p>

                <div className="flex items-center justify-center gap-6 text-sm text-muted">
                    <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4" />
                        {data.durationMinutes ? `${data.durationMinutes} mins` : 'Untimed'}
                    </div>
                    <div className="flex items-center">
                        <AlertCircle className="mr-2 h-4 w-4" />
                        {questions.length} Questions
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {questions.map((q: Question, index: number) => (
                    <Card key={q.id}>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between">
                                <span className="text-sm font-medium text-muted">Question {index + 1}</span>
                                <span className="text-xs font-semibold bg-surface px-2 py-1 rounded text-muted">
                                    {q.weight} pts
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {q.imageUrl && (
                                <div className="mb-4 rounded-lg overflow-hidden border border-neutral-300 dark:border-neutral-600 bg-black/20">
                                    <img
                                        src={q.imageUrl}
                                        alt="Question"
                                        className="max-h-[300px] w-full object-contain mx-auto"
                                    />
                                </div>
                            )}
                            <p className="text-lg font-medium text-text">{q.stem}</p>

                            {q.type === 'mcq' && q.options && (
                                <div className="space-y-2">
                                    {q.options.map((opt: any, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center p-3 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-surface transition-colors"
                                        >
                                            <div className="h-4 w-4 rounded-full border border-neutral-300 dark:border-neutral-600 mr-3" />
                                            <div className="flex-1">
                                                {q.optionImages?.[i] && (
                                                    <img
                                                        src={q.optionImages[i]}
                                                        alt={`Option ${i + 1}`}
                                                        className="h-24 w-auto object-contain rounded-md border border-neutral-300 dark:border-neutral-600 mb-2"
                                                    />
                                                )}
                                                <span className="text-text">{typeof opt === 'object' ? opt.text : opt}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {q.type === 'text' && (
                                <textarea
                                    className="w-full h-32 p-3 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-background resize-none text-text"
                                    placeholder="Student answer will go here..."
                                    disabled
                                />
                            )}

                            {q.type === 'numeric' && (
                                <input
                                    type="number"
                                    className="w-full p-3 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-background text-text"
                                    placeholder="Enter number..."
                                    disabled
                                />
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
