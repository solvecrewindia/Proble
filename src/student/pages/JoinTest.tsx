import React, { useState } from 'react';
import { Button } from '../../shared/components/Button';
import { Key } from 'lucide-react';

const JoinTest = () => {
    const [code, setCode] = useState('');

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        alert(`Joining test with code: ${code}`);
        // Implement join logic here
    };

    return (
        <div className="max-w-md mx-auto mt-20">
            <div className="bg-surface p-8 rounded-2xl border border-border-custom shadow-sm text-center space-y-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                    <Key className="w-8 h-8" />
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-text">Join Master Test</h1>
                    <p className="text-muted mt-2">Enter the access code provided by your instructor to join the test.</p>
                </div>

                <form onSubmit={handleJoin} className="space-y-4">
                    <input
                        type="text"
                        placeholder="ENTER CODE"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        className="w-full h-12 text-center text-xl font-mono tracking-widest uppercase rounded-xl border border-border-custom bg-background text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        maxLength={8}
                    />
                    <Button type="submit" className="w-full h-12 text-lg" disabled={!code}>
                        Join Test
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default JoinTest;
