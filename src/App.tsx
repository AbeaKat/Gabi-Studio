import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { AppLayout } from './components/layout/AppLayout';
import { InventoryPage } from './pages/InventoryPage';
import { ClosingPage } from './pages/ClosingPage';
import { FinancePage } from './pages/FinancePage';
import { BatchesPage } from './pages/BatchesPage';
import { AuditPage } from './pages/AuditPage';
import { ProfilesPage } from './pages/ProfilesPage';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-nacre-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* App Private Routes */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/inventory" replace />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="closing" element={<ClosingPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="batches" element={<BatchesPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="team" element={<ProfilesPage />} />
            <Route path="*" element={<Navigate to="/app/inventory" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
