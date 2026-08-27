import { Router } from 'express';
import { db } from '../../lib/database/index.ts';
import { blockCypher } from '../blockcypher/client.ts';
import { SupportTicket } from '../../lib/database/types.ts';

const router = Router();

/**
 * Public store info & theme configuration
 */
router.get('/settings', async (req, res) => {
  const shop = db.getShopSettings();
  const theme = db.getThemeSettings();
  const authConfig = db.getAuthConfig();
  const ltcRate = await blockCypher.getLtcRate();

  res.json({
    shop: {
      shopName: shop.shopName,
      shopDescription: shop.shopDescription,
      logoUrl: shop.logoUrl,
      darkLogoUrl: shop.darkLogoUrl,
      faviconUrl: shop.faviconUrl,
      supportDiscordUsername: shop.supportDiscordUsername || '4gfi',
      discordInviteUrl: shop.discordInviteUrl,
      currency: shop.currency || 'USD',
      announcementText: shop.announcementText,
      announcementActive: shop.announcementActive,
      installationComplete: shop.installationComplete,
      ltcToUsdRate: ltcRate,
    },
    theme: {
      activePreset: theme.activePreset,
      primaryColor: theme.primaryColor,
      accentColor: theme.accentColor,
      surfaceColor: theme.surfaceColor,
      backgroundColor: theme.backgroundColor,
      textColor: theme.textColor,
      mutedColor: theme.mutedColor,
      borderColor: theme.borderColor,
      radius: theme.radius,
      enableCustomCursor: theme.enableCustomCursor,
      customCss: theme.customCss,
    },
    auth: {
      emailPasswordEnabled: authConfig.emailPasswordEnabled,
      googleEnabled: authConfig.googleEnabled,
      discordEnabled: authConfig.discordEnabled,
    },
  });
});

/**
 * Public categories
 */
router.get('/categories', (req, res) => {
  const categories = db.getCategories().filter((c) => c.active);
  res.json(categories);
});

/**
 * Public products catalogue
 */
router.get('/products', (req, res) => {
  const { category, search, tag } = req.query;
  let products = db.getProducts(false).filter((p) => !p.unlisted);

  if (category) {
    const cat = db.getCategoryByIdOrSlug(String(category));
    if (cat) {
      products = products.filter((p) => p.categoryId === cat.id);
    }
  }

  if (tag) {
    products = products.filter((p) => p.tags.includes(String(tag)));
  }

  if (search) {
    const query = String(search).toLowerCase();
    products = products.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.shortDescription.toLowerCase().includes(query) ||
        p.tags.some((t) => t.toLowerCase().includes(query))
    );
  }

  res.json(products);
});

/**
 * Product detail by slug or ID
 */
router.get('/products/:slug', (req, res) => {
  const product = db.getProductByIdOrSlug(req.params.slug);
  if (!product || (!product.active && !req.query.preview)) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  res.json(product);
});

/**
 * FAQs
 */
router.get('/faqs', (req, res) => {
  const faqs = db.getFaqs().filter((f) => f.active);
  res.json(faqs);
});

/**
 * Customer Support Ticket creation
 */
router.post('/tickets', (req, res) => {
  const { customerEmail, orderNumber, subject, message } = req.body;

  if (!customerEmail || !subject || !message) {
    return res.status(400).json({ error: 'Email, subject, and message are required.' });
  }

  const ticketNumber = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const newTicket: SupportTicket = {
    id: `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ticketNumber,
    customerEmail: customerEmail.trim().toLowerCase(),
    orderNumber: orderNumber ? orderNumber.trim() : undefined,
    subject: subject.trim(),
    status: 'open',
    messages: [
      {
        id: `msg-${Date.now()}`,
        sender: 'customer',
        senderName: customerEmail.split('@')[0],
        content: message.trim(),
        timestamp: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  db.createSupportTicket(newTicket);

  res.json({
    success: true,
    message: 'Support ticket submitted successfully.',
    ticket: newTicket,
  });
});

export default router;
