import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, BookOpen, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // ensure katex css is loaded

const ReadMode = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [quiz, setQuiz] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModuleCompleted, setIsModuleCompleted] = useState(false);
    const [markingRead, setMarkingRead] = useState(false);
    const [isTestAlreadyDone, setIsTestAlreadyDone] = useState(false);

    const handleMarkAsRead = async () => {
        if (!id) return;
        setMarkingRead(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not logged in");

            // Save to attempts table instead of profiles to avoid needing DB schema changes
            await supabase
                .from('attempts')
                .upsert({
                    quiz_id: id,
                    student_id: user.id,
                    status: 'completed',
                    answers: { is_read_only: true }
                }, { onConflict: 'student_id, quiz_id' });
            
            setIsModuleCompleted(true);
        } catch (error) {
            console.error('Error marking as read:', error);
            alert('Failed to mark as read');
        } finally {
            setMarkingRead(false);
        }
    };

    useEffect(() => {
        const fetchContent = async () => {
            if (!id) return;
            try {
                const { data, error } = await supabase
                    .from('quizzes')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (!data) throw new Error("Not found");

                setQuiz(data);

                // Check completion status
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const [{ data: userAttempts }, { data: testResults }] = await Promise.all([
                        supabase
                            .from('attempts')
                            .select('id, answers, status')
                            .eq('quiz_id', id)
                            .eq('student_id', user.id)
                            .eq('status', 'completed'),
                        supabase
                            .from('quiz_results')
                            .select('id')
                            .eq('quiz_id', id)
                            .eq('student_id', user.id)
                            .limit(1)
                    ]);
                    
                    if (userAttempts && userAttempts.some((a: any) => a.answers?.is_read_only)) {
                        setIsModuleCompleted(true);
                    }

                    const hasCompletedTest = (testResults && testResults.length > 0) || 
                        (userAttempts && userAttempts.some((a: any) => !a.answers?.is_read_only));

                    if (hasCompletedTest) {
                        setIsTestAlreadyDone(true);
                    }
                }
            } catch (err: any) {
                console.error(err);
                setError(err.message || "Failed to load content");
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [id]);

    if (loading) return <div className="min-h-screen bg-background text-text flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (error || !quiz) return <div className="min-h-screen bg-background text-text flex items-center justify-center text-red-500">{error || "Content not found."}</div>;

    const readContent = quiz.settings?.readContent || "";

    return (
        <div className="min-h-screen bg-background text-text font-sans">
            <div className="max-w-4xl mx-auto px-6 pt-8 pb-24">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-muted hover:text-text transition-colors mb-10 group"
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    <span className="text-sm font-medium">Back to details</span>
                </button>

                {/* Header Section */}
                <div className="mb-12 border-b border-neutral-200 dark:border-neutral-800 pb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                        <BookOpen className="w-4 h-4" />
                        <span>Study Material</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-text leading-tight mb-6">
                        {quiz.title}
                    </h1>
                    {quiz.description && (
                        <p className="text-muted text-lg leading-relaxed">
                            {quiz.description}
                        </p>
                    )}
                </div>

                {/* Content Section */}
                <div className="prose prose-lg dark:prose-invert max-w-none mb-16 font-sans text-text-secondary leading-relaxed break-words">
                    <ReactMarkdown 
                        remarkPlugins={[remarkMath, remarkGfm]} 
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-8 mb-4 text-text" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-8 mb-4 border-b border-neutral-200 dark:border-neutral-800 pb-2 text-text" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-xl font-bold mt-6 mb-3 text-text" {...props} />,
                            p: ({node, ...props}) => <p className="mb-4" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-8 mb-4 space-y-2" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-8 mb-4 space-y-2" {...props} />,
                            li: ({node, ...props}) => <li className="" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-bold text-text" {...props} />,
                            code: ({node, inline, ...props}: any) => 
                                inline ? <code className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-sm text-primary font-mono font-medium" {...props} /> 
                                       : <code className="block bg-[#0d1117] text-[#c9d1d9] p-5 rounded-xl text-[15px] font-mono overflow-x-auto mb-6 border border-neutral-800 shadow-xl" {...props} />,
                            pre: ({node, ...props}) => <pre className="bg-transparent p-0 m-0" {...props} />,
                            table: ({node, ...props}) => (
                                <div className="overflow-x-auto my-6 rounded-xl border border-neutral-200 dark:border-neutral-800">
                                    <table className="w-full text-left border-collapse" {...props} />
                                </div>
                            ),
                            thead: ({node, ...props}) => <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800" {...props} />,
                            tbody: ({node, ...props}) => <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800" {...props} />,
                            tr: ({node, ...props}) => <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 transition-colors" {...props} />,
                            th: ({node, ...props}) => <th className="px-6 py-4 font-bold text-text bg-surface" {...props} />,
                            td: ({node, ...props}) => <td className="px-6 py-4 align-top" {...props} />,
                        }}
                    >
                        {readContent}
                    </ReactMarkdown>
                </div>

                {/* Footer Action */}
                <div className="mt-16 pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-6 bg-surface/50 p-8 rounded-3xl">
                    <div>
                        <h3 className="text-xl font-bold mb-2">Ready to test your knowledge?</h3>
                        <p className="text-muted text-sm">
                            {isTestAlreadyDone 
                                ? "You have already taken and completed the test for this material." 
                                : "Take the mock test based on this material."}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                        {isModuleCompleted ? (
                            <div className="w-full sm:w-auto px-6 py-3.5 bg-green-500/20 text-green-400 font-bold rounded-2xl border border-green-500/50 flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-5 h-5" />
                                Read Completed
                            </div>
                        ) : (
                            <button
                                onClick={handleMarkAsRead}
                                disabled={markingRead}
                                className="w-full sm:w-auto px-6 py-3.5 bg-surface hover:bg-surface-hover text-white font-bold rounded-2xl transition-all border border-white/10 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {markingRead ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-5 h-5" />
                                        Mark as Read
                                    </>
                                )}
                            </button>
                        )}
                        
                        <button
                            onClick={() => {
                                if (!isTestAlreadyDone) navigate(`/student/test/${id}`);
                            }}
                            disabled={isTestAlreadyDone}
                            className={`w-full sm:w-auto px-8 py-3.5 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 ${
                                isTestAlreadyDone 
                                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 cursor-not-allowed opacity-90' 
                                    : 'bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl hover:-translate-y-1'
                            }`}
                        >
                            {isTestAlreadyDone ? (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    Already Taken Test
                                </>
                            ) : (
                                <>
                                    Take Test Now
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReadMode;
