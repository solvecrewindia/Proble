import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User as UserIcon, Globe, Trash2, Edit, ChevronDown, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ProfileSettings = () => {
    const { user, refreshUser, logout } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        full_name: '',
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
                        full_name: data?.full_name || '',
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
                full_name: formData.full_name,
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

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const handleDeleteAccount = async () => {
        if (!user) return;

        try {
            // Delete profile from Supabase
            // Note: If you have foreign key constraints (like quizzes created by user), 
            // you might need "ON DELETE CASCADE" in your DB schema, 
            // or manually delete related data first.
            // Assuming CASCADE is set up or profiles is the main entry.

            // 1. Delete account via RPC (Deep Delete: auth.users + profiles cascade)
            const { error } = await supabase.rpc('delete_account');

            if (error) {
                console.error("RPC Delete failed, trying fallback profile delete...");
                // Fallback: Delete just profile if RPC fails (e.g. function not created yet)
                const { error: profileError } = await supabase
                    .from('profiles')
                    .delete()
                    .eq('id', user.id);

                if (profileError) throw profileError;
            }

            // 2. Sign out
            // AuthContext's logout clears local storage state too.
            // We can call refreshUser or just force logout logic.
            // Since we can't access logout directly from here without destructuring it:
            if (logout) {
                await logout();
            } else {
                await supabase.auth.signOut();
            }
            window.location.href = '/';

        } catch (error: any) {
            console.error('Error deleting account:', error);
            alert("Failed to delete account: " + error.message);
            setIsDeleteModalOpen(false);
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
                            <label className="block text-sm text-muted mb-1">Full Name</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    placeholder="Enter your full name"
                                    className="w-full bg-background border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            ) : (
                                <div className="font-medium text-text px-3 py-2">{formData.full_name || 'Not set'}</div>
                            )}
                        </div>
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
                                    readOnly
                                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-2 text-muted cursor-not-allowed focus:outline-none"
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
                    <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                    >
                        Delete account
                    </button>
                </div>
            </div>

            {/* Delete Warning Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-surface rounded-xl max-w-md w-full p-6 shadow-2xl border border-neutral-300 dark:border-neutral-600 animate-fadeInScale">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4">
                            <Trash2 className="w-6 h-6 text-red-600" />
                        </div>

                        <h3 className="text-xl font-bold text-text text-center mb-2">Delete Account?</h3>
                        <p className="text-sm text-muted text-center mb-6">
                            Are you sure you want to delete your account? <br />
                            <span className="font-bold text-red-500">Warning: All your scores and quiz data will be permanently deleted.</span> <br />
                            This action cannot be undone.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 px-4 py-2 text-sm font-medium text-text bg-transparent border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                className="flex-1 px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileSettings;
