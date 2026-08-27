import { Router } from 'express';
import { db } from '../../lib/database/index.ts';
import { requireAdmin, requirePermission, AuthenticatedRequest } from '../auth/permissions.ts';
import { analyticsService } from '../analytics/service.ts';
import { inventoryService } from '../inventory/stock.ts';
import { walletService } from '../wallet/service.ts';
import { blockCypher } from '../blockcypher/client.ts';
import { deliveryService } from '../delivery/service.ts';
import { webhookDispatcher } from '../webhooks/dispatcher.ts';
import { credentials } from '../auth/credentials.ts';
import {
  Product,
  Category,
  AdminUser,
  Role,
  Webhook,
  FAQItem,
} from '../../lib/database/types.ts';

const router = Router();

// All admin routes require admin session
router.use(requireAdmin);

/**
 * Analytics Dashboard Data
 */
router.get('/analytics', (req, res) => {
  const stats = analyticsService.getDashboardStats();
  res.json(stats);
});

/**
 * Products CRUD
 */
router.get('/products', (req, res) => {
  const products = db.getProducts(true);
  res.json(products);
});

router.post('/products', (req: AuthenticatedRequest, res) => {
  try {
    const {
      title,
      slug,
      shortDescription,
      fullDescription,
      priceUsd,
      categoryId,
      images,
      deliveryType,
      downloadUrl,
      minQuantity,
      maxQuantity,
      tags,
      featured,
      active,
      unlisted,
      instructions,
      warrantyPeriod,
      customFields,
    } = req.body;

    if (!title || priceUsd === undefined) {
      return res.status(400).json({ error: 'Title and Price in USD are required.' });
    }

    const ltcRate = db.getShopSettings().ltcToUsdRate || 110.0;
    const priceLtc = Number((Number(priceUsd) / ltcRate).toFixed(6));
    const generatedSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const newProduct: Product = {
      id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      slug: generatedSlug,
      shortDescription: shortDescription || '',
      fullDescription: fullDescription || '',
      priceUsd: Number(priceUsd),
      priceLtc,
      categoryId: categoryId || 'cat-software',
      images: Array.isArray(images) && images.length > 0 ? images : ['https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop'],
      deliveryType: deliveryType || 'automatic',
      downloadUrl,
      minQuantity: Number(minQuantity) || 1,
      maxQuantity: Number(maxQuantity) || 10,
      tags: Array.isArray(tags) ? tags : [],
      featured: Boolean(featured),
      active: active !== undefined ? Boolean(active) : true,
      unlisted: Boolean(unlisted),
      instructions: instructions || 'Use your delivered license credentials directly in the application.',
      warrantyPeriod: warrantyPeriod || '30-Day Guarantee',
      customFields: customFields || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.createProduct(newProduct);

    db.addAuditLog({
      actorType: 'admin',
      actorId: req.admin!.id,
      actorName: req.admin!.username,
      action: 'PRODUCT_CREATED',
      entityType: 'Product',
      entityId: newProduct.id,
      details: { title: newProduct.title, priceUsd: newProduct.priceUsd },
    });

    res.json(newProduct);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/products/:id', (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.priceUsd !== undefined) {
      const ltcRate = db.getShopSettings().ltcToUsdRate || 110.0;
      updates.priceLtc = Number((Number(updates.priceUsd) / ltcRate).toFixed(6));
    }

    const updated = db.updateProduct(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    db.addAuditLog({
      actorType: 'admin',
      actorId: req.admin!.id,
      actorName: req.admin!.username,
      action: 'PRODUCT_UPDATED',
      entityType: 'Product',
      entityId: id,
      details: updates,
    });

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/products/:id', (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const success = db.deleteProduct(id);
  if (!success) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  db.addAuditLog({
    actorType: 'admin',
    actorId: req.admin!.id,
    actorName: req.admin!.username,
    action: 'PRODUCT_DELETED',
    entityType: 'Product',
    entityId: id,
    details: {},
  });

  res.json({ success: true, message: 'Product deleted.' });
});

/**
 * Stock Management
 */
router.get('/stock', (req, res) => {
  const productId = req.query.productId as string | undefined;
  const summary = inventoryService.getInventorySummary();
  const rawStock = db.getStockItems(productId);

  res.json({
    summary,
    stockItems: rawStock,
  });
});

router.post('/stock/bulk', (req: AuthenticatedRequest, res) => {
  try {
    const { productId, rawText } = req.body;
    if (!productId || !rawText) {
      return res.status(400).json({ error: 'Product ID and stock text lines are required.' });
    }

    const result = inventoryService.addBulkStock(productId, rawText);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/stock/:id', (req: AuthenticatedRequest, res) => {
  const success = db.deleteStockItem(req.params.id);
  res.json({ success });
});

router.delete('/stock/clear/:productId', (req: AuthenticatedRequest, res) => {
  const { productId } = req.params;
  const count = db.clearStock(productId, 'available');
  res.json({ success: true, removedCount: count });
});

/**
 * Categories CRUD
 */
router.get('/categories', (req, res) => {
  res.json(db.getCategories());
});

router.post('/categories', (req: AuthenticatedRequest, res) => {
  const { name, slug, description, icon, displayOrder } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required.' });

  const newCat: Category = {
    id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    name: name.trim(),
    slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: description || '',
    icon: icon || 'Tag',
    displayOrder: Number(displayOrder) || 1,
    active: true,
  };

  db.createCategory(newCat);
  res.json(newCat);
});

router.put('/categories/:id', (req: AuthenticatedRequest, res) => {
  const updated = db.updateCategory(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Category not found.' });
  res.json(updated);
});

router.delete('/categories/:id', (req: AuthenticatedRequest, res) => {
  const success = db.deleteCategory(req.params.id);
  res.json({ success });
});

/**
 * Orders
 */
router.get('/orders', (req, res) => {
  res.json(db.getOrders());
});

router.get('/orders/:id', (req, res) => {
  const order = db.getOrderByIdOrNumber(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  const payment = db.getPaymentByOrderId(order.id);
  const invoice = db.getInvoiceByIdOrNumber(order.id);
  const product = db.getProductByIdOrSlug(order.productId);

  res.json({ order, payment, invoice, product });
});

router.post('/orders/:id/deliver-manual', (req: AuthenticatedRequest, res) => {
  try {
    const result = deliveryService.executeDelivery(req.params.id);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/orders/:id/refund', (req: AuthenticatedRequest, res) => {
  const order = db.getOrderByIdOrNumber(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  db.updateOrder(order.id, { status: 'refunded' });

  // Record in ledger
  db.addLedgerEntry({
    type: 'refund',
    amountUsd: order.totalUsd,
    amountLtc: order.totalLtc,
    referenceId: order.id,
    description: `Refund for Order #${order.orderNumber}`,
  });

  db.addAuditLog({
    actorType: 'admin',
    actorId: req.admin!.id,
    actorName: req.admin!.username,
    action: 'ORDER_REFUNDED',
    entityType: 'Order',
    entityId: order.id,
    details: { orderNumber: order.orderNumber, amountUsd: order.totalUsd },
  });

  res.json({ success: true, message: 'Order marked as refunded and ledger adjusted.' });
});

/**
 * Invoices
 */
router.get('/invoices', (req, res) => {
  res.json(db.getInvoices());
});

/**
 * Payments & Transactions
 */
router.get('/payments', (req, res) => {
  res.json(db.getPayments());
});

/**
 * Wallet & Payouts
 */
router.get('/wallet/overview', async (req, res) => {
  const data = await walletService.getWalletOverview();
  res.json(data);
});

router.get('/wallet/blockcypher-config', (req, res) => {
  const config = db.getBlockCypherConfig();
  res.json({
    merchantAddress: config.merchantAddress,
    apiToken: config.apiToken ? '********' : '',
    hasApiToken: Boolean(config.apiToken),
    isConnected: config.isConnected,
    connectionMessage: config.connectionMessage,
    lastTestedAt: config.lastTestedAt,
  });
});

router.post('/wallet/test-blockcypher', async (req, res) => {
  const { address, apiToken } = req.body;
  const targetAddress = (address || blockCypher.getMerchantAddress()).trim();
  try {
    const details = await blockCypher.getAddressDetails(targetAddress);
    res.json({
      success: true,
      message: `Successfully connected to Litecoin blockchain! Address active with ${details.txCount} transactions and ${details.balanceLtc.toFixed(4)} LTC confirmed balance.`,
      details,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to query BlockCypher Litecoin blockchain endpoint.',
    });
  }
});

router.post('/wallet/save-blockcypher', (req: AuthenticatedRequest, res) => {
  const { merchantAddress, apiToken } = req.body;
  if (!merchantAddress || !merchantAddress.trim()) {
    return res.status(400).json({ error: 'Merchant Litecoin address is required.' });
  }

  const cleanAddr = merchantAddress.trim();
  db.updateBlockCypherConfig({
    merchantAddress: cleanAddr,
    apiToken: apiToken && apiToken !== '********' ? apiToken.trim() : undefined,
    isConnected: true,
    connectionMessage: `Connected to receiving address ${cleanAddr.substring(0, 10)}... (BlockCypher 5-sec poller active)`,
    lastTestedAt: new Date().toISOString(),
  });

  db.updateShopSettings({
    merchantLtcAddress: cleanAddr,
    blockcypherToken: apiToken && apiToken !== '********' ? apiToken.trim() : '',
  } as any);

  db.addAuditLog({
    actorType: 'admin',
    actorId: req.admin!.id,
    actorName: req.admin!.username,
    action: 'BLOCKCYPHER_CONFIG_SAVED',
    entityType: 'Wallet',
    entityId: cleanAddr,
    details: { merchantAddress: cleanAddr },
  });

  res.json({ success: true, message: 'BlockCypher Litecoin configuration saved successfully.' });
});

router.post('/wallet/payout', async (req: AuthenticatedRequest, res) => {
  try {
    const { destinationAddress, amountLtc, notes, deductFeeFromAmount } = req.body;
    if (!destinationAddress || amountLtc === undefined || amountLtc === null) {
      return res.status(400).json({ error: 'Destination address and LTC amount are required.' });
    }

    const payout = await walletService.requestPayout(
      req.admin!,
      destinationAddress,
      Number(amountLtc),
      notes,
      Boolean(deductFeeFromAmount)
    );

    res.json({ success: true, payout });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Webhooks & Logs
 */
router.get('/webhooks', (req, res) => {
  res.json(db.getWebhooks());
});

router.post('/webhooks', (req: AuthenticatedRequest, res) => {
  const { name, url, secret, events } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'Name and URL are required.' });

  const newHook: Webhook = {
    id: `wh-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    name: name.trim(),
    url: url.trim(),
    secret: secret || 'rm_sec_' + Math.random().toString(36).substring(2, 12),
    events: Array.isArray(events) && events.length > 0 ? events : ['order.completed', 'stock.low'],
    active: true,
    createdAt: new Date().toISOString(),
  };

  db.createWebhook(newHook);
  res.json(newHook);
});

router.put('/webhooks/:id', (req: AuthenticatedRequest, res) => {
  const updated = db.updateWebhook(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Webhook not found.' });
  res.json(updated);
});

router.delete('/webhooks/:id', (req: AuthenticatedRequest, res) => {
  const success = db.deleteWebhook(req.params.id);
  res.json({ success });
});

router.post('/webhooks/:id/test', async (req: AuthenticatedRequest, res) => {
  const webhook = db.getWebhookById(req.params.id);
  if (!webhook) return res.status(404).json({ error: 'Webhook not found.' });

  const log = await webhookDispatcher.sendToWebhook(webhook, 'test.ping', {
    message: 'ReachMarket test webhook ping.',
    adminUser: req.admin!.username,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: log.success, log });
});

router.get('/webhooks/logs', (req, res) => {
  res.json(db.getWebhookLogs(100));
});

/**
 * Themes & Theme Editor
 */
router.get('/themes', (req, res) => {
  res.json(db.getThemeSettings());
});

router.put('/themes', (req: AuthenticatedRequest, res) => {
  const updated = db.updateThemeSettings(req.body);
  res.json(updated);
});

/**
 * Settings
 */
router.get('/settings', (req, res) => {
  const shop = db.getShopSettings();
  const authConfig = db.getAuthConfig();
  const blockCypherConfig = db.getBlockCypherConfig();

  const safeBlockCypher = {
    ...blockCypherConfig,
    apiToken: blockCypherConfig.apiToken ? '********' : '',
    hasApiToken: Boolean(blockCypherConfig.apiToken),
  };

  res.json({
    shop,
    authConfig,
    blockCypherConfig: safeBlockCypher,
  });
});

router.put('/settings/shop', (req: AuthenticatedRequest, res) => {
  const updated = db.updateShopSettings(req.body);
  res.json(updated);
});

router.put('/settings/blockcypher', (req: AuthenticatedRequest, res) => {
  const { merchantAddress, apiToken, confirmationThreshold } = req.body;
  const updates: any = {};

  if (merchantAddress !== undefined) updates.merchantAddress = merchantAddress.trim();
  if (apiToken && apiToken !== '********') updates.apiToken = apiToken.trim();
  if (confirmationThreshold !== undefined) updates.confirmationThreshold = Number(confirmationThreshold);

  const updated = db.updateBlockCypherConfig(updates);
  res.json({
    ...updated,
    apiToken: updated.apiToken ? '********' : '',
    hasApiToken: Boolean(updated.apiToken),
  });
});

router.put('/settings/auth', (req: AuthenticatedRequest, res) => {
  const updated = db.updateAuthConfig(req.body);
  res.json(updated);
});

/**
 * Admin Accounts & Roles
 */
router.get('/admins', (req, res) => {
  const admins = db.getAdmins().map((a) => ({
    id: a.id,
    username: a.username,
    email: a.email,
    roleId: a.roleId,
    roleName: a.roleName,
    createdAt: a.createdAt,
    lastLoginAt: a.lastLoginAt,
  }));
  res.json(admins);
});

router.post('/admins', async (req: AuthenticatedRequest, res) => {
  try {
    const { username, email, password, roleId } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    const existing = db.getAdminByUsernameOrEmail(username) || db.getAdminByUsernameOrEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'An admin with this username or email already exists.' });
    }

    const role = db.getRoleById(roleId || 'role-manager');
    const passwordHash = await credentials.hashPassword(password);

    const newAdmin: AdminUser = {
      id: `admin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      username: username.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      roleId: role ? role.id : 'role-manager',
      roleName: role ? role.name : 'Store Manager',
      createdAt: new Date().toISOString(),
    };

    db.createAdmin(newAdmin);

    res.json({
      id: newAdmin.id,
      username: newAdmin.username,
      email: newAdmin.email,
      roleName: newAdmin.roleName,
      createdAt: newAdmin.createdAt,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/admins/:id', (req: AuthenticatedRequest, res) => {
  if (req.admin!.id === req.params.id) {
    return res.status(400).json({ error: 'You cannot delete your own admin account.' });
  }
  const success = db.deleteAdmin(req.params.id);
  res.json({ success });
});

router.get('/roles', (req, res) => {
  res.json(db.getRoles());
});

/**
 * Audit Logs
 */
router.get('/audit-logs', (req, res) => {
  res.json(db.getAuditLogs(100));
});

/**
 * Customer Support Tickets
 */
router.get('/tickets', (req, res) => {
  res.json(db.getSupportTickets());
});

router.post('/tickets/:id/reply', (req: AuthenticatedRequest, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Message content is required.' });

  const ticket = db.getSupportTicketById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

  ticket.messages.push({
    id: `msg-${Date.now()}`,
    sender: 'admin',
    senderName: req.admin!.username,
    content: content.trim(),
    timestamp: new Date().toISOString(),
  });
  ticket.status = 'in_progress';
  ticket.updatedAt = new Date().toISOString();

  db.updateSupportTicket(ticket.id, ticket);
  res.json(ticket);
});

router.put('/tickets/:id/status', (req: AuthenticatedRequest, res) => {
  const { status } = req.body;
  const ticket = db.updateSupportTicket(req.params.id, { status });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
  res.json(ticket);
});

export default router;
