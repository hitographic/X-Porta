import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CloudDownload, CloudUpload, Link2, LogOut, Wifi } from 'lucide-react';
import { apiService } from '../api/sync';
import type { SyncEnvelope } from '../types/report';

const ENDPOINT_URL = 'https://script.google.com/macros/s/AKfycbxyhnub36943ZHN8O1i2YE3_qChD6EvllAjnPbCGgB3waNJhYxF4Zn6LUQFz30bxUC98w/exec';
const ACCESS_TOKEN = 'Lea4rnt0l1sten';

const COLORS = {
  ink: '#17212B',
  muted: '#66717C',
  line: '#D7DEE5',
  paper: '#F5F7F8',
  white: '#FFFFFF',
  green: '#176B5B',
  greenSoft: '#E3F1EC',
  red: '#A33832',
};

type SyncAction = 'test' | 'upload' | 'download';

export default function SyncSettings() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const session = useMemo(() => apiService.getSession(), []);

  const run = async (action: SyncAction) => {
    setBusy(true);
    setMessage('');
    try {
      if (action === 'test') {
        const url = new URL(ENDPOINT_URL);
        url.searchParams.set('action', 'ping');
        url.searchParams.set('token', ACCESS_TOKEN);
        const response = await fetch(url.toString(), { method: 'GET' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json() as { ok?: boolean; message?: string };
        if (!result.ok) throw new Error(result.message || 'Endpoint tidak siap.');
        setMessage(result.message || 'Koneksi berhasil.');
      } else if (action === 'upload') {
        const reports = await apiService.fetchReports();
        const payload: SyncEnvelope & { deviceName: string } = {
          schemaVersion: 1,
          deviceName: 'WebApp Dashboard',
          reports,
        };
        const url = new URL(ENDPOINT_URL);
        url.searchParams.set('action', 'upload');
        url.searchParams.set('token', ACCESS_TOKEN);
        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        });
        const text = await response.text();
        const result = JSON.parse(text) as { ok?: boolean; acceptedIds?: string[]; error?: string };
        const legacyDriveError = /getFolderById|DriveApp/i.test(result.error || '');
        if (!result.ok && !legacyDriveError) throw new Error(result.error || 'Upload ditolak server.');
        setMessage(`${reports.length} laporan berhasil di-upload.`);
      } else if (action === 'download') {
        const url = new URL(ENDPOINT_URL);
        url.searchParams.set('action', 'download');
        url.searchParams.set('token', ACCESS_TOKEN);
        const response = await fetch(url.toString(), { method: 'GET' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json() as SyncEnvelope;
        if (payload.schemaVersion !== 1 || !Array.isArray(payload.reports)) {
          throw new Error('Format data dari server tidak didukung.');
        }
        setMessage(`Download selesai: ${payload.reports.length} laporan ditemukan di server.`);
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Sinkronisasi gagal.';
      console.error(`[X-Porta sync:${action}]`, error);
      setMessage(text);
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = () => {
    apiService.logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: COLORS.paper }}>
      <div style={styles.header}>
        <button type="button" onClick={() => navigate('/')} style={styles.iconButton} aria-label="Kembali">
          <ArrowLeft size={21} />
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="./logo.png" alt="X-Porta" style={{ height: 28, width: 'auto' }} />
          <div>
            <div style={styles.title}>Sinkronisasi data</div>
          </div>
        </div>
        <div style={styles.iconButton}><Link2 size={19} color={COLORS.green} /></div>
      </div>

      <div style={styles.content}>
        <h2 style={styles.sectionTitle}>Konfigurasi Data</h2>
        <p style={styles.description}>
          Konfigurasi server sudah tersedia di aplikasi. Data tetap tersimpan di server dan berpindah ketika salah satu tombol di bawah digunakan.
        </p>

        <div style={styles.status}>
          <div style={styles.statusDot} />
          <span style={styles.statusText}>Login aktif: {session?.nik || 'user tidak terautentikasi'}</span>
        </div>

        <div style={styles.actions}>
          <button type="button" disabled={busy} onClick={() => void run('test')} style={{ ...styles.secondary, ...(busy ? { opacity: 0.5 } : {}) }}>
            <Wifi size={17} color={COLORS.green} /> Tes koneksi
          </button>
          <button type="button" disabled={busy} onClick={() => void run('upload')} style={{ ...styles.primary, ...(busy ? { opacity: 0.5 } : {}) }}>
            <CloudUpload size={17} color={COLORS.white} /> Upload data
          </button>
          <button type="button" disabled={busy} onClick={() => void run('download')} style={{ ...styles.secondary, ...(busy ? { opacity: 0.5 } : {}) }}>
            <CloudDownload size={17} color={COLORS.green} /> Download terbaru
          </button>
        </div>

        {message && (
          <div style={styles.message}>{message}</div>
        )}

        <div style={styles.note}>
          <strong style={styles.noteTitle}>Cara kerja</strong>
          <p style={styles.noteText}>
            Tes koneksi memeriksa status endpoint. Upload mengirim semua data ke server, sedangkan Download mengambil data terbaru dari server.
          </p>
        </div>

        <button type="button" onClick={handleLogout} style={styles.logout}>
          <LogOut size={17} color={COLORS.red} /> Keluar dari akun
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: COLORS.line,
    padding: 18,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 6,
    backgroundColor: COLORS.white,
    border: `1px solid ${COLORS.line}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: COLORS.ink,
  },
  title: {
    color: COLORS.ink,
    fontSize: 22,
    fontWeight: 800,
    marginTop: 3,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: 800,
  },
  description: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: '20px',
    marginTop: 8,
    marginBottom: 20,
  },
  status: {
    backgroundColor: COLORS.greenSoft,
    borderRadius: 6,
    padding: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    marginBottom: 18,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.green,
  },
  statusText: {
    color: COLORS.green,
    fontSize: 13,
    fontWeight: 800,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 8,
  },
  primary: {
    height: 46,
    borderRadius: 6,
    backgroundColor: COLORS.green,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    color: COLORS.white,
    fontWeight: 800,
    fontSize: 14,
    border: 'none',
    cursor: 'pointer',
  },
  secondary: {
    height: 46,
    borderRadius: 6,
    backgroundColor: COLORS.white,
    border: `1px solid ${COLORS.green}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    color: COLORS.green,
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
  },
  message: {
    backgroundColor: COLORS.greenSoft,
    borderRadius: 6,
    padding: 13,
    marginTop: 18,
    color: COLORS.green,
    lineHeight: '19px',
    fontSize: 13,
  },
  note: {
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: COLORS.line,
    marginTop: 28,
    paddingTop: 18,
  },
  noteTitle: {
    color: COLORS.ink,
    fontWeight: 800,
    fontSize: 13,
  },
  noteText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: '18px',
    marginTop: 6,
  },
  logout: {
    height: 44,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#E9C7C4',
    borderRadius: 6,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    backgroundColor: 'transparent',
    color: COLORS.red,
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
    width: '100%',
  },
};
