import type { FinishedGoodsReport, ReportAttachment, SyncEnvelope } from '../types/report';
import { REJECT_CRITERIA } from '../types/report';
import { savePhotos } from '../utils/photoStorage';

const ENDPOINT_URL = 'https://script.google.com/macros/s/AKfycbxyhnub36943ZHN8O1i2YE3_qChD6EvllAjnPbCGgB3waNJhYxF4Zn6LUQFz30bxUC98w/exec';
const ACCESS_TOKEN = 'Lea4rnt0l1sten';
const REQUEST_TIMEOUT = 30000;

export interface AuthSession {
    nik: string;
    name: string;
    loggedInAt: string;
}

interface AttachmentUpload {
    reportId: string;
    attachmentId: string;
    fileName: string;
    mimeType: string;
    base64: string;
}

function getEndpoint(action: 'download' | 'upload' | 'master'): string {
    const url = new URL(ENDPOINT_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('token', ACCESS_TOKEN);
    return url.toString();
}

function getBase64FromDataUrl(dataUrl: string): string {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return '';
    return parts[1];
}

function stripDataUrl(attachment: ReportAttachment): ReportAttachment {
    return {
        ...attachment,
        dataUrl: '',
    };
}

function mergePhotosFromDrive(report: FinishedGoodsReport): FinishedGoodsReport {
    const attachments = report.attachments ?? [];
    const merged = attachments.map(att => {
        if (att.driveUrl && !att.dataUrl) {
            return { ...att, dataUrl: att.driveUrl };
        }
        return att;
    });

    const normalizedRejectResults: Record<string, (boolean | null)[]> = {};
    for (const criterion of REJECT_CRITERIA) {
        const key = String(criterion.id);
        const raw = report.rejectResults?.[key];
        if (!Array.isArray(raw)) {
            normalizedRejectResults[key] = Array(criterion.sampleCount).fill(true);
        } else {
            normalizedRejectResults[key] = raw.map((v: unknown) =>
                v === true ? true : v === false ? false : v === null ? null :
                typeof v === 'string' ? (v.trim().toLowerCase() === 'false' || v.trim().toLowerCase() === '0' ? false : v.trim() === '' ? null : true) :
                true
            );
        }
    }

    return { ...report, attachments: merged, rejectResults: normalizedRejectResults };
}

export interface MasterData {
    flavours: string[];
    countries: string[];
    distributors: string[];
}

let masterDataCache: MasterData | null = null;

export const apiService = {
    async fetchReports(): Promise<FinishedGoodsReport[]> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        try {
            const response = await fetch(getEndpoint('download'), {
                method: 'GET',
                signal: controller.signal,
            });
            clearTimeout(timeout);

            if (!response.ok) throw new Error(`Gagal mengambil data: HTTP ${response.status}`);

            const data: SyncEnvelope = await response.json();
            if (data.schemaVersion !== 1 || !Array.isArray(data.reports)) {
                throw new Error('Format data dari server tidak didukung.');
            }

            return data.reports.map(mergePhotosFromDrive);
        } catch (err) {
            clearTimeout(timeout);
            if (err instanceof DOMException && err.name === 'AbortError') {
                throw new Error('Request timeout. Periksa koneksi internet dan coba lagi.');
            }
            throw err;
        }
    },

    async fetchMasterData(): Promise<MasterData> {
        if (masterDataCache) return masterDataCache;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        try {
            const response = await fetch(getEndpoint('master'), {
                method: 'GET',
                signal: controller.signal,
            });
            clearTimeout(timeout);

            if (!response.ok) throw new Error(`Gagal mengambil data master: HTTP ${response.status}`);

            const data = await response.json() as MasterData;
            masterDataCache = {
                flavours: Array.isArray(data.flavours) ? data.flavours : [],
                countries: Array.isArray(data.countries) ? data.countries : [],
                distributors: Array.isArray(data.distributors) ? data.distributors : [],
            };
            return masterDataCache;
        } catch (err) {
            clearTimeout(timeout);
            if (err instanceof DOMException && err.name === 'AbortError') {
                throw new Error('Request timeout. Periksa koneksi internet dan coba lagi.');
            }
            throw err;
        }
    },

    async uploadReports(reports: FinishedGoodsReport[]): Promise<string[]> {
        const attachmentUploads: AttachmentUpload[] = [];

        for (const report of reports) {
            if (report.attachments?.length) {
                await savePhotos(report.id, report.attachments);

                for (const att of report.attachments) {
                    if (att.dataUrl && !att.driveUrl) {
                        attachmentUploads.push({
                            reportId: report.id,
                            attachmentId: att.id,
                            fileName: att.fileName,
                            mimeType: 'image/jpeg',
                            base64: getBase64FromDataUrl(att.dataUrl),
                        });
                    }
                }
            }
        }

        const strippedReports = reports.map(r => ({
            ...r,
            attachments: (r.attachments ?? []).map(stripDataUrl),
        }));

        const payload = {
            schemaVersion: 1,
            deviceName: 'WebApp Dashboard',
            reports: strippedReports,
            attachmentUploads,
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        try {
            const response = await fetch(getEndpoint('upload'), {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            clearTimeout(timeout);

            const text = await response.text();
            let result: { ok?: boolean; acceptedIds?: string[]; reports?: FinishedGoodsReport[]; error?: string };
            try {
                result = JSON.parse(text);
            } catch {
                throw new Error('Respons server bukan JSON yang valid.');
            }

            const legacyDriveError = /getFolderById|DriveApp/i.test(result.error || '');
            if (!result.ok && !legacyDriveError) throw new Error(result.error || 'Upload ditolak server.');

            if (result.reports) {
                for (const report of result.reports) {
                    if (report.attachments?.length) {
                        await savePhotos(report.id, report.attachments);
                    }
                }
            }

            return result.acceptedIds ?? reports.map(r => r.id);
        } catch (err) {
            clearTimeout(timeout);
            if (err instanceof DOMException && err.name === 'AbortError') {
                throw new Error('Request timeout. Periksa koneksi internet dan coba lagi.');
            }
            throw err;
        }
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

        const url = new URL(ENDPOINT_URL);
        url.searchParams.set('action', 'users');
        url.searchParams.set('token', ACCESS_TOKEN);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        try {
            const response = await fetch(url.toString(), { method: 'GET', signal: controller.signal });
            clearTimeout(timeout);

            if (!response.ok) throw new Error(`Gagal mengambil data user: HTTP ${response.status}`);

            const payload = await response.json() as { schemaVersion?: number; users?: Array<{ nik: string; passwordHash: string; active: boolean; name?: string }> };
            if (payload.schemaVersion !== 1 || !Array.isArray(payload.users)) {
                throw new Error('Format data user dari server tidak didukung.');
            }

            const user = payload.users.find(
                u => u.nik.toLowerCase() === nik.trim().toLowerCase() && u.passwordHash === passwordHash && u.active,
            );

            if (!user) return null;

            const session: AuthSession = { nik: user.nik, name: user.name || user.nik, loggedInAt: new Date().toISOString() };
            localStorage.setItem('x-porta-session', JSON.stringify(session));
            return session;
        } catch (err) {
            clearTimeout(timeout);
            if (err instanceof DOMException && err.name === 'AbortError') {
                throw new Error('Request timeout. Periksa koneksi internet dan coba lagi.');
            }
            throw err;
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
