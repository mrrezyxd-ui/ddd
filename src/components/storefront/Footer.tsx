import React from 'react';
import { ShieldCheck, Zap, Lock, MessageSquare, ExternalLink } from 'lucide-react';
import { ShopSettings } from '../../types/index.ts';

interface FooterProps {
  shop: ShopSettings;
  onNavigate: (route: string) => void;
  onAdminClick?: () => void;
  onOpenTrackOrder?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ shop, onNavigate, onAdminClick, onOpenTrackOrder }) => {
  return (
    <footer className="mt-24 border-t border-zinc-800 bg-zinc-950/90 text-zinc-400">
      {/* Features Bar */}
      <div className="border-b border-zinc-800/80">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-100">Instant Delivery</h4>
                <p className="text-xs text-zinc-500">Auto key fulfillment after 1 LTC block</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-100">Apirone Gateway</h4>
                <p className="text-xs text-zinc-500">Encrypted decentralized Litecoin payments</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-100">Verified Stock</h4>
                <p className="text-xs text-zinc-500">100% genuine keys with warranty</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/20 text-[#7983F5]">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-100">Discord Support</h4>
                <p className="text-xs text-zinc-500">Staff handle: @{shop.supportDiscordUsername || '4gfi'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={shop.logoUrl || '/logo/reachmarket.svg'}
                alt="ReachMarket"
                className="h-8 w-auto"
              />
            </div>
            <p className="text-sm text-zinc-400 max-w-sm">
              {shop.shopDescription || 'ReachMarket is a self-hosted digital marketplace featuring automated Litecoin transactions and instant digital license delivery.'}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <a
                href={shop.discordInviteUrl || 'https://discord.gg/reachmarket'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#5865F2]/15 border border-[#5865F2]/30 text-xs font-semibold text-[#8e97f5] hover:bg-[#5865F2]/25 transition-all"
              >
                <span>Join Support Discord</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-3">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Marketplace</h5>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => onNavigate('/products')} className="hover:text-red-400 transition-colors cursor-pointer">
                  All Products
                </button>
              </li>
              {onOpenTrackOrder && (
                <li>
                  <button onClick={onOpenTrackOrder} className="text-red-400 hover:text-red-300 font-semibold transition-colors cursor-pointer">
                    Track / Recover Order
                  </button>
                </li>
              )}
              <li>
                <button onClick={() => onNavigate('/support')} className="hover:text-red-400 transition-colors cursor-pointer">
                  Frequently Asked Questions
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/account')} className="hover:text-red-400 transition-colors cursor-pointer">
                  Customer Portal
                </button>
              </li>
            </ul>
          </div>

          {/* Security & Admin */}
          <div className="md:col-span-4 space-y-3">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Merchant & Operations</h5>
            <p className="text-xs text-zinc-500">
              Powered by ReachMarket Enterprise with atomic stock reservation and zero-leak delivery.
            </p>
            <div className="pt-2">
              <button
                onClick={onAdminClick || (() => onNavigate('/admin/login'))}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
              >
                Staff Admin Portal &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-800/80 pt-8 sm:flex-row text-xs text-zinc-500">
          <p>&copy; {new Date().getFullYear()} {shop.shopName || 'ReachMarket'}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Official Discord: @{shop.supportDiscordUsername || '4gfi'}</span>
            <span>&bull;</span>
            <span className="text-zinc-400">Litecoin / Apirone</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
