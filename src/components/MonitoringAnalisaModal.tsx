import { useState } from 'react';
import { X } from 'lucide-react';
import { ANALYSIS_PARAMETERS } from '../types/report';
import type { FinishedGoodsReport } from '../types/report';

interface Props {
  report: FinishedGoodsReport;
  onClose: () => void;
  onSave: (report: FinishedGoodsReport) => void;
}

export default function MonitoringAnalisaModal({ report, onClose, onSave }: Props) {
  const [draft, setDraft] = useState(report);

  const updateAnalysis = (key: string, value: string) => {
    setDraft(current => ({
      ...current,
      analysisResults: { ...current.analysisResults, [key]: value },
    }));
  };

  const updateStandard = (key: string, value: string) => {
    setDraft(current => ({
      ...current,
      analysisStandards: { ...current.analysisStandards, [key]: value },
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3 className="modal-title" style={{ marginBottom: 0 }}>Input Hasil Analisa</h3>
            <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
              {draft.flavour} · {draft.oqcType} · {draft.analysisDate}
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div className="form-field" style={{ marginBottom: 10 }}>
          <label style={{ fontWeight: 600, fontSize: 12 }}>Nama Analis</label>
          <input
            className="form-input"
            type="text"
            value={draft.analystName}
            placeholder="Masukkan nama analis"
            onChange={e => setDraft(current => ({ ...current, analystName: e.target.value }))}
          />
        </div>

        <div style={{ borderTop: '1px solid var(--color-line)', paddingTop: 10 }}>
          {ANALYSIS_PARAMETERS.map(parameter => {
            const nameParts = parameter.name.includes(' / ') ? parameter.name.split(' / ') : null;
            const storedValue = draft.analysisResults[parameter.key] ?? '';
            const storedStandard = (draft as any).analysisStandards?.[parameter.key] ?? parameter.standard ?? '';
            const values = nameParts ? storedValue.split(' / ') : [];

            if (nameParts) {
              return (
                <div className="form-field" key={parameter.key} style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>{parameter.id}. {parameter.name}</label>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    <input
                      className="form-input"
                      type="text"
                      style={{ fontSize: 11, padding: '4px 6px' }}
                      value={storedStandard}
                      placeholder="Standard"
                      onChange={e => updateStandard(parameter.key, e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {nameParts.map((part, i) => (
                      <input
                        key={i}
                        className="form-input"
                        type="text"
                        style={{ flex: '1 1 0', minWidth: 50, fontSize: 11, padding: '4px 6px' }}
                        value={values[i] ?? ''}
                        placeholder={part.trim()}
                        onChange={e => {
                          const next = [...values];
                          next[i] = e.target.value;
                          while (next.length < nameParts.length) next.push('');
                          updateAnalysis(parameter.key, next.join(' / '));
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <div className="form-field" key={parameter.key} style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>{parameter.id}. {parameter.name}</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input
                    className="form-input"
                    type="text"
                    style={{ flex: 1, fontSize: 11, padding: '4px 6px' }}
                    value={storedStandard}
                    placeholder="Standard"
                    onChange={e => updateStandard(parameter.key, e.target.value)}
                  />
                  <input
                    className="form-input"
                    type="text"
                    style={{ flex: 1, fontSize: 11, padding: '4px 6px' }}
                    value={storedValue}
                    placeholder="Hasil"
                    onChange={e => updateAnalysis(parameter.key, e.target.value)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal-actions" style={{ marginTop: 12 }}>
          <button className="cancel-button" onClick={onClose}>Batal</button>
          <button className="ok-button" onClick={() => onSave(draft)}>Simpan</button>
        </div>
      </div>
    </div>
  );
}
