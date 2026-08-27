import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  ShopSettings,
  ThemeSettings,
  AdminUser,
  Role,
  CustomerUser,
  AuthConfig,
  BlockCypherConfig,
  ApironeConfig,
  Category,
  Product,
  StockItem,
  Order,
  Payment,
  Invoice,
  LedgerEntry,
  Payout,
  Webhook,
  WebhookLog,
  AuditLog,
  FAQItem,
  SupportTicket,
} from './types.ts';

export interface DatabaseSchema {
  shopSettings: ShopSettings;
  themeSettings: ThemeSettings;
  admins: AdminUser[];
  roles: Role[];
  customers: CustomerUser[];
  authConfig: AuthConfig;
  blockCypherConfig?: BlockCypherConfig;
  apironeConfig: ApironeConfig;
  categories: Category[];
  products: Product[];
  stockItems: StockItem[];
  orders: Order[];
  payments: Payment[];
  invoices: Invoice[];
  ledger: LedgerEntry[];
  payouts: Payout[];
  webhooks: Webhook[];
  webhookLogs: WebhookLog[];
  auditLogs: AuditLog[];
  faqs: FAQItem[];
  supportTickets: SupportTicket[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'reachmarket_db.json');

const DEFAULT_ROLES: Role[] = [
  {
    id: 'role-superadmin',
    name: 'Super Admin',
    description: 'Full access to all marketplace features and settings',
    permissions: ['*'],
    isSystem: true,
  },
  {
    id: 'role-manager',
    name: 'Store Manager',
    description: 'Manage products, stock, orders, and view analytics',
    permissions: ['products.*', 'stock.*', 'orders.*', 'invoices.view', 'categories.*', 'analytics.view'],
    isSystem: true,
  },
  {
    id: 'role-support',
    name: 'Support Agent',
    description: 'View orders and respond to customer support tickets',
    permissions: ['orders.view', 'support.*', 'invoices.view'],
    isSystem: true,
  },
];

const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  id: 'shop-settings-1',
  shopName: 'ReachMarket',
  shopDescription: 'Your premium self-hosted digital marketplace for instant software, keys, and subscriptions.',
  logoUrl: '/logo/reachmarket.svg',
  darkLogoUrl: '/logo/reachmarket-dark.svg',
  faviconUrl: '/logo/favicon.svg',
  supportDiscordUsername: '4gfi',
  discordInviteUrl: 'https://discord.gg/reachmarket',
  currency: 'USD',
  ltcToUsdRate: 110.00,
  installationComplete: false,
  setupDate: null,
  announcementText: '⚡ Instant LTC payments with 1 confirmation delivery. Support on Discord: 4gfi',
  announcementActive: true,
};

const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  id: 'theme-settings-1',
  activePreset: 'obsidian-red',
  primaryColor: '#EF4444',
  accentColor: '#DC2626',
  surfaceColor: '#18181B',
  backgroundColor: '#09090B',
  textColor: '#F4F4F5',
  mutedColor: '#A1A1AA',
  borderColor: '#27272A',
  radius: 12,
  enableCustomCursor: false,
  customCss: '',
};

const DEFAULT_AUTH_CONFIG: AuthConfig = {
  emailPasswordEnabled: true,
  googleEnabled: false,
  googleClientId: '',
  googleClientSecret: '',
  googleRedirectUri: 'http://localhost/callback/google',
  discordEnabled: true,
  discordClientId: '1528299940839821352',
  discordClientSecret: 'HENeH6ggq6-XiJR6un4JaeuEwbmhc1kh',
  discordRedirectUri: 'http://localhost/callback',
};

const DEFAULT_BLOCKCYPHER_CONFIG: BlockCypherConfig = {
  merchantAddress: 'LfSfvBVJTWeZFzXcNz6GED67k9hBj8jfcF',
  apiToken: '',
  currency: 'ltc',
  confirmationThreshold: 1,
  isConnected: true,
  connectionMessage: 'BlockCypher 5-second Litecoin on-chain listener active',
  lastTestedAt: new Date().toISOString(),
};

