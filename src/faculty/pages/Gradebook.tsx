import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, AlertTriangle, Edit2, MessageSquare } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import type { Attempt } from '../types';

export default function Gradebook() {
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
    const [gradeData, setGradeData] = useState({ score: 0, feedback: '' });

    const { data: attempts, isLoading } = useQuery<Attempt[]>({
        queryKey: ['attempts', id],
        queryFn: async () => {
            const res = await fetch(`/api/faculty/quizzes/${id}/attempts`);
            if (!res.ok) throw new Error('Failed to fetch attempts');
            return res.json();
        },
    });

    const gradeMutation = useMutation({
        mutationFn: async (data: { score: number; feedback: string }) => {
            const res = await fetch(`/api/faculty/attempts/${selectedAttempt?.id}/grade`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Grading failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attempts', id] });
            setSelectedAttempt(null);
        },
    });

    const getStatusColor = (status: Attempt['status']) => {
        switch (status) {
            case 'graded': return 'success';
            case 'submitted': return 'warning';
            default: return 'secondary';
        }
    };

    if (isLoading) return <div className="p-8">Loading gradebook...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">Gradebook</h1>
                    <p className="text-neutral-500">Review and grade student submissions</p>
                </div>
                <Button variant="primary" onClick={() => {
                    const confirm = window.prompt('Type "CONFIRM PUBLISH RESULTS" to publish grades');
                    if (confirm === 'CONFIRM PUBLISH RESULTS') {
                        alert('Results published!');
                    }
                }}>Publish Results</Button>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-neutral-50 text-neutral-500 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">Student ID</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Score</th>
                                <th className="px-6 py-3">Flags</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {attempts?.map((attempt) => (
                                <tr key={attempt.id} className="hover:bg-neutral-50">
                                    <td className="px-6 py-4 font-medium">{attempt.studentId}</td>
                                    <td className="px-6 py-4">
                                        <Badge variant={getStatusColor(attempt.status)}>{attempt.status}</Badge>
                                    </td>
                                    <td className="px-6 py-4 font-bold">
                                        {attempt.score !== undefined ? `${attempt.score}%` : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {attempt.flags.length > 0 ? (
                                            <div className="flex items-center text-red-600">
                                                <AlertTriangle className="h-4 w-4 mr-1" />
                                                {attempt.flags.length} Flags
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-green-600">
                                                <CheckCircle className="h-4 w-4 mr-1" /> Clean
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setSelectedAttempt(attempt);
                                                setGradeData({ score: attempt.score || 0, feedback: '' });
                                            }}
                                        >
                                            <Edit2 className="h-3 w-3 mr-1" /> Grade
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {attempts?.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                                        No attempts found for this quiz.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Grading Modal */}
            {selectedAttempt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-lg animate-in zoom-in-95">
                        <CardHeader>
                            <CardTitle>Grade Submission</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Score (%)</label>
                                <Input
                                    type="number"
                                    value={gradeData.score}
                                    onChange={(e) => setGradeData({ ...gradeData, score: Number(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Feedback / Notes</label>
                                <textarea
                                    className="w-full h-32 p-3 border border-neutral-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="Enter feedback for the student..."
                                    value={gradeData.feedback}
                                    onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-primary hover:text-primary-600 p-0 h-auto"
                                    onClick={() => setGradeData({ ...gradeData, feedback: "Great work! Your explanation of the algorithm was clear and concise." })}
                                >
                                    <MessageSquare className="h-3 w-3 mr-1" /> AI Suggest Feedback
                                </Button>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="outline" onClick={() => setSelectedAttempt(null)}>Cancel</Button>
                                <Button onClick={() => gradeMutation.mutate(gradeData)}>Save Grade</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
