import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
  const [session, setSession] = useState(apiService.getSession());

  useEffect(() => {
    setSession(apiService.getSession());
  }, [navigate]);

  return (
    <div className="safe-area">
      <header className="header">
        <div>
          <div className="kicker">X-PORTA</div>
          <div className="title">Finished Goods QC</div>
          <div className="subtitle">
            PDQC-020 · {session ? 'WebApp Dashboard' : 'Login'}
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
    </div>
  );
}

export default App;
