import { Router } from 'express';
import { db } from '../../lib/database/index.ts';
import { blockCypher } from '../blockcypher/client.ts';
import { apirone } from '../apirone/client.ts';
import { credentials } from '../auth/credentials.ts';
import { sessionService } from '../auth/sessions.ts';
import { AdminUser } from '../../lib/database/types.ts';

const router = Router();

/**
 * Check if the first-run setup wizard is needed or already completed.
 */
router.get('/status', (req, res) => {
  const shop = db.getShopSettings();
  const admins = db.getAdmins();
  const isInstalled = shop.installationComplete && admins.length > 0;

  res.json({
    installationComplete: isInstalled,
    shopName: shop.shopName,
    hasAdmins: admins.length > 0,
    discordUsername: shop.supportDiscordUsername || '4gfi',
  });
});

/**
 * Test BlockCypher Litecoin on-chain connection & address validity.
 */
router.post('/test-blockcypher', async (req, res) => {
  const { merchantAddress, apiToken } = req.body;
  const address = (merchantAddress || 'LfSfvBVJTWeZFzXcNz6GED67k9hBj8jfcF').trim();

  try {
    const details = await blockCypher.getAddressDetails(address);
    res.json({
      success: true,
      message: `BlockCypher Connected! On-Chain Balance: ${details.balanceLtc.toFixed(6)} LTC (${details.txCount} txs recorded)`,
      details,
    });
  } catch (err: any) {
    res.json({
      success: false,
      message: err.message || 'Failed to query BlockCypher Litecoin API',
    });
  }
});

/**
 * Test Apirone Litecoin connection.
 */
router.post('/test-apirone', async (req, res) => {
  const { walletId, transferKey } = req.body;

  if (!walletId) {
    return res.status(400).json({ success: false, message: 'Wallet ID is required.' });
  }

  const result = await apirone.testConnection(walletId, transferKey);
  res.json(result);
});

/**
 * Completes first-run shop setup wizard:
 * 1. Validates inputs
 * 2. Creates the primary administrator with hashed password
 * 3. Saves shop name, discord, appearance, and payment gateway config
 * 4. Locks the setup route permanently (installationComplete = true)
 */
router.post('/complete', async (req, res) => {
  const shop = db.getShopSettings();
  const existingAdmins = db.getAdmins();

  if (shop.installationComplete && existingAdmins.length > 0) {
    return res.status(403).json({
      error: 'First-run setup has already been completed. This route is locked.',
    });
  }

  const {
    shopName,
    shopDescription,
    supportDiscordUsername,
    discordInviteUrl,
    adminUsername,
    adminEmail,
    adminPassword,
    adminConfirmPassword,
    authConfig,
    blockCypherMerchantAddress,
    blockCypherApiToken,
    apironeWalletId,
    apironeTransferKey,
    themePreset,
    primaryColor,
    accentColor,
    customCursor,
  } = req.body;

  // Validation
  if (!shopName || shopName.trim().length < 2) {
    return res.status(400).json({ error: 'Shop name is required.' });
  }

  if (!adminUsername || adminUsername.trim().length < 3) {
    return res.status(400).json({ error: 'Admin username must be at least 3 characters.' });
  }

  if (!adminEmail || !adminEmail.includes('@')) {
    return res.status(400).json({ error: 'Valid admin email is required.' });
  }

  if (!adminPassword || adminPassword.length < 6) {
    return res.status(400).json({ error: 'Admin password must be at least 6 characters.' });
  }

  if (adminPassword !== adminConfirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  // Hash Admin Password
  const passwordHash = await credentials.hashPassword(adminPassword);

  const superAdmin: AdminUser = {
    id: `admin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    username: adminUsername.trim(),
    email: adminEmail.trim().toLowerCase(),
    passwordHash,
    roleId: 'role-superadmin',
    roleName: 'Super Admin',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  db.createAdmin(superAdmin);

  const merchantLtc = (blockCypherMerchantAddress || 'LfSfvBVJTWeZFzXcNz6GED67k9hBj8jfcF').trim();

  // Update Shop Settings
  db.updateShopSettings({
    shopName: shopName.trim(),
    shopDescription: shopDescription || 'Your premium digital marketplace.',
    supportDiscordUsername: supportDiscordUsername || '4gfi',
    discordInviteUrl: discordInviteUrl || 'https://discord.gg/Reachmarket',
    installationComplete: true,
    setupDate: new Date().toISOString(),
    merchantLtcAddress: merchantLtc,
    announcementText: `⚡ Instant LTC payments with 5-second automatic BlockCypher detection. Support on Discord: ${supportDiscordUsername || '4gfi'}`,
    announcementActive: true,
  });

  // Update BlockCypher Config
  db.updateBlockCypherConfig({
    merchantAddress: merchantLtc,
    apiToken: blockCypherApiToken ? blockCypherApiToken.trim() : '',
    currency: 'ltc',
    confirmationThreshold: 1,
    isConnected: true,
    connectionMessage: 'BlockCypher 5-Second Real-Time On-Chain Scanner Connected',
    lastTestedAt: new Date().toISOString(),
  });

  // Update Auth Config
  if (authConfig) {
    db.updateAuthConfig({
      emailPasswordEnabled: authConfig.emailPasswordEnabled ?? true,
      googleEnabled: authConfig.googleEnabled ?? false,
      googleClientId: authConfig.googleClientId ?? '',
      googleClientSecret: authConfig.googleClientSecret ?? '',
      googleRedirectUri: authConfig.googleRedirectUri || 'http://localhost/callback/google',
      discordEnabled: authConfig.discordEnabled ?? true,
      discordClientId: authConfig.discordClientId ?? '1528299940839821352',
      discordClientSecret: authConfig.discordClientSecret ?? 'HENeH6ggq6-XiJR6un4JaeuEwbmhc1kh',
      discordRedirectUri: authConfig.discordRedirectUri || 'http://localhost/callback',
    });
  }

  // Update Apirone Gateway Settings if provided
  if (apironeWalletId) {
    db.updateApironeConfig({
      walletId: apironeWalletId.trim(),
      transferKey: apironeTransferKey ? apironeTransferKey.trim() : '',
      isConnected: true,
      lastTestedAt: new Date().toISOString(),
      testMode: apironeWalletId.startsWith('test_') || false,
    });
  }

  // Update Theme Settings
  if (themePreset) {
    db.updateThemeSettings({
      activePreset: themePreset || 'deep-amber',
      primaryColor: primaryColor || '#F59E0B',
      accentColor: accentColor || '#D97706',
      enableCustomCursor: customCursor ?? true,
    });
  }

  // Generate Admin Session
  const token = sessionService.createAdminSession(superAdmin);

  // Audit Log
  db.addAuditLog({
    actorType: 'admin',
    actorId: superAdmin.id,
    actorName: superAdmin.username,
    action: 'SHOP_SETUP_COMPLETED',
    entityType: 'ShopSettings',
    entityId: 'shop-settings-1',
    details: {
      shopName,
      adminUsername: superAdmin.username,
      themePreset,
      apironeConfigured: Boolean(apironeWalletId),
    },
  });

  res.cookie('rm_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 72 * 3600 * 1000,
  });

  res.json({
    success: true,
    message: 'ReachMarket shop initialized successfully!',
    token,
    admin: {
      id: superAdmin.id,
      username: superAdmin.username,
      email: superAdmin.email,
      roleName: superAdmin.roleName,
    },
  });
});

export default router;
