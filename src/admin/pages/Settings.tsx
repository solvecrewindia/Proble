import { useState } from 'react';
import { Save, Lock, Shield, Eye, EyeOff } from 'lucide-react';

const Settings = () => {
    const [showApiKey, setShowApiKey] = useState(false);
    const [settings, setSettings] = useState({
        maintenanceMode: false,
        newSignups: true,
        strictAntiCheat: true,
        emailNotifications: true,
        marketingEmails: false,
    });

    const handleToggle = (key: keyof typeof settings) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <h1 className="text-2xl font-bold text-text">Platform Settings</h1>

            {/* General Settings */}
            <div className="rounded-2xl border border-surface bg-surface p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                        <Shield className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-semibold text-text">System Controls</h2>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-text">Maintenance Mode</p>
                            <p className="text-sm text-muted">Disable access for all non-admin users</p>
                        </div>
                        <button
                            onClick={() => handleToggle('maintenanceMode')}
                            className={`relative h-6 w-11 rounded-full transition-colors ${settings.maintenanceMode ? 'bg-primary' : 'bg-muted/30'
                                }`}
                        >
                            <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${settings.maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                                }`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-text">Allow New Signups</p>
                            <p className="text-sm text-muted">Users can create new accounts</p>
                        </div>
                        <button
                            onClick={() => handleToggle('newSignups')}
                            className={`relative h-6 w-11 rounded-full transition-colors ${settings.newSignups ? 'bg-primary' : 'bg-muted/30'
                                }`}
                        >
                            <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${settings.newSignups ? 'translate-x-5' : 'translate-x-0'
                                }`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-text">Strict Anti-Cheat Mode</p>
                            <p className="text-sm text-muted">Automatically flag suspicious browser behavior</p>
                        </div>
                        <button
                            onClick={() => handleToggle('strictAntiCheat')}
                            className={`relative h-6 w-11 rounded-full transition-colors ${settings.strictAntiCheat ? 'bg-primary' : 'bg-muted/30'
                                }`}
                        >
                            <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${settings.strictAntiCheat ? 'translate-x-5' : 'translate-x-0'
                                }`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* API Configuration */}
            <div className="rounded-2xl border border-surface bg-surface p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="rounded-lg bg-purple-500/10 p-2 text-purple-500">
                        <Lock className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-semibold text-text">API Configuration</h2>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-text">Admin API Key</label>
                        <div className="relative">
                            <input
                                type={showApiKey ? "text" : "password"}
                                value="sk_live_51MzQx2Kj8L9p0O1n2M3k4J5i6H7g8F9"
                                readOnly
                                className="h-10 w-full rounded-xl border border-surface bg-background px-4 text-sm text-muted focus:border-primary focus:outline-none"
                            />
                            <button
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                            >
                                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <p className="mt-2 text-xs text-muted">
                            This key grants full access to the Proble Admin API. Keep it secure.
                        </p>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-background hover:bg-primary/90 transition-colors">
                            <Save className="h-4 w-4" />
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
