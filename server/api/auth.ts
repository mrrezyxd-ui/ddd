import { Router } from 'express';
import { db } from '../../lib/database/index.ts';
import { credentials } from '../auth/credentials.ts';
import { sessionService } from '../auth/sessions.ts';
import { CustomerUser } from '../../lib/database/types.ts';

const router = Router();

/**
 * Admin Login
 */
router.post('/admin/login', async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username/Email and Password are required.' });
  }

  let admin = db.getAdminByUsernameOrEmail(identifier);
  if (!admin) {
    const allAdmins = db.getAdmins();
    // Fallback if only 1 admin configured and matches
    if (allAdmins.length === 1 && (
      identifier.toLowerCase() === 'admin' ||
      identifier.toLowerCase() === allAdmins[0].username.toLowerCase() ||
      identifier.toLowerCase() === allAdmins[0].email.toLowerCase()
    )) {
      admin = allAdmins[0];
    }
  }

  if (!admin) {
    return res.status(401).json({ error: 'Invalid credentials or administrator account does not exist.' });
  }

  const isMatch = await credentials.verifyPassword(password, admin.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  // Update last login
  db.updateAdmin(admin.id, { lastLoginAt: new Date().toISOString() });

  const token = sessionService.createAdminSession(admin);

  db.addAuditLog({
    actorType: 'admin',
    actorId: admin.id,
    actorName: admin.username,
    action: 'ADMIN_LOGIN',
    entityType: 'Admin',
    entityId: admin.id,
    details: { ip: req.ip },
  });

  res.cookie('rm_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 72 * 3600 * 1000,
  });

  const role = db.getRoleById(admin.roleId);

  res.json({
    success: true,
    token,
    user: {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: 'admin',
      roleName: admin.roleName,
      permissions: role?.permissions || ['*'],
    },
  });
});

/**
 * Customer Registration
 */
router.post('/customer/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const existing = db.getCustomerByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  const passwordHash = await credentials.hashPassword(password);
  const newCustomer: CustomerUser = {
    id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    username: username.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    balanceLtc: 0,
    balanceUsd: 0,
    oauthProvider: 'email',
    createdAt: new Date().toISOString(),
  };

  db.createCustomer(newCustomer);
  const token = sessionService.createCustomerSession(newCustomer);

  res.cookie('rm_customer_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 72 * 3600 * 1000,
  });

  res.json({
    success: true,
    token,
    user: {
      id: newCustomer.id,
      username: newCustomer.username,
      email: newCustomer.email,
      role: 'customer',
      balanceLtc: 0,
      balanceUsd: 0,
    },
  });
});

/**
 * Customer / Universal Login (also supports Admin logins seamlessly)
 */
router.post('/customer/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // 1. Try finding customer first
  let customer = db.getCustomerByEmail(email);
  if (!customer) {
    const allCustomers = db.getCustomers();
    customer = allCustomers.find(c => c.username.toLowerCase() === email.toLowerCase().trim());
  }

  if (customer && customer.passwordHash) {
    const isMatch = await credentials.verifyPassword(password, customer.passwordHash);
    if (isMatch) {
      const token = sessionService.createCustomerSession(customer);

      res.cookie('rm_customer_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 72 * 3600 * 1000,
      });

      // If this customer email also corresponds to an admin, elevate session info
      const matchingAdmin = db.getAdminByUsernameOrEmail(customer.email);

      return res.json({
        success: true,
        token,
        user: {
          id: customer.id,
          username: customer.username,
          email: customer.email,
          role: matchingAdmin ? 'admin' : 'customer',
          roleName: matchingAdmin ? matchingAdmin.roleName : 'Customer',
          permissions: matchingAdmin ? ['*'] : [],
          balanceLtc: customer.balanceLtc,
          balanceUsd: customer.balanceUsd,
        },
      });
    }
  }

  // 2. If not found in customers or customer password failed, check if it is an Admin logging in
  const admin = db.getAdminByUsernameOrEmail(email);
  if (admin && admin.passwordHash) {
    const isMatch = await credentials.verifyPassword(password, admin.passwordHash);
    if (isMatch) {
      db.updateAdmin(admin.id, { lastLoginAt: new Date().toISOString() });
      const token = sessionService.createAdminSession(admin);
      const role = db.getRoleById(admin.roleId);

      res.cookie('rm_admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 72 * 3600 * 1000,
      });

      return res.json({
        success: true,
        token,
        user: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: 'admin',
          roleName: admin.roleName,
          permissions: role?.permissions || ['*'],
        },
      });
    }
  }

  return res.status(401).json({ error: 'Invalid email/username or password.' });
});

