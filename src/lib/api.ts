import {
  ShopSettings,
  ThemeSettings,
  AuthConfig,
  Category,
  Product,
  Order,
  Payment,
  Invoice,
  UserSession,
  FAQItem,
  SupportTicket,
} from '../types/index.ts';

class ApiClient {
  private getHeaders() {
    const token = localStorage.getItem('rm_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = { ...this.getHeaders(), ...(options.headers as any) };
    const res = await fetch(endpoint, { ...options, headers });

    if (!res.ok) {
      let errMsg = `Request failed: ${res.status}`;
      try {
        const data = await res.json();
        errMsg = data.error || data.message || errMsg;
      } catch {
        // ignore
      }
      throw new Error(errMsg);
    }

    return res.json();
  }

  // Setup Wizard
  public getSetupStatus() {
    return this.request<{ installationComplete: boolean; shopName: string; hasAdmins: boolean; discordUsername: string }>('/api/setup/status');
  }

  public testBlockCypherConnection(merchantAddress: string, apiToken?: string) {
    return this.request<{ success: boolean; message: string; details?: any }>('/api/setup/test-blockcypher', {
      method: 'POST',
      body: JSON.stringify({ merchantAddress, apiToken }),
    });
  }

  public testApironeConnection(walletId: string, transferKey?: string) {
    return this.request<{ success: boolean; message: string; details?: any }>('/api/setup/test-apirone', {
      method: 'POST',
      body: JSON.stringify({ walletId, transferKey }),
    });
  }

  public completeSetup(payload: any) {
    return this.request<{ success: boolean; message: string; token: string; admin: any }>('/api/setup/complete', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Store
  public getStoreSettings() {
    return this.request<{ shop: ShopSettings; theme: ThemeSettings; auth: AuthConfig }>('/api/store/settings');
  }

  public getStorefront() {
    return this.getStoreSettings();
  }

  public getCategories() {
    return this.request<Category[]>('/api/store/categories');
  }

  public getProducts(params?: { category?: string; search?: string; tag?: string }) {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    if (params?.tag) query.set('tag', params.tag);
    return this.request<Product[]>(`/api/store/products?${query.toString()}`);
  }

  public getProduct(slug: string) {
    return this.request<Product>(`/api/store/products/${slug}`);
  }

  public getFaqs() {
    return this.request<FAQItem[]>('/api/store/faqs');
  }

  public submitSupportTicket(data: { customerEmail: string; orderNumber?: string; subject: string; message: string }) {
    return this.request<{ success: boolean; ticket: SupportTicket }>('/api/store/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Checkout & Payment
  public createCheckout(data: { productId: string; quantity: number; customerEmail: string; customFieldValues?: Record<string, string> }) {
    return this.request<{
      success: boolean;
      orderId: string;
      orderNumber: string;
      paymentAddress: string;
      amountLtc: number;
      amountUsd: number;
      qrCodeDataUrl: string;
      expiresAt: number;
      expiresInSeconds: number;
      order: Order;
      payment: Payment;
    }>('/api/checkout/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public getOrderStatus(orderId: string) {
    return this.request<{
      order: Order;
      payment: Payment;
      product: Partial<Product>;
      invoice: { id: string; invoiceNumber: string } | null;
      timeRemainingSeconds: number;
    }>(`/api/checkout/order/${orderId}`);
  }

  public simulatePayment(orderId: string, confirmations = 1) {
    return this.request<{ success: boolean; message: string; order: Order; payment: Payment; deliveryResult?: any }>(
      '/api/checkout/simulate-payment',
      {
        method: 'POST',
        body: JSON.stringify({ orderId, confirmations }),
      }
    );
  }

  public getInvoice(invoiceId: string) {
    return this.request<{ invoice: Invoice; shop: any }>(`/api/checkout/invoices/${invoiceId}`);
  }

  public getCustomerOrders(email?: string) {
    return this.request<Order[]>(`/api/checkout/my-orders?email=${encodeURIComponent(email || '')}`);
  }

  // Auth
  public adminLogin(identifier: string, password: string) {
    return this.request<{ success: boolean; token: string; user: UserSession }>('/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  }

  public customerLogin(email: string, password: string) {
    return this.request<{ success: boolean; token: string; user: UserSession }>('/api/auth/customer/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  public customerRegister(username: string, email: string, password: string) {
    return this.request<{ success: boolean; token: string; user: UserSession }>('/api/auth/customer/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  }

  public getDiscordAuthUrl(redirectUri?: string) {
    const q = redirectUri ? `?redirectUri=${encodeURIComponent(redirectUri)}` : '';
    return this.request<{ url: string; clientId: string; redirectUri: string }>(`/api/auth/discord/url${q}`);
  }

  public exchangeDiscordCode(code: string, redirectUri?: string) {
    return this.request<{ success: boolean; token: string; user: UserSession }>('/api/auth/discord/exchange', {
      method: 'POST',
      body: JSON.stringify({ code, redirectUri }),
    });
  }

  public getMe() {
    return this.request<{ authenticated: boolean; type?: 'admin' | 'customer'; user: UserSession | null }>('/api/auth/me');
  }

  public getCurrentUser() {
    return this.getMe();
  }

  public logout() {
    localStorage.removeItem('rm_token');
    return this.request<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
  }

  // Admin APIs
  public getAdminAnalytics() {
    return this.request<any>('/api/admin/analytics');
  }

  public getAdminProducts() {
    return this.request<Product[]>('/api/admin/products');
  }

  public createAdminProduct(product: Partial<Product>) {
    return this.request<Product>('/api/admin/products', { method: 'POST', body: JSON.stringify(product) });
  }

  public updateAdminProduct(id: string, updates: Partial<Product>) {
    return this.request<Product>(`/api/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
  }

  public deleteAdminProduct(id: string) {
    return this.request<{ success: boolean }>(`/api/admin/products/${id}`, { method: 'DELETE' });
  }

  public getAdminStock(productId?: string) {
    return this.request<{ summary: any[]; stockItems: any[] }>(`/api/admin/stock${productId ? `?productId=${productId}` : ''}`);
  }

  public addBulkStock(productId: string, rawText: string) {
    return this.request<any>('/api/admin/stock/bulk', { method: 'POST', body: JSON.stringify({ productId, rawText }) });
  }

  public deleteStockItem(id: string) {
    return this.request<any>(`/api/admin/stock/${id}`, { method: 'DELETE' });
  }

  public clearStock(productId: string) {
    return this.request<any>(`/api/admin/stock/clear/${productId}`, { method: 'DELETE' });
  }

  public getAdminCategories() {
    return this.request<Category[]>('/api/admin/categories');
  }

  public createCategory(cat: Partial<Category>) {
    return this.request<Category>('/api/admin/categories', { method: 'POST', body: JSON.stringify(cat) });
  }

  public createAdminCategory(cat: Partial<Category>) {
    return this.createCategory(cat);
  }

  public updateCategory(id: string, updates: Partial<Category>) {
    return this.request<Category>(`/api/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
  }

  public updateAdminCategory(id: string, updates: Partial<Category>) {
    return this.updateCategory(id, updates);
  }

  public deleteCategory(id: string) {
    return this.request<any>(`/api/admin/categories/${id}`, { method: 'DELETE' });
  }

  public deleteAdminCategory(id: string) {
    return this.deleteCategory(id);
  }

  public getAdminOrders() {
    return this.request<Order[]>('/api/admin/orders');
  }

  public getAdminOrder(id: string) {
    return this.request<any>(`/api/admin/orders/${id}`);
  }

  public manualDeliverOrder(id: string) {
    return this.request<any>(`/api/admin/orders/${id}/deliver-manual`, { method: 'POST' });
  }

  public refundOrder(id: string) {
    return this.request<any>(`/api/admin/orders/${id}/refund`, { method: 'POST' });
  }

  public getAdminInvoices() {
    return this.request<Invoice[]>('/api/admin/invoices');
  }

  public getAdminPayments() {
    return this.request<Payment[]>('/api/admin/payments');
  }

  public getAdminWallet() {
    return this.request<any>('/api/admin/wallet/overview');
  }

  public getBlockCypherConfig() {
    return this.request<{
      merchantAddress: string;
      apiToken: string;
      hasApiToken: boolean;
      isConnected: boolean;
      connectionMessage?: string;
      lastTestedAt?: string;
    }>('/api/admin/wallet/blockcypher-config');
  }

  public testAdminBlockCypher(address?: string, apiToken?: string) {
    return this.request<{ success: boolean; message: string; details?: any }>('/api/admin/wallet/test-blockcypher', {
      method: 'POST',
      body: JSON.stringify({ address, apiToken }),
    });
  }

  public saveBlockCypherConfig(merchantAddress: string, apiToken?: string) {
    return this.request<{ success: boolean; message: string }>('/api/admin/wallet/save-blockcypher', {
      method: 'POST',
      body: JSON.stringify({ merchantAddress, apiToken }),
    });
  }

  public getApironeConfig() {
    return this.getBlockCypherConfig() as any;
  }

  public generateApironeWallet() {
    return this.testAdminBlockCypher() as any;
  }

  public testAdminApirone(walletId: string, transferKey?: string) {
    return this.testAdminBlockCypher(walletId, transferKey);
  }

  public saveApironeConfig(walletId: string, transferKey?: string) {
    return this.saveBlockCypherConfig(walletId, transferKey);
  }

  public requestPayout(data: { destinationAddress: string; amountLtc: number; transferKey?: string; notes?: string; deductFeeFromAmount?: boolean }) {
    return this.request<any>('/api/admin/wallet/payout', { method: 'POST', body: JSON.stringify(data) });
  }

  public getAdminWebhooks() {
    return this.request<any[]>('/api/admin/webhooks');
  }

  public createWebhook(webhook: any) {
    return this.request<any>('/api/admin/webhooks', { method: 'POST', body: JSON.stringify(webhook) });
  }

  public updateWebhook(id: string, updates: any) {
    return this.request<any>(`/api/admin/webhooks/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
  }

  public deleteWebhook(id: string) {
    return this.request<any>(`/api/admin/webhooks/${id}`, { method: 'DELETE' });
  }

  public testWebhook(id: string) {
    return this.request<any>(`/api/admin/webhooks/${id}/test`, { method: 'POST' });
  }

  public getWebhookLogs() {
    return this.request<any[]>('/api/admin/webhooks/logs');
  }

  public getThemeSettings() {
    return this.request<ThemeSettings>('/api/admin/themes');
  }

  public updateThemeSettings(settings: Partial<ThemeSettings>) {
    return this.request<ThemeSettings>('/api/admin/themes', { method: 'PUT', body: JSON.stringify(settings) });
  }

  public getAdminSettings() {
    return this.request<any>('/api/admin/settings');
  }

  public updateShopSettings(settings: Partial<ShopSettings>) {
    return this.request<ShopSettings>('/api/admin/settings/shop', { method: 'PUT', body: JSON.stringify(settings) });
  }

  public updateStoreSettings(settings: Partial<ShopSettings>) {
    return this.updateShopSettings(settings);
  }

  public updateBlockCypherSettings(settings: any) {
    return this.request<any>('/api/admin/settings/blockcypher', { method: 'PUT', body: JSON.stringify(settings) });
  }

  public updateApironeSettings(settings: any) {
    return this.updateBlockCypherSettings(settings);
  }

  public updateAuthSettings(settings: any) {
    return this.request<any>('/api/admin/settings/auth', { method: 'PUT', body: JSON.stringify(settings) });
  }

  public getAdminUsers() {
    return this.request<any[]>('/api/admin/admins');
  }

  public createAdminUser(user: any) {
    return this.request<any>('/api/admin/admins', { method: 'POST', body: JSON.stringify(user) });
  }

  public deleteAdminUser(id: string) {
    return this.request<any>(`/api/admin/admins/${id}`, { method: 'DELETE' });
  }

  public getRoles() {
    return this.request<any[]>('/api/admin/roles');
  }

  public getAdminRoles() {
    return this.getRoles();
  }

  public getAuditLogs() {
    return this.request<any[]>('/api/admin/audit-logs');
  }

  public getAdminAuditLogs() {
    return this.getAuditLogs();
  }

  public getAdminTickets() {
    return this.request<SupportTicket[]>('/api/admin/tickets');
  }

  public getAdminSupportTickets() {
    return this.getAdminTickets();
  }

  public async replySupportTicket(id: string, content: string, status?: string) {
    const res = await this.request<SupportTicket>(`/api/admin/tickets/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    if (status) {
      await this.updateTicketStatus(id, status);
    }
    return { ...res, ticket: res };
  }

  public updateTicketStatus(id: string, status: string) {
    return this.request<SupportTicket>(`/api/admin/tickets/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
  }
}

export const api = new ApiClient();
