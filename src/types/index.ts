export interface ShopSettings {
  shopName: string;
  shopDescription?: string;
  logoUrl?: string;
  bannerUrl?: string;
  darkLogoUrl?: string;
  faviconUrl?: string;
  supportDiscordUsername?: string;
  discordInviteUrl?: string;
  currency?: string;
  ltcToUsdRate?: number;
  ltcRateUsd?: number;
  merchantLtcAddress?: string;
  blockcypherToken?: string;
  apironeAccount?: string;
  apironeTransferKey?: string;
  apironeSecretKey?: string;
  rateLimitEnabled?: boolean;
  announcementText?: string;
  announcementActive?: boolean;
  installationComplete?: boolean;
}

export interface ThemeSettings {
  activePreset: 'obsidian-red' | 'midnight-emerald' | 'cyber-violet' | 'crimson-monochrome' | 'deep-amber' | string;
  primaryColor: string;
  accentColor: string;
  surfaceColor: string;
  backgroundColor: string;
  textColor?: string;
  mutedColor?: string;
  borderColor?: string;
  radius?: number;
  enableCustomCursor: boolean;
  customCss?: string;
}

export interface AuthConfig {
  emailPasswordEnabled: boolean;
  googleEnabled: boolean;
  googleClientId?: string;
  googleRedirectUri?: string;
  discordEnabled: boolean;
  discordClientId?: string;
  discordRedirectUri?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  displayOrder?: number;
  active?: boolean;
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
  content: string;
  status: 'available' | 'reserved' | 'delivered' | 'void';
  orderId?: string;
  createdAt: string;
  deliveredAt?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
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
  deliveredItems: string[];
  customFieldValues?: Record<string, string>;
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
  expiresAt: number;
  createdAt: number;
  confirmedAt?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
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

export interface UserSession {
  id: string;
  username: string;
  email: string;
  role?: 'admin' | 'customer' | string;
  roleId?: string;
  roleName?: string;
  permissions?: string[];
  balanceLtc?: number;
  balanceUsd?: number;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  order: number;
  active: boolean;
}

export interface SupportTicketMessage {
  id: string;
  sender?: 'customer' | 'admin' | 'staff' | string;
  senderRole?: 'customer' | 'admin' | 'staff' | string;
  senderName: string;
  content?: string;
  message?: string;
  timestamp?: string;
  createdAt?: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerEmail: string;
  orderNumber?: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  messages: SupportTicketMessage[];
  createdAt: string;
  updatedAt: string;
}

