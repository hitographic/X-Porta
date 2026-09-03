import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RefreshCw, FileText, FilePlus2, SlidersHorizontal, FileDown, Trash2, LockKeyhole, ImagePlus, ClipboardList } from 'lucide-react';
import { apiService } from '../api/sync';
import { exportReportPdf, exportReportsCsv } from '../utils/export';
import { OQC_TYPES, BANDED_TYPES, type FinishedGoodsReport, type ReportAttachment, type OqcType, type BandedType } from '../types/report';
import { format } from 'date-fns';
import { id as dateFnsId } from 'date-fns/locale';
import PhotoViewerModal from '../components/PhotoViewerModal';
import MonitoringAnalisaModal from '../components/MonitoringAnalisaModal';

export default function Dashboard() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<FinishedGoodsReport[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filterOqc, setFilterOqc] = useState<OqcType | ''>('');
  const [filterShift, setFilterShift] = useState('');
  const [filterLine, setFilterLine] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | 'draft' | 'completed'>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modal state
  const [showNewReport, setShowNewReport] = useState(false);
  const [reportNumber, setReportNumber] = useState('');
  const [duplicateError, setDuplicateError] = useState('');
  const [oqcType, setOqcType] = useState<OqcType>('OQC Regular');
  const [bandedType, setBandedType] = useState<BandedType>('Single');
  const [shift, setShift] = useState('');
  const [line, setLine] = useState('');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<FinishedGoodsReport | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Monitoring modal
  const [monitoringReport, setMonitoringReport] = useState<FinishedGoodsReport | null>(null);

  // Photo viewer
  const [photoReport, setPhotoReport] = useState<FinishedGoodsReport | null>(null);

  const getReportNumberValue = (r: FinishedGoodsReport): number => {
    const n = parseInt((r.reportNumber || '').trim(), 10);
    return Number.isNaN(n) ? -1 : n;
  };

  const getReportYear = (r: FinishedGoodsReport): number => {
    const raw = r.analysisDate || r.createdAt || '';
    const y = new Date(raw).getFullYear();
    return Number.isNaN(y) ? new Date().getFullYear() : y;
  };

  const normalizeReportNumber = (value: string): string =>
    (value || '').trim().replace(/^0+(?=\d)/, '');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiService.fetchReports();
      data.sort((a, b) =>
        getReportNumberValue(b) - getReportNumberValue(a) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setReports(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengambil data dari server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetFilters = () => {
    setFilterOqc('');
    setFilterShift('');
    setFilterLine('');
    setFilterYear('');
    setFilterStatus('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = reports.filter(r => {
      const matchSearch = !query || [
        r.flavour,
        r.productionCode,
        r.reportNumber,
        r.country,
        r.distributor,
      ].some(value => (value || '').toLowerCase().includes(query));
      const matchOqc = filterOqc ? r.oqcType === filterOqc : true;
      const matchShift = filterShift ? String(r.shift) === filterShift : true;
      const matchLine = filterLine ? String(r.line) === filterLine : true;
      const matchStatus = filterStatus ? r.status === filterStatus : true;
      const matchYear = filterYear ? (r.analysisDate || '').startsWith(filterYear) : true;
      const date = r.analysisDate || '';
      const matchDateFrom = filterDateFrom ? date >= filterDateFrom : true;
      const matchDateTo = filterDateTo ? date <= filterDateTo : true;

      return matchSearch && matchOqc && matchShift && matchLine && matchStatus && matchYear && matchDateFrom && matchDateTo;
    });
    // Selalu sort dari No Laporan terbesar
    result.sort((a, b) =>
      getReportNumberValue(b) - getReportNumberValue(a) ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return result;
  }, [reports, search, filterOqc, filterShift, filterLine, filterStatus, filterYear, filterDateFrom, filterDateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));
  const paginatedReports = useMemo(
    () => filteredReports.slice((page - 1) * pageSize, page * pageSize),
    [filteredReports, page],
  );

  useEffect(() => {
    setPage(1);
  }, [search, filterOqc, filterShift, filterLine, filterStatus, filterYear, filterDateFrom, filterDateTo]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const openNewReport = () => {
    setReportNumber('');
    setDuplicateError('');
    setOqcType('OQC Regular');
    setBandedType('Single');
    setShift('');
    setLine('');
    setShowNewReport(true);
  };

  const confirmNewReport = () => {
    const normalizedNo = normalizeReportNumber(reportNumber);
    if (!normalizedNo || !/^[0-9]+$/.test(normalizedNo)) {
      const msg = 'Nomor laporan harus diisi dengan angka.';
      setDuplicateError(msg);
      alert(msg);
      return;
    }
    const shiftNumber = Number(shift);
    const lineNumber = Number(line);
    if (!Number.isInteger(shiftNumber) || shiftNumber < 1 || shiftNumber > 3) {
      alert('Shift harus berupa angka 1 sampai 3.');
      return;
    }
    if (!Number.isInteger(lineNumber) || lineNumber < 1 || lineNumber > 33) {
      alert('Line harus berupa angka 1 sampai 33.');
      return;
    }
    // Rules: No laporan + jenis OQC tidak boleh sama dalam satu tahun yang sama
    const currentYear = new Date().getFullYear();
    const duplicate = reports.find(r =>
      normalizeReportNumber(r.reportNumber) === normalizedNo &&
      r.oqcType === oqcType &&
      getReportYear(r) === currentYear,
    );
    if (duplicate) {
      const msg = `No. laporan ${normalizedNo} dengan ${oqcType} sudah ada pada tahun ${currentYear}. Ubah nomor laporan dan jenis OQC.`;
      setDuplicateError(msg);
      alert(msg);
      return;
    }
    setDuplicateError('');
    setShowNewReport(false);
    navigate('/reports/new', { state: { oqcType, bandedType, shift: shiftNumber, line: lineNumber, reportNumber: normalizedNo } });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiService.deleteReport(deleteTarget.id);
      setReports(prev => prev.filter(r => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus laporan.');
    } finally {
      setDeleting(false);
    }
  };

  const getWorkflowLabel = (step?: number) => {
    if (!step || step >= 3) return null;
    const labels: Record<number, string> = { 1: 'Informasi', 2: 'Fisik' };
    return labels[step] || null;
  };

  const handleSavePhotos = async (report: FinishedGoodsReport, attachments: ReportAttachment[]): Promise<void> => {
    const updated = { ...report, attachments };
    await apiService.uploadReports([updated]);
    setReports(prev => prev.map(r => r.id === report.id ? updated : r));
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Toolbar */}
      <div className="flex gap-10" style={{ marginBottom: '18px' }}>
        <input
          type="text"
          className="search-input"
          placeholder="Cari flavour, kode produksi, nomor laporan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className={`icon-button ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal size={19} color={showFilters ? "var(--color-white)" : "var(--color-green)"} />
        </button>
        <button className="icon-button" onClick={loadData} disabled={loading}>
          <RefreshCw size={19} color="var(--color-green)" className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="filter-panel">
          <div className="filter-header">
            <span className="filter-title">Pencarian lanjutan</span>
            <button className="reset-text" onClick={resetFilters}>Reset</button>
          </div>

          <span className="filter-label">Jenis OQC</span>
          <div className="chip-row">
            <div className={`filter-chip ${!filterOqc ? 'selected' : ''}`} onClick={() => setFilterOqc('')}>Semua</div>
            {OQC_TYPES.map(type => (
              <div key={type} className={`filter-chip ${filterOqc === type ? 'selected' : ''}`} onClick={() => setFilterOqc(type)}>
                {type.replace('OQC ', '')}
              </div>
            ))}
          </div>

          <div className="filter-inputs">
            <div className="filter-field">
              <span className="filter-label">Shift</span>
              <input type="text" className="filter-input" placeholder="1-3" value={filterShift} onChange={(e) => setFilterShift(e.target.value.replace(/[^0-9]/g, '').slice(0, 1))} />
            </div>
            <div className="filter-field">
              <span className="filter-label">Line</span>
              <input type="text" className="filter-input" placeholder="1-33" value={filterLine} onChange={(e) => setFilterLine(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} />
            </div>
            <div className="filter-field">
              <span className="filter-label">Tahun</span>
              <input type="text" className="filter-input" placeholder="2026" value={filterYear} onChange={(e) => setFilterYear(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))} />
            </div>
          </div>

          <div className="filter-inputs">
            <div className="filter-field">
              <span className="filter-label">Tanggal dari</span>
              <input type="date" className="filter-input" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
            </div>
            <div className="filter-field">
              <span className="filter-label">Tanggal sampai</span>
              <input type="date" className="filter-input" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
            </div>
          </div>

          <span className="filter-label">Status</span>
          <div className="chip-row">
            <div className={`filter-chip ${!filterStatus ? 'selected' : ''}`} onClick={() => setFilterStatus('')}>Semua</div>
            <div className={`filter-chip ${filterStatus === 'draft' ? 'selected' : ''}`} onClick={() => setFilterStatus('draft')}>Draft</div>
            <div className={`filter-chip ${filterStatus === 'completed' ? 'selected' : ''}`} onClick={() => setFilterStatus('completed')}>Selesai</div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '16px', background: 'var(--color-red)', color: 'var(--color-white)', borderRadius: '6px', marginBottom: '14px' }}>
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="summary-row">
        <div>
          <div className="summary-label">HASIL DITEMUKAN</div>
          <div className="summary-value">{filteredReports.length}</div>
        </div>
        <button className="btn-primary" onClick={openNewReport}>
          <FilePlus2 size={18} />
          Laporan baru
        </button>
      </div>

      {/* Report List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {loading && filteredReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-muted)' }}>Memuat data...</div>
        ) : filteredReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ color: 'var(--color-ink)', fontSize: '18px', fontWeight: 800 }}>Laporan tidak ditemukan</div>
            <div style={{ color: 'var(--color-muted)', fontSize: '13px', marginTop: '7px' }}>Ubah kata kunci atau filter pencarian lanjutan.</div>
          </div>
        ) : (
          paginatedReports.map(report => (
            <div key={report.id} className="report-item">
              <div className="report-top">
                <div className="report-number-badge">No.{report.reportNumber?.trim() || '-'}</div>
                <div className={`badge ${report.status === 'completed' ? 'badge-done' : 'badge-draft'}`}>
                  <span className="badge-text">{report.status === 'completed' ? 'SELESAI' : 'DRAFT'}</span>
                </div>
              </div>
              <div style={{ marginTop: '10px' }}>
                <div className="report-name">{report.flavour || 'Flavour belum diisi'}</div>
                <div className="report-code">{report.productionCode || 'Tanpa kode produksi'}</div>
              </div>
              <div className="meta">{report.oqcType} · Shift {report.shift} · Line {report.line}</div>
              <div className="detail-text">
                {report.analysisDate ? format(new Date(report.analysisDate), 'dd MMM yyyy', { locale: dateFnsId }) : '-'} · Lot {report.totalLot || '-'} / {report.totalLotPcs || '-'} pcs
              </div>
              {getWorkflowLabel(report.workflowStep) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: 'var(--color-orange)', fontWeight: 700 }}>
                  <LockKeyhole size={12} />
                  <span>Terakhir diubah di tahap: {getWorkflowLabel(report.workflowStep)}</span>
                </div>
              )}
              <div className="actions">
                <button
                  className="btn-secondary"
                  style={{ borderColor: 'var(--color-line)' }}
                  onClick={(e) => {
                    e.preventDefault();
                    exportReportPdf(report);
                  }}
                >
                  <FileText size={16} color="var(--color-red)" />
                  <span style={{ color: 'var(--color-red)' }}>PDF</span>
                </button>
                {report.oqcType === 'OQC Monitoring' && (
                  <button
                    className="btn-secondary"
                    style={{ borderColor: 'var(--color-line)', display: 'flex', alignItems: 'center', gap: 5 }}
                    onClick={(e) => {
                      e.preventDefault();
                      setMonitoringReport(report);
                    }}
                  >
                    <ClipboardList size={16} color="var(--color-blue)" />
                    <span style={{ color: 'var(--color-blue)' }}>Input Hasil Analisa</span>
                  </button>
                )}
                <button
                  className="btn-secondary"
                  style={{ borderColor: 'var(--color-line)', display: 'flex', alignItems: 'center', gap: 5 }}
                  onClick={(e) => {
                    e.preventDefault();
                    setPhotoReport(report);
                  }}
                >
                  <ImagePlus size={16} color="var(--color-green)" />
                  <span style={{ color: 'var(--color-green)' }}>{report.attachments?.length ? `${report.attachments.length} foto` : 'Foto'}</span>
                </button>
                <Link to={`/reports/${report.id}`} className="btn-secondary" style={{ borderColor: 'var(--color-line)', color: 'var(--color-green)' }}>
                  Buka
                </Link>
                <button
                  className="btn-secondary"
                  style={{ borderColor: 'var(--color-line)', color: 'var(--color-red)' }}
                  onClick={(e) => {
                    e.preventDefault();
                    setDeleteTarget(report);
                  }}
                >
                  <Trash2 size={16} color="var(--color-red)" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {filteredReports.length > 0 && (
        <div className="pagination">
          <button className="page-button" disabled={page === 1} onClick={() => setPage(value => value - 1)} aria-label="Halaman sebelumnya">
            <ChevronLeft size={17} />
          </button>
          <span className="page-text">Halaman {page} dari {totalPages}</span>
          <button className="page-button" disabled={page === totalPages} onClick={() => setPage(value => value + 1)} aria-label="Halaman berikutnya">
            <ChevronRight size={17} />
          </button>
        </div>
      )}

      {/* Export CSV */}
      {filteredReports.length > 0 && (
        <button
          className="btn-secondary"
          style={{ width: '100%', marginTop: '14px', height: '42px', borderColor: 'var(--color-green)', color: 'var(--color-green)' }}
          onClick={() => exportReportsCsv(filteredReports)}
        >
          <FileDown size={17} color="var(--color-green)" />
          Ekspor hasil CSV ({filteredReports.length})
        </button>
      )}

      {/* New Report Modal */}
      {showNewReport && (
        <div className="modal-overlay" onClick={() => setShowNewReport(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Laporan Baru</div>
            <div className="modal-description">Pilih jenis pemeriksaan dan lokasi produksi.</div>

            {duplicateError && (
              <div style={{ padding: '12px', background: 'var(--color-red)', color: 'var(--color-white)', borderRadius: '6px', marginBottom: '14px', fontSize: '12px', fontWeight: 700, lineHeight: '18px' }}>
                {duplicateError}
              </div>
            )}

            <div className="form-label" style={{ marginBottom: '7px' }}>No Laporan</div>
            <input
              type="text"
              inputMode="numeric"
              className="form-input"
              placeholder="Contoh: 12"
              value={reportNumber}
              onChange={(e) => {
                setReportNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 6));
                if (duplicateError) setDuplicateError('');
              }}
              style={{ marginBottom: '14px' }}
            />

            <div className="form-label" style={{ marginBottom: '7px' }}>Jenis OQC</div>
            <div className="type-list">
              {OQC_TYPES.map(type => (
                <div key={type} className={`type-option ${oqcType === type ? 'selected' : ''}`} onClick={() => setOqcType(type)}>
                  <div className={`radio ${oqcType === type ? 'selected' : ''}`}>
                    {oqcType === type && <div className="radio-dot"></div>}
                  </div>
                  <div className={`type-text ${oqcType === type ? 'selected' : ''}`}>{type}</div>
                </div>
              ))}
            </div>

            <div className="form-label" style={{ marginBottom: '7px', marginTop: '12px' }}>Tipe</div>
            <div className="type-list">
              {BANDED_TYPES.map(type => (
                <div key={type} className={`type-option ${bandedType === type ? 'selected' : ''}`} onClick={() => setBandedType(type)}>
                  <div className={`radio ${bandedType === type ? 'selected' : ''}`}>
                    {bandedType === type && <div className="radio-dot"></div>}
                  </div>
                  <div className={`type-text ${bandedType === type ? 'selected' : ''}`}>{type}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="filter-field">
                <div className="form-label">Shift (1-3)</div>
                <input type="text" className="form-input" placeholder="1" value={shift} onChange={(e) => setShift(e.target.value.replace(/[^0-9]/g, '').slice(0, 1))} />
              </div>
              <div className="filter-field">
                <div className="form-label">Line (1-33)</div>
                <input type="text" className="form-input" placeholder="1" value={line} onChange={(e) => setLine(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} />
              </div>
            </div>

            <div className="modal-actions">
              <button className="cancel-button" onClick={() => setShowNewReport(false)}>Batal</button>
              <button className="ok-button" onClick={confirmNewReport}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Hapus Laporan</div>
            <div className="modal-description">
              Hapus <strong>{deleteTarget.flavour || deleteTarget.productionCode || 'laporan ini'}</strong> dari server?
              <br /><br />
              Tindakan ini akan menghapus laporan dari Google Sheets/Drive.
            </div>
            <div className="modal-actions">
              <button className="cancel-button" onClick={() => setDeleteTarget(null)}>Batal</button>
              <button
                className="ok-button"
                style={{ backgroundColor: 'var(--color-red)', borderColor: 'var(--color-red)' }}
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {photoReport && (
        <PhotoViewerModal
          attachments={photoReport.attachments ?? []}
          onClose={() => setPhotoReport(null)}
          onSave={(attachments) => handleSavePhotos(photoReport, attachments)}
        />
      )}

      {monitoringReport && (
        <MonitoringAnalisaModal
          report={monitoringReport}
          onClose={() => setMonitoringReport(null)}
          onSave={async (updated) => {
            const idx = reports.findIndex(r => r.id === updated.id);
            if (idx < 0) return;
            const next = [...reports];
            next[idx] = updated;
            setReports(next);
            setMonitoringReport(null);
            try { await apiService.uploadReports([updated]); } catch { /* silent */ }
          }}
        />
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