const DEFAULT_APIRONE_CONFIG: ApironeConfig = {
  walletId: '',
  transferKey: '',
  currency: 'ltc',
  confirmationThreshold: 1,
  testMode: true,
  isConnected: false,
  connectionMessage: 'Awaiting wallet configuration',
};

const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-software',
    name: 'Software & Tools',
    slug: 'software-tools',
    description: 'Premium developer utilities, desktop tools, and productivity suites.',
    icon: 'Terminal',
    displayOrder: 1,
    active: true,
  },
  {
    id: 'cat-subscriptions',
    name: 'Subscriptions & VIP',
    slug: 'subscriptions',
    description: 'Digital service access passes, memberships, and premium tiers.',
    icon: 'Crown',
    displayOrder: 2,
    active: true,
  },
  {
    id: 'cat-keys',
    name: 'License Keys & Serials',
    slug: 'license-keys',
    description: 'Instant 100% authentic activation serials and license codes.',
    icon: 'Key',
    displayOrder: 3,
    active: true,
  },
  {
    id: 'cat-accounts',
    name: 'Accounts & Bundles',
    slug: 'accounts-bundles',
    description: 'Pre-configured cloud environments, dev accounts, and starter bundles.',
    icon: 'ShieldCheck',
    displayOrder: 4,
    active: true,
  },
];

const INITIAL_PRODUCTS: Product[] = [];

const INITIAL_STOCK_ITEMS: StockItem[] = [];

const INITIAL_FAQS: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'How fast is product delivery after paying with Litecoin?',
    answer: 'Delivery is 100% automated. As soon as your Litecoin payment registers the required confirmation (default 1 confirmation) on the blockchain via Apirone, your license keys or download links are instantly revealed on the screen and archived in your customer dashboard.',
    order: 1,
    active: true,
  },
  {
    id: 'faq-2',
    question: 'What happens if I send a partial payment or wrong amount?',
    answer: 'Our payment processor detects partial amounts automatically and updates the pending balance in real-time. Simply send the remaining LTC to the same address before expiry to complete your order.',
    order: 2,
    active: true,
  },
  {
    id: 'faq-3',
    question: 'How do I contact customer support?',
    answer: 'You can open a support ticket directly from our Support page, or contact our head technician on Discord: **4gfi**.',
    order: 3,
    active: true,
  },
  {
    id: 'faq-4',
    question: 'Are replacements provided if a key does not work?',
    answer: 'Yes! All digital items come with our guaranteed warranty period. If any item is invalid, reach out via ticket with your Order Number for an instant replacement.',
    order: 4,
    active: true,
  }
];

class Database {
  private data: DatabaseSchema;
  private isWriting = false;

