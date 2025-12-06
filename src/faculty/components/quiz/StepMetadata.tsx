import React from 'react';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

export function StepMetadata({ data, update }: any) {
    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-text">Quiz Details</h2>
                <p className="text-sm text-muted">Basic information about the assessment.</p>
            </div>

            <div className="space-y-4">
                <Input
                    label="Quiz Title"
                    placeholder="e.g. Midterm Examination Fall 2024"
                    value={data.title || ''}
                    onChange={(e) => update({ title: e.target.value })}
                />

                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text">Description</label>
                    <textarea
                        className="flex min-h-[100px] w-full rounded-xl border border-border-custom bg-background px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-text"
                        placeholder="Enter instructions or description..."
                        value={data.description || ''}
                        onChange={(e) => update({ description: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text">Anti-Cheat Level</label>
                        <select
                            className="w-full h-10 rounded-xl border border-border-custom bg-background px-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-text"
                            value={data.settings?.antiCheatLevel || 'standard'}
                            onChange={(e) => update({ settings: { ...data.settings, antiCheatLevel: e.target.value } })}
                        >
                            <option value="low">Low (Basic Monitoring)</option>
                            <option value="standard">Standard (Tab Switching + Webcam)</option>
                            <option value="strict">Strict (Full Lockdown)</option>
                        </select>
                    </div>

                    <div className="flex items-center space-x-2 pt-8">
                        <input
                            type="checkbox"
                            id="allowRetake"
                            className="h-4 w-4 rounded border-border-custom text-primary focus:ring-primary"
                            checked={data.settings?.allowRetake || false}
                            onChange={(e) => update({ settings: { ...data.settings, allowRetake: e.target.checked } })}
                        />
                        <label htmlFor="allowRetake" className="text-sm font-medium text-text">Allow Retakes</label>
                    </div>
                </div>
            </div>
        </div>
    );
}
