import { Component } from 'react';

/** Catches render errors anywhere below it so one broken component doesn't blank the whole app. */
class ErrorBoundary extends Component {
    state = { error: null };

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error('Unhandled UI error:', error, info.componentStack);
    }

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <div role="alert" className="h-screen bg-black text-white flex flex-col items-center justify-center gap-4 p-6 text-center">
                <h1 className="text-2xl font-bold">Something went wrong</h1>
                <p className="text-gray-400">The page hit an unexpected error.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-white text-black font-semibold rounded-full px-6 py-2 cursor-pointer"
                >
                    Reload
                </button>
            </div>
        );
    }
}

export default ErrorBoundary;
