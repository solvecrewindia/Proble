import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User as UserIcon, Globe, Lock, Trash2, Edit, ChevronDown, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ProfileSettings = () => {
    const { user, refreshUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        photo: '',
        language: 'English'
    });

    useEffect(() => {
        let mounted = true;

        const loadProfile = async () => {
            if (!user) return;

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.error('Error fetching profile:', error);
                }

                if (mounted) {
                    setFormData({
                        email: data?.email || user.email || '',
                        username: data?.username || '',
                        photo: data?.avatar_url || `https://ui-avatars.com/api/?name=${data?.username || 'User'}&background=0D8ABC&color=fff`,
                        language: data?.preferred_language || 'English'
                    });
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('Error loading profile:', error);
                if (mounted) setIsLoading(false);
            }
        };

        loadProfile();

        return () => {
            mounted = false;
        };
    }, [user]);

    const handleCancel = () => {
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!user) return;

        try {
            const updates = {
                id: user.id,
                email: formData.email,
                username: formData.username,
                preferred_language: formData.language,
                updated_at: new Date().toISOString(),
                avatar_url: formData.photo
            };

            const { error } = await supabase
                .from('profiles')
                .upsert(updates);

            if (error) throw error;

            await refreshUser(); // Update global context
            setIsEditing(false);
            alert("Changes saved!");
        } catch (error: any) {
            console.error('Error saving profile:', error);
            alert("Error saving changes: " + error.message);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user) return;

        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Immediate preview
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setFormData(prev => ({ ...prev, photo: event.target!.result as string }));
                }
            };
            reader.readAsDataURL(file);

            // Upload to Supabase Storage
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `${user.id}-${Date.now()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

                if (data) {
                    setFormData(prev => ({ ...prev, photo: data.publicUrl }));
                }
            } catch (error) {
                console.error('Error uploading avatar:', error);
                alert('Error uploading image');
            }
        }
    };

    if (isLoading) {
        return <div className="p-6 text-center">Loading settings...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto px-6 py-2 space-y-8">
            <h1 className="text-3xl font-bold text-text">Settings</h1>

            {/* Account Section */}
            <div className="bg-surface rounded-xl border border-neutral-300 dark:border-neutral-600 p-6 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2">
                        <UserIcon className="w-5 h-5 text-text" />
                        <h2 className="text-lg font-bold text-text">Account</h2>
                    </div>

                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                        >
                            <Edit className="w-4 h-4" />
                            Edit
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 text-sm font-medium text-text hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors border border-neutral-300 dark:border-neutral-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                            >
                                Save Changes
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Profile Pic */}
                    <div className="flex-shrink-0">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-neutral-300 dark:border-neutral-600 relative group cursor-pointer">
                            <img
                                src={formData.photo}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                            {isEditing && (
                                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <Camera className="w-6 h-6 text-white" />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handlePhotoChange}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 flex-1">
                        <div>
                            <label className="block text-sm text-muted mb-1">Username</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    readOnly
                                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-2 text-muted cursor-not-allowed focus:outline-none"
                                />
                            ) : (
                                <div className="font-medium text-text px-3 py-2">{formData.username}</div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm text-muted mb-1">Email address</label>
                            {isEditing ? (
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full bg-background border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            ) : (
                                <div className="font-medium text-text px-3 py-2">{formData.email}</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Language Section */}
            <div className="bg-surface rounded-xl border border-neutral-300 dark:border-neutral-600 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <Globe className="w-5 h-5 text-text" />
                    <h2 className="text-lg font-bold text-text">Language</h2>
                </div>

                <div className="max-w-md">
                    <label className="block text-sm text-muted mb-2">Select preferred language</label>
                    <div className="relative">
                        <select
                            name="language"
                            value={formData.language}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className={`w-full appearance-none bg-background border border-neutral-300 dark:border-neutral-600 rounded-lg px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 ${isEditing ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
                        >
                            <option>English</option>
                            <option>Spanish</option>
                            <option>French</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                    </div>
                </div>
            </div>



            {/* Delete Account Section */}
            <div className="bg-surface rounded-xl border border-neutral-300 dark:border-neutral-600 p-6 shadow-sm">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Trash2 className="w-5 h-5 text-text" />
                        <h2 className="text-lg font-bold text-text">Delete account</h2>
                    </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="font-medium text-text">Don't need your account anymore?</p>
                    <button className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20">
                        Delete account
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
