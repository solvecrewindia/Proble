import React, { useState } from 'react';
import { Input } from '../../../faculty/components/ui/Input';
import { supabase } from '../../../lib/supabase';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import imageCompression from 'browser-image-compression';

export function AdminStepMetadata({ data, update }: any) {
    const [uploading, setUploading] = useState(false);

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
                {/* Banner Image Upload */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-text">Quiz Banner</label>
                    <div className="flex items-start gap-6">
                        {/* Preview Area */}
                        <div className={`relative w-40 h-24 rounded-lg border-2 border-dashed border-border-custom flex items-center justify-center overflow-hidden bg-surface group transition-all ${!data.image_url ? 'hover:border-primary/50' : 'border-none'}`}>
                            {data.image_url ? (
                                <>
                                    <img src={data.image_url} alt="Banner" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => update({ image_url: '' })}
                                        className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </>
                            ) : (
                                <ImageIcon className="w-8 h-8 text-muted/50" />
                            )}
                        </div>

                        {/* Upload Controls */}
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                                <label className="cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                        disabled={uploading}
                                    />
                                    <span className="btn-primary inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl">
                                        {uploading ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Compressing...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-4 h-4" />
                                                Upload Thumbnail
                                            </>
                                        )}
                                    </span>
                                </label>
                                <span className="text-xs text-muted">Max 100KB (Auto-compressed)</span>
                            </div>
                            <p className="text-xs text-muted leading-relaxed">
                                Upload a thumbnail for the home page.
                                Recommended aspect ratio 16:9.
                            </p>
                        </div>
                    </div>
                </div>

                <Input
                    label="Quiz Title"
                    placeholder="e.g. Midterm Examination Fall 2024"
                    value={data.title || ''}
                    onChange={(e) => update({ title: e.target.value })}
                />

                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text">Description</label>
                    <textarea
                        className="flex min-h-[100px] w-full rounded-xl border border-border-custom bg-background px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-text transition-all"
                        placeholder="Enter instructions or description..."
                        value={data.description || ''}
                        onChange={(e) => update({ description: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text">Anti-Cheat Level</label>
                        <select
                            className="w-full h-10 rounded-xl border border-border-custom bg-background px-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-text transition-all"
                            value={data.settings?.antiCheatLevel || 'standard'}
                            onChange={(e) => update({ settings: { ...data.settings, antiCheatLevel: e.target.value } })}
                        >
                            <option value="standard">Standard (Tab Switching & Fullscreen)</option>
                            <option value="strict">Strict (1 Strike Tolerance)</option>
                        </select>
                    </div>

                    <div className="flex items-center space-x-2 pt-8">
                        <input
                            type="checkbox"
                            id="allowRetake"
                            className="h-4 w-4 rounded border-border-custom text-primary focus:ring-primary accent-primary"
                            checked={data.settings?.allowRetake || false}
                            onChange={(e) => update({ settings: { ...data.settings, allowRetake: e.target.checked } })}
                        />
                        <label htmlFor="allowRetake" className="text-sm font-medium text-text select-none cursor-pointer">Allow Retakes</label>
                    </div>
                </div>
            </div>
        </div>
    );
}
