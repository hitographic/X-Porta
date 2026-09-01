import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, ChevronRight, ChevronUp, LockKeyhole, Save, X } from 'lucide-react';
import { apiService } from '../api/sync';
import { ANALYSIS_PARAMETERS, createEmptyReport, isRejected, REJECT_CRITERIA } from '../types/report';
import type { FinishedGoodsReport, ReportDraft, WorkflowStep } from '../types/report';
import { FLAVOUR_OPTIONS, COUNTRY_OPTIONS, DISTRIBUTOR_OPTIONS } from '../data/masterData';

const SAMPLE_SIZE_OPTIONS = [2, 3, 5, 8, 13];

function calculateAR(sampleSize: number): string {
  if (sampleSize <= 3) return '0/1';
  if (sampleSize <= 8) return '1/2';
  return '2/3';
}

const INFO_FIELDS: { key: keyof ReportDraft; label: string; type?: 'number'; readOnly?: boolean }[] = [
  { key: 'locationCode', label: 'Kode lokasi' },
];

const COMBOBOX_FIELDS: { key: keyof ReportDraft; label: string; options: string[] }[] = [
  { key: 'flavour', label: 'Flavour', options: FLAVOUR_OPTIONS },
  { key: 'country', label: 'Negara', options: COUNTRY_OPTIONS },
  { key: 'distributor', label: 'Distributor', options: DISTRIBUTOR_OPTIONS },
];

const INFO_FIELDS_BOTTOM: { key: keyof ReportDraft; label: string; type?: 'number'; readOnly?: boolean }[] = [
  { key: 'aqlPercentage', label: 'AQL (%)', readOnly: true },
  { key: 'aqlAcceptReject', label: 'A/R', readOnly: true },
  { key: 'halalPercentage', label: 'Pemeriksaan halal (%)', readOnly: true },
  { key: 'analysisDate', label: 'Tanggal analisa' },
  { key: 'inspectorName', label: 'Nama pemeriksa', readOnly: true },
  { key: 'approverName', label: 'Nama yang mengetahui', readOnly: true },
];

type FormTab = 'info' | 'criteria' | 'analysis';

const TABS: { key: FormTab; label: string; step: WorkflowStep }[] = [
  { key: 'info', label: '1. Informasi', step: 1 },
  { key: 'criteria', label: '2. Fisik', step: 2 },
  { key: 'analysis', label: '3. Analisa', step: 3 },
];

function normalizeDraft(value: ReportDraft): ReportDraft {
  const validSizes = SAMPLE_SIZE_OPTIONS as unknown as number[];
  const sampleSize = validSizes.includes(Number(value.sampleSize)) ? Number(value.sampleSize) : 13;
  const sampleSizePlan = value.sampleSizePlan || String(sampleSize);
  const aqlAcceptReject = value.aqlAcceptReject || calculateAR(sampleSize);
  const rejectResults = Object.fromEntries(REJECT_CRITERIA.map((criterion) => {
    const current = value.rejectResults?.[String(criterion.id)] ?? [];
    return [String(criterion.id), Array.from(
      { length: criterion.sampleCount },
      (_, index) => typeof current[index] === 'boolean' || current[index] === null ? current[index] : true,
    )];
  }));
  return { ...value, sampleSize, sampleSizePlan, aqlAcceptReject, halalPercentage: value.halalPercentage || '100', aqlPercentage: value.aqlPercentage || '2,5', workflowStep: value.workflowStep ?? 1, rejectResults };
}