  constructor() {
    this.ensureDataDir();
    this.data = this.loadDatabase();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadDatabase(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          shopSettings: parsed.shopSettings || DEFAULT_SHOP_SETTINGS,
          themeSettings: parsed.themeSettings || DEFAULT_THEME_SETTINGS,
          admins: parsed.admins || [],
          roles: parsed.roles || DEFAULT_ROLES,
          customers: parsed.customers || [],
          authConfig: parsed.authConfig || DEFAULT_AUTH_CONFIG,
          blockCypherConfig: parsed.blockCypherConfig || DEFAULT_BLOCKCYPHER_CONFIG,
          apironeConfig: parsed.apironeConfig || DEFAULT_APIRONE_CONFIG,
          categories: Array.isArray(parsed.categories) ? parsed.categories : [],
          products: Array.isArray(parsed.products) ? parsed.products : [],
          stockItems: Array.isArray(parsed.stockItems) ? parsed.stockItems : [],
          orders: parsed.orders || [],
          payments: parsed.payments || [],
          invoices: parsed.invoices || [],
          ledger: parsed.ledger || [],
          payouts: parsed.payouts || [],
          webhooks: parsed.webhooks || [],
          webhookLogs: parsed.webhookLogs || [],
          auditLogs: parsed.auditLogs || [],
          faqs: parsed.faqs || INITIAL_FAQS,
          supportTickets: parsed.supportTickets || [],
        };
      } catch (err) {
        console.error('Error parsing database file, creating fresh state:', err);
      }
    }

    const fresh: DatabaseSchema = {
      shopSettings: DEFAULT_SHOP_SETTINGS,
      themeSettings: DEFAULT_THEME_SETTINGS,
      admins: [],
      roles: DEFAULT_ROLES,
      customers: [],
      authConfig: DEFAULT_AUTH_CONFIG,
      blockCypherConfig: DEFAULT_BLOCKCYPHER_CONFIG,
      apironeConfig: DEFAULT_APIRONE_CONFIG,
      categories: INITIAL_CATEGORIES,
      products: INITIAL_PRODUCTS,
      stockItems: INITIAL_STOCK_ITEMS,
      orders: [],
      payments: [],
      invoices: [],
      ledger: [],
      payouts: [],
      webhooks: [],
      webhookLogs: [],
      auditLogs: [],
      faqs: INITIAL_FAQS,
      supportTickets: [],
    };
    this.saveDatabase(fresh);
    return fresh;
  }

  public save(): void {
    this.saveDatabase(this.data);
  }

  private saveDatabase(data: DatabaseSchema): void {
    try {
      this.ensureDataDir();
      const tmpPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpPath, DB_FILE);
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  public getRaw(): DatabaseSchema {
    return this.data;
  }

  // Shop Settings
  public getShopSettings(): ShopSettings {
    return this.data.shopSettings;
  }

  public updateShopSettings(updates: Partial<ShopSettings>): ShopSettings {
    this.data.shopSettings = { ...this.data.shopSettings, ...updates };
    this.save();
    return this.data.shopSettings;
  }

  // Theme Settings
  public getThemeSettings(): ThemeSettings {
    return this.data.themeSettings;
  }

  public updateThemeSettings(updates: Partial<ThemeSettings>): ThemeSettings {
    this.data.themeSettings = { ...this.data.themeSettings, ...updates };
    this.save();
    return this.data.themeSettings;
  }

  // Auth Config
  public getAuthConfig(): AuthConfig {
    return this.data.authConfig;
  }

  public updateAuthConfig(updates: Partial<AuthConfig>): AuthConfig {
    this.data.authConfig = { ...this.data.authConfig, ...updates };
    this.save();
    return this.data.authConfig;
  }

  // BlockCypher Config
  public getBlockCypherConfig(): BlockCypherConfig {
    return (
      this.data.blockCypherConfig || {
        merchantAddress:
          (this.data.shopSettings as any).merchantLtcAddress ||
          (this.data.shopSettings as any).ltcAddress ||
          'LfSfvBVJTWeZFzXcNz6GED67k9hBj8jfcF',
        apiToken: (this.data.shopSettings as any).blockcypherToken || '',
        currency: 'ltc',
        confirmationThreshold: 1,
        isConnected: true,
        connectionMessage: 'BlockCypher 5-second Litecoin on-chain listener active',
        lastTestedAt: new Date().toISOString(),
      }
    );
  }

  public updateBlockCypherConfig(updates: Partial<BlockCypherConfig>): BlockCypherConfig {
    this.data.blockCypherConfig = { ...this.getBlockCypherConfig(), ...updates };
    if (updates.merchantAddress) {
      this.data.shopSettings.merchantLtcAddress = updates.merchantAddress;
    }
    if (updates.apiToken !== undefined) {
      this.data.shopSettings.blockcypherToken = updates.apiToken;
    }
    this.save();
    return this.data.blockCypherConfig;
  }

  // Apirone Config
  public getApironeConfig(): ApironeConfig {
    return this.data.apironeConfig;
  }

  public updateApironeConfig(updates: Partial<ApironeConfig>): ApironeConfig {
    this.data.apironeConfig = { ...this.data.apironeConfig, ...updates };
    this.save();
    return this.data.apironeConfig;
  }

  // Admins
  public getAdmins(): AdminUser[] {
    return this.data.admins;
  }

  public getAdminById(id: string): AdminUser | undefined {
    return this.data.admins.find((a) => a.id === id);
  }

  public getAdminByUsernameOrEmail(identifier: string): AdminUser | undefined {
    const lower = identifier.toLowerCase().trim();
    return this.data.admins.find(
      (a) => a.username.toLowerCase() === lower || a.email.toLowerCase() === lower
    );
  }

  public createAdmin(admin: AdminUser): AdminUser {
    this.data.admins.push(admin);
    this.save();
    return admin;
  }

  public updateAdmin(id: string, updates: Partial<AdminUser>): AdminUser | null {
    const idx = this.data.admins.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    this.data.admins[idx] = { ...this.data.admins[idx], ...updates };
    this.save();
    return this.data.admins[idx];
  }

  public deleteAdmin(id: string): boolean {
    const initialLen = this.data.admins.length;
    this.data.admins = this.data.admins.filter((a) => a.id !== id);
    if (this.data.admins.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Roles
  public getRoles(): Role[] {
    return this.data.roles;
  }

  public getRoleById(id: string): Role | undefined {
    return this.data.roles.find((r) => r.id === id);
  }

  public createRole(role: Role): Role {
    this.data.roles.push(role);
    this.save();
    return role;
  }

  public updateRole(id: string, updates: Partial<Role>): Role | null {
    const idx = this.data.roles.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    this.data.roles[idx] = { ...this.data.roles[idx], ...updates };
    this.save();
    return this.data.roles[idx];
  }

  public deleteRole(id: string): boolean {
    const role = this.getRoleById(id);
    if (role?.isSystem) return false;
    this.data.roles = this.data.roles.filter((r) => r.id !== id);
    this.save();
    return true;
  }

  // Categories
  public getCategories(): Category[] {
    return this.data.categories.map((c) => ({
      ...c,
      productCount: this.data.products.filter((p) => p.categoryId === c.id && p.active).length,
    }));
  }

  public getCategoryByIdOrSlug(idOrSlug: string): Category | undefined {
    return this.data.categories.find((c) => c.id === idOrSlug || c.slug === idOrSlug);
  }

  public createCategory(cat: Category): Category {
    this.data.categories.push(cat);
    this.save();
    return cat;
  }

  public updateCategory(id: string, updates: Partial<Category>): Category | null {
    const idx = this.data.categories.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.data.categories[idx] = { ...this.data.categories[idx], ...updates };
    this.save();
    return this.data.categories[idx];
  }

  public deleteCategory(idOrSlug: string): boolean {
    const target = this.data.categories.find((c) => c.id === idOrSlug || c.slug === idOrSlug);
    const targetId = target ? target.id : idOrSlug;

    this.data.categories = this.data.categories.filter((c) => c.id !== targetId && c.slug !== idOrSlug);
    
    // Unlink any products assigned to this deleted category
    this.data.products.forEach((p) => {
      if (p.categoryId === targetId || p.categoryId === idOrSlug) {
        p.categoryId = '';
        p.categoryName = 'Uncategorized';
      }
    });

    this.save();
    return true;
  }

  // Products
  public getProducts(includeInactive = false): Product[] {
    return this.data.products
      .filter((p) => includeInactive || p.active)
      .map((p) => {
        const cat = this.data.categories.find((c) => c.id === p.categoryId);
        const availableStock = this.data.stockItems.filter(
          (s) => s.productId === p.id && s.status === 'available'
        ).length;
        return {
          ...p,
          categoryName: cat ? cat.name : 'Uncategorized',
          stockCount: availableStock,
        };
      });
  }

  public getProductByIdOrSlug(idOrSlug: string): Product | undefined {
    const p = this.data.products.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
    if (!p) return undefined;
    const cat = this.data.categories.find((c) => c.id === p.categoryId);
    const availableStock = this.data.stockItems.filter(
      (s) => s.productId === p.id && s.status === 'available'
    ).length;
    return {
      ...p,
      categoryName: cat ? cat.name : 'Uncategorized',
      stockCount: availableStock,
    };
  }

  public createProduct(product: Product): Product {
    this.data.products.push(product);
    this.save();
    return product;
  }

  public updateProduct(id: string, updates: Partial<Product>): Product | null {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.data.products[idx] = {
      ...this.data.products[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.products[idx];
  }

  public deleteProduct(id: string): boolean {
    this.data.products = this.data.products.filter((p) => p.id !== id);
    this.data.stockItems = this.data.stockItems.filter((s) => s.productId !== id);
    this.save();
    return true;
  }

  // Stock Items
  public getStockItems(productId?: string): StockItem[] {
    if (productId) {
      return this.data.stockItems.filter((s) => s.productId === productId);
    }
    return this.data.stockItems;
  }

  public addStockItems(items: StockItem[]): StockItem[] {
    this.data.stockItems.push(...items);
    this.save();
    return items;
  }

  public deleteStockItem(id: string): boolean {
    this.data.stockItems = this.data.stockItems.filter((s) => s.id !== id);
    this.save();
    return true;
  }

  public clearStock(productId: string, status?: StockItem['status']): number {
    const countBefore = this.data.stockItems.length;
    this.data.stockItems = this.data.stockItems.filter((s) => {
      if (s.productId !== productId) return true;
      if (status && s.status !== status) return true;
      return false;
    });
    const removed = countBefore - this.data.stockItems.length;
    if (removed > 0) this.save();
    return removed;
  }

  // Atomic Stock Reservation and Allocation
  public reserveStock(productId: string, quantity: number, orderId: string, ttlSeconds = 900): StockItem[] | null {
    const now = new Date();
    // Clear expired reservations first
    this.data.stockItems.forEach((item) => {
      if (
        item.status === 'reserved' &&
        item.reservationExpiresAt &&
        new Date(item.reservationExpiresAt) < now
      ) {
        item.status = 'available';
        item.orderId = undefined;
        item.reservationExpiresAt = undefined;
      }
    });

    const available = this.data.stockItems.filter(
      (s) => s.productId === productId && s.status === 'available'
    );

    if (available.length < quantity) {
      return null;
    }

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const reservedItems: StockItem[] = [];

    for (let i = 0; i < quantity; i++) {
      const item = available[i];
      item.status = 'reserved';
      item.orderId = orderId;
      item.reservationExpiresAt = expiresAt;
      reservedItems.push(item);
    }

    this.save();
    return reservedItems;
  }

  public commitStockDelivery(orderId: string): StockItem[] {
    const nowIso = new Date().toISOString();
    const delivered: StockItem[] = [];

    this.data.stockItems.forEach((item) => {
      if (item.orderId === orderId && (item.status === 'reserved' || item.status === 'available')) {
        item.status = 'delivered';
        item.deliveredAt = nowIso;
        item.reservationExpiresAt = undefined;
        delivered.push(item);
      }
    });

    if (delivered.length > 0) {
      this.save();
    }
    return delivered;
  }

  public releaseStockReservation(orderId: string): void {
    let changed = false;
    this.data.stockItems.forEach((item) => {
      if (item.orderId === orderId && item.status === 'reserved') {
        item.status = 'available';
        item.orderId = undefined;
        item.reservationExpiresAt = undefined;
        changed = true;
      }
    });
    if (changed) this.save();
  }

  // Orders
  public getOrders(): Order[] {
    return [...this.data.orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getOrderByIdOrNumber(idOrNumber: string): Order | undefined {
    return this.data.orders.find((o) => o.id === idOrNumber || o.orderNumber === idOrNumber);
  }

  public getOrderByTxid(txid: string): Order | undefined {
    const payment = this.data.payments.find((p) => p.txid === txid && (p.status === 'confirmed' || p.status === 'unconfirmed'));
    if (!payment) return undefined;
    return this.data.orders.find((o) => o.id === payment.orderId);
  }

  public getOrdersByCustomer(emailOrUserId: string): Order[] {
    const lower = emailOrUserId.toLowerCase();
    return this.data.orders.filter(
      (o) => o.customerEmail.toLowerCase() === lower || o.customerUserId === emailOrUserId
    );
  }

  public createOrder(order: Order): Order {
    this.data.orders.push(order);
    this.save();
    return order;
  }

  public updateOrder(id: string, updates: Partial<Order>): Order | null {
    const idx = this.data.orders.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    this.data.orders[idx] = { ...this.data.orders[idx], ...updates };
    this.save();
    return this.data.orders[idx];
  }

  // Payments
  public getPayments(): Payment[] {
    return [...this.data.payments].sort((a, b) => b.createdAt - a.createdAt);
  }

  public getPaymentById(id: string): Payment | undefined {
    return this.data.payments.find((p) => p.id === id);
  }

  public getPaymentByOrderId(orderId: string): Payment | undefined {
    return this.data.payments.find((p) => p.orderId === orderId);
  }

  public getPaymentByAddress(address: string): Payment | undefined {
    return this.data.payments.find(
      (p) => p.address.toLowerCase() === address.toLowerCase().trim()
    );
  }

  public createPayment(payment: Payment): Payment {
    this.data.payments.push(payment);
    this.save();
    return payment;
  }

  public updatePayment(id: string, updates: Partial<Payment>): Payment | null {
    const idx = this.data.payments.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.data.payments[idx] = { ...this.data.payments[idx], ...updates };
    this.save();
    return this.data.payments[idx];
  }

  // Invoices
  public getInvoices(): Invoice[] {
    return [...this.data.invoices].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getInvoiceByIdOrNumber(idOrNumber: string): Invoice | undefined {
    return this.data.invoices.find(
      (i) => i.id === idOrNumber || i.invoiceNumber === idOrNumber || i.orderId === idOrNumber
    );
  }

  public createInvoice(invoice: Invoice): Invoice {
    this.data.invoices.push(invoice);
    this.save();
    return invoice;
  }

  // Ledger & Balances
  public getLedger(): LedgerEntry[] {
    return [...this.data.ledger].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public addLedgerEntry(entry: Omit<LedgerEntry, 'id' | 'balanceAfterLtc' | 'createdAt'>): LedgerEntry {
    const currentBalance = this.getStoreBalanceLtc();
    let newBalance = currentBalance;
    if (entry.type === 'sale' || entry.type === 'deposit') {
      newBalance += entry.amountLtc;
    } else if (entry.type === 'payout' || entry.type === 'refund' || entry.type === 'fee') {
      newBalance -= entry.amountLtc;
    }

    const created: LedgerEntry = {
      id: `ledg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...entry,
      balanceAfterLtc: Math.max(0, newBalance),
      createdAt: new Date().toISOString(),
    };
    this.data.ledger.push(created);
    this.save();
    return created;
  }

  public getStoreBalanceLtc(): number {
    return this.data.ledger.reduce((acc, curr) => {
      if (curr.type === 'sale' || curr.type === 'deposit') {
        return acc + curr.amountLtc;
      }
      return acc - curr.amountLtc;
    }, 0);
  }

  // Payouts
  public getPayouts(): Payout[] {
    return [...this.data.payouts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public createPayout(payout: Payout): Payout {
    this.data.payouts.push(payout);
    this.save();
    return payout;
  }

  public updatePayout(id: string, updates: Partial<Payout>): Payout | null {
    const idx = this.data.payouts.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.data.payouts[idx] = { ...this.data.payouts[idx], ...updates };
    this.save();
    return this.data.payouts[idx];
  }

  // Customers
  public getCustomers(): CustomerUser[] {
    return this.data.customers;
  }

  public getCustomerById(id: string): CustomerUser | undefined {
    return this.data.customers.find((c) => c.id === id);
  }

  public getCustomerByEmail(email: string): CustomerUser | undefined {
    return this.data.customers.find((c) => c.email.toLowerCase() === email.toLowerCase().trim());
  }

  public getCustomerByUsername(username: string): CustomerUser | undefined {
    return this.data.customers.find((c) => c.username.toLowerCase() === username.toLowerCase().trim());
  }

  public getCustomerByUsernameOrEmail(identifier: string): CustomerUser | undefined {
    const lower = identifier.toLowerCase().trim();
    return this.data.customers.find((c) => c.email.toLowerCase() === lower || c.username.toLowerCase() === lower);
  }

  public createCustomer(customer: CustomerUser): CustomerUser {
    this.data.customers.push(customer);
    this.save();
    return customer;
  }

  public updateCustomer(id: string, updates: Partial<CustomerUser>): CustomerUser | null {
    const idx = this.data.customers.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.data.customers[idx] = { ...this.data.customers[idx], ...updates };
    this.save();
    return this.data.customers[idx];
  }

  // Webhooks & Logs
  public getWebhooks(): Webhook[] {
    return this.data.webhooks;
  }

  public getWebhookById(id: string): Webhook | undefined {
    return this.data.webhooks.find((w) => w.id === id);
  }

  public createWebhook(webhook: Webhook): Webhook {
    this.data.webhooks.push(webhook);
    this.save();
    return webhook;
  }

  public updateWebhook(id: string, updates: Partial<Webhook>): Webhook | null {
    const idx = this.data.webhooks.findIndex((w) => w.id === id);
    if (idx === -1) return null;
    this.data.webhooks[idx] = { ...this.data.webhooks[idx], ...updates };
    this.save();
    return this.data.webhooks[idx];
  }

  public deleteWebhook(id: string): boolean {
    this.data.webhooks = this.data.webhooks.filter((w) => w.id !== id);
    this.save();
    return true;
  }

  public getWebhookLogs(limit = 100): WebhookLog[] {
    return [...this.data.webhookLogs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  public addWebhookLog(log: WebhookLog): void {
    this.data.webhookLogs.unshift(log);
    if (this.data.webhookLogs.length > 500) {
      this.data.webhookLogs = this.data.webhookLogs.slice(0, 500);
    }
    this.save();
  }

  // Audit Logs
  public getAuditLogs(limit = 150): AuditLog[] {
    return [...this.data.auditLogs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  public addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const created: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...log,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(created);
    if (this.data.auditLogs.length > 1000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 1000);
    }
    this.save();
    return created;
  }

  // FAQs
  public getFaqs(): FAQItem[] {
    return [...this.data.faqs].sort((a, b) => a.order - b.order);
  }

  public saveFaqs(faqs: FAQItem[]): FAQItem[] {
    this.data.faqs = faqs;
    this.save();
    return this.data.faqs;
  }

  // Support Tickets
  public getSupportTickets(): SupportTicket[] {
    return [...this.data.supportTickets].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  public getSupportTicketById(id: string): SupportTicket | undefined {
    return this.data.supportTickets.find((t) => t.id === id || t.ticketNumber === id);
  }

  public createSupportTicket(ticket: SupportTicket): SupportTicket {
    this.data.supportTickets.unshift(ticket);
    this.save();
    return ticket;
  }

  public updateSupportTicket(id: string, updates: Partial<SupportTicket>): SupportTicket | null {
    const idx = this.data.supportTickets.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    this.data.supportTickets[idx] = {
      ...this.data.supportTickets[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.supportTickets[idx];
  }
}

export const db = new Database();
