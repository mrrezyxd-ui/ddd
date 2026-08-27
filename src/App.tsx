import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './components/theme/ThemeProvider.tsx';
import { Header } from './components/storefront/Header.tsx';
import { Footer } from './components/storefront/Footer.tsx';

// Storefront Pages
import { SetupWizard } from './pages/setup/SetupWizard.tsx';
import { ProductsPage } from './pages/storefront/ProductsPage.tsx';
import { ProductDetailPage } from './pages/storefront/ProductDetailPage.tsx';
import { PaymentPage } from './pages/storefront/PaymentPage.tsx';
import { InvoicePage } from './pages/storefront/InvoicePage.tsx';
import { SupportPage } from './pages/storefront/SupportPage.tsx';
import { AccountPage } from './pages/storefront/AccountPage.tsx';
import { AuthPages } from './pages/storefront/AuthPages.tsx';
import { CheckoutModal } from './pages/storefront/CheckoutModal.tsx';
import { TrackOrderModal } from './components/storefront/TrackOrderModal.tsx';

// Admin Suite
import { AdminLogin } from './pages/admin/AdminLogin.tsx';
import { AdminLayout } from './pages/admin/AdminLayout.tsx';
import { DashboardView } from './pages/admin/DashboardView.tsx';
import { ProductsManager } from './pages/admin/ProductsManager.tsx';
import { StockManager } from './pages/admin/StockManager.tsx';
import { CategoriesManager } from './pages/admin/CategoriesManager.tsx';
import { OrdersManager } from './pages/admin/OrdersManager.tsx';
import { InvoicesManager } from './pages/admin/InvoicesManager.tsx';
import { WalletManager } from './pages/admin/WalletManager.tsx';
import { WebhooksManager } from './pages/admin/WebhooksManager.tsx';
import { ThemeEditor } from './pages/admin/ThemeEditor.tsx';
import { SupportManager } from './pages/admin/SupportManager.tsx';
import { StaffManager } from './pages/admin/StaffManager.tsx';
import { AuditLogsManager } from './pages/admin/AuditLogsManager.tsx';
import { SettingsManager } from './pages/admin/SettingsManager.tsx';

import { api } from './lib/api.ts';
import { ShopSettings, ThemeSettings, UserSession, Product, Category } from './types/index.ts';
import { Loader2 } from 'lucide-react';