/**
 * Check Active Session / Current User
 */
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const adminCookie = req.cookies?.['rm_admin_token'];
  const custCookie = req.cookies?.['rm_customer_token'];

  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (adminCookie || custCookie);

  const session = sessionService.verifySession(token);
  if (!session) {
    return res.json({ authenticated: false, user: null });
  }

  if (session.type === 'admin') {
    const admin = db.getAdminById(session.id);
    if (!admin) return res.json({ authenticated: false, user: null });
    const role = db.getRoleById(admin.roleId);

    return res.json({
      authenticated: true,
      type: 'admin',
      user: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: 'admin',
        roleName: admin.roleName,
        permissions: role?.permissions || ['*'],
      },
    });
  } else {
    const customer = db.getCustomerById(session.id);
    if (!customer) return res.json({ authenticated: false, user: null });

    const matchingAdmin = db.getAdminByUsernameOrEmail(customer.email);

    return res.json({
      authenticated: true,
      type: matchingAdmin ? 'admin' : 'customer',
      user: {
        id: customer.id,
        username: customer.username,
        email: customer.email,
        role: matchingAdmin ? 'admin' : 'customer',
        roleName: matchingAdmin ? matchingAdmin.roleName : 'Customer',
        permissions: matchingAdmin ? ['*'] : [],
        balanceLtc: customer.balanceLtc,
        balanceUsd: customer.balanceUsd,
      },
    });
  }
});

/**
 * Discord OAuth: Get Authorize URL
 */
router.get('/discord/url', (req, res) => {
  const authConfig = db.getAuthConfig();
  const clientId = (authConfig.discordClientId || process.env.DISCORD_CLIENT_ID || '1528299940839821352').trim();
  
  let redirectUri = (req.query.redirectUri as string) || authConfig.discordRedirectUri || 'http://localhost/callback';
  if (!redirectUri || redirectUri.trim() === '') {
    redirectUri = 'http://localhost/callback';
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'identify email',
  });

  const url = `https://discord.com/oauth2/authorize?${params.toString()}`;
  res.json({ url, clientId, redirectUri });
});

/**
 * Discord OAuth: Exchange Code for Session
 */
router.post('/discord/exchange', async (req, res) => {
  const { code, redirectUri } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'OAuth code is required.' });
  }

  const authConfig = db.getAuthConfig();
  const clientId = (authConfig.discordClientId || process.env.DISCORD_CLIENT_ID || '1528299940839821352').trim();
  const clientSecret = (authConfig.discordClientSecret || process.env.DISCORD_CLIENT_SECRET || 'HENeH6ggq6-XiJR6un4JaeuEwbmhc1kh').trim();
  const finalRedirectUri = redirectUri || authConfig.discordRedirectUri || 'http://localhost/callback';

  try {
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code: String(code),
      redirect_uri: finalRedirectUri,
    });

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Discord token exchange failed:', errText);
      return res.status(400).json({ error: `Discord authentication failed: ${errText}` });
    }

    const tokenData = await tokenRes.json();
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      return res.status(400).json({ error: 'Failed to fetch Discord user profile.' });
    }

    const discordUser = await userRes.json();
    const email = (discordUser.email || `${discordUser.username}@discord.reachmarket`).toLowerCase().trim();
    const username = discordUser.global_name || discordUser.username;

    // Check existing customer
    let customer = db.getCustomerByEmail(email);
    if (!customer) {
      const allCust = db.getCustomers();
      customer = allCust.find(c => c.oauthProviderId === discordUser.id || c.username.toLowerCase() === username.toLowerCase());
    }

    if (!customer) {
      customer = {
        id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        username,
        email,
        balanceLtc: 0,
        balanceUsd: 0,
        oauthProvider: 'discord',
        oauthProviderId: discordUser.id,
        createdAt: new Date().toISOString(),
      };
      db.createCustomer(customer);
    } else {
      db.updateCustomer(customer.id, {
        oauthProvider: 'discord',
        oauthProviderId: discordUser.id,
      });
    }

    // Check if matching Admin
    const matchingAdmin = db.getAdminByUsernameOrEmail(email) || db.getAdminByUsernameOrEmail(username);

    let token: string;
    let roleName = 'Customer';
    let roleType = 'customer';
    let permissions: string[] = [];

    if (matchingAdmin) {
      token = sessionService.createAdminSession(matchingAdmin);
      const role = db.getRoleById(matchingAdmin.roleId);
      roleName = matchingAdmin.roleName;
      roleType = 'admin';
      permissions = role?.permissions || ['*'];
    } else {
      token = sessionService.createCustomerSession(customer);
    }

    res.cookie('rm_customer_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 72 * 3600 * 1000,
    });

    return res.json({
      success: true,
      token,
      user: {
        id: customer.id,
        username: customer.username,
        email: customer.email,
        role: roleType,
        roleName,
        permissions,
        balanceLtc: customer.balanceLtc,
        balanceUsd: customer.balanceUsd,
      },
    });
  } catch (error: any) {
    console.error('Discord auth handler exception:', error);
    return res.status(500).json({ error: error.message || 'Internal server error during Discord auth.' });
  }
});

/**
 * Logout
 */
router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.cookies?.['rm_admin_token'] || req.cookies?.['rm_customer_token']);

  sessionService.revokeSession(token);
  res.clearCookie('rm_admin_token');
  res.clearCookie('rm_customer_token');

  res.json({ success: true, message: 'Logged out successfully.' });
});

export default router;

