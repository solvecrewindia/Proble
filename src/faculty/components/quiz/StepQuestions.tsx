import React, { useState, useCallback } from 'react';
import { Plus, Trash2, GripVertical, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';
import type { Question } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export function StepQuestions({ questions, setQuestions }: any) {
    const [activeType, setActiveType] = useState<Question['type']>('mcq');
    const [view, setView] = useState<'list' | 'import'>('list');
    const [error, setError] = useState<string | null>(null);

    // Import Logic
    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                // Validate and map
                const newQuestions: Question[] = jsonData.map((row: any) => {
                    if (!row.question || !row.optionA || !row.correctOption) {
                        throw new Error('Invalid format: Missing required columns');
                    }

                    return {
                        id: uuidv4(),
                        quizId: '',
                        type: 'mcq',
                        stem: row.question,
                        options: [row.optionA, row.optionB, row.optionC, row.optionD].filter(Boolean),
                        correct: ['A', 'B', 'C', 'D'].indexOf(row.correctOption),
                        weight: row.weight || 1,
                    };
                });

                setQuestions([...questions, ...newQuestions]);
                setError(null);
                setView('list'); // Switch back to list view on success
            } catch (err: any) {
                setError(err.message || 'Failed to parse Excel file');
            }
        };

        reader.readAsBinaryString(file);
    }, [questions, setQuestions]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
    });

    // Question Management Logic
    const addQuestion = () => {
        const newQuestion: Question = {
            id: uuidv4(),
            quizId: '', // Assigned later
            type: activeType,
            stem: '',
            weight: 1,
            options: activeType === 'mcq' ? ['', '', '', ''] : undefined,
            correct: activeType === 'mcq' ? 0 : '',
        };
        setQuestions([...questions, newQuestion]);
    };

    const updateQuestion = (index: number, updates: Partial<Question>) => {
        const newQuestions = [...questions];
        newQuestions[index] = { ...newQuestions[index], ...updates };
        setQuestions(newQuestions);
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_: any, i: number) => i !== index));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-text">Questions Management</h2>
            </div>


            <div className="flex border-b border-border-custom">
                <button
                    className={cn(
                        "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                        view === 'list'
                            ? "border-primary text-primary"
                            : "border-transparent text-muted hover:text-text hover:border-border-custom"
                    )}
                    onClick={() => setView('list')}
                >
                    Question List
                    <span className="ml-2 text-xs bg-surface px-2 py-0.5 rounded-full text-muted">{questions.length}</span>
                </button>
                <button
                    className={cn(
                        "px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                        view === 'import'
                            ? "border-primary text-primary"
                            : "border-transparent text-muted hover:text-text hover:border-border-custom"
                    )}
                    onClick={() => setView('import')}
                >
                    Bulk Import
                </button>
            </div>

            <div className="mt-6">
                {view === 'list' && (
                    <div className="flex justify-end mb-4">
                        <div className="flex gap-2">
                            <select
                                className="h-9 rounded-lg border border-border-custom bg-background text-text text-sm px-2"
                                value={activeType}
                                onChange={(e) => setActiveType(e.target.value as any)}
                            >
                                <option value="mcq">Multiple Choice</option>
                                <option value="text">Descriptive Text</option>
                                <option value="numeric">Numeric Answer</option>
                                <option value="code">Code Snippet</option>
                            </select>
                            <Button size="sm" onClick={addQuestion}>
                                <Plus className="mr-2 h-4 w-4" /> Add Question
                            </Button>
                        </div>
                    </div>
                )}
            </div>


            {
                view === 'import' ? (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div {...getRootProps()} className={cn(
                            "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors",
                            isDragActive ? "border-primary bg-primary/5" : "border-border-custom hover:border-primary",
                            error ? "border-red-300 bg-red-50" : ""
                        )}>
                            <input {...getInputProps()} />
                            <FileSpreadsheet className={cn("mx-auto h-12 w-12 mb-4", error ? "text-red-400" : "text-muted")} />
                            <p className="text-lg font-medium text-text">
                                {isDragActive ? "Drop the file here" : "Drag & drop Excel file"}
                            </p>
                            <p className="text-sm text-muted mt-2">
                                or click to select file
                            </p>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg">
                                <AlertTriangle className="h-5 w-5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="bg-surface p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-text mb-2">Template Format</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left text-muted">
                                    <thead className="bg-background uppercase">
                                        <tr>
                                            <th className="px-3 py-2">question</th>
                                            <th className="px-3 py-2">optionA</th>
                                            <th className="px-3 py-2">optionB</th>
                                            <th className="px-3 py-2">optionC</th>
                                            <th className="px-3 py-2">optionD</th>
                                            <th className="px-3 py-2">correctOption</th>
                                            <th className="px-3 py-2">weight</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-border-custom">
                                            <td className="px-3 py-2">What is 2+2?</td>
                                            <td className="px-3 py-2">3</td>
                                            <td className="px-3 py-2">4</td>
                                            <td className="px-3 py-2">5</td>
                                            <td className="px-3 py-2">6</td>
                                            <td className="px-3 py-2">B</td>
                                            <td className="px-3 py-2">1</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {questions.map((q: Question, index: number) => (
                            <Card key={q.id} className="p-4 relative group">
                                <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="sm" onClick={() => removeQuestion(index)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="flex gap-4">
                                    <div className="mt-2 text-muted cursor-move">
                                        <GripVertical className="h-5 w-5" />
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <Input
                                                    placeholder="Question Text"
                                                    value={q.stem}
                                                    onChange={(e) => updateQuestion(index, { stem: e.target.value })}
                                                />
                                            </div>
                                            <div className="w-24">
                                                <Input
                                                    type="number"
                                                    placeholder="Points"
                                                    value={q.weight}
                                                    onChange={(e) => updateQuestion(index, { weight: Number(e.target.value) })}
                                                />
                                            </div>
                                        </div>

                                        {q.type === 'mcq' && q.options && (
                                            <div className="space-y-2 pl-4 border-l-2 border-border-custom">
                                                {q.options.map((opt, optIndex) => (
                                                    <div key={optIndex} className="flex items-center gap-3">
                                                        <input
                                                            type="radio"
                                                            name={`q-${q.id}`}
                                                            checked={q.correct === optIndex}
                                                            onChange={() => updateQuestion(index, { correct: optIndex })}
                                                            className="h-4 w-4 text-primary focus:ring-primary"
                                                        />
                                                        <Input
                                                            placeholder={`Option ${optIndex + 1}`}
                                                            value={opt}
                                                            onChange={(e) => {
                                                                const newOptions = [...q.options!];
                                                                newOptions[optIndex] = e.target.value;
                                                                updateQuestion(index, { options: newOptions });
                                                            }}
                                                            className="h-8 text-sm"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}

                        {questions.length === 0 && (
                            <div className="text-center py-12 border-2 border-dashed border-border-custom rounded-xl text-muted">
                                No questions added yet. Click "Add Question" to start or use Import.
                            </div>
                        )}
                    </div>
                )
            }
        </div >
    );
}
