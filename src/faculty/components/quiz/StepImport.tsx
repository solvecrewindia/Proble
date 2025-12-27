import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';
import { v4 as uuidv4 } from 'uuid';
import type { Question } from '../../types';

export function StepImport({ questions, setQuestions }: any) {
    const [error, setError] = useState<string | null>(null);

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

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Import Questions</h2>
                <p className="text-sm text-neutral-500">Upload an Excel file to bulk import MCQ questions.</p>
            </div>

            <div {...getRootProps()} className={cn(
                "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors",
                isDragActive ? "border-primary bg-primary/5" : "border-neutral-300 dark:border-neutral-600 hover:border-primary",
                error ? "border-red-300 bg-red-50" : ""
            )}>
                <input {...getInputProps()} />
                <FileSpreadsheet className={cn("mx-auto h-12 w-12 mb-4", error ? "text-red-400" : "text-neutral-400")} />
                <p className="text-lg font-medium text-neutral-900">
                    {isDragActive ? "Drop the file here" : "Drag & drop Excel file"}
                </p>
                <p className="text-sm text-neutral-500 mt-2">
                    or click to select file
                </p>
            </div>

            {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg">
                    <AlertTriangle className="h-5 w-5" />
                    <span>{error}</span>
                </div>
            )}

            <div className="bg-neutral-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-neutral-900 mb-2">Template Format</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-neutral-600">
                        <thead className="bg-neutral-100 uppercase">
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
                            <tr className="border-b border-neutral-200">
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
    );
}
