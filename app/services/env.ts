/**
 * Utility to handle environment-specific configurations, 
 * especially for connectivity in Github Codespaces.
 */

export const getEmulatorHost = (defaultHost: string = 'localhost'): string => {
    if (typeof window !== 'undefined' && window.location.hostname) {
        return window.location.hostname;
    }
    return process.env.EXPO_PUBLIC_FIREBASE_HOST || defaultHost;
};

/**
 * In Codespaces, each port is exposed on its own subdomain.
 * Frontend (8081): <name>-8081.app.github.dev
 * Backend (5001): <name>-5001.app.github.dev
 */
export const getEmulatorUrl = (port: number, protocol: string = 'http'): string => {
    const host = getEmulatorHost();

    // If we are in Codespaces (detected by the hostname pattern)
    if (host.includes('app.github.dev') || host.includes('preview.app.github.dev')) {
        // Replace the port in the hostname.
        // Format is usually: <name>-<port>.<region>.app.github.dev
        // We look for the -<port> part.
        const newHost = host.replace(/-\d+(\.|(?=\.))/, `-${port}$1`);
        return `${protocol}://${newHost}`;
    }

    // Standard localhost / IP based access
    return `${protocol}://${host}:${port}`;
};

export const USE_EMULATOR = process.env.EXPO_PUBLIC_USE_EMULATOR !== 'false';
