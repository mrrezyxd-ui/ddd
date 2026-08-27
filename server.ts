import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import setupRoutes from './server/api/setup.ts';
import authRoutes from './server/api/auth.ts';
import storeRoutes from './server/api/store.ts';
import checkoutRoutes from './server/api/checkout.ts';
import apironeRoutes from './server/api/apirone.ts';
import adminRoutes from './server/api/admin.ts';
import { rateLimiter } from './server/security/rateLimit.ts';
import { db } from './lib/database/index.ts';
import { sessionService } from './server/auth/sessions.ts';

async function handleOAuthCallback(req: express.Request, res: express.Response) {
  const code = req.query.code as string;
  const error = req.query.error as string;
  const errorDesc = req.query.error_description as string;

  if (error || !code) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Discord Auth - ReachMarket</title>
          <style>
            body { background: #09090b; color: #f4f4f5; font-family: ui-sans-serif, system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .box { background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 32px; text-align: center; max-width: 420px; }
            h2 { color: #ef4444; margin-top: 0; }
            p { color: #a1a1aa; font-size: 14px; }
            a { display: inline-block; margin-top: 16px; background: #27272a; color: white; padding: 8px 18px; border-radius: 8px; text-decoration: none; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="box">
            <h2>Authentication Failed</h2>
            <p>${errorDesc || error || 'No authorization code was provided by Discord.'}</p>
            <a href="/">Return to Store</a>
          </div>
        </body>
      </html>
    `);
  }

  const authConfig = db.getAuthConfig();
  const clientId = (authConfig.discordClientId || process.env.DISCORD_CLIENT_ID || '1528299940839821352').trim();
  const clientSecret = (authConfig.discordClientSecret || process.env.DISCORD_CLIENT_SECRET || 'HENeH6ggq6-XiJR6un4JaeuEwbmhc1kh').trim();

  const currentUrl = `${req.protocol}://${req.get('host')}${req.path}`;
  const redirectCandidates = [
    authConfig.discordRedirectUri || 'http://localhost/callback',
    'http://localhost/callback',
    'http://localhost:3000/callback',
    'http://localhost:3000/auth/callback/discord',
    currentUrl,
  ];

  let tokenData: any = null;
  let exchangeError = '';

  for (const rUri of redirectCandidates) {
    try {
      const tokenParams = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: rUri,
      });

      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
      });

      if (tokenRes.ok) {
        tokenData = await tokenRes.json();
        break;
      } else {
        exchangeError = await tokenRes.text();
      }
    } catch (e: any) {
      exchangeError = e.message;
    }
  }

  if (!tokenData || !tokenData.access_token) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Discord Auth - ReachMarket</title>
          <style>
            body { background: #09090b; color: #f4f4f5; font-family: ui-sans-serif, system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .box { background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 32px; text-align: center; max-width: 440px; }
            h2 { color: #ef4444; margin-top: 0; }
            p { color: #a1a1aa; font-size: 13px; }
            code { display: block; background: #09090b; padding: 10px; border-radius: 8px; text-align: left; font-size: 11px; margin: 12px 0; color: #f87171; overflow-x: auto; }
            a { display: inline-block; background: #ef4444; color: white; padding: 10px 20px; border-radius: 10px; text-decoration: none; font-size: 13px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="box">
            <h2>Discord Token Exchange Failed</h2>
            <p>Could not exchange the Discord authorization code. Ensure <code>http://localhost/callback</code> is registered in your Discord Developer Application.</p>
            <code>${exchangeError || 'Invalid grant or redirect URI mismatch'}</code>
            <a href="/">Return to Store</a>
          </div>
        </body>
      </html>
    `);
  }

  try {
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const discordUser = await userRes.json();
    const email = (discordUser.email || `${discordUser.username}@discord.reachmarket`).toLowerCase().trim();
    const username = discordUser.global_name || discordUser.username;

    let customer = db.getCustomerByEmail(email);
    if (!customer) {
      const allCust = db.getCustomers();
      customer = allCust.find((c) => c.oauthProviderId === discordUser.id || c.username.toLowerCase() === username.toLowerCase());
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

    const userObj = {
      id: customer.id,
      username: customer.username,
      email: customer.email,
      role: roleType,
      roleName,
      permissions,
      balanceLtc: customer.balanceLtc,
      balanceUsd: customer.balanceUsd,
    };

    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Discord Authentication - ReachMarket</title>
          <style>
            body { background: #09090b; color: #f4f4f5; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 32px; text-align: center; max-width: 420px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
            .badge { display: inline-flex; align-items: center; gap: 8px; background: #5865F2; color: white; padding: 6px 16px; border-radius: 9999px; font-weight: 600; font-size: 13px; margin-bottom: 16px; }
            h1 { font-size: 20px; font-weight: 700; margin: 0 0 8px; color: #ffffff; }
            p { font-size: 13px; color: #a1a1aa; margin: 0 0 20px; }
            a { display: inline-block; background: #ef4444; color: white; text-decoration: none; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
              Discord Connected
            </div>
            <h1>Welcome, ${username}!</h1>
            <p>Signed in successfully. Returning to ReachMarket...</p>
            <a href="/?token=${encodeURIComponent(token)}">Return to Store</a>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'OAUTH_AUTH_SUCCESS',
                  token: ${JSON.stringify(token)},
                  user: ${JSON.stringify(userObj)}
                }, '*');
                setTimeout(function() { window.close(); }, 400);
              } else {
                window.location.href = '/?token=' + encodeURIComponent(${JSON.stringify(token)});
              }
            } catch(e) {
              window.location.href = '/?token=' + encodeURIComponent(${JSON.stringify(token)});
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    return res.status(500).send(`Authentication error: ${err.message}`);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic Middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'ReachMarket',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // OAuth Callback Endpoints
  const callbackPaths = [
    '/callback',
    '/callback/',
    '/auth/callback',
    '/auth/callback/',
    '/auth/callback/discord',
    '/auth/callback/discord/',
    '/api/auth/discord/callback',
  ];
  app.get(callbackPaths, handleOAuthCallback);

  // Apply rate limiter to sensitive endpoints
  app.use('/api/auth', rateLimiter(40, 60000));
  app.use('/api/checkout', rateLimiter(60, 60000));

  // Mount API Routers
  app.use('/api/setup', setupRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/store', storeRoutes);
  app.use('/api/checkout', checkoutRoutes);
  app.use('/api/apirone', apironeRoutes);
  app.use('/api/admin', adminRoutes);

  // Vite middleware for development vs Static file serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ ReachMarket server active at http://0.0.0.0:${PORT}`);
  });
}

startServer();
