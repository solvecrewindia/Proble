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
                <h1 className="text-3xl font-bold text-neutral-900">{data.title || 'Untitled Quiz'}</h1>
                <p className="text-neutral-600">{data.description || 'No description provided.'}</p>

                <div className="flex items-center justify-center gap-6 text-sm text-neutral-500">
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
                                <span className="text-sm font-medium text-neutral-500">Question {index + 1}</span>
                                <span className="text-xs font-semibold bg-neutral-100 px-2 py-1 rounded text-neutral-600">
                                    {q.weight} pts
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-lg font-medium text-neutral-900">{q.stem}</p>

                            {q.type === 'mcq' && q.options && (
                                <div className="space-y-2">
                                    {q.options.map((opt, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                                        >
                                            <div className="h-4 w-4 rounded-full border border-neutral-300 mr-3" />
                                            <span className="text-neutral-700">{opt}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {q.type === 'text' && (
                                <textarea
                                    className="w-full h-32 p-3 border border-neutral-200 rounded-lg bg-neutral-50 resize-none"
                                    placeholder="Student answer will go here..."
                                    disabled
                                />
                            )}

                            {q.type === 'numeric' && (
                                <input
                                    type="number"
                                    className="w-full p-3 border border-neutral-200 rounded-lg bg-neutral-50"
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
