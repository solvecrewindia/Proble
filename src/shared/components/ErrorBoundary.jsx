import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Auto-reload on chunk load failure (deployment update)
        const isChunkError = error.message && (
            error.message.includes('Failed to fetch dynamically imported module') ||
            error.message.includes('Importing a module script failed') ||
            error.message.includes("'text/html' is not a valid JavaScript MIME type")
        );

        if (isChunkError) {
            const lastReload = sessionStorage.getItem('chunk_reload_ts');
            const now = Date.now();
            // Prevent infinite loops - only reload if > 10s since last attempt
            if (!lastReload || now - parseInt(lastReload) > 10000) {
                console.warn("Chunk load error detected. Reloading...");
                sessionStorage.setItem('chunk_reload_ts', String(now));
                window.location.reload();
                return;
            }
        }

        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 bg-red-50 min-h-screen text-red-900 font-mono">
                    <h1 className="text-3xl font-bold mb-4">Something went wrong.</h1>
                    <p className="mb-4">The application crashed with the following error:</p>
                    <div className="bg-white p-4 rounded border border-red-200 overflow-auto whitespace-pre-wrap">
                        <h2 className="font-bold text-red-600 mb-2">{this.state.error && this.state.error.toString()}</h2>
                        <details>
                            <summary className="cursor-pointer text-sm text-gray-500">Stack Trace</summary>
                            <pre className="text-xs mt-2 text-gray-700">{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
                        </details>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                    >
                        Reload Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
