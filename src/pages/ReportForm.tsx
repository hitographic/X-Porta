import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, ChevronRight, ChevronUp, ImagePlus, LockKeyhole, Save, Trash2, X } from 'lucide-react';
import { apiService } from '../api/sync';
import { ANALYSIS_PARAMETERS, createEmptyReport, REJECT_CRITERIA } from '../types/report';
import type { FinishedGoodsReport, ReportAttachment, ReportDraft, WorkflowStep } from '../types/report';
import { processImageFile, canAddAttachment, getMaxAttachments } from '../utils/photos';

const INFO_FIELDS: { key: keyof ReportDraft; label: string; type?: 'date' | 'number'; placeholder?: string }[] = [
  { key: 'reportNumber', label: 'Nomor laporan' },
  { key: 'flavour', label: 'Flavour' },
  { key: 'country', label: 'Negara' },
  { key: 'distributor', label: 'Distributor' },
  { key: 'productionCode', label: 'Kode produksi' },
  { key: 'productionCodeDetail', label: 'Detail kode produksi' },
  { key: 'locationCode', label: 'Kode lokasi' },
  { key: 'totalLot', label: 'Total lot' },
  { key: 'totalLotPcs', label: 'Total lot (pcs)', type: 'number' },
  { key: 'sampleSizePlan', label: 'Rencana sample size' },
  { key: 'aqlPercentage', label: 'AQL (%)' },
  { key: 'aqlAcceptReject', label: 'A/R (contoh: 2/3)', placeholder: '2/3' },
  { key: 'halalPercentage', label: 'Pemeriksaan halal (%)' },
  { key: 'analysisDate', label: 'Tanggal analisa', type: 'date' },
  { key: 'inspectorName', label: 'Nama pemeriksa' },
  { key: 'approverName', label: 'Nama yang mengetahui' },
];

type FormTab = 'info' | 'criteria' | 'analysis' | 'photos';

const TABS: { key: FormTab; label: string; step: WorkflowStep }[] = [
  { key: 'info', label: '1. Informasi', step: 1 },
  { key: 'criteria', label: '2. Fisik', step: 2 },
  { key: 'analysis', label: '3. Analisa', step: 3 },
  { key: 'photos', label: '4. Foto', step: 3 },
];

function normalizeDraft(value: ReportDraft): ReportDraft {
  const sampleSize = Math.min(13, Math.max(1, Number(value.sampleSize) || 1));
  const rejectResults = Object.fromEntries(REJECT_CRITERIA.map((criterion) => {
    const current = value.rejectResults?.[String(criterion.id)] ?? [];
    return [String(criterion.id), Array.from(
      { length: criterion.sampleCount },
      (_, index) => typeof current[index] === 'boolean' ? current[index] : true,
    )];
  }));
  return { ...value, sampleSize, workflowStep: value.workflowStep ?? 1, rejectResults };
}

