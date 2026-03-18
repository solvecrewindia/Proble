import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Mail, Award, BookOpen, MapPin, Globe, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
    const { user: contextUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!contextUser?.id) return;
            const { data, error: _error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', contextUser.id)
                .single();
            
            if (data) setProfile(data);
            setLoading(false);
        };
        fetchProfile();
    }, [contextUser]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contextUser?.id) return;
        setSaving(true);
        
        const { error } = await supabase
            .from('profiles')
            .update({
                bio: profile.bio,
                department: profile.department,
                location: profile.location,
                website: profile.website
            })
            .eq('id', contextUser.id);

        if (!error) setIsEditing(false);
        setSaving(false);
    };

    if (loading) return (
        <div className="flex items-center justify-center p-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );

    if (!profile) return <div>Profile not found.</div>;


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">My Profile</h1>
                    <p className="text-neutral-500">Manage your public profile and credentials.</p>
                </div>
                <Button 
                    variant={isEditing ? "primary" : "outline"} 
                    onClick={() => isEditing ? (document.getElementById('profile-form') as HTMLFormElement)?.requestSubmit() : setIsEditing(true)}
                    disabled={saving}
                >
                    {saving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Edit Profile')}
                </Button>
            </div>

            <form id="profile-form" onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Photo & Basic Info */}
                <Card className="lg:col-span-1">
                    <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                        <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary mb-2">
                            {(profile.username?.[0] || profile.email?.[0] || 'U').toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-neutral-900">{profile.username || 'Unnamed Faculty'}</h2>
                            {isEditing ? (
                                <Input 
                                    className="mt-1"
                                    value={profile.department || ''} 
                                    onChange={e => setProfile({...profile, department: e.target.value})}
                                    placeholder="Department"
                                />
                            ) : (
                                <p className="text-sm text-neutral-500 font-medium">{profile.department || 'Add Department'}</p>
                            )}
                        </div>

                        <div className="flex gap-2 justify-center w-full">
                            <Badge variant="success">Verified Faculty</Badge>
                            <Badge variant="secondary">Top Rated</Badge>
                        </div>

                        <div className="w-full pt-6 space-y-3 text-left">
                            <div className="flex items-center gap-3 text-sm text-neutral-600">
                                <Mail className="h-4 w-4 shrink-0" /> {profile.email}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-neutral-600">
                                <MapPin className="h-4 w-4 shrink-0" /> 
                                {isEditing ? (
                                    <Input 
                                        value={profile.location || ''} 
                                        onChange={e => setProfile({...profile, location: e.target.value})}
                                        placeholder="Location"
                                    />
                                ) : (profile.location || 'Add Location')}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-neutral-600">
                                <Globe className="h-4 w-4 shrink-0" /> 
                                {isEditing ? (
                                    <Input 
                                        value={profile.website || ''} 
                                        onChange={e => setProfile({...profile, website: e.target.value})}
                                        placeholder="Website"
                                    />
                                ) : (profile.website || 'Add Website')}
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
                                    className="w-full h-32 p-3 rounded-xl border border-neutral-300 dark:border-neutral-600 focus:ring-primary focus:border-primary text-sm"
                                    value={profile.bio || ''}
                                    onChange={e => setProfile({...profile, bio: e.target.value})}
                                    placeholder="Tell us about yourself..."
                                />
                            ) : (
                                <p className="text-neutral-600 leading-relaxed text-sm">
                                    {profile.bio || 'No bio yet. Click Edit to add one!'}
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
                                    <p className="text-sm text-neutral-500">Stanford University â€¢ 2015</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-3 bg-neutral-50 rounded-lg">
                                <div className="p-2 bg-white rounded-md shadow-sm">
                                    <BookOpen className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-neutral-900">M.S. in Artificial Intelligence</h4>
                                    <p className="text-sm text-neutral-500">MIT â€¢ 2012</p>
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
            </form>
        </div>
    );
}
