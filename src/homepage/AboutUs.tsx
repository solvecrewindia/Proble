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


                {/* Team Section */}
                <div className="space-y-16">
                    <div className="text-center">
                        <h3 className="text-3xl font-bold mb-4">Meet the Team</h3>
                        <p className="text-muted">The visionaries and builders behind Proble.</p>
                    </div>

                    {[
                        {
                            title: 'Faculty Mentor',
                            members: [{ name: 'Dr. Hariharan R', role: 'Faculty Mentor', color: 'from-slate-600 to-slate-900' }]
                        },
                        {
                            title: 'Leadership',
                            members: [
                                { name: 'Esakkimadan M', role: 'Team Lead', color: 'from-blue-500 to-indigo-600' },
                                { name: 'Tharun', role: 'Lead Developer', color: 'from-purple-500 to-pink-600' }
                            ]
                        },
                        {
                            title: 'Developers',
                            members: [
                                { name: 'Nithil', role: 'Developer', color: 'from-green-500 to-emerald-600' },
                                { name: 'Surjith', role: 'Developer', color: 'from-orange-500 to-amber-600' },
                                { name: 'Sundar', role: 'Developer', color: 'from-red-500 to-rose-600' }
                            ]
                        },
                        {
                            title: 'Contributors',
                            members: [
                                { name: 'Harix', role: 'Contributor', color: 'from-teal-500 to-cyan-600' },
                                { name: 'Bharth', role: 'Contributor', color: 'from-indigo-500 to-blue-600' },
                                { name: 'Aarya', role: 'Contributor', color: 'from-pink-500 to-rose-600' },
                                { name: 'Pugal', role: 'Contributor', color: 'from-amber-500 to-orange-600' },
                                { name: 'Santhosh', role: 'Contributor', color: 'from-indigo-400 to-cyan-500' }
                            ]
                        }
                    ].map((group, groupIdx) => (
                        <div key={groupIdx} className="space-y-6">
                            <h4 className="text-2xl font-semibold text-center text-neutral-800 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-800 pb-2 max-w-sm mx-auto">
                                {group.title}
                            </h4>
                            <div className="flex flex-wrap justify-center gap-6">
                                {group.members.map((member, index) => (
                                    <div key={index} className="w-64 bg-surface border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 flex flex-col items-center text-center hover:shadow-lg transition-all">
                                        <div className={`w-20 h-20 bg-gradient-to-br ${member.color} rounded-full flex items-center justify-center shrink-0 mb-4 text-white font-bold text-2xl shadow-lg shadow-black/10`}>
                                            {member.name.charAt(0)}
                                        </div>
                                        <h4 className="text-xl font-bold whitespace-nowrap overflow-hidden text-ellipsis w-full">{member.name}</h4>
                                        <p className="text-primary font-medium text-sm mt-1">{member.role}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Startup Section */}
                <div className="bg-neutral-900 rounded-3xl p-12 text-white relative overflow-hidden mt-20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                        <div className="flex-1 space-y-6 text-center md:text-left">
                            <h3 className="text-sm font-bold tracking-widest text-primary uppercase">Proudly Built By</h3>
                            <h2 className="text-4xl font-extrabold">Solvecrew<span className="text-primary">{ }</span></h2>
                            <p className="text-neutral-400 text-lg leading-relaxed max-w-xl">
                                Proble is the flagship product of Solvecrew, a forward-thinking startup founded by Esakkimadan M and Tharun.
                                We are dedicated to building innovative software solutions that solve real-world problems and empower the next generation.
                            </p>
                        </div>
                        <div className="shrink-0">
                            <div className="bg-white p-6 rounded-2xl shadow-xl hover:scale-105 transition-transform duration-300">
                                <img
                                    src="/solvecrew-logo.jpg"
                                    alt="Solvecrew Logo"
                                    className="w-48 h-auto object-contain"
                                    onError={(e) => {
                                        // Fallback if the logo fails to load
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="border-t border-neutral-200 dark:border-neutral-800 py-12 text-center text-muted">
                <p>&copy; {new Date().getFullYear()} Proble.</p>
            </footer>
        </div>
    );
};

export default AboutUs;
