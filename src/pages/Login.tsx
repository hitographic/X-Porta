import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, LogIn, UserRound } from 'lucide-react';
import { apiService } from '../api/sync';

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

export default function Login() {
  const navigate = useNavigate();
  const [nik, setNik] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const login = async () => {
    if (!nik.trim() || !password) {
      setError('NIK dan password wajib diisi.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const session = await apiService.login(nik, password);
      if (!session) {
        setError('NIK atau password salah. Periksa kembali data di Google Sheets.');
        return;
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.brand}>
        <img src="./logo.png" alt="X-Porta Logo" style={{ width: 120, height: 'auto', marginBottom: 12 }} />
        <div style={styles.title}>Finished Goods QC</div>
        <div style={styles.subtitle}>Masuk ke workspace laporan</div>
      </div>

      <div style={styles.form}>
        <div style={styles.formTitle}>Login pengguna</div>
        <div style={styles.formDescription}>
          Gunakan NIK dan password yang terdaftar di Google Sheets.
        </div>

        <div style={styles.field}>
          <label style={styles.label}>NIK</label>
          <div style={styles.inputRow}>
            <UserRound size={18} color={COLORS.muted} />
            <input
              type="text"
              value={nik}
              onChange={(e) => setNik(e.target.value)}
              placeholder="Masukkan NIK"
              autoCapitalize="none"
              autoCorrect="off"
              onKeyDown={(e) => e.key === 'Enter' && login()}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Password</label>
          <div style={styles.inputRow}>
            <LockKeyhole size={18} color={COLORS.muted} />
            <input
              type={secure ? 'password' : 'text'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              autoCapitalize="none"
              autoCorrect="off"
              onKeyDown={(e) => e.key === 'Enter' && login()}
              style={styles.input}
            />
            <button
              type="button"
              onClick={() => setSecure(!secure)}
              style={styles.eye}
              aria-label={secure ? 'Tampilkan password' : 'Sembunyikan password'}
            >
              {secure ? <Eye size={18} color={COLORS.muted} /> : <EyeOff size={18} color={COLORS.muted} />}
            </button>
          </div>
        </div>

        {error && (
          <div style={styles.error}>{error}</div>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={login}
          style={{ ...styles.submit, ...(busy ? { opacity: 0.55 } : {}) }}
        >
          {busy ? 'Masuk...' : <><LogIn size={18} /> Masuk</>}
        </button>
      </div>

      <div style={styles.footer}>PDQC-020 · WebApp Dashboard</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '22px',
    backgroundColor: COLORS.paper,
  },
  brand: {
    marginBottom: 28,
  },
  title: {
    color: COLORS.ink,
    fontSize: 28,
    fontWeight: 800,
    marginTop: 6,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 5,
  },
  form: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: COLORS.line,
    borderRadius: 8,
    padding: 20,
  },
  formTitle: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: 800,
  },
  formDescription: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: '19px',
    marginTop: 6,
    marginBottom: 22,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 7,
    display: 'block',
  },
  inputRow: {
    height: 46,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: COLORS.line,
    borderRadius: 6,
    paddingLeft: 12,
    paddingRight: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 9,
  },
  input: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 14,
    height: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
  },
  eye: {
    padding: 5,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  error: {
    backgroundColor: '#FBEDEC',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#E9C7C4',
    borderRadius: 6,
    padding: 11,
    marginBottom: 14,
    color: COLORS.red,
    fontSize: 12,
    lineHeight: '17px',
  },
  submit: {
    height: 46,
    backgroundColor: COLORS.green,
    borderRadius: 6,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    color: COLORS.white,
    fontWeight: 800,
    fontSize: 14,
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    marginTop: 15,
  },
  footer: {
    color: COLORS.muted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 24,
  },
};
