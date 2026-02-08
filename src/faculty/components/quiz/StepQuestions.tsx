import { useState, useCallback } from 'react';
import { Plus, Trash2, GripVertical, FileSpreadsheet, AlertTriangle, Image as ImageIcon, X, Loader2, FileArchive, CheckCircle, Download, PlusCircle, MinusCircle } from 'lucide-react';
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
import { ExistingQuizBrowser } from './ExistingQuizBrowser';

export function StepQuestions({ questions, setQuestions, quizId }: any) {
    const [activeType, setActiveType] = useState<Question['type']>('mcq');
    const [view, setView] = useState<'list' | 'import' | 'existing'>('list');
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

    const downloadTemplate = () => {
        const headers = ['Question No', 'Question', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Correct Answer'];
        const sampleRow = ['Q1', 'Sample Question?', 'Option A', 'Option B', 'Option C', 'Option D', 'A'];

        const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");

        XLSX.writeFile(wb, "quiz_template.xlsx");
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
                // Collect all keys from all rows to ensure we don't miss columns if the first row is sparse
                const headersSet = new Set<string>();
                (jsonData as any[]).forEach(row => {
                    Object.keys(row).forEach(k => headersSet.add(k));
                });
                const headers = Array.from(headersSet);
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
                    throw new Error(`Missing required columns (Option 1, Correct Answer). Found: ${headers.join(', ')}`);
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

                    if (!questionText && !zipFile) {
                        // If no text AND no zip file (so no potential images), then it's truly empty?
                        // Alternatively, just allow it. The user might upload images manually later.
                        // Let's just check if it's a completely empty row (no options/correct either?)
                        // For now, let's just allow it, but maybe warn?
                        // Actually user said "only images", implying they upload zip.
                        // If they don't upload zip, they get empty questions they can edit.
                        // So we continue ONLY if row is basically empty
                        if (!questionText && !opt1 && !correctChar) continue;
                    }

                    // Map Correct Answer
                    let correct: number | number[] | { min: number; max: number } = -1;
                    let type: 'mcq' | 'msq' | 'range' | 'true_false' = 'mcq';

                    if (correctChar) {
                        const rawStr = String(correctChar).trim();
                        const upperStr = rawStr.toUpperCase();

                        // Check for Range Question (e.g., "100 to 200")
                        const rangeMatch = upperStr.match(/^(\d+(?:\.\d+)?)\s+TO\s+(\d+(?:\.\d+)?)$/);

                        if (rangeMatch) {
                            type = 'range';
                            correct = {
                                min: Number(rangeMatch[1]),
                                max: Number(rangeMatch[2])
                            };
                        } else if (upperStr.includes(';') || upperStr.includes(',')) {
                            // MSQ
                            type = 'msq';
                            const parts = upperStr.split(/[;,]+/).map(s => s.trim()).filter(s => s);
                            const indices: number[] = [];

                            parts.forEach(p => {
                                if (['A', '1'].includes(p)) indices.push(0);
                                else if (['B', '2'].includes(p)) indices.push(1);
                                else if (['C', '3'].includes(p)) indices.push(2);
                                else if (['D', '4'].includes(p)) indices.push(3);
                            });

                            correct = indices; // Array of indices
                        } else {
                            // Check for True/False
                            const isTrueFalseOptions =
                                (String(opt1).toUpperCase() === 'TRUE' && String(opt2).toUpperCase() === 'FALSE') ||
                                (String(opt1).toUpperCase() === 'YES' && String(opt2).toUpperCase() === 'NO');

                            const isTrueFalseAnswer = ['TRUE', 'FALSE', 'T', 'F'].includes(upperStr);

                            if (isTrueFalseOptions || isTrueFalseAnswer) {
                                type = 'true_false';
                                if (['TRUE', 'T', 'A', '1', 'YES'].includes(upperStr)) correct = 0;
                                else if (['FALSE', 'F', 'B', '2', 'NO', '0'].includes(upperStr)) correct = 1;
                                else correct = 0; // Default
                            } else {
                                // MCQ
                                type = 'mcq';
                                if (['A', '1'].includes(upperStr)) correct = 0;
                                else if (['B', '2'].includes(upperStr)) correct = 1;
                                else if (['C', '3'].includes(upperStr)) correct = 2;
                                else if (['D', '4'].includes(upperStr)) correct = 3;
                                else correct = 0; // Default fallback
                            }
                        }
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
                        type: type,
                        stem: questionText || '',
                        options: type === 'true_false' ? ['True', 'False'] : [opt1, opt2, opt3, opt4].map(o => String(o || '')),

                        correct: correct,
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
            options: activeType === 'mcq' ? ['', '', '', ''] : activeType === 'true_false' ? ['True', 'False'] : undefined,
            correct: activeType === 'mcq' || activeType === 'true_false' ? 0 : activeType === 'msq' ? [] : activeType === 'code' ? { language: 'python', starterCode: '', testCases: [{ input: '', output: '' }] } : '',
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

    const clearQuestions = () => {
        if (window.confirm("Are you sure you want to remove ALL questions? This cannot be undone.")) {
            setQuestions([]);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold text-text">Questions Management</h2>
                </div>
                {questions.length > 0 && (
                    <Button variant="outline" size="sm" onClick={clearQuestions} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 border-red-200 dark:border-red-900/50">
                        <Trash2 className="mr-2 h-4 w-4" /> Clear All Questions
                    </Button>
                )}
            </div>


            <div className="flex border-b border-neutral-300 dark:border-neutral-600">
                <button
                    className={cn(
                        "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                        view === 'list'
                            ? "border-primary text-primary"
                            : "border-transparent text-muted hover:text-text hover:border-neutral-300 dark:border-neutral-600"
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
                            : "border-transparent text-muted hover:text-text hover:border-neutral-300 dark:border-neutral-600"
                    )}
                    onClick={() => setView('import')}
                >
                    Bulk Import
                </button>
                <button
                    className={cn(
                        "px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                        view === 'existing'
                            ? "border-primary text-primary"
                            : "border-transparent text-muted hover:text-text hover:border-neutral-300 dark:border-neutral-600"
                    )}
                    onClick={() => setView('existing')}
                >
                    Select from Existing Quiz
                </button>
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
                                isZipDragActive ? "border-primary bg-primary/5" : "border-neutral-300 dark:border-neutral-600 hover:border-primary",
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
                                isExcelDragActive ? "border-primary bg-primary/5" : "border-neutral-300 dark:border-neutral-600 hover:border-primary",
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
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-text">Required Columns (Exact Match)</h3>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={downloadTemplate}
                                    className="text-xs h-7 px-2 gap-1 text-primary border-primary/20 hover:bg-primary/5"
                                >
                                    <Download className="h-3 w-3" />
                                    Download Template
                                </Button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left text-muted">
                                    <thead className="bg-background">
                                        <tr>
                                            <th className="px-3 py-2 border-b border-neutral-300 dark:border-neutral-600">Question No</th>
                                            <th className="px-3 py-2 border-b border-neutral-300 dark:border-neutral-600">Question</th>
                                            <th className="px-3 py-2 border-b border-neutral-300 dark:border-neutral-600">Option 1</th>
                                            <th className="px-3 py-2 border-b border-neutral-300 dark:border-neutral-600">Option 2</th>
                                            <th className="px-3 py-2 border-b border-neutral-300 dark:border-neutral-600">Option 3</th>
                                            <th className="px-3 py-2 border-b border-neutral-300 dark:border-neutral-600">Option 4</th>
                                            <th className="px-3 py-2 border-b border-neutral-300 dark:border-neutral-600">Correct Answer</th>
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
                ) : view === 'existing' ? (
                    <ExistingQuizBrowser
                        onAddQuestions={(newQuestions: Question[]) => {
                            setQuestions((prev: any) => [...prev, ...newQuestions]);
                            setView('list');
                        }}
                    />
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
                                                    <label className="flex items-center justify-center p-2 rounded-lg border border-neutral-300 dark:border-neutral-600 hover:bg-surface cursor-pointer transition-colors relative" title="Add Image">
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
                                                        <img src={q.imageUrl} alt="Question" className="h-32 w-auto rounded-lg border border-neutral-300 dark:border-neutral-600 object-cover" />
                                                        <button
                                                            onClick={() => updateQuestion(index, { imageUrl: undefined })}
                                                            className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover/image:opacity-100 transition-opacity"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="w-48">
                                                <select
                                                    className="h-10 w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-background text-text text-sm px-2"
                                                    value={q.type}
                                                    onChange={(e) => {
                                                        const newType = e.target.value as Question['type'];
                                                        // Reset correct answer when switching types
                                                        updateQuestion(index, {
                                                            type: newType,
                                                            options: newType === 'mcq'
                                                                ? ['', '', '', '']
                                                                : newType === 'true_false'
                                                                    ? ['True', 'False']
                                                                    : undefined,
                                                            correct: newType === 'code' ? { language: 'python', starterCode: '', testCases: [{ input: '', output: '' }] } : newType === 'msq' ? [] : 0
                                                        });
                                                    }}
                                                >
                                                    <option value="mcq">Single Correct (MCQ)</option>
                                                    <option value="msq">Multi Correct (MSQ)</option>
                                                    <option value="true_false">True / False</option>
                                                    <option value="range">Range Answer</option>
                                                    <option value="code">Code Snippet</option>
                                                </select>
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

                                        {(q.type === 'mcq' || q.type === 'msq' || q.type === 'true_false') && q.options && (
                                            <div className="space-y-2 pl-4 border-l-2 border-neutral-300 dark:border-neutral-600">
                                                {q.options.map((opt, optIndex) => (
                                                    <div key={optIndex} className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type={q.type === 'msq' ? "checkbox" : "radio"}
                                                                name={`q-${q.id}`}
                                                                checked={q.type === 'msq'
                                                                    ? Array.isArray(q.correct) && q.correct.includes(optIndex)
                                                                    : q.correct === optIndex
                                                                }
                                                                onChange={() => {
                                                                    if (q.type === 'msq') {
                                                                        const currentCorrect = Array.isArray(q.correct) ? q.correct : [];
                                                                        let newCorrect;
                                                                        if (currentCorrect.includes(optIndex)) {
                                                                            newCorrect = currentCorrect.filter(i => i !== optIndex);
                                                                        } else {
                                                                            newCorrect = [...currentCorrect, optIndex];
                                                                        }
                                                                        updateQuestion(index, { correct: newCorrect });
                                                                    } else {
                                                                        updateQuestion(index, { correct: optIndex });
                                                                    }
                                                                }}
                                                                className="h-4 w-4 text-primary focus:ring-primary accent-primary"
                                                            />
                                                            <div className="flex-1 flex gap-2">
                                                                {q.type === 'true_false' ? (
                                                                    <div className="flex items-center h-8 text-sm font-medium px-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                                                                        {opt}
                                                                    </div>
                                                                ) : (
                                                                    <>
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
                                                                        <label className="flex items-center justify-center p-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 hover:bg-surface cursor-pointer transition-colors relative" title="Add Option Image">
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
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {q.optionImages?.[optIndex] && (
                                                            <div className="ml-7 relative w-fit group/optImage">
                                                                <img src={q.optionImages[optIndex]} alt={`Option ${optIndex + 1}`} className="h-20 w-auto rounded-lg border border-neutral-300 dark:border-neutral-600 object-cover" />
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

                                        {q.type === 'code' && (
                                            <div className="space-y-4 p-4 border rounded-lg bg-surface/50 border-neutral-300 dark:border-neutral-600">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-medium text-text-secondary">Default Language</label>
                                                        <select
                                                            className="h-10 w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-background text-text text-sm px-2"
                                                            value={(q.correct as any)?.language || 'python'}
                                                            onChange={(e) => {
                                                                const current = (q.correct as any) || { starterCode: '', testCases: [] };
                                                                updateQuestion(index, { correct: { ...current, language: e.target.value } });
                                                            }}
                                                        >
                                                            <option value="python">Python</option>
                                                            <option value="javascript">JavaScript</option>
                                                            <option value="cpp">C++</option>
                                                            <option value="c">C</option>
                                                            <option value="java">Java</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-medium text-text-secondary">Allowed Languages (Optional)</label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {['python', 'javascript', 'cpp', 'c', 'java'].map(lang => {
                                                                const currentCorrect = (q.correct as any) || {};
                                                                const allowed = currentCorrect.allowedLanguages || [];
                                                                const isAllowed = allowed.includes(lang);

                                                                return (
                                                                    <button
                                                                        key={lang}
                                                                        onClick={() => {
                                                                            let newAllowed;
                                                                            if (isAllowed) {
                                                                                newAllowed = allowed.filter((l: string) => l !== lang);
                                                                            } else {
                                                                                newAllowed = [...allowed, lang];
                                                                            }

                                                                            const updates: any = { allowedLanguages: newAllowed };

                                                                            // If we have allowed languages, and the current default is NOT in them, switch default
                                                                            if (newAllowed.length > 0 && !newAllowed.includes(currentCorrect.language || 'python')) {
                                                                                updates.language = newAllowed[0];
                                                                            }

                                                                            updateQuestion(index, { correct: { ...currentCorrect, ...updates } });
                                                                        }}
                                                                        className={cn(
                                                                            "px-2 py-1 text-xs rounded border transition-colors capitalize",
                                                                            isAllowed
                                                                                ? "bg-primary text-white border-primary"
                                                                                : "bg-surface text-muted border-neutral-200 dark:border-neutral-700 hover:border-primary/50"
                                                                        )}
                                                                    >
                                                                        {lang === 'cpp' ? 'C++' : lang}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <p className="text-[10px] text-muted">If empty, only Default Language is allowed.</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-text-secondary">Starter Code</label>
                                                    <textarea
                                                        className="w-full h-32 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-background text-text p-3 font-mono text-sm"
                                                        placeholder="# Write your code here"
                                                        value={(q.correct as any)?.starterCode || ''}
                                                        onChange={(e) => {
                                                            const current = (q.correct as any) || { language: 'python', testCases: [] };
                                                            updateQuestion(index, { correct: { ...current, starterCode: e.target.value } });
                                                        }}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-text-secondary">Hidden Driver Code (Appended to Student Code)</label>
                                                    <textarea
                                                        className="w-full h-32 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-background text-text p-3 font-mono text-sm"
                                                        placeholder={`# Example Driver Code (Python):
import sys
import json

# Read all input and split by lines, removing empty ones
lines = [line.strip() for line in sys.stdin.read().splitlines() if line.strip()]

if len(lines) < 2:
    print("Error: Invalid Input Format")
    sys.exit(1)

# Parse inputs
nums = json.loads(lines[0])
target = int(lines[1])

# Call student's function
s = Solution()
result = s.twoSum(nums, target)
print(result)`}
                                                        value={(q.correct as any)?.driverCode || ''}
                                                        onChange={(e) => {
                                                            const current = (q.correct as any) || { language: 'python', testCases: [] };
                                                            updateQuestion(index, { correct: { ...current, driverCode: e.target.value } });
                                                        }}
                                                    />
                                                    <p className="text-[10px] text-muted">This code runs after the student's code. Use it to call their function and print the result to stdout.</p>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-text-secondary flex justify-between items-center">
                                                        Test Cases
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                const current = (q.correct as any) || { language: 'python', starterCode: '', testCases: [] };
                                                                const cases = current?.testCases || [];
                                                                updateQuestion(index, { correct: { ...current, testCases: [...cases, { input: '', output: '' }] } });
                                                            }}
                                                        >
                                                            <PlusCircle className="h-4 w-4 mr-1" /> Add Case
                                                        </Button>
                                                    </label>
                                                    <div className="space-y-2">
                                                        {((q.correct as any)?.testCases || []).map((tc: any, tcIndex: number) => (
                                                            <div key={tcIndex} className="flex gap-2 items-start">
                                                                <div className="grid grid-cols-2 gap-2 flex-1">
                                                                    <textarea
                                                                        placeholder="Input (stdin)"
                                                                        value={tc.input}
                                                                        onChange={(e) => {
                                                                            const current = (q.correct as any);
                                                                            const newCases = [...current.testCases];
                                                                            newCases[tcIndex] = { ...tc, input: e.target.value };
                                                                            updateQuestion(index, { correct: { ...current, testCases: newCases } });
                                                                        }}
                                                                        className="w-full h-20 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-background text-text p-2 font-mono text-xs resize-y"
                                                                    />
                                                                    <textarea
                                                                        placeholder="Expected Output (stdout)"
                                                                        value={tc.output}
                                                                        onChange={(e) => {
                                                                            const current = (q.correct as any);
                                                                            const newCases = [...current.testCases];
                                                                            newCases[tcIndex] = { ...tc, output: e.target.value };
                                                                            updateQuestion(index, { correct: { ...current, testCases: newCases } });
                                                                        }}
                                                                        className="w-full h-20 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-background text-text p-2 font-mono text-xs resize-y"
                                                                    />
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-red-500 hover:text-red-600"
                                                                    onClick={() => {
                                                                        const current = (q.correct as any);
                                                                        const newCases = current.testCases.filter((_: any, i: number) => i !== tcIndex);
                                                                        updateQuestion(index, { correct: { ...current, testCases: newCases } });
                                                                    }}
                                                                >
                                                                    <MinusCircle className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {q.type === 'range' && (
                                            <div className="flex gap-4 p-4 border rounded-lg bg-surface/50 border-neutral-300 dark:border-neutral-600">
                                                <div className="flex-1 space-y-1">
                                                    <label className="text-xs font-medium text-text-secondary">Min Value</label>
                                                    <Input
                                                        type="number"
                                                        placeholder="Min"
                                                        value={(() => {
                                                            if (typeof q.correct === 'object' && q.correct !== null && 'min' in q.correct) {
                                                                return (q.correct as any).min ?? '';
                                                            }
                                                            try {
                                                                const parsed = typeof q.correct === 'string' ? JSON.parse(q.correct) : {};
                                                                return parsed.min ?? '';
                                                            } catch { return ''; }
                                                        })()}
                                                        onChange={(e) => {
                                                            let current: any = {};
                                                            if (typeof q.correct === 'object' && q.correct !== null) {
                                                                current = { ...q.correct };
                                                            } else if (typeof q.correct === 'string') {
                                                                try { current = JSON.parse(q.correct); } catch { }
                                                            }
                                                            const newVal = { ...current, min: Number(e.target.value) };
                                                            updateQuestion(index, { correct: newVal });
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <label className="text-xs font-medium text-text-secondary">Max Value</label>
                                                    <Input
                                                        type="number"
                                                        placeholder="Max"
                                                        value={(() => {
                                                            if (typeof q.correct === 'object' && q.correct !== null && 'max' in q.correct) {
                                                                return (q.correct as any).max ?? '';
                                                            }
                                                            try {
                                                                const parsed = typeof q.correct === 'string' ? JSON.parse(q.correct) : {};
                                                                return parsed.max ?? '';
                                                            } catch { return ''; }
                                                        })()}
                                                        onChange={(e) => {
                                                            let current: any = {};
                                                            if (typeof q.correct === 'object' && q.correct !== null) {
                                                                current = { ...q.correct };
                                                            } else if (typeof q.correct === 'string') {
                                                                try { current = JSON.parse(q.correct); } catch { }
                                                            }
                                                            const newVal = { ...current, max: Number(e.target.value) };
                                                            updateQuestion(index, { correct: newVal });
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}

                        {questions.length === 0 && (
                            <div className="text-center py-12 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl text-muted">
                                No questions added yet. Click "Add Question" to start or use Import.
                            </div>
                        )}
                        <div className="flex justify-end pt-4">
                            <div className="flex gap-2">
                                <select
                                    className="h-9 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-background text-text text-sm px-2"
                                    value={activeType}
                                    onChange={(e) => setActiveType(e.target.value as any)}
                                >
                                    <option value="mcq">Multiple Choice</option>
                                    <option value="true_false">True / False</option>
                                    <option value="text">Descriptive Text</option>
                                    <option value="numeric">Numeric Answer</option>
                                    <option value="range">Range Answer</option>
                                    <option value="code">Code Snippet</option>
                                </select>
                                <Button size="sm" onClick={addQuestion}>
                                    <Plus className="mr-2 h-4 w-4" /> Add Question
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

