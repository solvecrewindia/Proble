import React from 'react';
import { Globe, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';

export function StepType({ data, update }: any) {
    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-text">Choose Assessment Type</h2>
                <p className="text-muted">Select how you want to publish this test.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 pt-8">
                <button
                    onClick={() => update({ type: 'global' })}
                    className={cn(
                        "relative p-8 rounded-2xl border-2 text-left transition-all hover:shadow-lg group",
                        data.type === 'global'
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border-custom hover:border-primary/50 bg-surface"
                    )}
                >
                    <div className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center mb-4 transition-colors",
                        data.type === 'global' ? "bg-primary text-white" : "bg-neutral-100 dark:bg-neutral-800 text-muted group-hover:text-primary"
                    )}>
                        <Globe className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-text mb-2">Global Test</h3>
                    <p className="text-sm text-muted leading-relaxed">
                        Publicly visible to all students on the platform. Ideal for MOOCs, certifications, and open assessments.
                        Includes certificate generation.
                    </p>
                </button>

                <button
                    onClick={() => update({ type: 'master' })}
                    className={cn(
                        "relative p-8 rounded-2xl border-2 text-left transition-all hover:shadow-lg group",
                        data.type === 'master'
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border-custom hover:border-primary/50 bg-surface"
                    )}
                >
                    <div className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center mb-4 transition-colors",
                        data.type === 'master' ? "bg-primary text-white" : "bg-neutral-100 dark:bg-neutral-800 text-muted group-hover:text-primary"
                    )}>
                        <Lock className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-text mb-2">Master Test</h3>
                    <p className="text-sm text-muted leading-relaxed">
                        Private assessment restricted by access code or invite. Ideal for internal exams, class tests, and hiring.
                        Includes live proctoring.
                    </p>
                </button>
            </div>
        </div>
    );
}
