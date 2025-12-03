import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Plus, Lock, Eye, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Master() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('ongoing');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">Master Tests</h1>
                    <p className="text-neutral-500">Private assessments with secure access codes.</p>
                </div>

            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-neutral-200">
                {['ongoing', 'scheduled', 'completed'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 px-1 text-sm font-medium capitalize transition-colors border-b-2 ${activeTab === tab
                            ? 'border-primary text-primary'
                            : 'border-transparent text-neutral-500 hover:text-neutral-700'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="grid gap-4">
                {activeTab === 'ongoing' && (
                    <Card className="border-l-4 border-l-green-500">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="success" className="animate-pulse">Live Now</Badge>
                                        <span className="text-xs text-neutral-500">Started 15m ago</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-neutral-900">Advanced Algorithms Final</h3>
                                    <p className="text-sm text-neutral-500">Code: <span className="font-mono font-bold text-neutral-900">ALGO-2024-X</span></p>
                                </div>
                                <Button>
                                    <Eye className="h-4 w-4 mr-2" /> Monitor Live
                                </Button>
                            </div>

                            <div className="mt-6 grid grid-cols-4 gap-4">
                                <div className="bg-neutral-50 p-3 rounded-lg">
                                    <div className="text-2xl font-bold text-neutral-900">42</div>
                                    <div className="text-xs text-neutral-500">Active Students</div>
                                </div>
                                <div className="bg-neutral-50 p-3 rounded-lg">
                                    <div className="text-2xl font-bold text-red-500">2</div>
                                    <div className="text-xs text-neutral-500">Flagged Incidents</div>
                                </div>
                                <div className="bg-neutral-50 p-3 rounded-lg">
                                    <div className="text-2xl font-bold text-neutral-900">15%</div>
                                    <div className="text-xs text-neutral-500">Avg. Progress</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'scheduled' && (
                    <div className="text-center py-12 text-neutral-500">No scheduled tests found.</div>
                )}
            </div>
        </div>
    );
}