export function App() {
  // App initialization state
  const [initLoading, setInitLoading] = useState(true);
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [theme, setTheme] = useState<ThemeSettings | null>(null);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  // Navigation Routing Normalizer & State
  const normalizeRoute = (rawRoute: string, rawParam: string | null = null): { route: string; param: string | null } => {
    const clean = (rawRoute || '').replace(/^#?\/?/, '').trim();
    const parts = clean.split('/').filter(Boolean);
    const primary = (parts[0] || 'products').toLowerCase();
    const secondary = parts.slice(1).join('/') || rawParam;

    if (primary === 'auth_login' || primary === 'login' || (primary === 'auth' && (!secondary || secondary === 'login'))) {
      return { route: 'auth_login', param: null };
    }
    if (primary === 'auth_register' || primary === 'register' || (primary === 'auth' && secondary === 'register')) {
      return { route: 'auth_register', param: null };
    }
    if (primary === 'admin_login' || (primary === 'admin' && secondary === 'login')) {
      return { route: 'admin_login', param: null };
    }
    if (primary === 'admin') {
      return { route: 'admin', param: secondary || null };
    }
    if (primary === 'product' || primary === 'product_detail' || primary === 'products_detail') {
      return { route: 'product_detail', param: secondary || null };
    }
    if (primary === 'payment' || primary === 'checkout') {
      return { route: 'payment', param: secondary || null };
    }
    if (primary === 'invoice' || primary === 'receipt') {
      return { route: 'invoice', param: secondary || null };
    }
    if (primary === 'account' || primary === 'dashboard' || primary === 'profile') {
      return { route: 'account', param: null };
    }
    if (primary === 'support' || primary === 'faq' || primary === 'help') {
      return { route: 'support', param: null };
    }
    if (primary === 'setup' || primary === 'install' || primary === 'wizard') {
      return { route: 'setup', param: null };
    }

    return { route: 'products', param: null };
  };

  const parseLocationRoute = () => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (hash) {
      return normalizeRoute(hash);
    }
    const path = window.location.pathname.replace(/^\//, '');
    if (path) {
      return normalizeRoute(path);
    }
    return { route: 'products', param: null };
  };

  const initialParsed = parseLocationRoute();
  const [currentRoute, setCurrentRoute] = useState<string>(initialParsed.route);
  const [routeParam, setRouteParam] = useState<string | null>(initialParsed.param);
  const [adminTab, setAdminTab] = useState<string>('dashboard');

  // Checkout modal & Track Order modal
  interface CheckoutPayload {
    product: Product;
    quantity?: number;
    customFields?: Record<string, string>;
  }
  const [checkoutData, setCheckoutData] = useState<CheckoutPayload | null>(null);
  const [trackModalOpen, setTrackModalOpen] = useState(false);

  // Load Initial Store Data & Session
  const initApp = async () => {
    try {
      // Check if URL has token query param
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      const oauthCode = urlParams.get('code');

      if (urlToken) {
        localStorage.setItem('rm_token', urlToken);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (oauthCode) {
        try {
          const redirectUri = window.location.hostname === 'localhost'
            ? 'http://localhost/callback'
            : `${window.location.origin}/callback`;
          const exchangeRes = await api.exchangeDiscordCode(oauthCode, redirectUri);
          if (exchangeRes.token) {
            localStorage.setItem('rm_token', exchangeRes.token);
            window.history.replaceState({}, document.title, '/');
          }
        } catch (exErr) {
          console.error('Client OAuth exchange error:', exErr);
        }
      }

      const storefront = await api.getStorefront();
      setShop(storefront.shop);
      setTheme(storefront.theme);

      // Check current session token if any
      const token = localStorage.getItem('rm_token');
      if (token) {
        try {
          const authRes = await api.getCurrentUser();
          if (authRes.user) {
            setCurrentUser(authRes.user);
          }
        } catch {
          localStorage.removeItem('rm_token');
        }
      }
    } catch (err) {
      console.error('Initialization error:', err);
    } finally {
      setInitLoading(false);
    }
  };

  useEffect(() => {
    initApp();

    const onHashChange = () => {
      const parsed = parseLocationRoute();
      setCurrentRoute(parsed.route);
      setRouteParam(parsed.param);
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Handle URL hash changes or routing triggers
  const navigate = (route: string, param: string | null = null) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const normalized = normalizeRoute(route, param);
    setCurrentRoute(normalized.route);
    setRouteParam(normalized.param);

    if (normalized.route === 'products') {
      window.location.hash = '';
    } else if (normalized.param) {
      window.location.hash = `${normalized.route}/${normalized.param}`;
    } else {
      window.location.hash = normalized.route;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('rm_token');
    api.logout().catch(() => {});
    setCurrentUser(null);
    navigate('products');
  };

  const handleAuthSuccess = (user: UserSession, token: string) => {
    setCurrentUser(user);
    if (user.role === 'admin' || user.roleName === 'Super Admin' || user.permissions?.includes('*')) {
      navigate('admin');
    } else {
      navigate('account');
    }
  };

  if (initLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-4">
        <img
          src="/logo/reachmarket.svg"
          alt="ReachMarket"
          className="h-10 w-auto animate-pulse"
        />
        <Loader2 className="h-6 w-6 animate-spin text-red-500" />
      </div>
    );
  }

  // First-run setup check: If shop is not installed, render SetupWizard
  if (shop && !shop.installationComplete) {
    return (
      <SetupWizard
        onComplete={() => {
          initApp();
          navigate('products');
        }}
      />
    );
  }

  const defaultTheme: ThemeSettings = theme || {
    activePreset: 'obsidian_red',
    primaryColor: '#ef4444',
    accentColor: '#dc2626',
    surfaceColor: '#18181b',
    backgroundColor: '#09090b',
    enableCustomCursor: false,
  };

  const defaultShop: ShopSettings = shop || {
    shopName: 'ReachMarket',
    logoUrl: '/logo/reachmarket.svg',
    supportDiscordUsername: '4gfi',
    installationComplete: true,
    ltcRateUsd: 110,
  };

  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.roleName === 'Super Admin' || currentUser.permissions?.includes('*'));

  // Render Admin View
  if (currentRoute === 'admin') {
    if (!isAdmin) {
      return (
        <AdminLogin
          onSuccess={handleAuthSuccess}
          onBackToStore={() => navigate('products')}
        />
      );
    }

    return (
      <ThemeProvider initialTheme={defaultTheme}>
        <AdminLayout
          activeTab={adminTab}
          onTabChange={setAdminTab}
          shop={defaultShop}
          user={currentUser!}
          onLogout={handleLogout}
          onGoToStore={() => navigate('products')}
        >
          {adminTab === 'dashboard' && <DashboardView onNavigateTab={setAdminTab} />}
          {adminTab === 'products' && <ProductsManager />}
          {adminTab === 'stock' && <StockManager />}
          {adminTab === 'categories' && <CategoriesManager />}
          {adminTab === 'orders' && <OrdersManager />}
          {adminTab === 'invoices' && (
            <InvoicesManager onViewInvoice={(invId) => navigate('invoice', invId)} />
          )}
          {adminTab === 'wallet' && <WalletManager />}
          {adminTab === 'webhooks' && <WebhooksManager />}
          {adminTab === 'themes' && <ThemeEditor />}
          {adminTab === 'tickets' && <SupportManager />}
          {adminTab === 'staff' && <StaffManager />}
          {adminTab === 'audit' && <AuditLogsManager />}
          {adminTab === 'settings' && <SettingsManager onShopUpdate={setShop} />}
        </AdminLayout>
      </ThemeProvider>
    );
  }

  // Render Admin Login standalone route
  if (currentRoute === 'admin_login') {
    if (isAdmin) {
      navigate('admin');
      return null;
    }
    return (
      <AdminLogin
        onSuccess={handleAuthSuccess}
        onBackToStore={() => navigate('products')}
      />
    );
  }

  // Render Customer Auth routes
  if (currentRoute === 'auth_login' || currentRoute === 'auth_register') {
    return (
      <ThemeProvider initialTheme={defaultTheme}>
        <AuthPages
          mode={currentRoute === 'auth_register' ? 'register' : 'login'}
          shop={defaultShop}
          onSuccess={handleAuthSuccess}
          onSwitchMode={(mode) => navigate(mode === 'register' ? 'auth_register' : 'auth_login')}
        />
      </ThemeProvider>
    );
  }

  // Render Official Invoice View
  if (currentRoute === 'invoice' && routeParam) {
    return (
      <ThemeProvider initialTheme={defaultTheme}>
        <InvoicePage invoiceId={routeParam} onBack={() => navigate('products')} />
      </ThemeProvider>
    );
  }

  // Render Litecoin Payment Page
  if (currentRoute === 'payment' && routeParam) {
    return (
      <ThemeProvider initialTheme={defaultTheme}>
        <PaymentPage
          orderId={routeParam}
          shop={defaultShop}
          onPaymentSuccess={() => {}}
          onBack={() => navigate('products')}
          onGoHome={() => navigate('products')}
          onViewInvoice={(invoiceId) => navigate('invoice', invoiceId)}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider initialTheme={defaultTheme}>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-red-500 selection:text-white">
        {/* Header */}
        <Header
          shop={defaultShop}
          user={currentUser}
          userType={isAdmin ? 'admin' : 'customer'}
          currentRoute={`/${currentRoute}`}
          onNavigate={navigate}
          onOpenSearch={() => {
            navigate('products');
          }}
          onOpenTrackOrder={() => setTrackModalOpen(true)}
        />

        {/* Main Content View Container */}
        <main className="flex-1">
          {currentRoute === 'products' && (
            <ProductsPage
              shop={defaultShop}
              onSelectProduct={(p) => navigate('product_detail', p.slug || p.id)}
              onBuyProduct={(p) => setCheckoutData({ product: p, quantity: 1 })}
            />
          )}

          {currentRoute === 'product_detail' && routeParam && (
            <ProductDetailPage
              slugOrId={routeParam}
              shop={defaultShop}
              onBack={() => navigate('products')}
              onBuyProduct={(p, qty, fields) => setCheckoutData({ product: p, quantity: qty, customFields: fields })}
            />
          )}

          {currentRoute === 'support' && <SupportPage shop={defaultShop} />}

          {currentRoute === 'account' && (
            currentUser ? (
              <AccountPage
                user={currentUser}
                shop={defaultShop}
                onLogout={handleLogout}
                onViewInvoice={(invoiceId) => navigate('invoice', invoiceId)}
                onViewOrder={(orderId) => navigate('payment', orderId)}
              />
            ) : (
              <AuthPages
                mode="login"
                shop={defaultShop}
                onSuccess={handleAuthSuccess}
                onSwitchMode={(mode) => navigate(mode === 'register' ? 'auth_register' : 'auth_login')}
              />
            )
          )}
        </main>

        {/* Footer */}
        <Footer
          shop={defaultShop}
          onNavigate={navigate}
          onAdminClick={() => navigate('admin')}
          onOpenTrackOrder={() => setTrackModalOpen(true)}
        />

        {/* Track / Recover Order Modal */}
        <TrackOrderModal
          isOpen={trackModalOpen}
          onClose={() => setTrackModalOpen(false)}
          onOpenOrder={(orderId) => {
            setTrackModalOpen(false);
            navigate('payment', orderId);
          }}
        />

        {/* Checkout Modal */}
        {checkoutData && (
          <CheckoutModal
            product={checkoutData.product}
            quantity={checkoutData.quantity || 1}
            customFields={checkoutData.customFields}
            user={currentUser}
            shop={defaultShop}
            onClose={() => setCheckoutData(null)}
            onOrderCreated={(orderId) => {
              setCheckoutData(null);
              navigate('payment', orderId);
            }}
            onCheckoutSuccess={(order) => {
              setCheckoutData(null);
              navigate('payment', order.id);
            }}
          />
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
