import React, { useState } from 'react';
import { Input } from '../../../faculty/components/ui/Input';
import { supabase } from '../../../lib/supabase';
import { Upload, X, Image as ImageIcon, FileText, Sparkles, Key, Bot } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import * as mammoth from 'mammoth';
import TurndownService from 'turndown';
// @ts-ignore
import { gfm } from 'turndown-plugin-gfm';

export function AdminStepMetadata({ data, update }: any) {
    const [uploading, setUploading] = useState(false);
    const [importingWord, setImportingWord] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleWordImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setImportingWord(true);
            const arrayBuffer = await file.arrayBuffer();

            // Custom image converter for mammoth
            const options = {
                convertImage: mammoth.images.inline(async (element: any) => {
                    try {
                        const contentType = element.contentType;
                        const buffer = await element.read();
                        // Create a blob from buffer
                        const blob = new Blob([buffer], { type: contentType });
                        // Create a File object
                        const fileExt = contentType.split('/')[1] || 'png';
                        const fileName = `word-img-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                        const fileObj = new File([blob], fileName, { type: contentType });

                        // Compress image
                        const compOptions = {
                            maxSizeMB: 0.1,
                            maxWidthOrHeight: 1200,
                            useWebWorker: true
                        };
                        const compressedFile = await imageCompression(fileObj, compOptions);

                        // Upload to Supabase
                        const { error: uploadError } = await supabase.storage
                            .from('quiz-banners')
                            .upload(fileName, compressedFile);

                        if (uploadError) throw uploadError;

                        // Get Public URL
                        const { data: { publicUrl } } = supabase.storage
                            .from('quiz-banners')
                            .getPublicUrl(fileName);

                        return { src: publicUrl };
                    } catch (err) {
                        console.error("Failed to upload image from word doc", err);
                        return { src: "" }; // Fallback
                    }
                })
            };

            const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer }, options);
            const html = result.value;

            // Convert HTML to Markdown using Turndown
            const turndownService = new TurndownService({
                headingStyle: 'atx',
                bulletListMarker: '-',
                codeBlockStyle: 'fenced'
            });
            
            turndownService.use(gfm);

            // Fix for word document table cells having paragraphs that break markdown tables
            turndownService.addRule('table-cell-p', {
                filter: function (node, options) {
                    return (
                        node.nodeName === 'P' &&
                        node.parentNode &&
                        (node.parentNode.nodeName === 'TD' || node.parentNode.nodeName === 'TH')
                    );
                },
                replacement: function (content) {
                    return content;
                }
            });
            
            const markdown = turndownService.turndown(html);

            // Update the content
            const currentContent = data.settings?.readContent || '';
            const newContent = currentContent ? `${currentContent}\n\n${markdown}` : markdown;
            
            update({ settings: { ...data.settings, readContent: newContent } });
            
            // Clear input
            if (fileInputRef.current) fileInputRef.current.value = '';

        } catch (error) {
            console.error('Error importing word document:', error);
            alert('Failed to import Word document. Please try again.');
        } finally {
            setImportingWord(false);
        }
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);

            // Compress image to ~100KB
            const options = {
                maxSizeMB: 0.1, // 100KB
                maxWidthOrHeight: 1200,
                useWebWorker: true
            };

            const compressedFile = await imageCompression(file, options);

            // Upload to Supabase
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('quiz-banners')
                .upload(filePath, compressedFile);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('quiz-banners')
                .getPublicUrl(filePath);

            update({ image_url: publicUrl });

        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-text">Quiz Details</h2>
                <p className="text-sm text-text-secondary">Basic information about the assessment.</p>
            </div>

            <div className="space-y-6">


                <Input
                    label="Quiz Title"
                    placeholder="e.g. Midterm Examination Fall 2024"
                    value={data.title || ''}
                    onChange={(e) => update({ title: e.target.value })}
                />

                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text">Description</label>
                    <textarea
                        className="flex min-h-[100px] w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-background px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-text transition-all"
                        placeholder="Enter instructions or description..."
                        value={data.description || ''}
                        onChange={(e) => update({ description: e.target.value })}
                    />
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-text flex items-center gap-2">
                            Read Page Content (LaTeX Supported)
                            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-wider">New</span>
                        </label>
                        <div>
                            <input 
                                type="file" 
                                accept=".docx" 
                                ref={fileInputRef} 
                                className="hidden" 
                                onChange={handleWordImport} 
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={importingWord}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {importingWord ? (
                                    <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <FileText className="w-3.5 h-3.5" />
                                )}
                                {importingWord ? 'Importing...' : 'Import Word (.docx)'}
                            </button>
                        </div>
                    </div>
                    <textarea
                        className="flex min-h-[200px] w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-background px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-text transition-all font-mono"
                        placeholder="Write blog-like study material here. LaTeX is supported e.g. O(n^2)."
                        value={data.settings?.readContent || ''}
                        onChange={(e) => update({ settings: { ...data.settings, readContent: e.target.value } })}
                    />
                    <p className="text-xs text-muted">If filled, students will see a 'Read Mode' card instead of 'Practice Mode'.</p>
                </div>

                {/* Proble Originals Evaluation Mode Selector */}
                {(data.type === 'originals' || data.settings?.category?.toUpperCase() === 'ORIGINALS' || data.settings?.category?.toUpperCase() === 'PROBLE ORIGINALS') && (
                    <div className="p-4 rounded-2xl border-2 border-primary/20 bg-primary/5 dark:bg-primary/10 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-primary text-white shadow-sm">
                                    {data.settings?.useKeywords ? <Key className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-text flex items-center gap-2">
                                        {data.settings?.useKeywords ? 'Manual Keyword Matching' : 'AI Reason Evaluation (Automated)'}
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-primary/20 text-primary">
                                            Proble Originals Only
                                        </span>
                                    </h4>
                                    <p className="text-xs text-muted">
                                        {data.settings?.useKeywords
                                            ? 'Admin provides required keywords per question. System checks if student reasoning contains keywords.'
                                            : 'AI evaluates student answers and reasoning upon test submission, awarding full/half marks. No keywords required.'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-background dark:bg-neutral-800/80 p-1.5 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700">
                                <span className="text-xs font-semibold text-muted">Use Keywords</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.settings?.useKeywords || false}
                                        onChange={(e) => update({
                                            settings: {
                                                ...data.settings,
                                                useKeywords: e.target.checked,
                                                evaluationMode: e.target.checked ? 'keywords' : 'ai'
                                            }
                                        })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>
                        </div>

                        {!data.settings?.useKeywords ? (
                            <div className="flex items-center gap-2 text-[11px] text-primary/80 bg-primary/10 rounded-lg p-2.5 font-medium">
                                <Bot className="w-4 h-4 shrink-0" />
                                <span>AI evaluation is active. In question creation, you do not need to provide keywords. Students will be asked to justify their answers, and AI will evaluate the quality of their explanations.</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg p-2.5 font-medium">
                                <Key className="w-4 h-4 shrink-0" />
                                <span>Keyword mode is active. Remember to specify required keywords for questions in the Questions step.</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text">Anti-Cheat Level</label>
                        <select
                            className="w-full h-10 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-background px-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-text transition-all"
                            value={data.settings?.antiCheatLevel || 'standard'}
                            onChange={(e) => update({ settings: { ...data.settings, antiCheatLevel: e.target.value } })}
                        >
                            <option value="standard">Standard (Tab Switching & Fullscreen)</option>
                            <option value="strict">Strict (1 Strike Tolerance)</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 gap-2 pt-6">
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="allowRetake"
                                className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-600 text-primary focus:ring-primary accent-primary"
                                checked={data.settings?.allowRetake || false}
                                onChange={(e) => update({ settings: { ...data.settings, allowRetake: e.target.checked } })}
                            />
                            <label htmlFor="allowRetake" className="text-sm font-medium text-text select-none cursor-pointer">Allow Retakes</label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="showPercentage"
                                className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-600 text-primary focus:ring-primary accent-primary"
                                checked={data.settings?.showPercentage ?? true}
                                onChange={(e) => update({ settings: { ...data.settings, showPercentage: e.target.checked } })}
                            />
                            <label htmlFor="showPercentage" className="text-sm font-medium text-text select-none cursor-pointer">Show Score/Percentage</label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="showAnswers"
                                className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-600 text-primary focus:ring-primary accent-primary"
                                checked={data.settings?.showAnswers ?? true}
                                onChange={(e) => update({ settings: { ...data.settings, showAnswers: e.target.checked } })}
                            />
                            <label htmlFor="showAnswers" className="text-sm font-medium text-text select-none cursor-pointer">Show Correct Answers</label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
