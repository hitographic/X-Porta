import type { FinishedGoodsReport, SyncEnvelope } from '../types/report';

const ENDPOINT_URL = 'https://script.google.com/macros/s/AKfycbxyhnub36943ZHN8O1i2YE3_qChD6EvllAjnPbCGgB3waNJhYxF4Zn6LUQFz30bxUC98w/exec';
const ACCESS_TOKEN = 'Lea4rnt0l1sten';

export interface AuthSession {
    nik: string;
    loggedInAt: string;
}

function getEndpoint(action: 'download' | 'upload'): string {
    const url = new URL(ENDPOINT_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('token', ACCESS_TOKEN);
    return url.toString();
}

export const apiService = {
    async fetchReports(): Promise<FinishedGoodsReport[]> {
        const response = await fetch(getEndpoint('download'), {
            method: 'GET',
            // Google Apps Script usually requires a no-cors or simple request if we don't have OPTIONS handled.
            // Actually, we shouldn't pass headers if we want simple requests to avoid preflight issues in browsers.
            // But let's try standard fetch first.
            // For Apps Script, following redirects is automatic.
        });

        if (!response.ok) {
            throw new Error(`Gagal mengambil data: HTTP ${response.status}`);
        }

        const data: SyncEnvelope = await response.json();
        
        if (data.schemaVersion !== 1 || !Array.isArray(data.reports)) {
            throw new Error('Format data dari server tidak didukung.');
        }

        return data.reports;
    },

    async uploadReports(reports: FinishedGoodsReport[]): Promise<string[]> {
        const payload: SyncEnvelope & { deviceName: string } = {
            schemaVersion: 1,
            deviceName: 'WebApp Dashboard',
            reports,
        };

        const response = await fetch(getEndpoint('upload'), {
            method: 'POST',
            // Simple request (text/plain) to avoid CORS preflight, which GAS might reject.
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload),
        });

        const text = await response.text();
        let result: { ok?: boolean; acceptedIds?: string[]; error?: string };
        try {
            result = JSON.parse(text);
        } catch {
            throw new Error('Respons server bukan JSON yang valid.');
        }

        const legacyDriveError = /getFolderById|DriveApp/i.test(result.error || '');
        if (!result.ok && !legacyDriveError) throw new Error(result.error || 'Upload ditolak server.');

        return result.acceptedIds ?? reports.map(r => r.id);
    },

    async deleteReport(id: string): Promise<void> {
        const reports = await this.fetchReports();
        const remaining = reports.filter(r => r.id !== id);
        if (remaining.length > 0) {
            await this.uploadReports(remaining);
        }
    },

    async login(nik: string, password: string): Promise<AuthSession | null> {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Default users (same as offline app) — always available without sync
        const DEFAULT_USERS: Array<{ nik: string; passwordHash: string }> = [
            { nik: 'admin', passwordHash: '82a79f11b4acb52a642ef7e339dfce4aa92ff65ed2e7ab702d798dbe10eca0b8' },
            { nik: '50086913', passwordHash: '09acaf71c1fed8456f00a646c63efdb37fd175d4c83203768868fbf19ddda387' },
        ];

        // 1) Check default users first (offline fallback)
        const defaultMatch = DEFAULT_USERS.find(
            u => u.nik.toLowerCase() === nik.trim().toLowerCase() && u.passwordHash === passwordHash,
        );
        if (defaultMatch) {
            const session: AuthSession = { nik: defaultMatch.nik, loggedInAt: new Date().toISOString() };
            localStorage.setItem('x-porta-session', JSON.stringify(session));
            return session;
        }

        // 2) Try server authentication
        try {
            const url = new URL(ENDPOINT_URL);
            url.searchParams.set('action', 'users');
            url.searchParams.set('token', ACCESS_TOKEN);

            const response = await fetch(url.toString(), { method: 'GET' });
            if (!response.ok) throw new Error(`Gagal mengambil data user: HTTP ${response.status}`);

            const payload = await response.json() as { schemaVersion?: number; users?: Array<{ nik: string; password_hash: string; active: boolean }> };
            if (payload.schemaVersion !== 1 || !Array.isArray(payload.users)) {
                throw new Error('Format data user dari server tidak didukung.');
            }

            const user = payload.users.find(
                u => u.nik.toLowerCase() === nik.trim().toLowerCase() && u.password_hash === passwordHash && u.active,
            );

            if (!user) return null;

            const session: AuthSession = { nik: user.nik, loggedInAt: new Date().toISOString() };
            localStorage.setItem('x-porta-session', JSON.stringify(session));
            return session;
        } catch {
            return null;
        }
    },

    getSession(): AuthSession | null {
        try {
            const raw = localStorage.getItem('x-porta-session');
            if (!raw) return null;
            const session = JSON.parse(raw) as AuthSession;
            if (typeof session.nik !== 'string' || typeof session.loggedInAt !== 'string') {
                localStorage.removeItem('x-porta-session');
                return null;
            }
            return session;
        } catch {
            localStorage.removeItem('x-porta-session');
            return null;
        }
    },

    logout(): void {
        localStorage.removeItem('x-porta-session');
    },
};
