import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Upload, X, Save, AlertCircle } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { useAuth } from '../../shared/context/AuthContext';

const AdminModuleCreate = () => {
    const { category, moduleId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch existing module if editing
    useState(() => {
        const fetchModule = async () => {
            if (!moduleId) return;
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('modules')
                    .select('*')
                    .eq('id', moduleId)
                    .single();

                if (error) throw error;
                if (data) {
                    setTitle(data.title);
                    setDescription(data.description || '');
                    setImageUrl(data.image_url || '');
                }
            } catch (err: any) {
                console.error('Error fetching module:', err);
                setError('Failed to load module details');
            } finally {
                setLoading(false);
            }
        };

        fetchModule();
    });

    // Image Upload
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploadingImage(true);
            setError(null);

            // Compress Image
            const options = {
                maxSizeMB: 0.1, // 100KB
                maxWidthOrHeight: 800,
                useWebWorker: true
            };

            const compressedFile = await imageCompression(file, options);

            // Upload to Supabase
            const fileExt = file.name.split('.').pop();
            const fileName = `module-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('quiz-banners')
                .upload(filePath, compressedFile);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('quiz-banners')
                .getPublicUrl(filePath);

            setImageUrl(publicUrl);

        } catch (err: any) {
            console.error('Error uploading image:', err);
            setError(err.message || 'Failed to upload image. Please try again.');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            setError('Module Name is required');
            return;
        }

        try {
            setSaving(true);
            setError(null);

            let result;

            if (moduleId) {
                // UPDATE
                result = await supabase
                    .from('modules')
                    .update({
                        title,
                        description,
                        image_url: imageUrl,
                        // category: don't update category usually, or allow? let's keep it same
                    })
                    .eq('id', moduleId)
                    .select()
                    .single();
            } else {
                // INSERT
                result = await supabase
                    .from('modules')
                    .insert({
                        title,
                        description,
                        image_url: imageUrl,
                        category: category?.toUpperCase(),
                        created_by: user?.id
                    })
                    .select()
                    .single();
            }

            if (result.error) throw result.error;

            // Navigate to the module detail page
            navigate(`/admin/modules/${moduleId || result.data.id}`);

        } catch (err: any) {
            console.error('Error saving module:', err);
            setError(err.message || 'Failed to save module');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate(`/admin/quizzes/${category}`)}
                    className="p-3 hover:bg-white/5 rounded-full transition-all duration-200 group border border-transparent hover:border-white/10"
                >
                    <ArrowLeft className="w-5 h-5 text-text-secondary group-hover:text-white" />
                </button>
                <div>

                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
                        {moduleId ? 'Edit Module' : 'Create New Module'}
                    </h1>
                    <p className="text-text-secondary mt-1">
                        {moduleId ? 'Update module details' : 'Group your quizzes into a single learning module'}
                    </p>
                </div>
            </div>

            <div className="bg-surface border border-white/10 rounded-2xl p-8 space-y-8">
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                        <AlertCircle className="w-5 h-5" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Module Details */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Module Name
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Calculus I, Machine Learning Basics"
                            className="w-full px-4 py-3 bg-background border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-muted"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Description <span className="text-muted text-xs">(Optional)</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Briefly describe what this module covers..."
                            rows={3}
                            className="w-full px-4 py-3 bg-background border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-muted resize-none"
                        />
                    </div>

                    {/* Thumbnail Upload */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Module Thumbnail
                        </label>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            accept="image/*"
                            className="hidden"
                        />

                        {imageUrl ? (
                            <div className="relative w-full h-48 rounded-xl overflow-hidden border border-white/10 group">
                                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                                    >
                                        <Upload className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setImageUrl('')}
                                        className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg text-red-500 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-48 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-white/5 transition-all group"
                            >
                                <div className="p-3 bg-white/5 rounded-full group-hover:scale-110 transition-transform">
                                    {uploadingImage ? (
                                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Upload className="w-6 h-6 text-text-secondary group-hover:text-primary" />
                                    )}
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-text-secondary group-hover:text-text">
                                        Click to upload thumbnail
                                    </p>
                                    <p className="text-xs text-muted mt-1">
                                        Max 100KB (Automatically compressed)
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end pt-6 border-t border-white/10">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                <span>{moduleId ? 'Update Module' : 'Create Module'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminModuleCreate;
