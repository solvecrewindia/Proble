import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { AlertCircle, Save } from 'lucide-react';

const RegistrationNumberModal = () => {
    const { user, refreshUser } = useAuth();
    const [regNumber, setRegNumber] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    // Filter conditions:
    // 1. User must be logged in
    // 2. Email must end with @srmist.edu.in
    // 3. registration_number must be missing or empty
    if (!user || !user.email.endsWith('@srmist.edu.in') || user.registration_number) {
        return null;
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!regNumber.trim()) {
            setError('Registration Number is required');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ registration_number: regNumber.trim() })
                .eq('id', user.id);

            if (updateError) throw updateError;

            await refreshUser(); // This will update the context and unmount the modal
        } catch (err: any) {
            console.error('Error saving registration number:', err);
            setError(err.message || 'Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-surface w-full max-w-md rounded-2xl p-8 border border-neutral-300 dark:border-neutral-600 shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary mb-4">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-text">Action Required</h2>
                    <p className="text-muted mt-2">
                        Please enter your SRMIST Registration Number to continue using the platform.
                    </p>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text mb-1">
                            Registration Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={regNumber}
                            onChange={(e) => setRegNumber(e.target.value)}
                            placeholder="e.g. RA2111003010xxx"
                            className="w-full h-12 px-4 rounded-xl bg-background border border-neutral-300 dark:border-neutral-600 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono"
                            autoFocus
                        />
                        {error && (
                            <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" /> {error}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full h-12 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Save & Continue
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RegistrationNumberModal;
