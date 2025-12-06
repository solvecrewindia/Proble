import React, { useState } from 'react';
import { Calendar, Clock, Key, Shield, Link, Copy, Check } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export function StepSchedule({ data, update }: any) {
    const [copied, setCopied] = useState(false);

    const generateCode = () => {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        update({ accessCode: code });
    };

    const copyLink = () => {
        const link = `${window.location.origin}/quiz/${data.accessCode || 'CODE'}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-text">Schedule & Access</h2>
                <p className="text-sm text-muted">Configure when and how students can access this quiz.</p>
            </div>

            <Card className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text flex items-center">
                            <Calendar className="mr-2 h-4 w-4" /> Start Date & Time
                        </label>
                        <Input
                            type="datetime-local"
                            value={data.scheduledAt ? data.scheduledAt.slice(0, 16) : ''}
                            onChange={(e) => update({ scheduledAt: new Date(e.target.value).toISOString() })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text flex items-center">
                            <Clock className="mr-2 h-4 w-4" /> Duration (minutes)
                        </label>
                        <Input
                            type="number"
                            placeholder="e.g. 60"
                            value={data.durationMinutes || ''}
                            onChange={(e) => update({ durationMinutes: Number(e.target.value) })}
                        />
                    </div>
                </div>

                <div className="pt-6 border-t border-border-custom space-y-4">
                    <label className="text-sm font-medium text-text flex items-center">
                        <Key className="mr-2 h-4 w-4" /> Access Code
                    </label>
                    <div className="flex gap-3">
                        <Input
                            placeholder="Generate or enter code"
                            value={data.accessCode || ''}
                            onChange={(e) => update({ accessCode: e.target.value.toUpperCase() })}
                            className="font-mono tracking-widest uppercase"
                        />
                        <Button variant="outline" onClick={generateCode}>Generate</Button>
                    </div>
                    <p className="text-xs text-muted">Students will need this code to start the quiz.</p>
                </div>

                <div className="pt-6 border-t border-border-custom space-y-4">
                    <label className="text-sm font-medium text-text flex items-center">
                        <Link className="mr-2 h-4 w-4" /> Shareable Link
                    </label>
                    <div className="flex gap-3">
                        <input
                            readOnly
                            value={`${window.location.origin}/quiz/${data.accessCode || '...'}`}
                            className="flex-1 h-10 px-3 rounded-md border border-border-custom bg-background text-sm text-muted font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <Button variant="outline" onClick={copyLink} disabled={!data.accessCode}>
                            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                    <p className="text-xs text-muted">Direct link for students to join the quiz.</p>
                </div>

                <div className="pt-6 border-t border-border-custom">
                    <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-700 dark:text-blue-300">
                        <Shield className="h-5 w-5 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-sm">Proctoring Enabled</h4>
                            <p className="text-xs mt-1 opacity-80">
                                {data.settings?.antiCheatLevel === 'strict'
                                    ? 'Full lockdown mode active. Students cannot switch tabs or exit fullscreen.'
                                    : 'Standard monitoring active. Tab switches and webcam feed will be recorded.'}
                            </p>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
