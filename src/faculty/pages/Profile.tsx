import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { User, Mail, Award, BookOpen, MapPin, Globe } from 'lucide-react';

export default function Profile() {
    const [isEditing, setIsEditing] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">My Profile</h1>
                    <p className="text-neutral-500">Manage your public profile and credentials.</p>
                </div>
                <Button variant={isEditing ? "primary" : "outline"} onClick={() => setIsEditing(!isEditing)}>
                    {isEditing ? 'Save Changes' : 'Edit Profile'}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Photo & Basic Info */}
                <Card className="lg:col-span-1">
                    <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                        <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary mb-2">
                            SS
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-neutral-900">Dr. Sarah Smith</h2>
                            <p className="text-sm text-neutral-500">Professor of Computer Science</p>
                        </div>

                        <div className="flex gap-2 justify-center w-full">
                            <Badge variant="success">Verified Faculty</Badge>
                            <Badge variant="secondary">Top Rated</Badge>
                        </div>

                        <div className="w-full pt-6 space-y-3 text-left">
                            <div className="flex items-center gap-3 text-sm text-neutral-600">
                                <Mail className="h-4 w-4" /> sarah.smith@proble.edu
                            </div>
                            <div className="flex items-center gap-3 text-sm text-neutral-600">
                                <MapPin className="h-4 w-4" /> San Francisco, CA
                            </div>
                            <div className="flex items-center gap-3 text-sm text-neutral-600">
                                <Globe className="h-4 w-4" /> www.sarahsmith.com
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Right Column: Detailed Info */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>About Me</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isEditing ? (
                                <textarea
                                    className="w-full h-32 p-3 rounded-xl border border-neutral-200 focus:ring-primary focus:border-primary"
                                    defaultValue="Passionate educator with over 15 years of experience in Computer Science and Artificial Intelligence. Dedicated to making complex concepts accessible to everyone."
                                />
                            ) : (
                                <p className="text-neutral-600 leading-relaxed">
                                    Passionate educator with over 15 years of experience in Computer Science and Artificial Intelligence. Dedicated to making complex concepts accessible to everyone. My research focuses on machine learning applications in education and adaptive learning systems.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Degrees & Certifications</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-start gap-4 p-3 bg-neutral-50 rounded-lg">
                                <div className="p-2 bg-white rounded-md shadow-sm">
                                    <BookOpen className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-neutral-900">Ph.D. in Computer Science</h4>
                                    <p className="text-sm text-neutral-500">Stanford University • 2015</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-3 bg-neutral-50 rounded-lg">
                                <div className="p-2 bg-white rounded-md shadow-sm">
                                    <BookOpen className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-neutral-900">M.S. in Artificial Intelligence</h4>
                                    <p className="text-sm text-neutral-500">MIT • 2012</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Achievements & Research</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Award className="h-5 w-5 text-yellow-500" />
                                <span className="text-neutral-900 font-medium">Best Faculty Award 2023</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Award className="h-5 w-5 text-blue-500" />
                                <span className="text-neutral-900 font-medium">Published 20+ Research Papers</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Award className="h-5 w-5 text-purple-500" />
                                <span className="text-neutral-900 font-medium">Top 1% Instructor on Proble</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
