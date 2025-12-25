import React, { useState, useCallback } from 'react';
import { Plus, Trash2, GripVertical, FileSpreadsheet, AlertTriangle, Image as ImageIcon, X, Loader2, FileArchive, CheckCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import imageCompression from 'browser-image-compression';
import JSZip from 'jszip';
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

    // Bulk Import State
    const [zipFile, setZipFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [importStatus, setImportStatus] = useState<string>('');

    // Handle Zip Drop
    const onZipDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles?.length) {
            setZipFile(acceptedFiles[0]);
            setError(null);
        }
    }, []);

    const { getRootProps: getZipRootProps, getInputProps: getZipInputProps, isDragActive: isZipDragActive } = useDropzone({
        onDrop: onZipDrop,
        accept: { 'application/zip': ['.zip'], 'application/x-zip-compressed': ['.zip'] },
        maxFiles: 1
    });

    // Helper to Upload Image Buffer to Supabase
    const uploadImageBuffer = async (blob: Blob, fileName: string) => {
        try {
            // Compress if possible (might skip for bulk speed if needed, but keeping for quality/size control)
            // compression lib takes File only? It takes Blob too usually.
            // Let's coerce to File
            const file = new File([blob], fileName, { type: blob.type });

            const options = {
                maxSizeMB: 0.1, // 100KB limit
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                initialQuality: 0.7
            };

            let uploadFile: File | Blob = file;
            try {
                uploadFile = await imageCompression(file, options);
            } catch (e) {
                console.warn("Compression failed, using original", e);
            }

            const folder = quizId ? `${quizId}` : `temp/${uuidv4()}`;
            const timestamp = Date.now();
            const cleanFileName = fileName.replace(/[^a-zA-Z0-9.\-_()]/g, ''); // Sanitize
            const filePath = `${folder}/${timestamp}-${cleanFileName}`;

            const { error: uploadError } = await supabase.storage
                .from('quiz_images') // Using separate bucket for questions as discussed or 'quiz-banners' if preferred. User plan said 'quiz-banners' or 'quiz_images' if confirmed. Previous code used 'quiz_images' successfully.
                .upload(filePath, uploadFile, { upsert: true });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('quiz_images')
                .getPublicUrl(filePath);

            return data.publicUrl;
        } catch (err) {
            console.error(`Failed to upload ${fileName}`, err);
            return null;
        }
    };

    // Handle Excel Drop and Processing
    const onExcelDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setIsProcessing(true);
        setImportStatus('Reading files...');
        setError(null);

        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                // 1. Process ZIP if exists
                // Map: normalized_key -> { blob, originalName }
                const imageMap = new Map<string, { blob: Blob, name: string }>();

                if (zipFile) {
                    setImportStatus('Extracting images from ZIP...');
                    const zip = new JSZip();
                    try {
                        const zipContent = await zip.loadAsync(zipFile);

                        // Iterate files
                        for (const [relativePath, zipEntry] of Object.entries(zipContent.files)) {
                            if (!zipEntry.dir && !relativePath.startsWith('__MACOSX')) {
                                const blob = await zipEntry.async('blob');
                                const filename = relativePath.split('/').pop() || relativePath;
                                // Normalize: remove path, remove extension, remove non-alphanumeric, lowercase
                                // e.g. "Q12(A).png" -> "q12a"
                                const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.')) || filename;
                                const normalizedKey = nameWithoutExt.replace(/[^a-z0-9]/gi, '').toLowerCase();

                                imageMap.set(normalizedKey, { blob, name: filename });
                            }
                        }
                    } catch (zipErr) {
                        console.error("Zip extraction failed", zipErr);
                        setError("Failed to read ZIP file. Please check if it's valid.");
                        setIsProcessing(false);
                        return;
                    }
                }

                // 2. Process Excel
                setImportStatus('Parsing Excel...');
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                if (jsonData.length === 0) {
                    throw new Error("Excel sheet is empty");
                }

                setImportStatus(`Processing ${jsonData.length} questions...`);

                // Fuzzy Header Helper
                const headers = Object.keys(jsonData[0] as object);
                const findHeadeKey = (patterns: RegExp[]) => {
                    return headers.find(h => patterns.some(p => p.test(h))) || '';
                };

                // Identify keys dynamically
                const keyQNo = findHeadeKey([/Question\s*No/i, /Q\.?\s*No/i, /^No$/i]);
                const keyQText = findHeadeKey([/^Question$/i, /^Stem$/i, /Question\s+Text/i]); // Strict match to avoid "Question No"
                const keyOpt1 = findHeadeKey([/Option\s*1/i, /Option\s*A/i]);
                const keyOpt2 = findHeadeKey([/Option\s*2/i, /Option\s*B/i]);
                const keyOpt3 = findHeadeKey([/Option\s*3/i, /Option\s*C/i]);
                const keyOpt4 = findHeadeKey([/Option\s*4/i, /Option\s*D/i]);
                const keyCorrect = findHeadeKey([/Correct\s*Answer/i, /Answer/i, /Key/i]);

                if (!keyOpt1 || !keyCorrect) {
                    // We can proceed without explicit question text strictly, but usually it's needed. 
                    // If QText header is missing, maybe it's named something else entirely?
                    // Let's assume strict requirement for Options/Answer at least.
                    // If QText header missing, maybe we can fallback to finding "Question" again if strict failed? 
                    // But strictly, let's complain if standard columns missing.
                    if (!keyQText) {
                        throw new Error(`Missing required 'Question' column. Found: ${headers.join(', ')}`);
                    }
                    throw new Error(`Missing required columns. Found: ${headers.join(', ')}`);
                }

                const newQuestions: Question[] = [];
                let mappedCount = 0;

                for (const row of jsonData as any[]) {
                    let qNo = row[keyQNo];
                    const questionText = row[keyQText];
                    const opt1 = row[keyOpt1];
                    const opt2 = row[keyOpt2];
                    const opt3 = row[keyOpt3];
                    const opt4 = row[keyOpt4];
                    const correctChar = row[keyCorrect];

                    if (!questionText) continue;

                    // Map Correct Answer
                    let correctIndex = -1;
                    if (correctChar) {
                        const cleanChar = String(correctChar).trim().toUpperCase();
                        if (['A', '1'].includes(cleanChar)) correctIndex = 0;
                        else if (['B', '2'].includes(cleanChar)) correctIndex = 1;
                        else if (['C', '3'].includes(cleanChar)) correctIndex = 2;
                        else if (['D', '4'].includes(cleanChar)) correctIndex = 3;
                    }

                    // Handling Images
                    let qImageUrl: string | undefined = undefined;
                    let optionImages: string[] = ['', '', '', ''];

                    if (zipFile && imageMap.size > 0 && qNo !== undefined) {
                        // Normalize qNo from Excel (e.g., "Q12" -> "q12", "12" -> "12")
                        const qStr = String(qNo).trim();
                        const qNorm = qStr.replace(/[^a-z0-9]/gi, '').toLowerCase();

                        // Try patterns for Question Image
                        // 1. Exact match (q12)
                        // 2. Prepend 'q' if missing (12 -> q12)
                        const qTargets = [qNorm];
                        if (!qNorm.startsWith('q')) qTargets.push(`q${qNorm}`);

                        for (const target of qTargets) {
                            if (imageMap.has(target)) {
                                const { blob, name } = imageMap.get(target)!;
                                const url = await uploadImageBuffer(blob, name);
                                if (url) {
                                    qImageUrl = url;
                                    mappedCount++;
                                }
                                break;
                            }
                        }

                        // Try patterns for Option Images
                        // Logic: Q12(A) -> q12a
                        const opts = ['a', 'b', 'c', 'd'];
                        for (let i = 0; i < 4; i++) {
                            const optChar = opts[i];

                            // Potential keys: q12a, 12a, q12(a)... normalized is just q12a
                            const optTargets: string[] = [];

                            // Target 1: qNorm + optChar (q12 + a -> q12a)
                            optTargets.push(`${qNorm}${optChar}`);

                            // Target 2: if qNorm didn't have q, add it (12 + a -> 12a, but check q12a too)
                            if (!qNorm.startsWith('q')) optTargets.push(`q${qNorm}${optChar}`);

                            for (const target of optTargets) {
                                if (imageMap.has(target)) {
                                    const { blob, name } = imageMap.get(target)!;
                                    const url = await uploadImageBuffer(blob, name);
                                    if (url) {
                                        optionImages[i] = url;
                                    }
                                    break;
                                }
                            }
                        }
                    }

                    newQuestions.push({
                        id: uuidv4(),
                        quizId: quizId || '',
                        type: 'mcq',
                        stem: questionText,
                        options: [opt1, opt2, opt3, opt4].map(o => String(o || '')),
                        correct: correctIndex,
                        weight: 1,
                        imageUrl: qImageUrl,
                        optionImages: optionImages
                    });
                }

                setQuestions((prev: Question[]) => [...prev, ...newQuestions]);
                setImportStatus(mappedCount > 0 ? `Imported ${newQuestions.length} questions (${mappedCount} images linked)` : '');
                setIsProcessing(false);
                setZipFile(null);
                setView('list');

            } catch (err: any) {
                console.error("Import Error", err);
                setError(err.message || 'Failed to process import');
                setIsProcessing(false);
                setImportStatus('');
            }
        };

        reader.readAsBinaryString(file);
    }, [zipFile, questions, setQuestions, quizId]);

    const { getRootProps: getExcelRootProps, getInputProps: getExcelInputProps, isDragActive: isExcelDragActive } = useDropzone({
        onDrop: onExcelDrop,
        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
        maxFiles: 1,
        disabled: isProcessing
    });

    // ... (Existing Single Question Edit Logic - Keeping it intact) ...
    const handleImageUpload = async (file: File, context: 'question' | 'option', index: number, optIndex?: number) => {
        const key = context === 'question' ? `q-${index}` : `o-${index}-${optIndex}`;
        const objectUrl = URL.createObjectURL(file);

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
            const options = {
                maxSizeMB: 0.1,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                initialQuality: 0.7
            };
            const compressedFile = await imageCompression(file, options);
            const folder = quizId ? `${quizId}` : `temp/${uuidv4()}`;
            const fileName = `${Date.now()}-${file.name}`;
            const filePath = `${folder}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('quiz_images')
                .upload(filePath, compressedFile, { upsert: true });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('quiz_images')
                .getPublicUrl(filePath);

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
            alert('Failed to upload image.');
        } finally {
            setUploading(prev => ({ ...prev, [key]: false }));
            URL.revokeObjectURL(objectUrl);
        }
    };

    const addQuestion = () => {
        const newQuestion: Question = {
            id: uuidv4(),
            quizId: '',
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
                    <div className="space-y-8 animate-in fade-in duration-300">

                        {/* 1. ZIP Upload Step */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-text flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-xs font-bold ring-1 ring-border-custom">1</span>
                                Upload Images (Optional)
                            </h3>
                            <div {...getZipRootProps()} className={cn(
                                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors relative",
                                isZipDragActive ? "border-primary bg-primary/5" : "border-border-custom hover:border-primary",
                                zipFile ? "bg-green-500/5 border-green-500/30" : ""
                            )}>
                                <input {...getZipInputProps()} />
                                {zipFile ? (
                                    <div className="flex flex-col items-center text-green-500">
                                        <CheckCircle className="h-10 w-10 mb-2" />
                                        <p className="font-medium">{zipFile.name}</p>
                                        <p className="text-xs opacity-80 mt-1">Ready for extraction</p>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setZipFile(null); }}
                                            className="mt-4 text-xs underline text-text-secondary hover:text-red-400"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <FileArchive className="mx-auto h-10 w-10 mb-3 text-muted" />
                                        <p className="text-sm font-medium text-text">
                                            {isZipDragActive ? "Drop Zip here" : "Upload .zip file with images"}
                                        </p>
                                        <p className="text-xs text-muted mt-1">
                                            Images must be named <code>Q1.png</code> or <code>Q1(A).png</code>
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 2. Excel Upload Step */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-text flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-xs font-bold ring-1 ring-border-custom">2</span>
                                Upload Question Sheet (Required)
                            </h3>
                            <div {...getExcelRootProps()} className={cn(
                                "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors",
                                isExcelDragActive ? "border-primary bg-primary/5" : "border-border-custom hover:border-primary",
                                error ? "border-red-300 bg-red-50" : "",
                                isProcessing ? "pointer-events-none opacity-50" : ""
                            )}>
                                <input {...getExcelInputProps()} />

                                {isProcessing ? (
                                    <div className="flex flex-col items-center">
                                        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                                        <p className="text-lg font-medium text-text">Processing...</p>
                                        <p className="text-sm text-primary mt-2">{importStatus}</p>
                                    </div>
                                ) : (
                                    <>
                                        <FileSpreadsheet className={cn("mx-auto h-12 w-12 mb-4", error ? "text-red-400" : "text-muted")} />
                                        <p className="text-lg font-medium text-text">
                                            {isExcelDragActive ? "Drop Excel here" : "Drag & drop Excel file"}
                                        </p>
                                        <p className="text-sm text-muted mt-2">
                                            Triggers processing immediately
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
                                <AlertTriangle className="h-5 w-5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="bg-surface p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-text mb-2">Required Columns (Exact Match)</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left text-muted">
                                    <thead className="bg-background">
                                        <tr>
                                            <th className="px-3 py-2 border-b border-border-custom">Question No</th>
                                            <th className="px-3 py-2 border-b border-border-custom">Question</th>
                                            <th className="px-3 py-2 border-b border-border-custom">Option 1</th>
                                            <th className="px-3 py-2 border-b border-border-custom">Option 2</th>
                                            <th className="px-3 py-2 border-b border-border-custom">Option 3</th>
                                            <th className="px-3 py-2 border-b border-border-custom">Option 4</th>
                                            <th className="px-3 py-2 border-b border-border-custom">Correct Answer</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="px-3 py-2">Q1</td>
                                            <td className="px-3 py-2">What is...</td>
                                            <td className="px-3 py-2">A</td>
                                            <td className="px-3 py-2">B</td>
                                            <td className="px-3 py-2">C</td>
                                            <td className="px-3 py-2">D</td>
                                            <td className="px-3 py-2">A</td>
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
                                    <Button variant="ghost" size="sm" onClick={() => removeQuestion(index)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
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
                                                                <ImageIcon className="h-5 w-5 text-muted" />
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
                                                                className="h-4 w-4 text-primary focus:ring-primary accent-primary"
                                                            />
                                                            <div className="flex-1 flex gap-2">
                                                                <Input
                                                                    placeholder={`Option ${optIndex + 1}`}
                                                                    value={typeof opt === 'object' ? (opt as any).text : opt}
                                                                    onChange={(e) => {
                                                                        const newOptions = [...q.options!];
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
                                                                            <ImageIcon className="h-4 w-4 text-muted" />
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

