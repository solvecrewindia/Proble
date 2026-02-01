
import { lazy, ComponentType } from 'react';

export const lazyRetry = <T extends ComponentType<any>>(
    componentImport: () => Promise<{ default: T }>,
    name?: string // Optional name for logging
): React.LazyExoticComponent<T> => {
    return lazy(async () => {
        try {
            return await componentImport();
        } catch (error: any) {
            // Check if the error is a chunk load error
            if (error?.message?.includes('Failed to fetch dynamically imported module') ||
                error?.message?.includes('Importing a module script failed')) {

                // Prevent infinite reload loops
                const storageKey = `retry-lazy-${name || 'unknown'}`;
                const lastReload = sessionStorage.getItem(storageKey);
                const now = Date.now();

                if (!lastReload || now - parseInt(lastReload) > 10000) {
                    // If we haven't reloaded recently (last 10 seconds), reload the page
                    sessionStorage.setItem(storageKey, now.toString());
                    window.location.reload();
                    // Return a never-resolving promise to wait for reload
                    return new Promise(() => { });
                }
            }

            // If not a chunk error or we just reloaded, throw the error
            console.error(`Failed to load component ${name || ''}:`, error);
            throw error;
        }
    });
};
