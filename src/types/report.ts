export type ReportStatus = 'draft' | 'completed';
export type WorkflowStep = 1 | 2 | 3;
export type Conclusion = '' | 'accepted' | 'rejected';
export type SyncState = 'local' | 'synced' | 'modified';
export type OqcType = 'OQC Regular' | 'OQC Sticker' | 'OQC Repack' | 'OQC Monitoring';

export const OQC_TYPES: OqcType[] = ['OQC Regular', 'OQC Sticker', 'OQC Repack', 'OQC Monitoring'];

export interface ReportAttachment {
  id: string;
  description: string;
  dataUrl: string;
  fileName: string;
  width: number;
  height: number;
  sizeBytes: number;
  driveFileId: string | null;
  driveUrl: string | null;
  createdAt: string;
}

export interface RejectCriterion {
    id: number;
    category: 'A' | 'B';
    categoryLabel: string;
    name: string;
    standard: string;
    sampleCount: number;
}

export interface AnalysisParameter {
    id: number;
    key: string;
    name: string;
    standard: string;
    note?: string;
}

export interface FinishedGoodsReport {
    id: string;
    oqcType: OqcType;
    shift: number;
    line: number;
    reportNumber: string;
    flavour: string;
    country: string;
    distributor: string;
    productionCode: string;
    productionCodeDetail: string;
    locationCode: string;
    totalLot: string;
    totalLotPcs: string;
    sampleSize: number;
    sampleSizePlan: string;
    aqlPercentage: string;
    aqlAcceptReject: string;
    halalPercentage: string;
    analysisDate: string;
    status: ReportStatus;
    workflowStep: WorkflowStep;
    conclusion: Conclusion;
    inspectorName: string;
    approverName: string;
    rejectResults: Record<string, (boolean | null)[]>;
    analysisResults: Record<string, string>;
    createdAt: string;
    updatedAt: string;
    syncState: SyncState;
    lastSyncedAt: string | null;
    attachments: ReportAttachment[];
}

export type ReportDraft = Omit<FinishedGoodsReport, 'id' | 'createdAt' | 'updatedAt' | 'syncState' | 'lastSyncedAt'>;

export interface SyncSettings {
    endpointUrl: string;
    accessToken: string;
    deviceName: string;
}

export interface SyncEnvelope {
    schemaVersion: 1;
    reports: FinishedGoodsReport[];
}

export const FORM_META = {
    company: 'PT INDOFOOD CBP SUKSES MAKMUR Tbk',
    division: 'DIVISI NOODLE - PABRIK CIBITUNG',
    title: 'LAPORAN HASIL ANALISA FINISHED GOODS',
    formCode: 'PDQC - 020',
    issueNumber: '1.8',
    effectiveDate: '31 Desember 2012',
    page: '1 / 2',
} as const;

export const REJECT_CRITERIA: RejectCriterion[] = [
    { id: 1, category: 'A', categoryLabel: 'KEHALALAN PRODUK', name: 'Kemasan (karton, plastik, isi / etiket) tercemar bahan najis / haram', standard: 'Tidak tercemar bahan najis / haram', sampleCount: 1 },
    { id: 2, category: 'B', categoryLabel: 'FISIK', name: 'Salah karton (karton tidak sesuai)', standard: 'Sesuai dengan flavour isi karton', sampleCount: 13 },
    { id: 3, category: 'B', categoryLabel: 'FISIK', name: 'Kemasan kotor / tercemar benda asing, robek, basah, penyok / tidak utuh', standard: 'Bersih / tidak ada cemaran benda asing, tidak robek, kering, tidak penyok / utuh', sampleCount: 13 },
    { id: 4, category: 'B', categoryLabel: 'FISIK', name: 'Lem / plag ban tidak sesuai standar, tidak asli dan tidak lengket', standard: 'Lem / plag ban sesuai standard, asli dan lengket', sampleCount: 13 },
    { id: 5, category: 'B', categoryLabel: 'FISIK', name: 'Kode produksi karton tidak standard', standard: 'Ada, benar dan jelas terbaca', sampleCount: 13 },
    { id: 6, category: 'B', categoryLabel: 'FISIK', name: 'Cetakan dan desain karton tidak standard', standard: 'Tidak misprint dan desain terbaru', sampleCount: 13 },
    { id: 7, category: 'B', categoryLabel: 'FISIK', name: 'Shipping mark / sticker karton tidak standard', standard: 'Ada, benar dan jelas terbaca', sampleCount: 13 },
    { id: 8, category: 'B', categoryLabel: 'FISIK', name: 'Kemasan banded tidak standard', standard: 'Tidak robek / tidak belah, tidak ada cemaran', sampleCount: 13 },
    { id: 9, category: 'B', categoryLabel: 'FISIK', name: 'Isi per banded kurang', standard: 'Sesuai Kumpulan Standard', sampleCount: 13 },
    { id: 10, category: 'B', categoryLabel: 'FISIK', name: 'Cetakan & desain OPP S-Film tidak standard', standard: 'Tidak misprint dan desain terbaru', sampleCount: 13 },
    { id: 11, category: 'B', categoryLabel: 'FISIK', name: 'Kode produksi banded tidak standard', standard: 'Ada, benar dan jelas terbaca', sampleCount: 13 },
    { id: 12, category: 'B', categoryLabel: 'FISIK', name: 'Arah susunan banded salah', standard: 'Sesuai standard arah susunan', sampleCount: 13 },
    { id: 13, category: 'B', categoryLabel: 'FISIK', name: 'Leaflet / sticker banded tidak standard', standard: 'Ada dan sesuai Kumpulan Standard', sampleCount: 13 },
    { id: 14, category: 'B', categoryLabel: 'FISIK', name: 'Salah isi karton (isi tidak sesuai)', standard: 'Sesuai dengan karton', sampleCount: 13 },
    { id: 15, category: 'B', categoryLabel: 'FISIK', name: 'Arah susunan salah (karton perforasi)', standard: 'Sesuai standard arah susunan', sampleCount: 13 },
    { id: 16, category: 'B', categoryLabel: 'FISIK', name: 'Kode produksi etiket / cup tidak standard', standard: 'Ada, benar dan jelas terbaca', sampleCount: 13 },
    { id: 17, category: 'B', categoryLabel: 'FISIK', name: 'Cetakan & desain etiket / cup tidak standard', standard: 'Tidak misprint dan desain terbaru', sampleCount: 13 },
    { id: 18, category: 'B', categoryLabel: 'FISIK', name: 'Sticker / leaflet / video jet tidak ada / salah', standard: 'Ada dan benar', sampleCount: 13 },
    { id: 19, category: 'B', categoryLabel: 'FISIK', name: 'Etiket / cup tercemar tikus / benda asing', standard: 'Tidak bekas cemaran tikus / benda asing', sampleCount: 13 },
    { id: 20, category: 'B', categoryLabel: 'FISIK', name: 'Etiket bocor', standard: 'Etiket tidak bocor', sampleCount: 13 },
    { id: 21, category: 'B', categoryLabel: 'FISIK', name: 'Kondisi sealing tidak standard', standard: 'Sesuai standard', sampleCount: 13 },
    { id: 22, category: 'B', categoryLabel: 'FISIK', name: 'Isi per karton kurang', standard: 'Sesuai Kumpulan Standard', sampleCount: 13 },
    { id: 23, category: 'B', categoryLabel: 'FISIK', name: 'Kelengkapan produk tidak standard (khusus bag noodle yang memakai seasoning)', standard: 'Lengkap sesuai standard', sampleCount: 13 },
];

