import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import AuthModal from './components/auth/AuthModal';
import AdminDashboard from './components/admin/AdminDashboard';
import StudioWorkspace from './components/studio/StudioWorkspace';
import Marketplace from './components/marketplace/Marketplace';

export default function App() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('studio'); // 'admin' | 'studio' | 'marketplace'
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Set default view based on role
  React.useEffect(() => {
    if (isAdmin) {
      setActiveTab('admin');
    }
  }, [isAdmin]);

  return (
    <>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      <main className="main-layout">
        {activeTab === 'admin' && isAdmin && <AdminDashboard />}
        {activeTab === 'admin' && !isAdmin && (
          <div className="container" style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '14px' }}>🛡️</div>
            <h3>MoSJE Administrative Access Required</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '8px auto 24px' }}>
              Please sign in with administrator credentials to access the national verification and governance console.
            </p>
            <button className="btn btn-primary btn-md" onClick={() => setIsAuthOpen(true)}>
              Sign In as Administrator
            </button>
          </div>
        )}

        {activeTab === 'studio' && (
          <StudioWorkspace onProductCreated={() => setActiveTab('marketplace')} />
        )}

        {activeTab === 'marketplace' && <Marketplace />}
      </main>

      <Footer />

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}

