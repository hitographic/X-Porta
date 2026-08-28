import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { apiService } from './api/sync';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ReportDetail from './pages/ReportDetail';
import ReportForm from './pages/ReportForm';
import SyncSettings from './pages/SyncSettings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = apiService.getSession();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(apiService.getSession());

  useEffect(() => {
    setSession(apiService.getSession());
  }, [navigate]);

  const isLogin = location.pathname === '/login';

  return (
    <div className="safe-area">
      {!isLogin && (
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="./logo.png" alt="X-Porta" style={{ height: 32, width: 'auto' }} />
            <div className="subtitle">
              PDQC-020 · WebApp Dashboard
            </div>
          </div>
          {session && (
            <button
              className="icon-button"
              aria-label="Pengaturan"
              onClick={() => navigate('/sync')}
            >
              <Settings size={21} />
            </button>
          )}
        </header>
      )}

      <main className="body-content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/new"
            element={
              <ProtectedRoute>
                <ReportForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/:id"
            element={
              <ProtectedRoute>
                <ReportDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/:id/edit"
            element={
              <ProtectedRoute>
                <ReportForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sync"
            element={
              <ProtectedRoute>
                <SyncSettings />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer style={{ padding: '16px', textAlign: 'center', color: 'var(--color-muted)', fontSize: 11, borderTop: '1px solid var(--color-line)' }}>
        © {new Date().getFullYear()} ver.1.1.0 by KursiHangat for Indofood
      </footer>
    </div>
  );
}

export default App;
