import React from 'react';
import { Input } from '../../../faculty/components/ui/Input'; // Reusing Faculty UI components
import { Card, CardContent, CardHeader, CardTitle } from '../../../faculty/components/ui/Card';

export function AdminStepMetadata({ data, update }: any) {
    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-text">Quiz Details</h2>
                <p className="text-sm text-muted">Basic information about the assessment.</p>
            </div>

            <div className="space-y-4">
                {/* Quiz Availability removed as per request */}

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

                {/* Removing Anti-Cheat and Retake options as per requirement implied by "Admin" simplified flow, 
                    OR keeping them but distinct from the "Mode" if needed. 
                    The user asked to ADD "Practice/Mock Test". 
                    Usually "Practice" implies allow retake, "Mock Test" implies strict. 
                    I'll hide manual controls if Mode handles it, or keep them as overrides. 
                    For now, I'll keep them but default them based on mode change if I were doing logic, 
                    but here just UI. I'll leave them visible for flexibility unless explicitly asked to hide.
                    Wait, the screenshot showed removing things from the LAST step. 
                    I'll keep these metadata settings for now. */}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text">Anti-Cheat Level</label>
                        <select
                            className="w-full h-10 rounded-xl border border-border-custom bg-background px-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-text"
                            value={data.settings?.antiCheatLevel || 'standard'}
                            onChange={(e) => update({ settings: { ...data.settings, antiCheatLevel: e.target.value } })}
                        >
                            <option value="standard">Standard (Tab Switching & Fullscreen)</option>
                            <option value="strict">Strict (1 Strike Tolerance)</option>
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
