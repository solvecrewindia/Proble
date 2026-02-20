import { AlertTriangle } from 'lucide-react';

const Maintenance = () => {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
            <div className="mb-8 rounded-full bg-amber-500/10 p-6 text-amber-500">
                <AlertTriangle className="h-24 w-24" />
            </div>
            <h1 className="mb-4 text-4xl font-extrabold text-text">Under Maintenance</h1>
            <p className="mb-8 max-w-lg text-lg text-muted leading-relaxed">
                Proble is currently undergoing scheduled maintenance to bring you a better experience.
                We will be back online shortly. Thank you for your patience!
            </p>
        </div>
    );
};

export default Maintenance;
