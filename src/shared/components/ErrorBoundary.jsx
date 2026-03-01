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
            const retryCount = parseInt(sessionStorage.getItem('chunk_retry_count') || '0');

            if (retryCount < 3) {
                console.warn(`Chunk load error detected. Reloading (Attempt ${retryCount + 1})...`);
                sessionStorage.setItem('chunk_retry_count', String(retryCount + 1));

                // Cache busting reload
                if (window.location.search.includes('?')) {
                    window.location.reload();
                } else {
                    window.location.href = window.location.href + '?t=' + Date.now();
                }
                return;
            }
            // Reset count if we showed the error UI so next genuine reload works
            sessionStorage.removeItem('chunk_retry_count');
        }

        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-text">
                    <div className="bg-surface border border-neutral-200 dark:border-neutral-700 rounded-2xl p-8 max-w-2xl w-full shadow-lg text-center">
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl">⚠️</span>
                        </div>
                        <h1 className="text-3xl font-bold mb-4">Oops! An unexpected error occurred.</h1>
                        <p className="text-muted mb-6">
                            We're sorry for the inconvenience. The application encountered a problem and couldn't recover.
                            Please try refreshing the page or going back to the home screen.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors"
                            >
                                Refresh Page
                            </button>
                            <button
                                onClick={() => { window.location.href = '/'; }}
                                className="px-6 py-3 bg-neutral-200 dark:bg-neutral-800 text-text rounded-xl font-bold hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
                            >
                                Go to Home
                            </button>
                        </div>

                        {/* Error Details Section for Debugging */}
                        <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-700 text-left">
                            <details className="group">
                                <summary className="cursor-pointer text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center">
                                    <span className="mr-2">View Error Details (For Developers)</span>
                                    <span className="group-open:rotate-180 transition-transform text-xs">▼</span>
                                </summary>
                                <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg overflow-x-auto border border-red-500/20">
                                    <h2 className="font-mono text-sm text-red-600 dark:text-red-400 mb-2 font-bold whitespace-pre-wrap">
                                        {this.state.error && this.state.error.toString()}
                                    </h2>
                                    <pre className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">
                                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                                    </pre>
                                </div>
                            </details>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
