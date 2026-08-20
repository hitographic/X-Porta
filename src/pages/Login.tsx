import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, LogIn, UserRound } from 'lucide-react';
import { apiService } from '../api/sync';
import ParticleBackground from '../components/ParticleBackground';

const COLORS = {
  ink: '#17212B',
  muted: '#66717C',
  line: '#D7DEE5',
  paper: '#F5F7F8',
  white: '#FFFFFF',
  green: '#176B5B',
  greenLight: '#1E8A76',
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
  const [focusField, setFocusField] = useState<string | null>(null);

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
        setError('NIK atau password salah.');
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
      <ParticleBackground />

      <div style={styles.content}>
        <div style={styles.brand}>
          <img
            src="./logo.png"
            alt="X-Porta Logo"
            style={{ width: 220, height: 'auto', position: 'relative', zIndex: 1 }}
          />
        </div>

        <div style={styles.card}>
          <div style={styles.cardInner}>
            <div style={styles.iconWrap}>
              <div style={styles.iconCircle}>
                <UserRound size={22} color={COLORS.green} />
              </div>
            </div>

            <div style={styles.title}>Masuk</div>

            <div style={styles.field}>
              <div style={{
                ...styles.inputWrap,
                borderColor: focusField === 'nik' ? COLORS.green : COLORS.line,
                boxShadow: focusField === 'nik' ? '0 0 0 3px rgba(23, 107, 91, 0.1)' : 'none',
              }}>
                <UserRound size={17} color={focusField === 'nik' ? COLORS.green : COLORS.muted} />
                <input
                  type="text"
                  value={nik}
                  onChange={(e) => setNik(e.target.value)}
                  onFocus={() => setFocusField('nik')}
                  onBlur={() => setFocusField(null)}
                  placeholder="NIK"
                  autoCapitalize="none"
                  autoCorrect="off"
                  onKeyDown={(e) => e.key === 'Enter' && login()}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.field}>
              <div style={{
                ...styles.inputWrap,
                borderColor: focusField === 'pw' ? COLORS.green : COLORS.line,
                boxShadow: focusField === 'pw' ? '0 0 0 3px rgba(23, 107, 91, 0.1)' : 'none',
              }}>
                <LockKeyhole size={17} color={focusField === 'pw' ? COLORS.green : COLORS.muted} />
                <input
                  type={secure ? 'password' : 'text'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusField('pw')}
                  onBlur={() => setFocusField(null)}
                  placeholder="Password"
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
                  {secure ? (
                    <Eye size={17} color={COLORS.muted} />
                  ) : (
                    <EyeOff size={17} color={COLORS.muted} />
                  )}
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
              style={{
                ...styles.submit,
                opacity: busy ? 0.6 : 1,
                background: busy ? COLORS.green : `linear-gradient(135deg, ${COLORS.green}, ${COLORS.greenLight})`,
              }}
            >
              {busy ? (
                <span style={styles.spinner} />
              ) : (
                <>
                  <LogIn size={17} />
                  Masuk
                </>
              )}
            </button>
          </div>
        </div>

        <div style={styles.footer}>
          Powered by <span style={{ fontWeight: 700 }}>KursiHangat</span> for Indofood
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: 380,
    padding: '0 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  brand: {
    marginBottom: 32,
    display: 'flex',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: 16,
    border: '1px solid rgba(255, 255, 255, 0.6)',
    boxShadow: '0 8px 40px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.04)',
    overflow: 'hidden',
  },
  cardInner: {
    padding: '36px 28px 32px',
  },
  iconWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: COLORS.greenSoft,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 800,
    color: COLORS.ink,
    marginBottom: 28,
  },
  field: {
    marginBottom: 14,
  },
  inputWrap: {
    height: 48,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: COLORS.line,
    borderRadius: 10,
    paddingLeft: 14,
    paddingRight: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    transition: 'all 0.2s ease',
    backgroundColor: 'rgba(245, 247, 248, 0.5)',
  },
  input: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 14,
    height: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontWeight: 500,
  },
  eye: {
    padding: 4,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: '10px 14px',
    marginBottom: 14,
    color: COLORS.red,
    fontSize: 12,
    lineHeight: '17px',
    fontWeight: 500,
  },
  submit: {
    height: 48,
    borderRadius: 10,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    color: COLORS.white,
    fontWeight: 700,
    fontSize: 14,
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    marginTop: 6,
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 12px rgba(23, 107, 91, 0.3)',
    letterSpacing: 0.3,
  },
  spinner: {
    width: 18,
    height: 18,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
  },
  footer: {
    marginTop: 28,
    color: COLORS.muted,
    fontSize: 11,
    textAlign: 'center',
    opacity: 0.7,
  },
};
