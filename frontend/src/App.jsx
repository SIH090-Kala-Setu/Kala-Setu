import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import AuthModal from './components/auth/AuthModal';
import AdminDashboard from './components/admin/AdminDashboard';
import StudioWorkspace from './components/studio/StudioWorkspace';
import Marketplace from './components/marketplace/Marketplace';
import ArtisanDashboard from './components/artisan/ArtisanDashboard';
import ArtisanProfile from './components/artisan/ArtisanProfile';
import InventoryManager from './components/artisan/InventoryManager';
import ArtisanAnalytics from './components/artisan/ArtisanAnalytics';
import NotificationsCenter from './components/artisan/NotificationsCenter';
import AggregatorDashboard from './components/aggregator/AggregatorDashboard';
import BuyerDashboard from './components/buyer/BuyerDashboard';
import OnboardingWizard from './components/onboarding/OnboardingWizard';

export default function App() {
  const { user, logout } = useAuth();
  const role = user?.role;
  const isAdmin = role === 'Admin';
  const isArtisan = role === 'Artisan';
  const isAggregator = role === 'Aggregator';
  const isBuyer = role === 'Buyer';

  const getDefaultTab = () => {
    if (isAdmin) return 'admin';
    if (isArtisan) return 'artisan-dashboard';
    if (isAggregator) return 'aggregator-dashboard';
    if (isBuyer) return 'buyer-dashboard';
    return 'marketplace';
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab());
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    setActiveTab(getDefaultTab());
  }, [role]);

  const navigate = (tab) => setActiveTab(tab);

  return (
    <>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenOnboarding={() => setShowOnboarding(true)}
        user={user}
        role={role}
        onLogout={logout}
      />

      <main className="main-layout">
        {/* ADMIN */}
        {isAdmin && activeTab === 'admin' && <AdminDashboard />}

        {/* ARTISAN */}
        {isArtisan && activeTab === 'artisan-dashboard' && <ArtisanDashboard onNavigate={navigate} />}
        {isArtisan && activeTab === 'studio' && <StudioWorkspace onProductCreated={() => navigate('marketplace')} />}
        {isArtisan && activeTab === 'inventory' && <InventoryManager />}
        {isArtisan && activeTab === 'analytics' && <ArtisanAnalytics />}
        {isArtisan && activeTab === 'profile' && <ArtisanProfile />}
        {isArtisan && activeTab === 'notifications' && <NotificationsCenter />}
        {isArtisan && activeTab === 'marketplace' && <Marketplace />}
        {isArtisan && activeTab === 'inquiries' && <NotificationsCenter filterType="Inquiry" />}

        {/* AGGREGATOR */}
        {isAggregator && activeTab === 'aggregator-dashboard' && <AggregatorDashboard />}
        {isAggregator && activeTab === 'marketplace' && <Marketplace />}

        {/* BUYER */}
        {isBuyer && activeTab === 'buyer-dashboard' && <BuyerDashboard />}
        {isBuyer && activeTab === 'marketplace' && <Marketplace />}

        {/* UNAUTHENTICATED */}
        {!user && <Marketplace />}

        {/* ADMIN ACCESS DENIED */}
        {activeTab === 'admin' && !isAdmin && (
          <div className="container" style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '14px' }}>🛡️</div>
            <h3>MoSJE Administrative Access Required</h3>
            <button className="btn btn-primary btn-md" onClick={() => setIsAuthOpen(true)}>Sign In as Administrator</button>
          </div>
        )}
      </main>

      <Footer />

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      {showOnboarding && <OnboardingWizard onComplete={() => setShowOnboarding(false)} />}
    </>
  );
}