export const ANALYSIS_PARAMETERS: AnalysisParameter[] = [
    { id: 24, key: 'organoleptic_noodle', name: 'Organoleptik mi', standard: 'Min. 6' },
    { id: 25, key: 'organoleptic_seasoning', name: 'Organoleptik bumbu / cabe / solid ingredient / bawang goreng *', standard: 'Min. 6' },
    { id: 26, key: 'organoleptic_oil', name: 'Organoleptik minyak bumbu / kecap / sambal pasta *', standard: 'Min. 6' },
    { id: 27, key: 'moisture_noodle', name: 'Kadar air mi', standard: '' },
    { id: 28, key: 'moisture_seasoning', name: 'Kadar air bumbu / cabe / solid ingredient / bawang goreng *', standard: '' },
    { id: 29, key: 'moisture_oil', name: 'Kadar air minyak bumbu / kecap / sambal pasta *', standard: '' },
    { id: 30, key: 'av_ffa', name: 'AV mi / FFA minyak bumbu', standard: '' },
    { id: 31, key: 'product_integrity', name: 'Keutuhan produk', standard: 'Min. 95 %' },
];

export function calculateSampleRejects(report: Pick<FinishedGoodsReport, 'rejectResults'>): number[] {
    return Array.from({ length: 13 }, (_, sampleIndex) => REJECT_CRITERIA.reduce(
        (total, criterion) => total + (report.rejectResults[String(criterion.id)]?.[sampleIndex] === false ? 1 : 0),
        0,
    ));
}

export function calculateAcceptRejectStatus(
    rejects: number[],
    sampleSize: number,
    aqlAcceptReject: string,
): string[] {
    const threshold = Number((aqlAcceptReject || '').split('/')[0]) || 0;
    return rejects.map((count, index) => index < sampleSize ? (count > threshold ? 'R' : 'A') : '');
}

export function createEmptyReport(oqcType: OqcType = 'OQC Regular'): ReportDraft {
    const today = new Date().toISOString().slice(0, 10);
    const uncheckedIds = new Set<number>();
    if (oqcType !== 'OQC Sticker') {
        uncheckedIds.add(7);
        uncheckedIds.add(18);
    }
    const rejectResults = Object.fromEntries(
        REJECT_CRITERIA.map((criterion) => [
            String(criterion.id),
            Array(criterion.sampleCount).fill(!uncheckedIds.has(criterion.id)),
        ]),
    );
    const analysisResults = Object.fromEntries(ANALYSIS_PARAMETERS.map((parameter) => [parameter.key, '']));

    return {
        oqcType: 'OQC Regular',
        shift: 1,
        line: 1,
        reportNumber: '',
        flavour: '',
        country: '',
        distributor: '',
        productionCode: '',
        productionCodeDetail: '',
        locationCode: '',
        totalLot: '',
        totalLotPcs: '',
        sampleSize: 13,
        workflowStep: 1,
        sampleSizePlan: '',
        aqlPercentage: '',
        aqlAcceptReject: '',
        halalPercentage: '100',
        analysisDate: today,
        status: 'draft',
        conclusion: '',
        inspectorName: '',
        approverName: '',
        rejectResults,
        analysisResults,
        attachments: [],
    };
}
