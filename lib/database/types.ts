export interface ShopSettings {
  id: string;
  shopName: string;
  shopDescription: string;
  logoUrl: string;
  darkLogoUrl: string;
  faviconUrl: string;
  supportDiscordUsername: string; // e.g. "4gfi"
  discordInviteUrl: string;
  currency: string; // "USD"
  ltcToUsdRate: number;
  merchantLtcAddress?: string; // Official receiving LTC address
  blockcypherToken?: string;
  installationComplete: boolean;
  setupDate: string | null;
  announcementText?: string;
  announcementActive?: boolean;
}

export interface ThemeSettings {
  id: string;
  activePreset: 'obsidian-red' | 'midnight-emerald' | 'cyber-violet' | 'crimson-monochrome' | 'deep-amber';
  primaryColor: string; // e.g. "#EF4444"
  accentColor: string; // e.g. "#DC2626"
  surfaceColor: string; // e.g. "#18181B"
  backgroundColor: string; // e.g. "#09090B"
  textColor: string; // e.g. "#F4F4F5"
  mutedColor: string; // e.g. "#A1A1AA"
  borderColor: string; // e.g. "#27272A"
  radius: number; // e.g. 12
  enableCustomCursor: boolean;
  customCss?: string;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  roleId: string;
  roleName: string;
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // e.g. ["all"] or ["products.manage", "orders.view", ...]
  isSystem?: boolean;
}

export interface CustomerUser {
  id: string;
  username: string;
  email: string;
  passwordHash?: string;
  avatarUrl?: string;
  oauthProvider?: 'google' | 'discord' | 'email';
  oauthId?: string;
  oauthProviderId?: string;
  balanceLtc: number;
  balanceUsd: number;
  createdAt: string;
}

export interface AuthConfig {
  emailPasswordEnabled: boolean;
  googleEnabled: boolean;
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
  discordEnabled: boolean;
  discordClientId: string;
  discordClientSecret: string;
  discordRedirectUri: string;
}

export interface BlockCypherConfig {
  merchantAddress: string; // e.g. "LfSfvBVJTWeZFzXcNz6GED67k9hBj8jfcF"
  apiToken?: string;
  currency: 'ltc';
  confirmationThreshold: number; // 0 or 1
  isConnected: boolean;
  connectionMessage?: string;
  lastTestedAt?: string;
}

export interface ApironeConfig {
  walletId: string;
  transferKey: string; // Keep server-side only
  currency: 'ltc';
  confirmationThreshold: number; // default 1
  testMode: boolean;
  lastTestedAt?: string;
  isConnected: boolean;
  connectionMessage?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  displayOrder: number;
  active: boolean;
  productCount?: number;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  priceUsd: number;
  priceLtc: number;
  categoryId: string;
  categoryName?: string;
  images: string[];
  deliveryType: 'automatic' | 'manual' | 'downloadable';
  downloadUrl?: string;
  minQuantity: number;
  maxQuantity: number;
  tags: string[];
  featured: boolean;
  active: boolean;
  unlisted: boolean;
  instructions: string;
  warrantyPeriod?: string;
  customFields?: { id: string; label: string; placeholder: string; required: boolean }[];
  stockCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockItem {
  id: string;
  productId: string;
  content: string; // The license key, account details (user:pass), serial, or token
  status: 'available' | 'reserved' | 'delivered' | 'void';
  orderId?: string;
  reservationExpiresAt?: string;
  createdAt: string;
  deliveredAt?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "RM-94821"
  customerEmail: string;
  customerUserId?: string;
  productId: string;
  productTitle: string;
  quantity: number;
  unitPriceUsd: number;
  totalUsd: number;
  totalLtc: number;
  currency: 'LTC';
  status: 'pending' | 'processing' | 'completed' | 'expired' | 'refunded' | 'cancelled';
  paymentId: string;
  paymentAddress: string;
  deliveredItems: string[]; // Decrypted / plain serials for order view
  customFieldValues?: Record<string, string>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  provider: 'blockcypher' | 'apirone';
  currency: 'ltc';
  address: string;
  amountExpectedLtc: number;
  amountPaidLtc: number;
  amountExpectedUsd: number;
  status: 'unpaid' | 'partially_paid' | 'unconfirmed' | 'confirmed' | 'overpaid' | 'expired';
  confirmations: number;
  requiredConfirmations: number;
  txid?: string;
  qrCodeDataUrl?: string;
  expiresAt: number; // Unix ms
  createdAt: number;
  confirmedAt?: number;
  callbackReceivedAt?: number;
  rawPayload?: any;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. "INV-2026-0041"
  orderId: string;
  customerEmail: string;
  items: {
    title: string;
    quantity: number;
    unitPriceUsd: number;
    totalUsd: number;
  }[];
  subtotalUsd: number;
  discountUsd: number;
  taxUsd: number;
  totalUsd: number;
  totalLtc: number;
  paymentMethod: string;
  paymentAddress: string;
  txid?: string;
  status: 'paid' | 'pending' | 'cancelled' | 'refunded';
  paidAt?: string;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  type: 'sale' | 'deposit' | 'payout' | 'refund' | 'fee';
  amountUsd: number;
  amountLtc: number;
  balanceAfterLtc: number;
  referenceId: string;
  description: string;
  createdAt: string;
}

export interface Payout {
  id: string;
  adminId: string;
  adminUsername: string;
  address: string;
  amountLtc: number;
  amountUsd: number;
  feeLtc: number;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  txid?: string;
  notes?: string;
  createdAt: string;
  processedAt?: string;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[]; // e.g. ["order.created", "order.completed", "stock.low", "stock.restocked"]
  active: boolean;
  createdAt: string;
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  webhookName: string;
  event: string;
  url: string;
  payload: any;
  responseStatus: number;
  responseBody: string;
  durationMs: number;
  success: boolean;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  actorType: 'admin' | 'system' | 'customer';
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: any;
  ipAddress?: string;
  timestamp: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  order: number;
  active: boolean;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerEmail: string;
  orderNumber?: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  messages: {
    id: string;
    sender: 'customer' | 'admin';
    senderName: string;
    content: string;
    timestamp: string;
  }[];
  createdAt: string;
  updatedAt: string;
}
