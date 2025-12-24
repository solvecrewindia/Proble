import React, { useState, useCallback } from 'react';
import { Plus, Trash2, GripVertical, FileSpreadsheet, AlertTriangle, Image, X, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import imageCompression from 'browser-image-compression';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../lib/utils';
import type { Question } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export function StepQuestions({ questions, setQuestions, quizId }: any) {
    const [activeType, setActiveType] = useState<Question['type']>('mcq');
    const [view, setView] = useState<'list' | 'import'>('list');
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});

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

    const handleImageUpload = async (file: File, context: 'question' | 'option', index: number, optIndex?: number) => {
        const key = context === 'question' ? `q-${index}` : `o-${index}-${optIndex}`;
        const objectUrl = URL.createObjectURL(file);

        // Optimistic update
        if (context === 'question') {
            updateQuestion(index, { imageUrl: objectUrl });
        } else if (context === 'option' && typeof optIndex === 'number') {
            const currentImages = questions[index].optionImages || ['', '', '', ''];
            const newImages = [...currentImages];
            newImages[optIndex] = objectUrl;
            updateQuestion(index, { optionImages: newImages });
        }

        setUploading(prev => ({ ...prev, [key]: true }));

        try {
            // Compress image
            const options = {
                maxSizeMB: 0.1, // Compress to ~100KB
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                initialQuality: 0.7
            };
            const compressedFile = await imageCompression(file, options);

            // Rename logic - simplified as per user request (Q1, Q1(A), etc.)
            // We keep the extension to ensure browser compatibility
            const optionChar = typeof optIndex === 'number' ? String.fromCharCode(65 + optIndex) : '';
            const fileExt = file.name.split('.').pop();
            const timestamp = Date.now(); // Add timestamp to bypass cache
            const baseName = context === 'question'
                ? `Q${index + 1}-${timestamp}`
                : `Q${index + 1}(${optionChar})-${timestamp}`;

            const fileName = `${baseName}.${fileExt}`;
            // Use quiz_images bucket and quizId folder
            const folder = quizId ? `${quizId}` : `temp/${uuidv4()}`;
            const filePath = `${folder}/${fileName}`;

            // List buckets to verify if quiz_images exists (optional but good for debugging, maybe too heavy for every upload)
            // Instead, just catch specific errors.

            const { error: uploadError } = await supabase.storage
                .from('quiz_images')
                .upload(filePath, compressedFile, {
                    upsert: true
                });

            if (uploadError) {
                console.error('Supabase upload error details:', uploadError);
                if (uploadError.message.includes('Bucket not found')) {
                    throw new Error('Storage bucket "quiz_images" not found. Please create it in Supabase.');
                }
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('quiz_images')
                .getPublicUrl(filePath);

            console.log('Image uploaded successfully:', data.publicUrl);

            // Update with real URL
            if (context === 'question') {
                updateQuestion(index, { imageUrl: data.publicUrl });
            } else if (context === 'option' && typeof optIndex === 'number') {
                const currentImages = questions[index].optionImages || ['', '', '', ''];
                const newImages = [...currentImages];
                newImages[optIndex] = data.publicUrl;
                updateQuestion(index, { optionImages: newImages });
            }
        } catch (error: any) {
            console.error('Error uploading image:', error);
            const msg = error.message || 'Failed to upload image.';
            alert(`${msg} Please try again or check console for details.`);

            // Revert changes on error
            if (context === 'question') {
                updateQuestion(index, { imageUrl: undefined });
            } else if (context === 'option' && typeof optIndex === 'number') {
                const currentImages = questions[index].optionImages || [];
                const newImages = [...currentImages];
                newImages[optIndex] = '';
                updateQuestion(index, { optionImages: newImages });
            }
        } finally {
            setUploading(prev => ({ ...prev, [key]: false }));
            // Clean up object URL
            URL.revokeObjectURL(objectUrl);
        }
    };

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
                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="Question Text"
                                                        value={q.stem}
                                                        onChange={(e) => updateQuestion(index, { stem: e.target.value })}
                                                    />
                                                    <label className="flex items-center justify-center p-2 rounded-lg border border-border-custom hover:bg-surface cursor-pointer transition-colors relative" title="Add Image">
                                                        {uploading[`q-${index}`] ? (
                                                            <Loader2 className="h-5 w-5 text-primary animate-spin" />
                                                        ) : (
                                                            <>
                                                                <Image className="h-5 w-5 text-muted" />
                                                                <input
                                                                    type="file"
                                                                    className="hidden"
                                                                    accept="image/*"
                                                                    disabled={uploading[`q-${index}`]}
                                                                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'question', index)}
                                                                />
                                                            </>
                                                        )}
                                                    </label>
                                                </div>
                                                {q.imageUrl && (
                                                    <div className="relative mt-2 w-fit group/image">
                                                        <img src={q.imageUrl} alt="Question" className="h-32 w-auto rounded-lg border border-border-custom object-cover" />
                                                        <button
                                                            onClick={() => updateQuestion(index, { imageUrl: undefined })}
                                                            className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover/image:opacity-100 transition-opacity"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                )}
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
                                                    <div key={optIndex} className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="radio"
                                                                name={`q-${q.id}`}
                                                                checked={q.correct === optIndex}
                                                                onChange={() => updateQuestion(index, { correct: optIndex })}
                                                                className="h-4 w-4 text-primary focus:ring-primary"
                                                            />
                                                            <div className="flex-1 flex gap-2">
                                                                <Input
                                                                    placeholder={`Option ${optIndex + 1}`}
                                                                    value={typeof opt === 'object' ? (opt as any).text : opt}
                                                                    onChange={(e) => {
                                                                        const newOptions = [...q.options!];
                                                                        // If it was object, keep it object and update text? 
                                                                        // Or revert to string? Keeping it simple: convert to string for editing
                                                                        // This might be destructive if we lose other properties but usually we just want string.
                                                                        // actually better to just update the string value.
                                                                        newOptions[optIndex] = e.target.value;
                                                                        updateQuestion(index, { options: newOptions });
                                                                    }}
                                                                    className="h-8 text-sm"
                                                                />
                                                                <label className="flex items-center justify-center p-1.5 rounded-lg border border-border-custom hover:bg-surface cursor-pointer transition-colors relative" title="Add Option Image">
                                                                    {uploading[`o-${index}-${optIndex}`] ? (
                                                                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                                                                    ) : (
                                                                        <>
                                                                            <Image className="h-4 w-4 text-muted" />
                                                                            <input
                                                                                type="file"
                                                                                className="hidden"
                                                                                accept="image/*"
                                                                                disabled={uploading[`o-${index}-${optIndex}`]}
                                                                                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'option', index, optIndex)}
                                                                            />
                                                                        </>
                                                                    )}
                                                                </label>
                                                            </div>
                                                        </div>
                                                        {q.optionImages?.[optIndex] && (
                                                            <div className="ml-7 relative w-fit group/optImage">
                                                                <img src={q.optionImages[optIndex]} alt={`Option ${optIndex + 1}`} className="h-20 w-auto rounded-lg border border-border-custom object-cover" />
                                                                <button
                                                                    onClick={() => {
                                                                        const newImages = [...(q.optionImages || [])];
                                                                        newImages[optIndex] = '';
                                                                        updateQuestion(index, { optionImages: newImages });
                                                                    }}
                                                                    className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover/optImage:opacity-100 transition-opacity"
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        )}
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

