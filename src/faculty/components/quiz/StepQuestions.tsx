import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import { Plus, Trash2, GripVertical, FileSpreadsheet, AlertTriangle, Image as ImageIcon, X, Loader2, FileArchive, CheckCircle, Download, PlusCircle, MinusCircle, Key, Sparkles, Play, CheckCircle2, Code2, Layers, Users, Mail, ListOrdered, Search, Hash, BookOpen } from 'lucide-react';
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
import { runTestCases, ExecutionResponse } from '../../../shared/utils/codeExecution';

const SRMIST_CLASS_EMAILS = [
    "pp1480@srmist.edu.in", "kr7949@srmist.edu.in", "gr3323@srmist.edu.in", "lk4885@srmist.edu.in",
    "sm1398@srmist.edu.in", "vs0214@srmist.edu.in", "as6545@srmist.edu.in", "ls1881@srmist.edu.in",
    "ms0541@srmist.edu.in", "tv2157@srmist.edu.in", "mm6377@srmist.edu.in", "pd2935@srmist.edu.in",
    "ub6511@srmist.edu.in", "ns1921@srmist.edu.in", "ar1113@srmist.edu.in", "gs4466@srmist.edu.in",
    "nv4942@srmist.edu.in", "ss9414@srmist.edu.in", "sj5726@srmist.edu.in", "sk4206@srmist.edu.in",
    "sb4582@srmist.edu.in", "nn8173@srmist.edu.in", "sl2827@srmist.edu.in", "ab7083@srmist.edu.in",
    "vb6028@srmist.edu.in", "as0267@srmist.edu.in", "lt9886@srmist.edu.in", "mh3040@srmist.edu.in",
    "hs7408@srmist.edu.in", "pj5088@srmist.edu.in", "gd1628@srmist.edu.in", "mn6742@srmist.edu.in",
    "vj0234@srmist.edu.in", "mh3277@srmist.edu.in", "tm7648@srmist.edu.in", "as1249@srmist.edu.in",
    "mb9299@srmist.edu.in", "cj9122@srmist.edu.in", "ar4764@srmist.edu.in", "ma8546@srmist.edu.in",
    "as8900@srmist.edu.in", "py1922@srmist.edu.in", "yt0479@srmist.edu.in", "na8288@srmist.edu.in",
    "sb5608@srmist.edu.in", "hj1830@srmist.edu.in", "aa5147@srmist.edu.in", "vp0519@srmist.edu.in",
    "ps8473@srmist.edu.in", "du3796@srmist.edu.in", "md9539@srmist.edu.in", "au3887@srmist.edu.in",
    "nb3358@srmist.edu.in", "jb4335@srmist.edu.in", "aa4617@srmist.edu.in", "nn2287@srmist.edu.in",
    "mb5486@srmist.edu.in", "pk8447@srmist.edu.in", "ag8389@srmist.edu.in", "ma8053@srmist.edu.in",
    "ts2682@srmist.edu.in", "em2424@srmist.edu.in"
];

