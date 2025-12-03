import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plus, Globe, BarChart2, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Global() {
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">My Global Tests</h1>
                    <p className="text-neutral-500">Manage your public assessments and view analytics.</p>
                </div>

            </div>

            <div className="grid gap-6">
                {/* Mock Item */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="h-32 w-48 bg-blue-500 rounded-lg shrink-0" />
                            <div className="flex-1 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-neutral-900">Introduction to Computer Science</h3>
                                        <p className="text-sm text-neutral-500">Published on Oct 15, 2024 • Technology</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm">
                                            <Share2 className="h-4 w-4 mr-2" /> Share
                                        </Button>
                                        <Button variant="outline" size="sm">
                                            <BarChart2 className="h-4 w-4 mr-2" /> Analytics
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-4 py-4 border-y border-neutral-100">
                                    <div>
                                        <div className="text-2xl font-bold text-neutral-900">1,250</div>
                                        <div className="text-xs text-neutral-500">Participants</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-neutral-900">4.8</div>
                                        <div className="text-xs text-neutral-500">Rating</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-neutral-900">85%</div>
                                        <div className="text-xs text-neutral-500">Avg. Score</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-green-600">Active</div>
                                        <div className="text-xs text-neutral-500">Status</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
