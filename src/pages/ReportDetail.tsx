import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Edit, FileText, X } from 'lucide-react';
import { apiService } from '../api/sync';
import { ANALYSIS_PARAMETERS, calculateAcceptRejectStatus, calculateSampleRejects, REJECT_CRITERIA } from '../types/report';
import type { FinishedGoodsReport } from '../types/report';
import { exportReportPdf } from '../utils/export';
import { format } from 'date-fns';
import { id as dateFnsId } from 'date-fns/locale';

const COLORS = {
  ink: '#17212B',
  muted: '#66717C',
  line: '#D7DEE5',
  paper: '#F5F7F8',
  white: '#FFFFFF',
  green: '#176B5B',
  greenSoft: '#E3F1EC',
  red: '#A33832',
  redSoft: '#FBE9E7',
};

export default function ReportDetail() {
  const { id: reportId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<FinishedGoodsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<number | null>(1);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const data = await apiService.fetchReports();
        const found = data.find(r => r.id === reportId);
        if (found) {
          setReport(found);
        } else {
          setError('Laporan tidak ditemukan.');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Gagal memuat detail laporan.');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [reportId]);

  if (loading) {
    return <div style={{ padding: '40px 0', textAlign: 'center', color: COLORS.muted }}>Memuat laporan...</div>;
  }

  if (error || !report) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={() => navigate('/')} style={btnSecondaryStyle}>
          <ArrowLeft size={16} /> Kembali
        </button>
        <div style={errorStyle}>
          {error || 'Laporan tidak ditemukan.'}
        </div>
      </div>
    );
  }

  const totalRejects = calculateSampleRejects(report);
  const statuses = calculateAcceptRejectStatus(totalRejects, report.sampleSize, report.aqlAcceptReject);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <button onClick={() => navigate('/')} style={btnSecondaryStyle}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => exportReportPdf(report)} style={btnSecondaryStyle}>
            <FileText size={16} color={COLORS.red} />
            <span style={{ color: COLORS.red }}>PDF</span>
          </button>
          <button onClick={() => navigate(`/reports/${report.id}/edit`)} style={btnPrimaryStyle}>
            <Edit size={16} /> Edit
          </button>
        </div>
      </div>

      {/* Report info card */}
      <div style={cardStyle}>
        <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.ink, marginBottom: 4 }}>
          {report.flavour || 'Tanpa Flavour'}
        </div>
        <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>
          No: {report.reportNumber || 'Draft'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['Jenis OQC', report.oqcType],
            ['Tanggal Analisa', report.analysisDate ? format(new Date(report.analysisDate), 'dd MMMM yyyy', { locale: dateFnsId }) : '-'],
            ['Shift / Line', `Shift ${report.shift} / Line ${report.line}`],
            ['Kode Produksi', report.productionCode || '-'],
            ['Negara', report.country || '-'],
            ['Distributor', report.distributor || '-'],
            ['Total Lot', `${report.totalLot || '-'} / ${report.totalLotPcs || '-'} pcs`],
            ['Sample Size', `${report.sampleSize} / ${report.sampleSizePlan || '-'}`],
            ['AQL', `${report.aqlPercentage || '-'} %, A/R: ${report.aqlAcceptReject || '-'}`],
            ['Halal', `${report.halalPercentage || '-'} %`],
            ['Inspektur', report.inspectorName || '-'],
            ['Approver', report.approverName || '-'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={detailTextStyle}>{label}</span>
              <span style={{ color: COLORS.ink, fontWeight: 600 }}>{value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={detailTextStyle}>Status</span>
            <span className={`badge ${report.status === 'completed' ? 'badge-done' : 'badge-draft'}`}>
              <span className="badge-text">{report.status.toUpperCase()}</span>
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={detailTextStyle}>Kesimpulan</span>
            <span style={{
              fontWeight: 800,
              color: report.conclusion === 'accepted' ? COLORS.green : report.conclusion === 'rejected' ? COLORS.red : COLORS.ink,
            }}>
              {report.conclusion === 'accepted' ? 'DITERIMA' : report.conclusion === 'rejected' ? 'DITOLAK' : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Reject criteria results */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: COLORS.ink, marginBottom: 12 }}>Kriteria Reject</h3>
        {REJECT_CRITERIA.map(criterion => {
          const isOpen = expanded === criterion.id;
          const values = report.rejectResults[String(criterion.id)] ?? [];
          return (
            <article key={criterion.id} style={{ ...criterionPanelStyle, marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : criterion.id)}
                style={criterionHeaderStyle}
                aria-expanded={isOpen}
              >
                <span style={criterionNumberStyle}>{criterion.id}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ display: 'block', color: COLORS.ink, fontSize: 12, lineHeight: '17px' }}>{criterion.name}</strong>
                  <small style={{ display: 'block', color: COLORS.muted, fontSize: 11, lineHeight: '16px', marginTop: 3 }}>{criterion.standard}</small>
                </span>
                {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {isOpen && (
                <div style={criterionBodyStyle}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))', gap: 7 }}>
                    {values.map((value, index) => index < report.sampleSize && (
                      <div
                        key={index}
                        style={{
                          height: 38,
                          padding: '0 9px',
                          borderRadius: 5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontWeight: 800,
                          fontSize: 11,
                          color: value ? COLORS.green : COLORS.red,
                          border: `1px solid ${value ? COLORS.green : COLORS.red}`,
                          backgroundColor: value ? COLORS.greenSoft : COLORS.redSoft,
                        }}
                      >
                        <span>{index + 1}</span>
                        {value ? <Check size={15} /> : <X size={15} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {/* Total rejects */}
        <div style={{ marginTop: 12, padding: '10px 12px', backgroundColor: COLORS.paper, borderRadius: 6, border: `1px solid ${COLORS.line}` }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: COLORS.ink, marginBottom: 6 }}>TOTAL REJECT</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: 4 }}>
            {totalRejects.map((count, index) => (
              <div key={index} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: count > 0 ? COLORS.red : COLORS.muted }}>
                {count}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, color: COLORS.ink, marginTop: 8, marginBottom: 6 }}>A / R (Status)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: 4 }}>
            {statuses.map((status, index) => (
              <div key={index} style={{
                textAlign: 'center',
                fontSize: 11,
                fontWeight: 800,
                color: status === 'A' ? COLORS.green : status === 'R' ? COLORS.red : COLORS.muted,
              }}>
                {status}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analysis results */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: COLORS.ink, marginBottom: 12 }}>Organoleptik dan Kimia</h3>
        {ANALYSIS_PARAMETERS.map(parameter => (
          <div key={parameter.key} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.ink, marginBottom: 4 }}>
              {parameter.id}. {parameter.name}
            </div>
            {parameter.standard && (
              <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>Standard: {parameter.standard}</div>
            )}
            <div style={{
              padding: '8px 10px',
              backgroundColor: COLORS.paper,
              border: `1px solid ${COLORS.line}`,
              borderRadius: 5,
              fontSize: 13,
              color: report.analysisResults[parameter.key] ? COLORS.ink : COLORS.muted,
            }}>
              {report.analysisResults[parameter.key] || '-'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  backgroundColor: COLORS.white,
  border: `1px solid ${COLORS.line}`,
  borderRadius: 6,
  padding: 15,
};

const btnSecondaryStyle: React.CSSProperties = {
  height: 36,
  minWidth: 42,
  border: `1px solid ${COLORS.line}`,
  borderRadius: 5,
  padding: '0 9px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  backgroundColor: COLORS.white,
  cursor: 'pointer',
  fontWeight: 800,
  fontSize: 11,
  color: COLORS.ink,
};

const btnPrimaryStyle: React.CSSProperties = {
  height: 36,
  backgroundColor: COLORS.green,
  borderRadius: 5,
  padding: '0 13px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  color: COLORS.white,
  fontWeight: 800,
  fontSize: 12,
  cursor: 'pointer',
  border: 'none',
};

const detailTextStyle: React.CSSProperties = {
  color: COLORS.muted,
  fontSize: 12,
};

const errorStyle: React.CSSProperties = {
  padding: 16,
  background: COLORS.red,
  color: COLORS.white,
  borderRadius: 6,
};

const criterionPanelStyle: React.CSSProperties = {
  backgroundColor: COLORS.white,
  border: `1px solid ${COLORS.line}`,
  borderRadius: 6,
  overflow: 'hidden',
};

const criterionHeaderStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 68,
  padding: 12,
  border: 'none',
  backgroundColor: COLORS.white,
  color: COLORS.muted,
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  textAlign: 'left',
  cursor: 'pointer',
};

const criterionNumberStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  flex: '0 0 28px',
  borderRadius: 14,
  backgroundColor: COLORS.greenSoft,
  color: COLORS.green,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  fontWeight: 800,
};

const criterionBodyStyle: React.CSSProperties = {
  padding: 12,
  borderTop: `1px solid ${COLORS.line}`,
  backgroundColor: '#FBFCFC',
};
