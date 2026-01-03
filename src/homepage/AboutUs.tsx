import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, Globe } from 'lucide-react';

const AboutUs = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background text-text selection:bg-primary/20">
            {/* Header */}
            <div className="bg-surface border-b border-neutral-200 dark:border-neutral-800">
                <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-muted hover:text-primary transition-colors font-medium"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Home
                    </button>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                        Proble
                    </h1>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-6 py-12 space-y-20">
                {/* Hero Section */}
                <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                        Revolutionizing Education <br />
                        <span className="text-primary">One Problem at a Time</span>
                    </h2>
                    <p className="text-lg text-muted max-w-2xl mx-auto leading-relaxed">
                        Proble is an advanced educational platform designed to bridge the gap between learning and practice.
                        We empower students with AI-driven insights and Faculty with powerful assessment tools.
                    </p>
                </div>

                {/* Mission & Vision Grid */}
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-surface p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6">
                            <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
                        <p className="text-muted leading-relaxed">
                            To democratize quality education by providing accessible, intelligent, and personalized learning experiences for students across the globe. We believe that practice is the key to mastery.
                        </p>
                    </div>

                    <div className="bg-surface p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6">
                            <Globe className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="text-2xl font-bold mb-4">Our Vision</h3>
                        <p className="text-muted leading-relaxed">
                            A world where every student has access to the tools they need to succeed. We envision a future where technology acts as a catalyst for human potential, not a replacement.
                        </p>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="bg-neutral-900 rounded-3xl p-12 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        <div>
                            <div className="text-4xl font-bold mb-2">10k+</div>
                            <div className="text-white/60 text-sm font-medium uppercase tracking-wider">Students</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold mb-2">500+</div>
                            <div className="text-white/60 text-sm font-medium uppercase tracking-wider">Quizzes</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold mb-2">50+</div>
                            <div className="text-white/60 text-sm font-medium uppercase tracking-wider">Institutions</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold mb-2">4.9</div>
                            <div className="text-white/60 text-sm font-medium uppercase tracking-wider">Rating</div>
                        </div>
                    </div>
                </div>

                {/* Founders Section */}
                <div className="space-y-12">
                    <div className="text-center">
                        <h3 className="text-3xl font-bold mb-4">Meet the Founders</h3>
                        <p className="text-muted">The visionaries behind Proble.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Founder 1 */}
                        <div className="bg-surface border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 flex flex-col items-center text-center hover:shadow-lg transition-all">
                            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shrink-0 mb-4 text-white font-bold text-2xl shadow-lg shadow-blue-500/20">
                                E
                            </div>
                            <h4 className="text-xl font-bold">ESAKKIMADAN</h4>
                            <p className="text-primary font-medium text-sm mb-3">Founder</p>
                            <p className="text-sm text-muted leading-relaxed">
                                Visionary leader driving the mission to accessible education tech.
                            </p>
                        </div>

                        {/* Founder 2 */}
                        <div className="bg-surface border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 flex flex-col items-center text-center hover:shadow-lg transition-all">
                            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shrink-0 mb-4 text-white font-bold text-2xl shadow-lg shadow-purple-500/20">
                                T
                            </div>
                            <h4 className="text-xl font-bold">THARUN</h4>
                            <p className="text-primary font-medium text-sm mb-3">Founder</p>
                            <p className="text-sm text-muted leading-relaxed">
                                Tech innovator architecting the future of smart learning platforms.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="border-t border-neutral-200 dark:border-neutral-800 py-12 text-center text-muted">
                <p>&copy; {new Date().getFullYear()} Proble. Built with ❤️ for Education.</p>
            </footer>
        </div>
    );
};

export default AboutUs;
