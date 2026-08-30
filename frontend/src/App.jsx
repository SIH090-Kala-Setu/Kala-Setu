import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import AuthModal from './components/auth/AuthModal';
import AdminDashboard from './components/admin/AdminDashboard';
import StudioWorkspace from './components/studio/StudioWorkspace';
import Marketplace from './components/marketplace/Marketplace';
import ProductPage from './components/marketplace/ProductPage';
import ArtisanDashboard from './components/artisan/ArtisanDashboard';
import ArtisanProfile from './components/artisan/ArtisanProfile';
import InventoryManager from './components/artisan/InventoryManager';
import ArtisanAnalytics from './components/artisan/ArtisanAnalytics';
import NotificationsCenter from './components/artisan/NotificationsCenter';
import AggregatorDashboard from './components/aggregator/AggregatorDashboard';
import BuyerDashboard from './components/buyer/BuyerDashboard';
import OnboardingWizard from './components/onboarding/OnboardingWizard';

export default function App() {
  const { user, logout, loading } = useAuth();
  const role = user?.role;
  const isAdmin = role === 'Admin';
  const isArtisan = role === 'Artisan';
  const isAggregator = role === 'Aggregator';
  const isBuyer = role === 'Buyer';

  const getDefaultTab = useCallback(() => {
    if (isAdmin) return 'admin';
    if (isArtisan) return 'artisan-dashboard';
    if (isAggregator) return 'aggregator-dashboard';
    if (isBuyer) return 'buyer-dashboard';
    return 'marketplace';
  }, [isAdmin, isArtisan, isAggregator, isBuyer]);

  const [activeTab, setActiveTab] = useState(() => getDefaultTab());
  const [adminPanel, setAdminPanel] = useState('verifications');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);

  // Check URL query parameters for QR code direct catalog links (?product=ID)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prodId = params.get('product');
    if (prodId) {
      setSelectedProductId(prodId);
    }
  }, []);

  useEffect(() => {
    if (!loading) setActiveTab(getDefaultTab());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, loading]);

  const navigate = (tab) => {
    setSelectedProduct(null);
    setSelectedProductId(null);
    setActiveTab(tab);
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setSelectedProductId(product.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromProduct = () => {
    setSelectedProduct(null);
    setSelectedProductId(null);
    // Remove query param from URL if present
    if (window.location.search.includes('product=')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  return (
    <>
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setSelectedProduct(null);
          setSelectedProductId(null);
          setActiveTab(tab);
        }}
        adminPanel={adminPanel}
        setAdminPanel={setAdminPanel}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenOnboarding={() => setShowOnboarding(true)}
        user={user}
        role={role}
        onLogout={logout}
      />

      <main className="main-layout">
        {/* DEDICATED SEPARATE PRODUCT PAGE */}
        {(selectedProduct || selectedProductId) ? (
          <ProductPage
            productId={selectedProductId || selectedProduct?.id}
            initialProduct={selectedProduct}
            onBack={handleBackFromProduct}
          />
        ) : (
          <>
            {/* ADMIN */}
            {isAdmin && activeTab === 'admin' && (
              <AdminDashboard activePanel={adminPanel} setActivePanel={setAdminPanel} />
            )}

            {/* ARTISAN */}
            {isArtisan && activeTab === 'artisan-dashboard' && <ArtisanDashboard onNavigate={navigate} />}
            {isArtisan && activeTab === 'studio' && <StudioWorkspace onProductCreated={() => navigate('inventory')} />}
            {isArtisan && activeTab === 'inventory' && <InventoryManager />}
            {isArtisan && activeTab === 'analytics' && <ArtisanAnalytics />}
            {isArtisan && activeTab === 'profile' && <ArtisanProfile />}
            {isArtisan && activeTab === 'notifications' && <NotificationsCenter />}
            {isArtisan && activeTab === 'marketplace' && <Marketplace onSelectProduct={handleSelectProduct} />}
            {isArtisan && activeTab === 'inquiries' && <NotificationsCenter filterType="Inquiry" />}

            {/* AGGREGATOR */}
            {isAggregator && activeTab === 'aggregator-dashboard' && <AggregatorDashboard />}
            {isAggregator && activeTab === 'marketplace' && <Marketplace onSelectProduct={handleSelectProduct} />}

            {/* BUYER */}
            {isBuyer && activeTab === 'buyer-dashboard' && <BuyerDashboard />}
            {isBuyer && activeTab === 'marketplace' && <Marketplace onSelectProduct={handleSelectProduct} />}

            {/* UNAUTHENTICATED */}
            {!loading && !user && <Marketplace onSelectProduct={handleSelectProduct} />}

            {/* ADMIN ACCESS DENIED */}
            {activeTab === 'admin' && !isAdmin && (
              <div className="container" style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '14px' }}>🛡️</div>
                <h3>MoSJE Administrative Access Required</h3>
                <button className="btn btn-primary btn-md" onClick={() => setIsAuthOpen(true)}>Sign In as Administrator</button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      {showOnboarding && <OnboardingWizard onComplete={() => setShowOnboarding(false)} onClose={() => setShowOnboarding(false)} />}
    </>
  );
}
