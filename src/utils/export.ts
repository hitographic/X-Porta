import { ANALYSIS_PARAMETERS, calculateAcceptRejectStatus, calculateSampleRejects, FORM_META, REJECT_CRITERIA, isRejected } from '../types/report';
import type { FinishedGoodsReport } from '../types/report';

const escapeHtml = (value: unknown) => String(value ?? '')
    .replace(/&/g, String.fromCharCode(38, 97, 109, 112, 59))
    .replace(/</g, String.fromCharCode(38, 108, 116, 59))
    .replace(/>/g, String.fromCharCode(38, 103, 116, 59))
    .replace(/"/g, String.fromCharCode(38, 113, 117, 111, 116, 59))
    .replace(/'/g, String.fromCharCode(38, 35, 51, 57, 59));
const cell = (value: unknown, className = '') => `<td class="${className}">${escapeHtml(value)}</td>`;

function rejectRows(report: FinishedGoodsReport, activeSamples: number): string {
    let previousCategory = '';
    return REJECT_CRITERIA.map((criterion) => {
        const results = report.rejectResults[String(criterion.id)] || [];
        const categoryRow = previousCategory !== criterion.category
            ? `<tr class="section"><td>${criterion.category}.</td><td colspan="2">${criterion.categoryLabel}</td><td class="section-fill" colspan="13"></td></tr>`
            : '';
        previousCategory = criterion.category;
        const sampleResults = criterion.sampleCount === 1
            ? `<td class="sample merged-sample" colspan="13">${isRejected(results[0]) ? 'X' : results[0] === true ? '✓' : ''}</td>`
            : Array.from({ length: 13 }, (_, index) => {
                if (index >= activeSamples || index >= criterion.sampleCount) return cell('', 'sample inactive-sample');
                return cell(isRejected(results[index]) ? 'X' : results[index] === true ? '✓' : '', 'sample');
            }).join('');
        return `${categoryRow}<tr>${cell(`${criterion.id}.`, 'number')}${cell(criterion.name, 'criterion-name')}${cell(criterion.standard, 'standard')}${sampleResults}</tr>`;
    }).join('');
}

function analysisRows(report: FinishedGoodsReport): string {
    return ANALYSIS_PARAMETERS.map((parameter) => `<tr>${cell(`${parameter.id}.`, 'number')}${cell(parameter.name, 'criterion-name')}${cell(parameter.standard, 'standard')}${cell(report.analysisResults[parameter.key] || '', 'analysis-value')}</tr>`).join('');
}

export function buildReportHtml(report: FinishedGoodsReport): string {
    const activeSamples = Math.min(13, Math.max(1, Number(report.sampleSize) || 1));
    const totalRejects = calculateSampleRejects(report);
    const statuses = calculateAcceptRejectStatus(totalRejects, activeSamples, report.aqlAcceptReject);
    const sampleHeaders = Array.from({ length: 13 }, (_, index) => `<th class="sample">${index + 1}</th>`).join('');
    const sampleCells = (values: string[]) => values.map((value, index) => `<td class="sample${index < activeSamples ? '' : ' inactive-sample'}">${index < activeSamples ? value : ''}</td>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:A4 portrait;margin:5mm}*{box-sizing:border-box}body{font-family:"Times New Roman",Times,serif;font-size:10px;line-height:1.12;margin:0;color:#000}.page-frame{border:1px solid #000;min-height:287mm}.page-content{padding:5px 12px 10px}table{width:100%;border-collapse:collapse;table-layout:fixed}td,th{border:1px solid #000;padding:1.5px 2px;vertical-align:middle;overflow-wrap:anywhere}th{font-weight:bold;text-align:center}.center{text-align:center}.bold{font-weight:bold}.meta{font-weight:bold}.document-header{border:0;border-bottom:1px solid #000}.document-header td{height:15px;border:0}.document-header .company{border-right:1px solid #000}.company{font-size:10px;text-align:center;font-weight:bold;line-height:1.25}.header-label{width:14%;font-weight:bold;padding-left:28px}.header-colon{width:3%;text-align:center}.header-value{text-align:left}.title{text-align:center;font-size:15px;font-weight:bold;margin:10px 0 2px;word-spacing:4px}.subtitle{text-align:center;font-size:10px;margin-bottom:8px}.info td{height:17px;border:0}.info .label{width:25%}.info .colon{width:2%;text-align:center}.info .value{width:21%;text-align:left;border-bottom:1px dotted #000}.info .right-label{width:28%}.info .right-colon{width:2%;text-align:center}.info .right-value{width:22%;text-align:left;border-bottom:1px dotted #000}.criteria{margin-top:8px;border:1px solid #000}.criteria col.no{width:3%}.criteria col.name{width:26%}.criteria col.standard{width:25%}.criteria col.sample{width:3.54%}.criteria th{height:17px}.criteria .number,.criteria td:first-child,.analysis td:first-child{text-align:center}.criterion-name,.standard{text-align:left;vertical-align:top}.sample{font-family:Arial,sans-serif;font-size:10px;font-weight:bold;text-align:center;padding:1px 0!important}.criteria tbody tr:not(.section) td{height:15px;border-top:1px dotted #777;border-bottom:1px dotted #777}.criteria tbody tr td:first-child,.criteria tbody tr td:nth-child(2),.criteria tbody tr td:nth-child(3){border-left:1px solid #000}.section td{background:#eee;font-weight:bold;border:1px solid #000!important;font-size:10px;vertical-align:middle}.section-fill{border:0!important}.total td{font-weight:bold;border:1px solid #000!important;background:#f5f5f5}.analysis{margin-top:8px;border:1px solid #000}.analysis col.no{width:3%}.analysis col.name{width:36%}.analysis col.standard{width:16%}.analysis col.result{width:45%}.analysis td{height:16px;border-top:1px dotted #777;border-bottom:1px dotted #777}.analysis tbody tr td:first-child,.analysis tbody tr td:nth-child(2),.analysis tbody tr td:nth-child(3){border-left:1px solid #000}.analysis-value{text-align:left}.conclusion{margin-top:10px;font-weight:bold;font-size:10px}.signatures{margin-top:12px;width:100%;border-collapse:collapse}.signatures td{padding:4px 8px;vertical-align:top;font-size:10px;border:0}.signatures .signature-name{height:52px;vertical-align:bottom;padding-bottom:1px;font-weight:bold}.signatures .signature-line{height:8px;vertical-align:top;font-weight:bold;line-height:1}.signatures .signature-role{height:16px;vertical-align:top;font-weight:normal}.footnotes{margin-top:8px;font-size:10px;color:#444;line-height:1.4}.inactive-sample{color:#ccc}.merged-sample{height:15px;background:#fff;color:#000;border:1px solid #000!important;text-align:center}
  .attachment-page{page-break-before:always;min-height:287mm;border:1px solid #000;padding:12mm}.attachment-title{text-align:center;font-size:14px;font-weight:bold;margin-bottom:10mm}.attachment-grid{display:grid;grid-template-columns:1fr 1fr;gap:8mm}.attachment{margin:0;text-align:center;break-inside:avoid}.attachment img{display:block;width:78mm;height:78mm;object-fit:cover;margin:0 auto;border:1px solid #000}.attachment figcaption{font-size:9px;margin-top:2mm}
  </style></head><body><div class="page-frame">
  <table class="document-header"><colgroup><col style="width:57%"><col class="header-label"><col class="header-colon"><col class="header-value"></colgroup><tr><td rowspan="4" class="company">${escapeHtml(FORM_META.company)}<br>${escapeHtml(FORM_META.division)}</td><td class="header-label">Kode Form</td><td class="header-colon">:</td><td class="header-value">${escapeHtml(FORM_META.formCode)}</td></tr><tr><td class="header-label">No. Terbitan</td><td class="header-colon">:</td><td class="header-value">${escapeHtml(FORM_META.issueNumber)}</td></tr><tr><td class="header-label">Tgl. Efektif</td><td class="header-colon">:</td><td class="header-value">${escapeHtml(FORM_META.effectiveDate)}</td></tr><tr><td class="header-label">Halaman</td><td class="header-colon">:</td><td class="header-value">${escapeHtml(FORM_META.page)}</td></tr></table><div class="page-content">
  <div class="title">${escapeHtml(FORM_META.title)}</div>  <div class="subtitle">No. : ${escapeHtml(report.reportNumber)} / Batch / ${escapeHtml(report.oqcType)} / ${escapeHtml(report.analysisDate?.slice(0, 4) || '')}</div>
  <table class="info"><colgroup><col class="label"><col class="colon"><col class="value"><col class="right-label"><col class="right-colon"><col class="right-value"></colgroup><tr>${cell('Flavour', 'label')}${cell(':', 'colon')}${cell(report.flavour, 'value')}${cell('Total Lot', 'right-label')}${cell(':', 'right-colon')}${cell(`${report.totalLot || ''} / ${report.totalLotPcs || ''} pcs`, 'right-value')}</tr><tr>${cell('Negara', 'label')}${cell(':', 'colon')}${cell(report.country, 'value')}${cell('Sample Size', 'right-label')}${cell(':', 'right-colon')}${cell(`${activeSamples} / ${report.sampleSizePlan || ''}`, 'right-value')}</tr><tr>${cell('Distributor', 'label')}${cell(':', 'colon')}${cell(report.distributor, 'value')}${cell('AQL', 'right-label')}${cell(':', 'right-colon')}${cell(`${report.aqlPercentage || ''} %, A/R : ${report.aqlAcceptReject || ''}`, 'right-value')}</tr><tr>${cell('Kode Produksi', 'label')}${cell(':', 'colon')}${cell(`${report.productionCode || ''} ${report.productionCodeDetail || ''}`, 'value')}${cell('Pemeriksaan Halal', 'right-label')}${cell(':', 'right-colon')}${cell(`${report.halalPercentage || ''} %`, 'right-value')}</tr><tr>${cell('Kode Lokasi', 'label')}${cell(':', 'colon')}${cell(report.locationCode, 'value')}${cell('Tanggal Analisa', 'right-label')}${cell(':', 'right-colon')}${cell(report.analysisDate, 'right-value')}</tr></table>
  <table class="criteria"><colgroup><col class="no"><col class="name"><col class="standard">${Array.from({ length: 13 }, () => '<col class="sample">').join('')}</colgroup><thead><tr><th rowspan="2">No.</th><th rowspan="2">KRITERIA REJECT</th><th rowspan="2">STANDARD</th><th colspan="13">HASIL ANALISA</th></tr><tr>${sampleHeaders}</tr></thead><tbody>${rejectRows(report, activeSamples)}<tr class="total"><td colspan="3">TOTAL REJECT</td>${sampleCells(totalRejects.map(String))}</tr><tr class="total"><td colspan="3">A / R (Status)</td>${sampleCells(statuses)}</tr></tbody></table>
  <table class="analysis"><colgroup><col class="no"><col class="name"><col class="standard"><col class="result"></colgroup><thead><tr class="section"><td>C.</td><td>ORGANOLEPTIK DAN KIMIA ** :</td><td>Standard</td><td>Hasil Analisa</td></tr></thead><tbody>${analysisRows(report)}</tbody></table>
  <div class="conclusion">Kesimpulan : <u>${report.conclusion === 'accepted' ? 'Diterima' : report.conclusion === 'rejected' ? 'Ditolak' : '................'}</u>${!report.conclusion ? ' / <u>................</u>' : ''}</div>
  <table class="signatures"><tr><td colspan="2">Pemeriksa</td><td colspan="2">Mengetahui</td></tr><tr><td colspan="2" class="signature-name">${escapeHtml(report.inspectorName || '................................')}</td><td colspan="2" class="signature-name">${escapeHtml(report.approverName || '................................')}</td></tr><tr><td colspan="2" class="signature-line">____________________</td><td colspan="2" class="signature-line">____________________</td></tr><tr><td colspan="2" class="signature-role">QC FG Field</td><td colspan="2" class="signature-role">QC RM/FG Spv. / QC FG Sect. Spv.</td></tr></table>
  <div class="footnotes">* : Coret salah satu yang tidak sesuai<br>** : Diisi sesuai jenis komponen yang ada<br>*** : Analisa kimia dan organoleptik dilakukan untuk FG umur > 1 bulan (Lokal) dan umur > 2 bulan (ekspor)</div>
  </div></div></body></html>`;
}

function buildAttachmentPageHtml(report: FinishedGoodsReport): string {
    if (!report.attachments?.length) return '';

    const images = report.attachments.map((attachment, index) => {
        const description = escapeHtml(attachment.description || `Foto lampiran ke-${index + 1}`);
        return `<figure class="attachment"><img src="${escapeHtml(attachment.driveUrl || attachment.dataUrl)}" /><figcaption>${description}</figcaption></figure>`;
    });

    return `<div class="attachment-page"><div class="attachment-title">LAMPIRAN FOTO</div><div class="attachment-grid">${images.join('')}</div></div>`;
}

export function exportReportPdf(report: FinishedGoodsReport): void {
    try {
        const attachmentPage = buildAttachmentPageHtml(report);
        const html = buildReportHtml(report).replace('</body></html>', `${attachmentPage}</body></html>`);
        const printWindow = window.open('', '_blank');
        if (!printWindow) throw new Error('Browser memblokir jendela cetak. Izinkan pop-up untuk situs ini.');

        printWindow.document.write(html);
        printWindow.document.close();

        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 250);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Export PDF gagal.';
        console.error('[X-Porta export:pdf]', error);
        alert(message);
    }
}

export async function exportReportsCsv(reports: FinishedGoodsReport[]): Promise<void> {
    try {
        const headers = ['id', 'reportNumber', 'flavour', 'country', 'distributor', 'productionCode', 'locationCode', 'analysisDate', 'status', 'conclusion', 'updatedAt'];
        const csv = [headers.join(','), ...reports.map((report) => headers.map((key) => JSON.stringify(String(report[key as keyof FinishedGoodsReport] ?? ''))).join(','))].join('\n');

        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        link.download = `x-porta-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Export CSV gagal.';
        alert(message);
    }
}
