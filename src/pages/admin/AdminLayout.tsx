import React, { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Layers,
  Tag,
  ShoppingBag,
  FileText,
  Wallet,
  Webhook,
  Palette,
  Settings,
  Users,
  Shield,
  LifeBuoy,
  FileCode,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { ShopSettings, UserSession } from '../../types/index.ts';

interface AdminLayoutProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  shop: ShopSettings;
  user: UserSession;
  onLogout: () => void;
  onGoToStore: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeTab,
  onTabChange,
  shop,
  user,
  onLogout,
  onGoToStore,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'stock', label: 'Stock Manager', icon: Layers },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'wallet', label: 'Wallet & Payouts', icon: Wallet },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
    { id: 'themes', label: 'Themes & Styles', icon: Palette },
    { id: 'tickets', label: 'Support Tickets', icon: LifeBuoy },
    { id: 'staff', label: 'Staff & Roles', icon: Users },
    { id: 'audit', label: 'Audit Logs', icon: FileCode },
    { id: 'settings', label: 'Store Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-3">
        <img
          src={shop.logoUrl || '/logo/reachmarket.svg'}
          alt="ReachMarket"
          className="h-7 w-auto"
        />
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-zinc-400 hover:text-white"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Admin Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-zinc-800 bg-zinc-900/95 backdrop-blur-md transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col justify-between`}
      >
        <div>
          {/* Logo Bar */}
          <div className="flex h-16 items-center justify-between border-b border-zinc-800 px-6">
            <img
              src={shop.logoUrl || '/logo/reachmarket.svg'}
              alt="ReachMarket"
              className="h-8 w-auto"
            />
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400">
              Admin
            </span>
          </div>

          {/* Nav List */}
          <div className="px-3 py-4 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)] scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* User & Store Quick Link Footer */}
        <div className="border-t border-zinc-800 p-4 space-y-3 bg-zinc-950/40">
          <button
            onClick={onGoToStore}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open Storefront</span>
          </button>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-red-400 text-xs font-bold">
                {(user?.username?.[0] || 'A').toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-zinc-200 truncate">{user?.username || 'Admin'}</p>
                <p className="text-[10px] text-zinc-500 truncate">{user?.roleName || 'Admin'}</p>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Admin Content View */}
      <main className="flex-1 overflow-x-hidden min-h-screen">
        <div className="p-4 sm:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
};