export default function ReportForm() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const navigationState = location.state as Partial<Pick<ReportDraft, 'oqcType' | 'shift' | 'line'>> | null;

  const initialDraft = createEmptyReport();
  if (!isEditing && navigationState) {
    initialDraft.oqcType = navigationState.oqcType ?? initialDraft.oqcType;
    initialDraft.shift = navigationState.shift ?? initialDraft.shift;
    initialDraft.line = navigationState.line ?? initialDraft.line;
  }

  const [draft, setDraft] = useState<ReportDraft>(normalizeDraft(initialDraft));
  const [original, setOriginal] = useState<FinishedGoodsReport | null>(null);
  const [tab, setTab] = useState<FormTab>('info');
  const [expanded, setExpanded] = useState<number | null>(1);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState<ReportAttachment[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<ReportAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) return;

    const fetchReport = async () => {
      try {
        const data = await apiService.fetchReports();
        const found = data.find(report => report.id === id);
        if (!found) {
          setError('Laporan tidak ditemukan.');
          return;
        }
        const normalized = normalizeDraft(found as unknown as ReportDraft);
        setOriginal(found);
        setDraft(normalized);
        setAttachments(found.attachments ?? []);
        setTab(TABS.find(t => t.step === (normalized.workflowStep ?? 3))?.key ?? 'analysis');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Gagal memuat laporan untuk diedit.');
      } finally {
        setLoading(false);
      }
    };

    void fetchReport();
  }, [id, isEditing]);

  const update = <K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) => {
    setDraft(current => ({ ...current, [key]: value }));
  };

  const updateInfo = (key: keyof ReportDraft, value: string) => {
    update(key, value as never);
  };

  const toggleSample = (criterionId: number, sampleIndex: number) => {
    setDraft(current => {
      const key = String(criterionId);
      const values = current.rejectResults[key] ?? [];
      return {
        ...current,
        rejectResults: {
          ...current.rejectResults,
          [key]: values.map((value, index) => index === sampleIndex ? !value : value),
        },
      };
    });
  };

  const setAllSamples = (criterionId: number, value: boolean) => {
    setDraft(current => {
      const key = String(criterionId);
      const values = current.rejectResults[key] ?? [];
      return {
        ...current,
        rejectResults: {
          ...current.rejectResults,
          [key]: values.map((v, i) => i < (current.sampleSize ?? 13) ? value : v),
        },
      };
    });
  };

  const selectTab = (next: { key: FormTab; label: string; step: WorkflowStep }) => {
    if (next.step <= (draft.workflowStep ?? 1)) {
      setTab(next.key);
    } else {
      alert(`Tahap terkunci. Simpan tahap sebelumnya melalui tombol Next untuk membuka "${next.label}".`);
    }
  };

  const handleAddPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!canAddAttachment(attachments.length)) {
      alert(`Maksimal ${getMaxAttachments()} foto per laporan.`);
      return;
    }
    setUploading(true);
    try {
      const attachment = await processImageFile(file);
      setAttachments(prev => [...prev, attachment]);
    } catch {
      alert('Gagal memproses gambar. Coba lagi.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (attachmentId: string) => {
    if (!confirm('Hapus foto ini?')) return;
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    if (selectedPhoto?.id === attachmentId) setSelectedPhoto(null);
  };

  const handleUpdateDescription = (attachmentId: string, description: string) => {
    setAttachments(prev => prev.map(a => a.id === attachmentId ? { ...a, description } : a));
  };

  const validateInfo = (): boolean => {
    if (draft.flavour.trim() && draft.productionCode.trim()) return true;
    alert('Flavour dan kode produksi harus diisi sebelum masuk ke tahap Fisik.');
    setTab('info');
    return false;
  };

  const goNext = async () => {
    if (tab === 'info') {
      if (!validateInfo()) return;
      const updated = normalizeDraft({ ...draft, status: 'draft', workflowStep: Math.max(draft.workflowStep, 2) as WorkflowStep });
      setDraft(updated);
      setTab('criteria');
      return;
    }
    if (tab === 'criteria') {
      const updated = normalizeDraft({ ...draft, status: 'draft', workflowStep: 3 });
      setDraft(updated);
      setTab('analysis');
      return;
    }
    if (!draft.conclusion) {
      alert('Kesimpulan belum dipilih. Pilih Diterima atau Ditolak sebelum menyelesaikan laporan.');
      return;
    }
    await save(true);
  };

  const save = async (completed: boolean) => {
    if (!draft.flavour.trim() || !draft.productionCode.trim()) {
      setError('Flavour dan kode produksi harus diisi.');
      setTab('info');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    setError('');
    const now = new Date().toISOString();
    const reportToSave: FinishedGoodsReport = {
      ...draft,
      status: completed ? 'completed' : 'draft',
      workflowStep: draft.workflowStep ?? (completed ? 3 : 1),
      id: original?.id ?? crypto.randomUUID(),
      createdAt: original?.createdAt ?? now,
      updatedAt: now,
      syncState: original?.lastSyncedAt ? 'modified' : (original?.syncState ?? 'local'),
      lastSyncedAt: original?.lastSyncedAt ?? null,
      attachments,
    };

    try {
      await apiService.uploadReports([reportToSave]);
      navigate(`/reports/${reportToSave.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan laporan.');
      setSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return <div className="form-loading">Memuat formulir...</div>;
  }

  return (
    <div className="report-form-page">
      <div className="report-form-header">
        <button type="button" onClick={() => navigate(isEditing ? `/reports/${id}` : '/')} className="form-icon-button" aria-label="Kembali">
          <ArrowLeft size={21} />
        </button>
        <div className="report-form-heading">
          <h1>{isEditing ? 'Edit laporan' : 'Laporan baru'}</h1>
          <p>{draft.oqcType} · Shift {draft.shift} · Line {draft.line}</p>
        </div>
        <button type="button" onClick={() => void save(false)} className="form-save-icon" disabled={saving} aria-label="Simpan draft">
          <Save size={19} />
        </button>
      </div>

      <div className="form-tabs" role="tablist" aria-label="Bagian laporan">
        {TABS.map((item) => {
          const locked = item.step > (draft.workflowStep ?? 1);
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              aria-disabled={locked}
              onClick={() => selectTab(item)}
              className={`form-tab ${tab === item.key ? 'active' : ''} ${locked ? 'locked' : ''}`}
            >
              {locked && <LockKeyhole size={11} style={{ marginRight: 4 }} />}
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="report-form-content">
        {error && <div className="form-error" role="alert">{error}</div>}

        {tab === 'info' && (
          <section>
            <h2 className="form-section-title">Informasi laporan</h2>
            <div className="metadata-card">
              <span>JENIS PEMERIKSAAN</span>
              <strong>{draft.oqcType}</strong>
              <div><strong>Shift {draft.shift}</strong><strong>Line {draft.line}</strong></div>
            </div>

            {INFO_FIELDS.map(field => (
              <div className="form-field" key={field.key}>
                <label htmlFor={`field-${field.key}`}>{field.label}</label>
                <input
                  id={`field-${field.key}`}
                  className="form-input"
                  type={field.type ?? 'text'}
                  value={String(draft[field.key] ?? '')}
                  placeholder={field.placeholder}
                  onChange={event => updateInfo(field.key, event.target.value)}
                />
              </div>
            ))}

            <div className="form-field">
              <label htmlFor="sample-size">Jumlah sampel (maks. 13)</label>
              <input
                id="sample-size"
                className="form-input"
                type="number"
                min="1"
                max="13"
                value={draft.sampleSize}
                onChange={event => update('sampleSize', Math.min(13, Math.max(1, Number(event.target.value) || 1)))}
              />
            </div>
          </section>
        )}

        {tab === 'criteria' && (
          <section>
            <h2 className="form-section-title">Kriteria reject</h2>
            <p className="form-helper">Hijau berarti sesuai standard. Tandai merah bila sampel reject.</p>
            <div className="criteria-list">
              {REJECT_CRITERIA.map(criterion => {
                const isOpen = expanded === criterion.id;
                const values = draft.rejectResults[String(criterion.id)] ?? [];
                return (
                  <article className="criterion-panel" key={criterion.id}>
                    <button type="button" className="criterion-header" onClick={() => setExpanded(isOpen ? null : criterion.id)} aria-expanded={isOpen}>
                      <span className="criterion-number">{criterion.id}</span>
                      <span className="criterion-copy">
                        <strong>{criterion.name}</strong>
                        <small>{criterion.standard}</small>
                      </span>
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    {isOpen && (
                      <div className="criterion-body">
                        <div className="quick-actions">
                          <button type="button" onClick={() => setAllSamples(criterion.id, true)}><Check size={15} /> Semua sesuai</button>
                          <button type="button" className="reject-action" onClick={() => setAllSamples(criterion.id, false)}><X size={15} /> Semua reject</button>
                        </div>
                        <div className="sample-grid">
                          {values.map((value, index) => index < draft.sampleSize && (
                            <button type="button" key={index} onClick={() => toggleSample(criterion.id, index)} className={`sample-button ${value ? 'good' : 'bad'}`} aria-label={`Sampel ${index + 1}: ${value ? 'sesuai' : 'reject'}`}>
                              <span>{index + 1}</span>{value ? <Check size={15} /> : <X size={15} />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {tab === 'analysis' && (
          <section>
            <h2 className="form-section-title">Organoleptik dan kimia</h2>
            {ANALYSIS_PARAMETERS.map(parameter => (
              <div className="form-field" key={parameter.key}>
                <label htmlFor={`analysis-${parameter.key}`}>{parameter.id}. {parameter.name}</label>
                {parameter.standard && <small className="field-hint">Standard: {parameter.standard}</small>}
                <input
                  id={`analysis-${parameter.key}`}
                  className="form-input"
                  value={draft.analysisResults[parameter.key] ?? ''}
                  placeholder="Hasil analisa"
                  onChange={event => update('analysisResults', { ...draft.analysisResults, [parameter.key]: event.target.value })}
                />
              </div>
            ))}

            <h2 className="form-section-title conclusion-title">Kesimpulan</h2>
            <div className="conclusion-segment">
              <button type="button" className={draft.conclusion === 'accepted' ? 'accepted' : ''} onClick={() => update('conclusion', 'accepted')}>
                <Check size={17} /> Diterima
              </button>
              <button type="button" className={draft.conclusion === 'rejected' ? 'rejected' : ''} onClick={() => update('conclusion', 'rejected')}>
                <X size={17} /> Ditolak
              </button>
            </div>
          </section>
        )}

        {tab === 'photos' && (
          <section>
            <h2 className="form-section-title">Foto lampiran</h2>
            <p className="form-helper">Maksimal {getMaxAttachments()} foto. Format: JPG/PNG.</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAddPhoto}
              style={{ display: 'none' }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginTop: 12 }}>
              {attachments.map(attachment => (
                <div
                  key={attachment.id}
                  onClick={() => setSelectedPhoto(attachment)}
                  style={{
                    position: 'relative',
                    borderRadius: 6,
                    overflow: 'hidden',
                    border: selectedPhoto?.id === attachment.id ? '2px solid var(--color-green)' : '1px solid var(--color-line)',
                    cursor: 'pointer',
                    aspectRatio: '1',
                  }}
                >
                  <img
                    src={attachment.dataUrl}
                    alt={attachment.description || 'Foto lampiran'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemovePhoto(attachment.id); }}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-label="Hapus foto"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}

              {canAddAttachment(attachments.length) && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 6,
                    border: '2px dashed var(--color-line)',
                    backgroundColor: 'var(--color-paper)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    color: 'var(--color-muted)',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <ImagePlus size={24} />
                  {uploading ? 'Memproses...' : 'Tambah foto'}
                </button>
              )}
            </div>

            {selectedPhoto && (
              <div style={{
                marginTop: 16,
                padding: 14,
                backgroundColor: 'var(--color-paper)',
                border: '1px solid var(--color-line)',
                borderRadius: 6,
              }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-ink)', marginBottom: 10 }}>Detail foto</div>
                <img
                  src={selectedPhoto.dataUrl}
                  alt={selectedPhoto.description || 'Preview'}
                  style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 4, marginBottom: 10 }}
                />
                <div className="form-field">
                  <label htmlFor="photo-desc">Deskripsi</label>
                  <input
                    id="photo-desc"
                    className="form-input"
                    value={selectedPhoto.description}
                    placeholder="Deskripsi foto (opsional)"
                    onChange={e => {
                      const desc = e.target.value;
                      handleUpdateDescription(selectedPhoto.id, desc);
                      setSelectedPhoto(prev => prev ? { ...prev, description: desc } : null);
                    }}
                  />
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 6 }}>
                  {selectedPhoto.width} x {selectedPhoto.height}px · {Math.round(selectedPhoto.sizeBytes / 1024)} KB
                </div>
              </div>
            )}

            {attachments.length > 0 && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-muted)', textAlign: 'center' }}>
                {attachments.length} / {getMaxAttachments()} foto
              </div>
            )}
          </section>
        )}

        <div className="form-footer-actions">
          <button type="button" className="draft-button" disabled={saving} onClick={() => void save(false)}>
            {saving ? 'Menyimpan...' : 'Simpan Draft'}
          </button>
          <button type="button" className="complete-button" disabled={saving} onClick={() => void goNext()}>
            {tab === 'analysis' ? <><Check size={18} /> Selesai</> : <><ChevronRight size={18} /> Next</>}
          </button>
        </div>
      </div>
    </div>
  );
}
