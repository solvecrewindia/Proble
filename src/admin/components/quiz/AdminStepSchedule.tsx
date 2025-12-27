import React from 'react';
import { Calendar, Clock, Lock } from 'lucide-react'; // Removing Key, Link, Shield, Copy, Check
import { Input } from '../../../faculty/components/ui/Input';
import { Card } from '../../../faculty/components/ui/Card';

export function AdminStepSchedule({ data, update }: any) {
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-text">Schedule</h2>
                <p className="text-sm text-muted">Configure when this quiz is available.</p>
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
                            value={data.settings?.duration || ''}
                            onChange={(e) => update({
                                settings: {
                                    ...data.settings,
                                    duration: Number(e.target.value)
                                }
                            })}
                        />
                    </div>
                </div>

                <div className="pt-6 border-t border-border-custom">
                    <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-700 dark:text-orange-300">
                        <Lock className="h-5 w-5" />
                        <div>
                            <h4 className="font-medium text-sm">Restricted Access</h4>
                            <p className="text-xs mt-1 opacity-80">
                                This quiz will differ based on the selected mode ({data.settings?.modes?.map((m: string) => m === 'mock_test' ? 'Mock Test' : 'Practice').join(' & ') || 'None'}).
                            </p>
                        </div>
                    </div>
                </div>

                {/* Removed Access Code, Shareable Link, and Proctoring sections */}
            </Card>
        </div>
    );
}