export default function ReportForm() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const navigationState = location.state as Partial<Pick<ReportDraft, 'oqcType' | 'bandedType' | 'shift' | 'line'>> | null;

  const initialDraft = createEmptyReport(navigationState?.oqcType ?? 'OQC Regular');
  if (!isEditing && navigationState) {
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
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (isEditing) return;
    const session = apiService.getSession();
    setDraft(current => ({
      ...current,
      inspectorName: session?.name || '',
      approverName: 'Syahwanda A.N. / Nuridin',
    }));
  }, [isEditing]);

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

  const updateSampleSizeKarton = (value: number) => {
    setDraft(current => ({ ...current, sampleSize: value, aqlAcceptReject: calculateAR(value) }));
  };

  const updateSampleSizePlan = (value: number) => {
    setDraft(current => ({ ...current, sampleSizePlan: String(value) }));
  };

  useEffect(() => {
    if (!openDropdown) return;
    const handleClickOutside = () => setOpenDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openDropdown]);

  const toggleSample = (criterionId: number, sampleIndex: number) => {
    setDraft(current => {
      const key = String(criterionId);
      const values = current.rejectResults[key] ?? [];
      const next = values.map((value, index) => {
        if (index !== sampleIndex) return value;
        if (value === true) return false;
        if (value === false) return null;
        return true;
      });
      return {
        ...current,
        rejectResults: { ...current.rejectResults, [key]: next },
      };
    });
  };

  const setAllSamples = (criterionId: number, value: boolean | null) => {
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
      attachments: original?.attachments ?? [],
    };

    try {
      await apiService.uploadReports([reportToSave]);
      navigate('/');
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
          <p>{draft.oqcType} · {draft.bandedType} · Shift {draft.shift} · Line {draft.line}</p>
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
              <strong>{draft.bandedType}</strong>
              <div><strong>Shift {draft.shift}</strong><strong>Line {draft.line}</strong></div>
            </div>

            <div className="form-field">
              <label htmlFor="field-reportNumber">Nomor laporan</label>
              <input
                id="field-reportNumber"
                className="form-input"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={draft.reportNumber}
                placeholder="Masukkan nomor laporan"
                onChange={e => updateInfo('reportNumber', e.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>

            {COMBOBOX_FIELDS.map(field => {
              const options = field.options;
              const currentValue = String(draft[field.key] ?? '');
              const filteredOptions = currentValue
                ? options.filter(opt => opt.toLowerCase().includes(currentValue.toLowerCase()))
                : options;
              const dropdownKey = `combo-${field.key}`;
              const isOpen = openDropdown === dropdownKey;

              return (
                <div className="form-field" key={field.key}>
                  <label htmlFor={`field-${field.key}`}>{field.label}</label>
                  <div className="custom-dropdown">
                    <input
                      id={`field-${field.key}`}
                      className="form-input"
                      type="text"
                      value={currentValue}
                      placeholder={`Pilih atau ketik ${field.label.toLowerCase()}...`}
                      autoComplete="off"
                      onChange={e => {
                        updateInfo(field.key, e.target.value);
                        setOpenDropdown(dropdownKey);
                      }}
                      onFocus={() => setOpenDropdown(dropdownKey)}
                      onClick={e => { e.stopPropagation(); setOpenDropdown(isOpen ? null : dropdownKey); }}
                    />
                    {isOpen && filteredOptions.length > 0 && (
                      <div className="dropdown-menu">
                        {filteredOptions.map(opt => (
                          <button
                            key={opt}
                            type="button"
                            className={`dropdown-item ${opt === currentValue ? 'active' : ''}`}
                            onClick={() => { updateInfo(field.key, opt); setOpenDropdown(null); }}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="form-field">
              <label>Kode produksi</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  type="text"
                  value={draft.productionCode}
                  placeholder="Kolom 1"
                  onChange={e => updateInfo('productionCode', e.target.value)}
                  style={{ flex: 1 }}
                />
                <input
                  className="form-input"
                  type="text"
                  value={draft.productionCodeDetail}
                  placeholder="Kolom 2"
                  onChange={e => updateInfo('productionCodeDetail', e.target.value)}
                  style={{ flex: 1 }}
                />
                <input
                  className="form-input"
                  type="text"
                  value={draft.productionCode3}
                  placeholder="Kolom 3"
                  onChange={e => updateInfo('productionCode3', e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            {INFO_FIELDS.map(field => {
              const isReadOnly = field.readOnly;
              let displayValue = String(draft[field.key] ?? '');
              return (
                <div className="form-field" key={field.key}>
                  <label htmlFor={`field-${field.key}`}>{field.label}</label>
                  <input
                    id={`field-${field.key}`}
                    className={`form-input ${isReadOnly ? 'readonly' : ''}`}
                    type={field.type ?? 'text'}
                    value={displayValue}
                    readOnly={isReadOnly}
                    onChange={isReadOnly ? undefined : event => updateInfo(field.key, event.target.value)}
                  />
                </div>
              );
            })}

            <div className="form-field">
              <label htmlFor="field-totalLot">Total lot (karton)</label>
              <input
                id="field-totalLot"
                className="form-input"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={draft.totalLot}
                onChange={event => updateInfo('totalLot', event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="field-totalLotPcs">Total lot (pcs)</label>
              <input
                id="field-totalLotPcs"
                className="form-input"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={draft.totalLotPcs}
                onChange={event => updateInfo('totalLotPcs', event.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Jumlah sampel (karton)</label>
              <div className="custom-dropdown">
                <button
                  type="button"
                  className="form-input form-input-clickable dropdown-trigger"
                  onClick={e => { e.stopPropagation(); setOpenDropdown(openDropdown === 'sampleSizeKarton' ? null : 'sampleSizeKarton'); }}
                >
                  <span>{draft.sampleSize}</span>
                  <ChevronDown size={16} />
                </button>
                {openDropdown === 'sampleSizeKarton' && (
                  <div className="dropdown-menu">
                    {SAMPLE_SIZE_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        className={`dropdown-item ${String(opt) === String(draft.sampleSize) ? 'active' : ''}`}
                        onClick={() => { updateSampleSizeKarton(opt); setOpenDropdown(null); }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-field">
              <label>Jumlah sampel (pcs)</label>
              <div className="custom-dropdown">
                <button
                  type="button"
                  className="form-input form-input-clickable dropdown-trigger"
                  onClick={e => { e.stopPropagation(); setOpenDropdown(openDropdown === 'sampleSizePcs' ? null : 'sampleSizePcs'); }}
                >
                  <span>{draft.sampleSizePlan || String(draft.sampleSize)}</span>
                  <ChevronDown size={16} />
                </button>
                {openDropdown === 'sampleSizePcs' && (
                  <div className="dropdown-menu">
                    {SAMPLE_SIZE_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        className={`dropdown-item ${String(opt) === String(draft.sampleSizePlan || draft.sampleSize) ? 'active' : ''}`}
                        onClick={() => { updateSampleSizePlan(opt); setOpenDropdown(null); }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {INFO_FIELDS_BOTTOM.map(field => {
              if (field.key === 'analysisDate') {
                return (
                  <div className="form-field" key={field.key}>
                    <label>{field.label}</label>
                    <button
                      type="button"
                      className="form-input form-input-clickable"
                      onClick={() => setShowDatePicker(true)}
                    >
                      <span className={!draft.analysisDate ? 'placeholder-text' : ''}>
                        {draft.analysisDate || 'Pilih tanggal (YYYY-MM-DD)'}
                      </span>
                    </button>
                  </div>
                );
              }

              const isReadOnly = field.readOnly;
              let displayValue = String(draft[field.key] ?? '');
              if (field.key === 'aqlPercentage') displayValue = '6,5';
              else if (field.key === 'halalPercentage') displayValue = '100';
              else if (field.key === 'aqlAcceptReject') displayValue = draft.aqlAcceptReject || calculateAR(draft.sampleSize);

              return (
                <div className="form-field" key={field.key}>
                  <label htmlFor={`field-${field.key}`}>{field.label}</label>
                  <input
                    id={`field-${field.key}`}
                    className={`form-input ${isReadOnly ? 'readonly' : ''}`}
                    type={field.type ?? 'text'}
                    value={displayValue}
                    readOnly={isReadOnly}
                    onChange={isReadOnly ? undefined : event => updateInfo(field.key, event.target.value)}
                  />
                </div>
              );
            })}
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
                          <button type="button" className="empty-action" onClick={() => setAllSamples(criterion.id, null)}>Semua kosong</button>
                        </div>
                        <div className="sample-grid">
                          {values.map((value, index) => index < draft.sampleSize && (
                            <button type="button" key={index} onClick={() => toggleSample(criterion.id, index)} className={`sample-button ${value === true ? 'good' : isRejected(value) ? 'bad' : 'empty'}`} aria-label={`Sampel ${index + 1}: ${value === true ? 'sesuai' : isRejected(value) ? 'reject' : 'kosong'}`}>
                              <span>{index + 1}</span>{value === true ? <Check size={15} /> : isRejected(value) ? <X size={15} /> : null}
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
            {ANALYSIS_PARAMETERS.map(parameter => {
              const isDisabled = parameter.monitoringOnly && draft.oqcType !== 'OQC Monitoring';
              const nameParts = parameter.name.includes(' / ') ? parameter.name.split(' / ') : null;
              const storedValue = draft.analysisResults[parameter.key] ?? '';
              const values = nameParts ? storedValue.split(' / ') : [];

              if (nameParts && !isDisabled) {
                return (
                  <div className="form-field" key={parameter.key}>
                    <label>{parameter.id}. {parameter.name}</label>
                    {parameter.standard && <small className="field-hint">Standard: {parameter.standard}</small>}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {nameParts.map((part, i) => (
                        <input
                          key={i}
                          className="form-input"
                          type="text"
                          style={{ flex: '1 1 0', minWidth: 60 }}
                          value={values[i] ?? ''}
                          placeholder={part.trim()}
                          onChange={e => {
                            const next = [...values];
                            next[i] = e.target.value;
                            while (next.length < nameParts.length) next.push('');
                            update('analysisResults', { ...draft.analysisResults, [parameter.key]: next.join(' / ') });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div className="form-field" key={parameter.key}>
                  <label htmlFor={`analysis-${parameter.key}`}>{parameter.id}. {parameter.name}</label>
                  {parameter.standard && <small className="field-hint">Standard: {parameter.standard}</small>}
                  <input
                    id={`analysis-${parameter.key}`}
                    className={`form-input ${isDisabled ? 'readonly' : ''}`}
                    value={isDisabled ? '-' : storedValue}
                    placeholder={isDisabled ? '' : 'Hasil analisa'}
                    readOnly={isDisabled}
                    disabled={isDisabled}
                    onChange={isDisabled ? undefined : event => update('analysisResults', { ...draft.analysisResults, [parameter.key]: event.target.value })}
                  />
                </div>
              );
            })}

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

        <div className="form-footer-actions">
          <button type="button" className="draft-button" disabled={saving} onClick={() => void save(false)}>
            {saving ? 'Menyimpan...' : 'Simpan Draft'}
          </button>
          <button type="button" className="complete-button" disabled={saving} onClick={() => void goNext()}>
            {tab === 'analysis' ? <><Check size={18} /> Selesai</> : <><ChevronRight size={18} /> Next</>}
          </button>
        </div>
      </div>

      {showDatePicker && (
        <div className="modal-overlay" onClick={() => setShowDatePicker(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="modal-title">Pilih Tanggal</h3>
              <button type="button" onClick={() => setShowDatePicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink)', fontSize: 13, fontWeight: 800 }}>Batal</button>
            </div>
            <input
              type="date"
              className="form-input"
              value={draft.analysisDate || ''}
              onChange={e => { update('analysisDate', e.target.value); setShowDatePicker(false); }}
              style={{ fontSize: 16 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