export function StepQuestions({ questions, setQuestions, quizId, quizData, data, update }: any) {
    const qMeta = quizData || data || {};
    const isOriginals = qMeta.type === 'originals' || qMeta.settings?.category?.toUpperCase() === 'ORIGINALS' || qMeta.settings?.category?.toUpperCase() === 'PROBLE ORIGINALS';
    const useKeywords = Boolean(qMeta.settings?.useKeywords);
    const isAiEvaluationMode = isOriginals && !useKeywords;
    const isLiveCoding = Boolean(qMeta.settings?.setsConfig?.enabled) || Boolean(qMeta.settings?.isCodingTest);
    const { user } = useAuth();
    // ML Coding toggle is only shown to faculty with an @srmist.edu.in email
    const isSrmFaculty = (user?.email || '').toLowerCase().endsWith('@srmist.edu.in');
    const [activeType, setActiveType] = useState<Question['type']>(isLiveCoding ? 'code' : 'mcq');
    const [view, setView] = useState<'list' | 'import' | 'existing'>('list');
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
    const [testingCode, setTestingCode] = useState<{ [qIndex: number]: boolean }>({});
    const [codeTestResults, setCodeTestResults] = useState<{ [qIndex: number]: ExecutionResponse | null }>({});

    const [forcedCodeMode, setForcedCodeMode] = useState<boolean | null>(null);
    // Question Sets Configuration (Moved to Step 3 for Code Mode)
    const isCodeMode = forcedCodeMode !== null 
        ? forcedCodeMode 
        : (activeType === 'code' || (Array.isArray(questions) && questions.some((q: any) => q.type === 'code')) || Boolean(qMeta.settings?.isCodingTest));
    const setsConfig = qMeta.settings?.setsConfig || {};
    const setsEnabled = setsConfig.enabled ?? true;
    const questionsPerStudent = Number(setsConfig.questionsPerStudent) > 0 ? Number(setsConfig.questionsPerStudent) : 2;
    const totalCodeQuestions = questions.length > 0 ? questions.length : (Number(setsConfig.totalQuestions) > 0 ? Number(setsConfig.totalQuestions) : 10);
    const rawEmails = typeof setsConfig.rawEmails === 'string' ? setsConfig.rawEmails : '';

    const [searchTerm, setSearchTerm] = useState('');

    const extractedEmails = useMemo(() => {
        if (!rawEmails) return [];
        const matches = rawEmails.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        return Array.from(new Set(matches.map(e => e.trim().toLowerCase())));
    }, [rawEmails]);

    const computedMappings = useMemo(() => {
        if (extractedEmails.length === 0 || questionsPerStudent <= 0 || totalCodeQuestions <= 0) return [];
        const numSets = Math.max(1, Math.ceil(totalCodeQuestions / questionsPerStudent));

        return extractedEmails.map((email, idx) => {
            const setIndex = idx % numSets;
            const startQ = setIndex * questionsPerStudent + 1;
            const endQ = Math.min(totalCodeQuestions, (setIndex + 1) * questionsPerStudent);
            const startIndex = setIndex * questionsPerStudent;
            const endIndex = endQ - 1;
            const setNumber = setIndex + 1;
            const setName = `Set ${setNumber}`;

            return {
                email,
                studentIndex: idx,
                setNumber,
                setName,
                startQuestion: startQ,
                endQuestion: endQ,
                startIndex,
                endIndex,
                questionCount: Math.max(0, endQ - startQ + 1)
            };
        });
    }, [extractedEmails, questionsPerStudent, totalCodeQuestions]);

    const updateSets = (updates: any) => {
        const nextEnabled = updates.enabled !== undefined ? updates.enabled : setsEnabled;
        const nextQPerStudent = updates.questionsPerStudent !== undefined ? Number(updates.questionsPerStudent) : questionsPerStudent;
        const nextTotalQ = updates.totalQuestions !== undefined ? Number(updates.totalQuestions) : totalCodeQuestions;
        const nextRawEmails = updates.rawEmails !== undefined ? updates.rawEmails : rawEmails;

        const emails = (nextRawEmails.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])
            .map((e: string) => e.trim().toLowerCase());
        const dedupedEmails = Array.from(new Set(emails));
        const numSets = Math.max(1, Math.ceil(nextTotalQ / nextQPerStudent));

        const mappings = dedupedEmails.map((email: string, idx: number) => {
            const setIndex = idx % numSets;
            const startQ = setIndex * nextQPerStudent + 1;
            const endQ = Math.min(nextTotalQ, (setIndex + 1) * nextQPerStudent);
            const startIndex = setIndex * nextQPerStudent;
            const endIndex = endQ - 1;
            const setNumber = setIndex + 1;
            const setName = `Set ${setNumber}`;

            return {
                email,
                studentIndex: idx,
                setNumber,
                setName,
                startQuestion: startQ,
                endQuestion: endQ,
                startIndex,
                endIndex,
                questionCount: Math.max(0, endQ - startQ + 1)
            };
        });

        if (typeof update === 'function') {
            update({
                settings: {
                    ...qMeta.settings,
                    isCodingTest: true,
                    setsConfig: {
                        enabled: nextEnabled,
                        questionsPerStudent: nextQPerStudent,
                        totalQuestions: nextTotalQ,
                        rawEmails: nextRawEmails,
                        mappings
                    }
                }
            });
        }
    };

    // Auto sync total questions with actual questions count
    useEffect(() => {
        if (questions.length > 0 && isCodeMode && questions.length !== setsConfig.totalQuestions) {
            updateSets({ totalQuestions: questions.length });
        }
    }, [questions.length, isCodeMode]);

    const filteredMappings = useMemo(() => {
        if (!searchTerm.trim()) return computedMappings;
        const s = searchTerm.toLowerCase();
        return computedMappings.filter(m => 
            m.email.toLowerCase().includes(s) || 
            m.setName.toLowerCase().includes(s) ||
            String(m.studentIndex + 1).includes(s)
        );
    }, [computedMappings, searchTerm]);

    const numSets = Math.max(1, Math.ceil(totalCodeQuestions / questionsPerStudent));

    const ML_PRESETS = [
        {
            name: 'Mean Squared Error (MSE)',
            description: 'Calculate MSE between actual and predicted float vectors',
            stem: '### Machine Learning: Mean Squared Error (MSE)\nCalculate the Mean Squared Error (MSE) between actual values and predicted values.\n\n**Input Format:**\n- Line 1: Space-separated float values representing actual values $y$\n- Line 2: Space-separated float values representing predicted values $\\hat{y}$\n\n**Output Format:**\n- Print the MSE rounded to 4 decimal places.',
            starterCode: `# Python 3 - Mean Squared Error (MSE)
import sys

def calculate_mse():
    lines = [line.strip() for line in sys.stdin.read().splitlines() if line.strip()]
    if len(lines) < 2:
        return
    
    y = [float(x) for x in lines[0].split()]
    y_pred = [float(x) for x in lines[1].split()]
    
    # TODO: Calculate Mean Squared Error (MSE) between y and y_pred
    # Formula: MSE = (1/n) * sum((y_i - y_pred_i)**2)
    # Print the calculated MSE rounded to 4 decimal places (e.g. 0.8750)
    pass

if __name__ == '__main__':
    calculate_mse()`,
            solutionCode: `# Python 3 - Mean Squared Error (MSE)
import sys

def calculate_mse():
    lines = [line.strip() for line in sys.stdin.read().splitlines() if line.strip()]
    if len(lines) < 2:
        return
    
    y = [float(x) for x in lines[0].split()]
    y_pred = [float(x) for x in lines[1].split()]
    
    mse = sum((actual - pred) ** 2 for actual, pred in zip(y, y_pred)) / len(y)
    print(f"{mse:.4f}")

if __name__ == '__main__':
    calculate_mse()`,
            driverCode: '',
            testCases: [
                { input: '3.0 5.0 2.5 7.0\n2.5 5.0 4.0 8.0', output: '0.8750' },
                { input: '1.0 2.0 3.0\n1.0 2.0 3.0', output: '0.0000' },
                { input: '10.5 20.0 30.5\n12.0 18.5 32.0', output: '2.2500' }
            ]
        },
        {
            name: 'Sigmoid Activation',
            description: 'Compute Sigmoid 1 / (1 + exp(-z)) for logistic regression',
            stem: '### Machine Learning: Sigmoid Activation Function\nImplement the Sigmoid activation function $\\sigma(z) = \\frac{1}{1 + e^{-z}}$ for input values $z$.\n\n**Input Format:**\n- Single line of space-separated float numbers representing $z$.\n\n**Output Format:**\n- Space-separated sigmoid values rounded to 4 decimal places.',
            starterCode: `# Python 3 - Sigmoid Activation
import sys
import math

def sigmoid():
    data = sys.stdin.read().strip()
    if not data:
        return
    
    values = [float(x) for x in data.split()]
    
    # TODO: Calculate sigmoid for each value: 1.0 / (1.0 + exp(-z))
    # Print space-separated results rounded to 4 decimal places
    pass

if __name__ == '__main__':
    sigmoid()`,
            solutionCode: `# Python 3 - Sigmoid Activation
import sys
import math

def sigmoid():
    data = sys.stdin.read().strip()
    if not data:
        return
    
    values = [float(x) for x in data.split()]
    results = [1.0 / (1.0 + math.exp(-z)) for z in values]
    print(" ".join(f"{r:.4f}" for r in results))

if __name__ == '__main__':
    sigmoid()`,
            driverCode: '',
            testCases: [
                { input: '0', output: '0.5000' },
                { input: '-2 0 2', output: '0.1192 0.5000 0.8808' },
                { input: '5 -5', output: '0.9933 0.0067' }
            ]
        },
        {
            name: 'Euclidean Distance (KNN)',
            description: 'Calculate Euclidean distance between two n-dimensional vectors',
            stem: '### Machine Learning: Euclidean Distance\nCompute Euclidean distance between two vectors $p$ and $q$ in $n$-dimensional feature space.\n\n**Input Format:**\n- Line 1: Space-separated float values representing vector $p$\n- Line 2: Space-separated float values representing vector $q$\n\n**Output Format:**\n- Print the Euclidean distance rounded to 4 decimal places.',
            starterCode: `# Python 3 - Euclidean Distance
import sys
import math

def euclidean_distance():
    lines = [line.strip() for line in sys.stdin.read().splitlines() if line.strip()]
    if len(lines) < 2:
        return
    
    p = [float(x) for x in lines[0].split()]
    q = [float(x) for x in lines[1].split()]
    
    # TODO: Calculate Euclidean distance between vectors p and q
    # Print the distance rounded to 4 decimal places
    pass

if __name__ == '__main__':
    euclidean_distance()`,
            solutionCode: `# Python 3 - Euclidean Distance
import sys
import math

def euclidean_distance():
    lines = [line.strip() for line in sys.stdin.read().splitlines() if line.strip()]
    if len(lines) < 2:
        return
    
    p = [float(x) for x in lines[0].split()]
    q = [float(x) for x in lines[1].split()]
    
    dist = math.sqrt(sum((a - b) ** 2 for a, b in zip(p, q)))
    print(f"{dist:.4f}")

if __name__ == '__main__':
    euclidean_distance()`,
            driverCode: '',
            testCases: [
                { input: '1 2 3\n4 6 8', output: '7.0711' },
                { input: '0 0\n3 4', output: '5.0000' },
                { input: '2.5 1.0\n2.5 1.0', output: '0.0000' }
            ]
        },
        {
            name: 'Linear Regression Inference',
            description: 'Predict y = w * x + b for given weights and features',
            stem: '### Machine Learning: Linear Regression Inference\nGiven weight $w$ and bias $b$, compute predictions $\\hat{y} = w \\cdot x + b$ for feature inputs $x$.\n\n**Input Format:**\n- Line 1: Weight $w$ and bias $b$ (two float numbers)\n- Line 2: Space-separated feature inputs $x$\n\n**Output Format:**\n- Space-separated predictions rounded to 2 decimal places.',
            starterCode: `# Python 3 - Linear Regression
import sys

def predict():
    lines = [line.strip() for line in sys.stdin.read().splitlines() if line.strip()]
    if len(lines) < 2:
        return
    
    w, b = [float(v) for v in lines[0].split()]
    x_vals = [float(v) for v in lines[1].split()]
    
    # TODO: Calculate predictions for each x in x_vals: y_pred = w * x + b
    # Print space-separated predictions rounded to 2 decimal places
    pass

if __name__ == '__main__':
    predict()`,
            solutionCode: `# Python 3 - Linear Regression
import sys

def predict():
    lines = [line.strip() for line in sys.stdin.read().splitlines() if line.strip()]
    if len(lines) < 2:
        return
    
    w, b = [float(v) for v in lines[0].split()]
    x_vals = [float(v) for v in lines[1].split()]
    
    preds = [w * x + b for x in x_vals]
    print(" ".join(f"{p:.2f}" for p in preds))

if __name__ == '__main__':
    predict()`,
            driverCode: '',
            testCases: [
                { input: '2.5 1.0\n1 2 3 4', output: '3.50 6.00 8.50 11.00' },
                { input: '-1.5 0.0\n2 4 -2', output: '-3.00 -6.00 3.00' },
                { input: '0.0 5.0\n10 20 30', output: '5.00 5.00 5.00' }
            ]
        },
        {
            name: 'Classification Accuracy',
            description: 'Compute classification accuracy percentage given true and predicted labels',
            stem: '### Machine Learning: Classification Accuracy\nCalculate the classification accuracy score given ground truth binary labels and predicted binary labels.\n\n**Input Format:**\n- Line 1: Space-separated true binary labels (0 or 1)\n- Line 2: Space-separated predicted binary labels (0 or 1)\n\n**Output Format:**\n- Print accuracy percentage rounded to 2 decimal places (e.g. 83.33%).',
            starterCode: `# Python 3 - Classification Accuracy
import sys

def accuracy():
    lines = [line.strip() for line in sys.stdin.read().splitlines() if line.strip()]
    if len(lines) < 2:
        return
    
    y_true = [int(x) for x in lines[0].split()]
    y_pred = [int(x) for x in lines[1].split()]
    
    # TODO: Calculate accuracy: (correct_matches / total_samples) * 100
    # Print formatted accuracy string e.g. 83.33%
    pass

if __name__ == '__main__':
    accuracy()`,
            solutionCode: `# Python 3 - Classification Accuracy
import sys

def accuracy():
    lines = [line.strip() for line in sys.stdin.read().splitlines() if line.strip()]
    if len(lines) < 2:
        return
    
    y_true = [int(x) for x in lines[0].split()]
    y_pred = [int(x) for x in lines[1].split()]
    
    correct = sum(1 for yt, yp in zip(y_true, y_pred) if yt == yp)
    acc = (correct / len(y_true)) * 100
    print(f"{acc:.2f}%")

if __name__ == '__main__':
    accuracy()`,
            driverCode: '',
            testCases: [
                { input: '1 0 1 1 0 1\n1 0 1 0 0 1', output: '83.33%' },
                { input: '1 1 0 0\n1 1 0 0', output: '100.00%' },
                { input: '1 0 1 0\n0 1 0 1', output: '0.00%' }
            ]
        }
    ];

    const DEFAULT_CODE_SNIPPET = {
        language: 'python',
        allowedLanguages: ['python'],
        starterCode: `# Python 3 - Machine Learning Template
import sys
import math

def solve():
    # Read input from stdin
    lines = [line.strip() for line in sys.stdin.read().splitlines() if line.strip()]
    if not lines:
        return
    
    # Process inputs
    print("Output result")

if __name__ == "__main__":
    solve()`,
        driverCode: '',
        testCases: [
            { input: '1 2 3', output: 'Output result' }
        ]
    };

    const handleTestQuestionCode = async (index: number, q: Question) => {
        const correct = (q.correct as any) || {};
        const lang = correct.language || 'python';
        const starterCode = correct.starterCode || '';
        const driverCode = correct.driverCode || '';
        const testCases = correct.testCases || [];

        // If starter code is just a scaffold with pass/TODO, test the reference solution so tests pass
        const testCode = (correct.solutionCode && (starterCode.includes('pass') || !starterCode.trim()))
            ? correct.solutionCode
            : starterCode;

        setTestingCode(prev => ({ ...prev, [index]: true }));
        try {
            const res = await runTestCases({
                language: lang,
                studentCode: testCode,
                driverCode,
                testCases,
            });
            setCodeTestResults(prev => ({ ...prev, [index]: res }));
        } catch (err: any) {
            setCodeTestResults(prev => ({
                ...prev,
                [index]: {
                    allPassed: false,
                    combinedStdout: '',
                    combinedStderr: err.message || 'Error running test',
                    results: [],
                },
            }));
        } finally {
            setTestingCode(prev => ({ ...prev, [index]: false }));
        }
    };

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

    const downloadTemplate = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        try {
            const headers = ['Question No', 'Question', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Correct Answer', 'Keywords'];
            const sampleRow = ['Q1', 'Sample Question?', 'Option A', 'Option B', 'Option C', 'Option D', 'A', 'keyword1, keyword2'];

            const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Template");

            XLSX.writeFile(wb, "quiz_template.xlsx");
        } catch (error: any) {
            console.error("Error downloading template", error);
            alert(`Failed to download template: ${error.message || error}`);
        }
    };

    const downloadCodeTemplate = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        try {
            const headers = [
                'Question',
                'Starter Code',
                'Test Case 1 Input',
                'Test Case 1 Output',
                'Test Case 2 Input',
                'Test Case 2 Output',
                'Test Case 3 Input',
                'Test Case 3 Output',
                'Test Case 4 Input',
                'Test Case 4 Output'
            ];

            const sampleRow1 = [
                "Write a Python function to calculate the sum of two integers.\n\nInput Format:\nTwo space-separated integers on line 1.\n\nOutput Format:\nPrint the sum of the integers.",
                `import sys

def solve():
    line = sys.stdin.read().strip()
    if not line:
        return
    a, b = map(int, line.split())
    print(a + b)

if __name__ == '__main__':
    solve()`,
                "3 5",
                "8",
                "10 -2",
                "8",
                "0 0",
                "0",
                "-5 -15",
                "-20"
            ];

            const sampleRow2 = [
                "Find the maximum integer in a list of numbers.\n\nInput Format:\nSpace-separated integers on line 1.\n\nOutput Format:\nPrint the maximum integer value.",
                `import sys

def find_max():
    nums = list(map(int, sys.stdin.read().split()))
    if nums:
        print(max(nums))

if __name__ == '__main__':
    find_max()`,
                "4 9 2 7 1",
                "9",
                "-5 -10 -1",
                "-1",
                "100",
                "100",
                "7 7 7",
                "7"
            ];

            const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow1, sampleRow2]);
            ws['!cols'] = [
                { wch: 45 },
                { wch: 40 },
                { wch: 20 },
                { wch: 20 },
                { wch: 20 },
                { wch: 20 },
                { wch: 20 },
                { wch: 20 },
                { wch: 20 },
                { wch: 20 }
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Code_Questions");
            XLSX.writeFile(wb, "code_questions_template.xlsx");
        } catch (error: any) {
            console.error("Error downloading code template", error);
            alert(`Failed to download template: ${error.message || error}`);
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
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

                if (!rawRows || rawRows.length === 0) {
                    throw new Error("Excel file is empty");
                }

                // Filter out completely empty rows at the beginning if any
                const validRows = rawRows.filter(r => Array.isArray(r) && r.some(cell => String(cell || '').trim() !== ''));
                if (validRows.length < 2) {
                    throw new Error("Excel file must contain a header row and at least one question row");
                }

                const headerRow = (validRows[0] || []).map(cell => String(cell || '').trim());
                const sampleRow = (validRows[1] || []).map(cell => String(cell || '').trim());

                // Identify indices of all headers
                let qNoCol = -1;
                let qTextCol = -1;
                let opt1Col = -1;
                let opt2Col = -1;
                let opt3Col = -1;
                let opt4Col = -1;
                let correctCol = -1;
                let keywordsCol = -1;

                // Step 1: Detect Option, Correct, and Keywords columns first
                headerRow.forEach((h, idx) => {
                    const clean = h.toLowerCase();
                    if (/^(option\s*1|option\s*a|opt\s*1|opt\s*a|choice\s*1|choice\s*a)$/i.test(clean) || /option\s*[1a]|opt\s*[1a]|choice\s*[1a]/i.test(clean)) {
                        if (opt1Col === -1) opt1Col = idx;
                    } else if (/^(option\s*2|option\s*b|opt\s*2|opt\s*b|choice\s*2|choice\s*b)$/i.test(clean) || /option\s*[2b]|opt\s*[2b]|choice\s*[2b]/i.test(clean)) {
                        if (opt2Col === -1) opt2Col = idx;
                    } else if (/^(option\s*3|option\s*c|opt\s*3|opt\s*c|choice\s*3|choice\s*c)$/i.test(clean) || /option\s*[3c]|opt\s*[3c]|choice\s*[3c]/i.test(clean)) {
                        if (opt3Col === -1) opt3Col = idx;
                    } else if (/^(option\s*4|option\s*d|opt\s*4|opt\s*d|choice\s*4|choice\s*d)$/i.test(clean) || /option\s*[4d]|opt\s*[4d]|choice\s*[4d]/i.test(clean)) {
                        if (opt4Col === -1) opt4Col = idx;
                    } else if (/^(keywords?|key\s*words?|explanation\s*keywords?)$/i.test(clean) || /keyword/i.test(clean)) {
                        if (keywordsCol === -1) keywordsCol = idx;
                    } else if (/^(correct\s*answer|correct\s*option|correct|answer\s*key|answer|key)$/i.test(clean) && !/keyword/i.test(clean)) {
                        if (correctCol === -1) correctCol = idx;
                    }
                });

                // Step 2: Detect Question Number vs Question Text
                headerRow.forEach((h, idx) => {
                    if ([opt1Col, opt2Col, opt3Col, opt4Col, correctCol, keywordsCol].includes(idx)) return;
                    const clean = h.toLowerCase();

                    if (/^(q\.?\s*no\.?|question\s*no\.?|q#|sl\.?\s*no\.?|s\.?\s*no\.?|no\.?)$/i.test(clean)) {
                        qNoCol = idx;
                    } else if (/^(question\s*text|stem|problem|prompt|q_text)$/i.test(clean)) {
                        qTextCol = idx;
                    }
                });

                // Step 3: Disambiguate remaining Question columns (handles files with duplicate 'Question' headers)
                const unassignedQuestionCols: number[] = [];
                headerRow.forEach((h, idx) => {
                    if ([opt1Col, opt2Col, opt3Col, opt4Col, correctCol, keywordsCol].includes(idx)) return;
                    if (/^question/i.test(h.trim()) || idx < (opt1Col !== -1 ? opt1Col : 2)) {
                        unassignedQuestionCols.push(idx);
                    }
                });

                if (unassignedQuestionCols.length === 1) {
                    if (qTextCol === -1) qTextCol = unassignedQuestionCols[0];
                } else if (unassignedQuestionCols.length >= 2) {
                    // Check sample row to identify which column has short IDs (Q1, Q2) vs full question text
                    const colA = unassignedQuestionCols[0];
                    const colB = unassignedQuestionCols[1];
                    const sampleA = String(sampleRow[colA] || '').trim();
                    const sampleB = String(sampleRow[colB] || '').trim();

                    if (/^q?\d+$/i.test(sampleA) || (sampleA.length > 0 && sampleA.length < sampleB.length)) {
                        if (qNoCol === -1) qNoCol = colA;
                        if (qTextCol === -1) qTextCol = colB;
                    } else {
                        if (qNoCol === -1) qNoCol = colB;
                        if (qTextCol === -1) qTextCol = colA;
                    }
                }

                if (qTextCol === -1) {
                    qTextCol = unassignedQuestionCols.length > 0 ? unassignedQuestionCols[0] : 0;
                }

                if (opt1Col === -1 || correctCol === -1 || qTextCol === -1) {
                    throw new Error(`Missing required columns (Question, Option 1, Correct). Found headers: ${headerRow.join(', ')}`);
                }

                setImportStatus(`Processing ${validRows.length - 1} questions...`);

                const newQuestions: Question[] = [];
                let mappedCount = 0;

                for (let r = 1; r < validRows.length; r++) {
                    const row = validRows[r];
                    let qNo = qNoCol !== -1 ? row[qNoCol] : undefined;
                    let questionText = qTextCol !== -1 ? String(row[qTextCol] ?? '').trim() : '';

                    // Safety check: If questionText is just a question number (e.g., 'Q1', 'Q16', '1', 'Q.1')
                    // and qNo (or any unassigned column) actually has the full text, swap them!
                    if (/^Q?\d+[:.)-]?$/i.test(questionText)) {
                        const alternativeCol = [qNoCol, ...unassignedQuestionCols, 0, 1].find(c =>
                            c !== -1 &&
                            c !== qTextCol &&
                            row[c] !== undefined &&
                            !/^Q?\d+[:.)-]?$/i.test(String(row[c] ?? '').trim()) &&
                            String(row[c] ?? '').trim().length > 0
                        );
                        if (alternativeCol !== undefined) {
                            qNo = questionText;
                            questionText = String(row[alternativeCol] ?? '').trim();
                        }
                    }

                    const opt1 = opt1Col !== -1 ? String(row[opt1Col] ?? '').trim() : '';
                    const opt2 = opt2Col !== -1 ? String(row[opt2Col] ?? '').trim() : '';
                    const opt3 = opt3Col !== -1 ? String(row[opt3Col] ?? '').trim() : '';
                    const opt4 = opt4Col !== -1 ? String(row[opt4Col] ?? '').trim() : '';
                    const correctChar = correctCol !== -1 ? String(row[correctCol] ?? '').trim() : '';

                    if (!questionText && !zipFile) {
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

                    const keywordsRaw = keywordsCol !== -1 ? row[keywordsCol] : '';
                    const keywordsList = keywordsRaw ? String(keywordsRaw).split(/[;,|]+/).map((s: string) => s.trim()).filter(Boolean) : undefined;

                    newQuestions.push({
                        id: uuidv4(),
                        quizId: quizId || '',
                        type: type,
                        stem: questionText || '',
                        options: type === 'true_false' ? ['True', 'False'] : [opt1, opt2, opt3, opt4].map(o => String(o || '')),
                        keywords: keywordsList,
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

    // Handle Code Excel Drop and Processing
    const onCodeExcelDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setIsProcessing(true);
        setImportStatus('Reading Code Questions Excel file...');
        setError(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

                if (!rawRows || rawRows.length < 2) {
                    throw new Error("Excel file must contain a header row and at least one code question.");
                }

                const validRows = rawRows.filter(r => Array.isArray(r) && r.some(cell => String(cell || '').trim() !== ''));
                if (validRows.length < 2) {
                    throw new Error("No data rows found in Excel sheet.");
                }

                const headerRow = (validRows[0] || []).map(cell => String(cell || '').trim());

                // Detect Question / Stem column
                let questionCol = -1;
                let starterCodeCol = -1;

                headerRow.forEach((h, idx) => {
                    const clean = h.toLowerCase().trim();
                    if (/^(question|stem|problem|prompt|description|problem\s*description|q_text)$/i.test(clean)) {
                        questionCol = idx;
                    } else if (questionCol === -1 && clean.includes('question') && !clean.includes('no')) {
                        questionCol = idx;
                    } else if (/^(starter\s*code|starter|code|initial\s*code|template\s*code|code\s*template)$/i.test(clean)) {
                        starterCodeCol = idx;
                    }
                });

                if (questionCol === -1) {
                    questionCol = 0; // Default to column 0 if no header matches
                }

                // Detect test case pairs (1..30)
                const testCasePairs: Array<{ inputCol: number; outputCol: number; num: number }> = [];

                for (let i = 1; i <= 30; i++) {
                    let inCol = -1;
                    let outCol = -1;

                    headerRow.forEach((h, colIdx) => {
                        const clean = h.toLowerCase().replace(/[\s_\-#.]/g, '');
                        // Match testcase1input, 1input, input1, case1input, tc1input
                        if (
                            clean === `testcase${i}input` ||
                            clean === `case${i}input` ||
                            clean === `tc${i}input` ||
                            clean === `input${i}` ||
                            clean === `${i}input` ||
                            (clean.includes(`case${i}`) && clean.includes('input')) ||
                            (clean.includes(`${i}`) && clean.includes('input'))
                        ) {
                            inCol = colIdx;
                        } else if (
                            clean === `testcase${i}output` ||
                            clean === `case${i}output` ||
                            clean === `tc${i}output` ||
                            clean === `output${i}` ||
                            clean === `${i}output` ||
                            (clean.includes(`case${i}`) && clean.includes('output')) ||
                            (clean.includes(`${i}`) && clean.includes('output'))
                        ) {
                            outCol = colIdx;
                        }
                    });

                    if (inCol !== -1 && outCol !== -1) {
                        testCasePairs.push({ inputCol: inCol, outputCol: outCol, num: i });
                    }
                }

                // Fallback: If no numbered columns matched, match columns that contain "input" and "output"
                if (testCasePairs.length === 0) {
                    const inCols: number[] = [];
                    const outCols: number[] = [];
                    headerRow.forEach((h, colIdx) => {
                        if (colIdx === questionCol || colIdx === starterCodeCol) return;
                        const clean = h.toLowerCase();
                        if (clean.includes('input')) inCols.push(colIdx);
                        else if (clean.includes('output')) outCols.push(colIdx);
                    });

                    const count = Math.min(inCols.length, outCols.length);
                    for (let i = 0; i < count; i++) {
                        testCasePairs.push({ inputCol: inCols[i], outputCol: outCols[i], num: i + 1 });
                    }
                }

                const importedQuestions: Question[] = [];

                for (let r = 1; r < validRows.length; r++) {
                    const row = validRows[r];
                    const stem = String(row[questionCol] ?? '').trim();
                    if (!stem) continue;

                    const starterCode = (starterCodeCol !== -1 && row[starterCodeCol] !== undefined && String(row[starterCodeCol]).trim() !== '')
                        ? String(row[starterCodeCol]).trim()
                        : DEFAULT_CODE_SNIPPET.starterCode;

                    const testCases: Array<{ input: string; output: string }> = [];

                    testCasePairs.forEach(pair => {
                        const inVal = row[pair.inputCol] !== undefined ? String(row[pair.inputCol]).trim() : '';
                        const outVal = row[pair.outputCol] !== undefined ? String(row[pair.outputCol]).trim() : '';
                        if (inVal !== '' || outVal !== '') {
                            testCases.push({ input: inVal, output: outVal });
                        }
                    });

                    if (testCases.length === 0) {
                        testCases.push({ input: '1', output: '1' });
                    }

                    importedQuestions.push({
                        id: uuidv4(),
                        quizId: quizId || '',
                        type: 'code',
                        stem: stem,
                        weight: 1,
                        correct: {
                            language: 'python',
                            allowedLanguages: ['python'],
                            starterCode: starterCode,
                            driverCode: '',
                            testCases: testCases
                        }
                    });
                }

                if (importedQuestions.length === 0) {
                    throw new Error("No valid code questions could be parsed from the Excel sheet.");
                }

                setQuestions((prev: any[]) => [...prev, ...importedQuestions]);
                setIsProcessing(false);
                setView('list');
                alert(`Successfully imported ${importedQuestions.length} Code Challenge(s) with test cases!`);
            } catch (err: any) {
                console.error("Code excel import error:", err);
                setError(err.message || "Failed to process Excel file.");
                setIsProcessing(false);
            }
        };

        reader.onerror = () => {
            setError("Failed to read file.");
            setIsProcessing(false);
        };

        reader.readAsBinaryString(file);
    }, [questions, setQuestions, quizId, DEFAULT_CODE_SNIPPET.starterCode]);

    const { getExcelRootProps, getInputProps: getExcelInputProps, isDragActive: isExcelDragActive } = useDropzone({
        onDrop: onExcelDrop,
        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
        maxFiles: 1,
        disabled: isProcessing
    });

    const { getRootProps: getCodeExcelRootProps, getInputProps: getCodeExcelInputProps, isDragActive: isCodeExcelDragActive } = useDropzone({
        onDrop: onCodeExcelDrop,
        accept: { 
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls']
        },
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
        const questionType = isCodeMode ? 'code' : 'mcq';
        const newQuestion: Question = {
            id: uuidv4(),
            quizId: '',
            type: questionType,
            stem: '',
            weight: 1,
            options: questionType === 'mcq' ? ['', '', '', ''] : undefined,
            correct: questionType === 'code' ? { ...DEFAULT_CODE_SNIPPET } : 0,
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold text-text">Questions Management</h2>
                    <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl border border-neutral-300 dark:border-neutral-700">
                        <button
                            type="button"
                            onClick={() => {
                                setForcedCodeMode(false);
                                setActiveType('mcq');
                                if (view === 'import') setView('list');
                            }}
                            className={cn(
                                "px-3 py-1 rounded-lg text-xs font-semibold transition-all",
                                !isCodeMode 
                                    ? "bg-surface text-text shadow-sm" 
                                    : "text-muted hover:text-text"
                            )}
                        >
                            Standard / MCQ
                        </button>
                        {isSrmFaculty && (
                        <button
                            type="button"
                            onClick={() => {
                                setForcedCodeMode(true);
                                setActiveType('code');
                                if (view === 'import') setView('list');
                            }}
                            className={cn(
                                "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                                isCodeMode 
                                    ? "bg-emerald-600 text-white shadow-sm" 
                                    : "text-muted hover:text-emerald-600 dark:hover:text-emerald-400"
                            )}
                        >
                            <Code2 className="w-3.5 h-3.5" />
                            ML Coding
                        </button>
                        )}
                    </div>
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
                {isCodeMode ? (
                    <button
                        className={cn(
                            "px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                            view === 'import'
                                ? "border-primary text-primary"
                                : "border-transparent text-muted hover:text-text hover:border-neutral-300 dark:border-neutral-600"
                        )}
                        onClick={() => setView('import')}
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                        Bulk Import (Code)
                    </button>
                ) : (
                    <>
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
                    </>
                )}
            </div>




            {
                view === 'import' ? (
                    isCodeMode ? (
                        /* CODE QUESTIONS BULK IMPORT VIEW */
                        <div className="space-y-8 animate-in fade-in duration-300">
                            {/* Code Header and Template Download */}
                            <div className="p-6 rounded-2xl border-2 border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-md">
                                        <Code2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-text flex items-center gap-2">
                                            Bulk Import Code Questions (.xlsx)
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                                                Excel Format
                                            </span>
                                        </h3>
                                        <p className="text-xs text-muted mt-0.5">
                                            Upload an Excel file with Question, Starter Code, and test case inputs & outputs.
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    type="button"
                                    onClick={downloadCodeTemplate}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-3.5 gap-2 shadow-sm shrink-0"
                                >
                                    <Download className="w-4 h-4" />
                                    Download Code Template (.xlsx)
                                </Button>
                            </div>

                            {/* Code Excel Dropzone */}
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-text flex items-center gap-2">
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                                    Upload Code Question Sheet (.xlsx)
                                </h3>
                                <div {...getCodeExcelRootProps()} className={cn(
                                    "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all",
                                    isCodeExcelDragActive ? "border-emerald-500 bg-emerald-500/10" : "border-neutral-300 dark:border-neutral-600 hover:border-emerald-500",
                                    error ? "border-red-300 bg-red-50 dark:bg-red-950/20" : "",
                                    isProcessing ? "pointer-events-none opacity-50" : ""
                                )}>
                                    <input {...getCodeExcelInputProps()} />

                                    {isProcessing ? (
                                        <div className="flex flex-col items-center">
                                            <Loader2 className="h-12 w-12 text-emerald-500 animate-spin mb-4" />
                                            <p className="text-lg font-medium text-text">Processing Code Questions...</p>
                                            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">{importStatus}</p>
                                        </div>
                                    ) : (
                                        <>
                                            <FileSpreadsheet className={cn("mx-auto h-12 w-12 mb-4", error ? "text-red-400" : "text-emerald-500")} />
                                            <p className="text-lg font-bold text-text">
                                                {isCodeExcelDragActive ? "Drop Excel file here" : "Drag & drop Code Questions Excel here"}
                                            </p>
                                            <p className="text-xs text-muted mt-2">
                                                Click to browse file • Supports multiple test cases per challenge
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-red-600 bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-sm">
                                    <AlertTriangle className="h-5 w-5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Required Columns Guide Table */}
                            <div className="bg-surface p-5 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-bold text-text">Expected Excel Columns</h4>
                                        <p className="text-xs text-muted">Each row becomes a Python code challenge with its test cases.</p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={downloadCodeTemplate}
                                        className="text-xs h-7 px-2.5 gap-1.5 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        Sample Template
                                    </Button>
                                </div>

                                <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
                                    <table className="w-full text-xs text-left text-text border-collapse">
                                        <thead className="bg-neutral-100 dark:bg-neutral-800 text-muted font-bold">
                                            <tr>
                                                <th className="px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-700">Question</th>
                                                <th className="px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-700">Starter Code</th>
                                                <th className="px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-700">Test Case 1 Input</th>
                                                <th className="px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-700">Test Case 1 Output</th>
                                                <th className="px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-700">Test Case 2 Input</th>
                                                <th className="px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-700">Test Case 2 Output</th>
                                                <th className="px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-700 text-muted/60">... (N Input / Output)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700/60 font-mono text-[11px]">
                                            <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-850/50">
                                                <td className="px-3 py-2 text-text font-sans font-medium">Sum of two numbers</td>
                                                <td className="px-3 py-2 text-emerald-600 dark:text-emerald-400">import sys...</td>
                                                <td className="px-3 py-2">3 5</td>
                                                <td className="px-3 py-2 font-bold text-primary">8</td>
                                                <td className="px-3 py-2">10 -2</td>
                                                <td className="px-3 py-2 font-bold text-primary">8</td>
                                                <td className="px-3 py-2 text-muted">...</td>
                                            </tr>
                                            <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-850/50">
                                                <td className="px-3 py-2 text-text font-sans font-medium">Maximum in array</td>
                                                <td className="px-3 py-2 text-emerald-600 dark:text-emerald-400">import sys...</td>
                                                <td className="px-3 py-2">4 9 2 7 1</td>
                                                <td className="px-3 py-2 font-bold text-primary">9</td>
                                                <td className="px-3 py-2">-5 -10 -1</td>
                                                <td className="px-3 py-2 font-bold text-primary">-1</td>
                                                <td className="px-3 py-2 text-muted">...</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* STANDARD MCQ BULK IMPORT VIEW */
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
                                    type="button"
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
                )
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
                                                            correct: newType === 'code' ? { ...DEFAULT_CODE_SNIPPET } : newType === 'msq' ? [] : 0
                                                        });
                                                    }}
                                                >
                                                    <option value="mcq">Single Correct (MCQ)</option>
                                                    <option value="msq">Multi Correct (MSQ)</option>
                                                    <option value="true_false">True / False</option>
                                                    <option value="range">Range Answer</option>
                                                    <option value="code">Code</option>
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
                                            <div className="space-y-4 p-4 border rounded-xl bg-surface/60 border-neutral-300 dark:border-neutral-700 shadow-sm">
                                                {/* ML Presets Quick Bar */}
                                                <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-surface border border-indigo-500/30 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                                                            <Sparkles className="h-4 w-4" />
                                                            <span>ML Presets (Python 3)</span>
                                                        </div>
                                                        <span className="text-[10px] text-muted">Click any preset to auto-fill question & test cases</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {ML_PRESETS.map((preset, pIdx) => (
                                                            <button
                                                                key={pIdx}
                                                                type="button"
                                                                onClick={() => {
                                                                    updateQuestion(index, {
                                                                        stem: preset.stem,
                                                                        correct: {
                                                                            language: 'python',
                                                                            allowedLanguages: ['python'],
                                                                            starterCode: preset.starterCode,
                                                                            solutionCode: preset.solutionCode,
                                                                            driverCode: preset.driverCode,
                                                                            testCases: preset.testCases,
                                                                        }
                                                                    });
                                                                }}
                                                                className="px-2.5 py-1 text-xs rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all font-medium flex items-center gap-1.5 active:scale-95 shadow-sm"
                                                                title={preset.description}
                                                            >
                                                                <Code2 className="h-3 w-3" />
                                                                {preset.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-semibold text-text flex items-center justify-between">
                                                            <span>Language</span>
                                                            <span className="text-[10px] text-emerald-500 font-mono font-medium">Judge0 CE Powered</span>
                                                        </label>
                                                        <select
                                                            className="h-10 w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-background text-text text-sm px-3 font-medium"
                                                            value={(q.correct as any)?.language || 'python'}
                                                            onChange={(e) => {
                                                                const current = (q.correct as any) || { starterCode: '', testCases: [] };
                                                                updateQuestion(index, { correct: { ...current, language: e.target.value } });
                                                            }}
                                                        >
                                                            <option value="python">Python 3 (ML Standard: math, sys, statistics, json)</option>
                                                            <option value="javascript">JavaScript (Node.js)</option>
                                                            <option value="cpp">C++ (GCC)</option>
                                                            <option value="c">C (GCC)</option>
                                                            <option value="java">Java (OpenJDK)</option>
                                                        </select>
                                                        <p className="text-[10px] text-muted">
                                                            For ML tests, Python 3 is the standard environment. Includes full standard library.
                                                        </p>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-semibold text-text">Allowed Languages (Optional)</label>
                                                        <div className="flex flex-wrap gap-2 pt-1">
                                                            {['python', 'javascript', 'cpp', 'c', 'java'].map(lang => {
                                                                const currentCorrect = (q.correct as any) || {};
                                                                const allowed = currentCorrect.allowedLanguages || [];
                                                                const isAllowed = allowed.includes(lang);

                                                                return (
                                                                    <button
                                                                        key={lang}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            let newAllowed;
                                                                            if (isAllowed) {
                                                                                newAllowed = allowed.filter((l: string) => l !== lang);
                                                                            } else {
                                                                                newAllowed = [...allowed, lang];
                                                                            }

                                                                            const updates: any = { allowedLanguages: newAllowed };
                                                                            if (newAllowed.length > 0 && !newAllowed.includes(currentCorrect.language || 'python')) {
                                                                                updates.language = newAllowed[0];
                                                                            }

                                                                            updateQuestion(index, { correct: { ...currentCorrect, ...updates } });
                                                                        }}
                                                                        className={cn(
                                                                            "px-2.5 py-1 text-xs rounded-lg border transition-colors capitalize font-medium",
                                                                            isAllowed
                                                                                ? "bg-primary text-white border-primary shadow-sm"
                                                                                : "bg-surface text-muted border-neutral-200 dark:border-neutral-700 hover:border-primary/50"
                                                                        )}
                                                                    >
                                                                        {lang === 'cpp' ? 'C++' : lang}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <p className="text-[10px] text-muted">Leave empty to restrict to Python only.</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-text flex items-center justify-between">
                                                        <span>Starter Code / Template</span>
                                                        <span className="text-[10px] text-muted">Students start with this code</span>
                                                    </label>
                                                    <textarea
                                                        className="w-full h-36 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-background text-text p-3 font-mono text-xs leading-relaxed resize-y focus:border-primary focus:outline-none"
                                                        placeholder="# Write starter code or function template here"
                                                        value={(q.correct as any)?.starterCode || ''}
                                                        onChange={(e) => {
                                                            const current = (q.correct as any) || { language: 'python', testCases: [] };
                                                            updateQuestion(index, { correct: { ...current, starterCode: e.target.value } });
                                                        }}
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-text flex items-center justify-between">
                                                        <span>Hidden Driver Code (Optional)</span>
                                                        <span className="text-[10px] text-muted">Appended to student's code to run tests</span>
                                                    </label>
                                                    <textarea
                                                        className="w-full h-24 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-background text-text p-3 font-mono text-xs leading-relaxed resize-y focus:border-primary focus:outline-none"
                                                        placeholder="# Hidden driver code (optional, runs after student's code)"
                                                        value={(q.correct as any)?.driverCode || ''}
                                                        onChange={(e) => {
                                                            const current = (q.correct as any) || { language: 'python', testCases: [] };
                                                            updateQuestion(index, { correct: { ...current, driverCode: e.target.value } });
                                                        }}
                                                    />
                                                    <p className="text-[10px] text-muted">Optional: If your question requires students to write a class/function without handling stdin/stdout, the driver code can invoke it and print the result.</p>
                                                </div>

                                                {/* Test Cases Header & List */}
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center pb-1 border-b border-neutral-200 dark:border-neutral-700">
                                                        <div>
                                                            <label className="text-xs font-semibold text-text flex items-center gap-1.5">
                                                                <span>Test Cases ({((q.correct as any)?.testCases || []).length})</span>
                                                            </label>
                                                            <p className="text-[10px] text-muted">Each test case tests the code with stdin input and validates stdout output.</p>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            type="button"
                                                            className="h-8 text-xs font-medium border-dashed border-primary text-primary hover:bg-primary/10 gap-1.5"
                                                            onClick={() => {
                                                                const current = (q.correct as any) || { language: 'python', starterCode: '', testCases: [] };
                                                                const cases = current?.testCases || [];
                                                                updateQuestion(index, { correct: { ...current, testCases: [...cases, { input: '', output: '' }] } });
                                                            }}
                                                        >
                                                            <PlusCircle className="h-4 w-4" /> Add Test Case
                                                        </Button>
                                                    </div>

                                                    {((q.correct as any)?.testCases || []).length === 0 ? (
                                                        <div className="p-4 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 text-center text-xs text-muted">
                                                            No test cases defined yet. Click <span className="font-semibold text-primary">"+ Add Test Case"</span> or pick an ML Preset above.
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2.5">
                                                            {((q.correct as any)?.testCases || []).map((tc: any, tcIndex: number) => (
                                                                <div key={tcIndex} className="p-3 rounded-lg bg-surface border border-neutral-200 dark:border-neutral-800 flex flex-col gap-2">
                                                                    <div className="flex items-center justify-between text-xs">
                                                                        <span className="font-bold text-primary font-mono text-[11px]">
                                                                            Test Case #{tcIndex + 1}
                                                                        </span>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            type="button"
                                                                            className="text-red-500 hover:text-red-600 h-6 px-2 text-xs"
                                                                            onClick={() => {
                                                                                const current = (q.correct as any);
                                                                                const newCases = current.testCases.filter((_: any, i: number) => i !== tcIndex);
                                                                                updateQuestion(index, { correct: { ...current, testCases: newCases } });
                                                                            }}
                                                                        >
                                                                            <MinusCircle className="h-3.5 w-3.5 mr-1" /> Remove
                                                                        </Button>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                        <div className="space-y-1">
                                                                            <span className="text-[10px] font-semibold text-text-secondary uppercase">Input (stdin)</span>
                                                                            <textarea
                                                                                placeholder="Example: 3.0 5.0 2.5\n2.5 5.0 4.0"
                                                                                value={tc.input}
                                                                                onChange={(e) => {
                                                                                    const current = (q.correct as any);
                                                                                    const newCases = [...current.testCases];
                                                                                    newCases[tcIndex] = { ...tc, input: e.target.value };
                                                                                    updateQuestion(index, { correct: { ...current, testCases: newCases } });
                                                                                }}
                                                                                className="w-full h-20 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-background text-text p-2 font-mono text-xs resize-y"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <span className="text-[10px] font-semibold text-text-secondary uppercase">Expected Output (stdout)</span>
                                                                            <textarea
                                                                                placeholder="Example: 0.8750"
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
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Interactive Code Testing Panel */}
                                                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700 flex flex-col gap-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-semibold text-text flex items-center gap-1.5">
                                                            <Code2 className="h-4 w-4 text-primary" /> Test Python Code & Test Cases
                                                        </span>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            disabled={testingCode[index]}
                                                            onClick={() => handleTestQuestionCode(index, q)}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8 px-3"
                                                        >
                                                            {testingCode[index] ? (
                                                                <>
                                                                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Running...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Play className="h-3.5 w-3.5 mr-1.5 fill-current" /> Run Code Against Test Cases
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>

                                                    {codeTestResults[index] && (
                                                        <div className="rounded-lg p-3 bg-neutral-900 border border-neutral-800 text-xs font-mono space-y-2">
                                                            <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
                                                                <span className="text-neutral-400">Execution Result:</span>
                                                                {codeTestResults[index]?.allPassed ? (
                                                                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                                                                        <CheckCircle2 className="h-3.5 w-3.5" /> All Test Cases Passed
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-rose-400 font-bold flex items-center gap-1">
                                                                        <X className="h-3.5 w-3.5" /> Some Test Cases Failed
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {codeTestResults[index]?.combinedStderr && (
                                                                <div className="text-rose-400 whitespace-pre-wrap bg-rose-950/40 p-2 rounded border border-rose-900/50">
                                                                    {codeTestResults[index]?.combinedStderr}
                                                                </div>
                                                            )}

                                                            {codeTestResults[index]?.results && codeTestResults[index]?.results.length > 0 && (
                                                                <div className="space-y-1.5 pt-1">
                                                                    {codeTestResults[index]!.results.map(res => (
                                                                        <div
                                                                            key={res.index}
                                                                            className={cn(
                                                                                "p-2 rounded flex flex-col gap-1 border",
                                                                                res.passed
                                                                                    ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-300"
                                                                                    : "bg-rose-950/20 border-rose-900/40 text-rose-300"
                                                                            )}
                                                                        >
                                                                            <div className="flex justify-between font-semibold">
                                                                                <span>Case {res.index}:</span>
                                                                                <span>{res.passed ? 'PASSED' : 'FAILED'}</span>
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-300">
                                                                                <div><span className="text-neutral-500">Input:</span> {res.input || '(empty)'}</div>
                                                                                <div><span className="text-neutral-500">Expected:</span> {res.expected || '(empty)'}</div>
                                                                            </div>
                                                                            <div><span className="text-neutral-500">Got:</span> {res.actual || '(empty)'}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
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

                                        {/* AI Evaluation Mode Notice (Only when active for Proble Originals) */}
                                        {isAiEvaluationMode && q.type !== 'code' && (
                                            <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700/80">
                                                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-text">
                                                    <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-primary">AI Reason Evaluation Active</span>
                                                            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.2 rounded font-semibold uppercase">No Keywords Needed</span>
                                                        </div>
                                                        <p className="text-[11px] text-muted">
                                                            Students will be prompted to explain their reasoning in the quiz text box. AI will evaluate their answer & explanation automatically upon test submission.
                                                        </p>
                                                    </div>
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
                                {isCodeMode && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setView('import')}
                                        className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 font-bold"
                                    >
                                        <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                                        Bulk Import Code (.xlsx)
                                    </Button>
                                )}
                                <Button size="sm" onClick={addQuestion}>
                                    <Plus className="mr-2 h-4 w-4" /> Add Question
                                </Button>
                            </div>
                        </div>

                        {/* QUESTION SETS (CODING TEST) SECTION IN STEP 3 */}
                        {isCodeMode && (
                            <div className="mt-8 pt-6 border-t-2 border-neutral-200 dark:border-neutral-800 space-y-6">
                                <div className="p-6 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-surface to-surface dark:from-primary/10 dark:via-surface dark:to-surface shadow-sm space-y-6">
                                    {/* Section Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-700/60">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2.5 rounded-xl bg-primary text-white shadow-md">
                                                <Layers className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2.5">
                                                    <h3 className="text-lg font-bold text-text">Question Sets (Coding Test)</h3>
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                                                        <Code2 className="w-3 h-3" /> ML Coding Enabled
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted mt-0.5">
                                                    Divide questions into sets. Student 1 gets Q1–Q2, Student 2 gets Q3–Q4, etc.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 bg-background dark:bg-neutral-800 p-2 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shrink-0">
                                            <span className="text-xs font-bold text-text">Enable Sets</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={setsEnabled}
                                                    onChange={(e) => updateSets({ enabled: e.target.checked })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                    </div>

                                    {setsEnabled && (
                                        <div className="space-y-6 animate-in fade-in duration-300">
                                            {/* Grid for Box 1 (Division) and Box 2 (Emails) */}
                                            <div className="grid md:grid-cols-2 gap-6">
                                                
                                                {/* BOX 1: DIVIDE THE QUESTIONS */}
                                                <div className="p-5 rounded-xl bg-surface border border-neutral-200 dark:border-neutral-700 space-y-4 shadow-sm">
                                                    <div className="flex items-center gap-2 pb-2 border-b border-neutral-200 dark:border-neutral-700">
                                                        <ListOrdered className="w-4 h-4 text-primary" />
                                                        <h4 className="text-sm font-bold text-text">1. Divide the Questions</h4>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="text-xs font-semibold text-text mb-1 block">
                                                                Questions per Student / Set
                                                            </label>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    max={totalCodeQuestions}
                                                                    value={questionsPerStudent}
                                                                    onChange={(e) => updateSets({ questionsPerStudent: Math.max(1, parseInt(e.target.value) || 1) })}
                                                                    className="w-24 h-10 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-background px-3 text-center font-bold text-base text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                                />
                                                                <span className="text-xs text-muted">questions per person</span>
                                                            </div>
                                                        </div>

                                                        {/* Preset Quick Chips */}
                                                        <div className="flex items-center gap-1.5 pt-1">
                                                            <span className="text-[11px] text-muted">Presets:</span>
                                                            {[1, 2, 3, 4, 5].map((count) => (
                                                                <button
                                                                    key={count}
                                                                    type="button"
                                                                    onClick={() => updateSets({ questionsPerStudent: count })}
                                                                    className={cn(
                                                                        "px-2.5 py-1 text-xs rounded-lg font-semibold transition-all",
                                                                        questionsPerStudent === count
                                                                            ? "bg-primary text-white shadow-sm"
                                                                            : "bg-neutral-100 dark:bg-neutral-800 text-text hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                                                    )}
                                                                >
                                                                    {count} Q{count > 1 ? 's' : ''}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        {/* Total Questions in Quiz */}
                                                        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                                                            <div className="flex items-center justify-between">
                                                                <label className="text-xs font-semibold text-text">
                                                                    Total Code Questions
                                                                </label>
                                                                {questions && questions.length > 0 && (
                                                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                                        {questions.length} Questions in Quiz
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1.5">
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    value={totalCodeQuestions}
                                                                    onChange={(e) => updateSets({ totalQuestions: Math.max(1, parseInt(e.target.value) || 1) })}
                                                                    className="w-24 h-10 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-background px-3 text-center font-bold text-base text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                                />
                                                                <span className="text-xs text-muted">total questions across all sets</span>
                                                            </div>
                                                        </div>

                                                        {/* Calculated Math Banner */}
                                                        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs space-y-1">
                                                            <p className="font-bold text-primary flex items-center gap-1.5">
                                                                <Sparkles className="w-3.5 h-3.5" />
                                                                {totalCodeQuestions} Questions ÷ {questionsPerStudent} per Student = {numSets} Sets Created
                                                            </p>
                                                            <p className="text-[11px] text-muted leading-tight">
                                                                Each set contains {questionsPerStudent} question(s). Student 1 gets Q1–Q{Math.min(totalCodeQuestions, questionsPerStudent)}, Student 2 gets Q{questionsPerStudent + 1}–Q{Math.min(totalCodeQuestions, questionsPerStudent * 2)}, etc.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* BOX 2: ADD THE EMAIL AS TEXT */}
                                                <div className="p-5 rounded-xl bg-surface border border-neutral-200 dark:border-neutral-700 space-y-4 shadow-sm flex flex-col">
                                                    <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-700">
                                                        <div className="flex items-center gap-2">
                                                            <Mail className="w-4 h-4 text-primary" />
                                                            <h4 className="text-sm font-bold text-text">2. Add Student Emails</h4>
                                                        </div>
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-xs font-bold font-mono",
                                                            extractedEmails.length > 0 
                                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                                                                : "bg-neutral-100 dark:bg-neutral-800 text-muted"
                                                        )}>
                                                            {extractedEmails.length} student{extractedEmails.length === 1 ? '' : 's'}
                                                        </span>
                                                    </div>

                                                    <div className="space-y-2 flex-1 flex flex-col">
                                                        <textarea
                                                            className="w-full flex-1 min-h-[120px] rounded-xl border border-neutral-300 dark:border-neutral-600 bg-background p-3 text-xs font-mono placeholder:text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-text resize-y custom-scrollbar"
                                                            placeholder="Paste student emails (one per line, comma-separated, or paste registration lists like RA... - email@srmist.edu.in)..."
                                                            value={rawEmails}
                                                            onChange={(e) => updateSets({ rawEmails: e.target.value })}
                                                        />

                                                        {/* Fast Action Buttons */}
                                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                                            <div className="flex flex-wrap gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateSets({ rawEmails: SRMIST_CLASS_EMAILS.join('\n') })}
                                                                    className="px-2.5 py-1 text-xs rounded-lg font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition-all flex items-center gap-1"
                                                                >
                                                                    <Users className="w-3.5 h-3.5" /> Load SRMIST Class (62 Students)
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateSets({ 
                                                                        rawEmails: SRMIST_CLASS_EMAILS.slice(0, 5).join('\n'),
                                                                        questionsPerStudent: 2,
                                                                        totalQuestions: 10
                                                                    })}
                                                                    className="px-2.5 py-1 text-xs rounded-lg font-medium bg-neutral-100 dark:bg-neutral-800 text-text hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                                                                >
                                                                    Demo (5 Students / 10 Qs)
                                                                </button>
                                                            </div>

                                                            {rawEmails.length > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateSets({ rawEmails: '' })}
                                                                    className="px-2 py-1 text-xs rounded-lg text-red-500 hover:bg-red-500/10 transition-all flex items-center gap-1"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" /> Clear
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* BOX 3: LIVE SETS DISTRIBUTION PREVIEW */}
                                            <div className="p-5 rounded-xl bg-surface border border-neutral-200 dark:border-neutral-700 space-y-4 shadow-sm">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-700">
                                                    <div className="flex items-center gap-2">
                                                        <Users className="w-4 h-4 text-primary" />
                                                        <h4 className="text-sm font-bold text-text">3. Live Sets Distribution Preview</h4>
                                                        <span className="text-xs text-muted">
                                                            ({computedMappings.length} mappings generated)
                                                        </span>
                                                    </div>

                                                    {/* Search Filter for Mapping Preview */}
                                                    {computedMappings.length > 5 && (
                                                        <div className="relative w-full sm:w-64">
                                                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                                                            <input
                                                                type="text"
                                                                placeholder="Search student email or set..."
                                                                value={searchTerm}
                                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-neutral-300 dark:border-neutral-600 bg-background text-text focus:outline-none focus:border-primary"
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {computedMappings.length === 0 ? (
                                                    <div className="p-8 text-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-850/50 space-y-2">
                                                        <Mail className="w-8 h-8 mx-auto text-muted opacity-40" />
                                                        <p className="text-sm font-semibold text-text">No student emails added yet</p>
                                                        <p className="text-xs text-muted max-w-sm mx-auto">
                                                            Paste student emails in Box 2 or click "Load SRMIST Class" to generate the question set distribution automatically.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {/* Summary Stats Badges */}
                                                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                                                            <span className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
                                                                <Users className="w-3.5 h-3.5" /> {extractedEmails.length} Students
                                                            </span>
                                                            <span className="px-3 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1.5">
                                                                <Layers className="w-3.5 h-3.5" /> {numSets} Sets Created
                                                            </span>
                                                            <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                                                                <Hash className="w-3.5 h-3.5" /> {questionsPerStudent} Questions / Student
                                                            </span>
                                                            <span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                                                                <BookOpen className="w-3.5 h-3.5" /> {totalCodeQuestions} Total Questions
                                                            </span>
                                                        </div>

                                                        {/* Mapping Table */}
                                                        <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden max-h-[360px] overflow-y-auto custom-scrollbar">
                                                            <table className="w-full text-left text-xs border-collapse">
                                                                <thead className="bg-neutral-100 dark:bg-neutral-800 text-muted font-bold sticky top-0 z-10 border-b border-neutral-200 dark:border-neutral-700">
                                                                    <tr>
                                                                        <th className="py-2.5 px-3 w-14 text-center">#</th>
                                                                        <th className="py-2.5 px-4">Student Email</th>
                                                                        <th className="py-2.5 px-4">Assigned Set</th>
                                                                        <th className="py-2.5 px-4">Question Range</th>
                                                                        <th className="py-2.5 px-4 text-right">Question Count</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700/60 bg-surface">
                                                                    {filteredMappings.map((m) => (
                                                                        <tr key={m.email} className="hover:bg-neutral-50 dark:hover:bg-neutral-850/50 transition-colors">
                                                                            <td className="py-2.5 px-3 text-center font-bold text-muted">
                                                                                {m.studentIndex + 1}
                                                                            </td>
                                                                            <td className="py-2.5 px-4 font-mono font-medium text-text">
                                                                                {m.email}
                                                                            </td>
                                                                            <td className="py-2.5 px-4">
                                                                                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                                                                                    {m.setName}
                                                                                </span>
                                                                            </td>
                                                                            <td className="py-2.5 px-4 font-mono font-semibold text-text">
                                                                                Question {m.startQuestion} – {m.endQuestion}
                                                                            </td>
                                                                            <td className="py-2.5 px-4 text-right">
                                                                                <span className="text-muted font-medium">
                                                                                    {m.questionCount} {m.questionCount === 1 ? 'question' : 'questions'}
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>

                                                        {filteredMappings.length < computedMappings.length && (
                                                            <p className="text-[11px] text-muted text-right">
                                                                Showing {filteredMappings.length} of {computedMappings.length} students
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )
            }
        </div >
    );
}

