import React, { useState } from 'react';
import { X, Send, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface ReportProblemModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ReportProblemModal: React.FC<ReportProblemModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [type, setType] = useState('Bug Report');
    const [description, setDescription] = useState('');
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) {
            setError('Please provide a description of the problem.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const { error: submitError } = await supabase
                .from('problem_requests')
                .insert({
                    user_id: user?.id,
                    type,
                    description,
                    details: details, // Optional extended details
                    status: 'Pending',
                    user_email: user?.email, // Store for easy display in admin
                    user_name: user?.username || user?.email, // Store for easy display
                    user_role: user?.role || 'Student' // Store role
                });

            if (submitError) throw submitError;

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setDescription('');
                setDetails('');
                setType('Bug Report');
            }, 2000);

        } catch (err: any) {
            console.error('Error submitting report:', err);
            setError('Failed to submit report. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-xl animate-in zoom-in-95 duration-200">

                {success ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                        <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-text">Report Sent!</h3>
                        <p className="text-text-secondary">Thank you for your feedback. We will look into it shortly.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-text">Report a Problem</h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/5 rounded-full text-text-secondary hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Problem Type
                                </label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-text"
                                >
                                    <option value="Bug Report">Bug Report</option>
                                    <option value="Feature Request">Feature Request</option>
                                    <option value="Quiz Error">Quiz Error</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What is the issue?"
                                    rows={3}
                                    className="w-full px-4 py-3 bg-background border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-muted text-text resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Additional Details <span className="text-muted text-xs">(Optional)</span>
                                </label>
                                <textarea
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    placeholder="Steps to reproduce, error messages, etc..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-background border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-muted text-text resize-none"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full btn-primary flex items-center justify-center gap-2 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            <span>Send Report</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default ReportProblemModal;
