import React, { useState } from 'react';
import {
  ShoppingBag,
  Search,
  User,
  ShieldAlert,
  Headphones,
  ExternalLink,
  Menu,
  X,
  Sparkles,
  PackageCheck,
} from 'lucide-react';
import { ShopSettings, UserSession } from '../../types/index.ts';

interface HeaderProps {
  shop: ShopSettings;
  user: UserSession | null;
  userType?: 'admin' | 'customer';
  onNavigate: (route: string) => void;
  currentRoute: string;
  onOpenSearch: () => void;
  onOpenTrackOrder?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  shop,
  user,
  userType,
  onNavigate,
  currentRoute,
  onOpenSearch,
  onOpenTrackOrder,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      {/* Announcement Bar if active */}
      {shop.announcementActive && shop.announcementText && (
        <div className="bg-gradient-to-r from-red-950 via-zinc-900 to-red-950 border-b border-red-900/30 px-4 py-1.5 text-center text-xs font-medium text-red-200">
          <div className="flex items-center justify-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span>{shop.announcementText}</span>
          </div>
        </div>
      )}

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => onNavigate('/')}
            className="flex items-center gap-3 group text-left cursor-pointer transition-opacity hover:opacity-90"
            id="btn-brand-home"
          >
            <img
              src={shop.logoUrl || '/logo/reachmarket.svg'}
              alt={shop.shopName || 'ReachMarket'}
              className="h-9 w-auto max-w-[200px] object-contain"
            />
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onNavigate('/products')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentRoute === '/products' || currentRoute === '/'
                  ? 'bg-zinc-800/80 text-white border border-zinc-700/50'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }`}
            >
              Products
            </button>
            {onOpenTrackOrder && (
              <button
                onClick={onOpenTrackOrder}
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <PackageCheck className="h-4 w-4 text-red-400" />
                <span>Track Order</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('/support')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentRoute === '/support'
                  ? 'bg-zinc-800/80 text-white border border-zinc-700/50'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }`}
            >
              Support & FAQ
            </button>
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Search */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all cursor-pointer"
            id="btn-search-trigger"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search products...</span>
            <kbd className="hidden sm:inline px-1.5 py-0.5 text-[10px] bg-zinc-800 text-zinc-400 rounded">⌘K</kbd>
          </button>

          {/* Track order mobile button if compact */}
          {onOpenTrackOrder && (
            <button
              onClick={onOpenTrackOrder}
              className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300"
              title="Track Order"
            >
              <PackageCheck className="h-3.5 w-3.5 text-red-400" />
              <span>Track</span>
            </button>
          )}

          {/* Discord Help Badge */}
          <a
            href={shop.discordInviteUrl || 'https://discord.gg/reachmarket'}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5865F2]/10 border border-[#5865F2]/30 text-xs font-medium text-[#7983F5] hover:bg-[#5865F2]/20 transition-all"
            title={`Discord Support: @${shop.supportDiscordUsername || '4gfi'}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>Discord: <strong>{shop.supportDiscordUsername || '4gfi'}</strong></span>
          </a>

          {/* User Account / Admin Switch */}
          {user ? (
            <div className="flex items-center gap-2">
              {userType === 'admin' ? (
                <button
                  onClick={() => onNavigate('/admin')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-500/40 text-xs font-semibold text-red-300 hover:bg-red-600/30 transition-all cursor-pointer"
                  id="btn-nav-admin"
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                  <span>Admin Panel</span>
                </button>
              ) : (
                <button
                  onClick={() => onNavigate('/account')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-200 hover:border-zinc-700 transition-all cursor-pointer"
                  id="btn-nav-account"
                >
                  <User className="h-3.5 w-3.5 text-red-400" />
                  <span>{user.username || 'My Account'}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onNavigate('/auth/login')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer"
                id="btn-nav-login"
              >
                Sign In
              </button>
              <button
                onClick={() => onNavigate('/admin/login')}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-all cursor-pointer"
                id="btn-nav-admin-portal"
              >
                Staff
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-zinc-800 bg-zinc-950 px-4 py-3 space-y-2">
          <button
            onClick={() => {
              onNavigate('/products');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-zinc-200 hover:bg-zinc-900 font-medium"
          >
            All Products
          </button>
          {onOpenTrackOrder && (
            <button
              onClick={() => {
                onOpenTrackOrder();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-zinc-900 font-medium flex items-center gap-2"
            >
              <PackageCheck className="h-4 w-4" />
              <span>Track / Recover Order</span>
            </button>
          )}
          <button
            onClick={() => {
              onNavigate('/support');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-zinc-200 hover:bg-zinc-900 font-medium"
          >
            Support & Discord ({shop.supportDiscordUsername || '4gfi'})
          </button>
          <button
            onClick={() => {
              onNavigate('/admin/login');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-950/30 font-medium"
          >
            Admin Dashboard
          </button>
        </div>
      )}
    </header>
  );
};
