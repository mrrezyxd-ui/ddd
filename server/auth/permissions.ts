import { Request, Response, NextFunction } from 'express';
import { db } from '../../lib/database/index.ts';
import { sessionService } from './sessions.ts';
import { AdminUser, CustomerUser } from '../../lib/database/types.ts';

export interface AuthenticatedRequest extends Request {
  admin?: AdminUser;
  customer?: CustomerUser;
  adminPermissions?: string[];
}

/**
 * Middleware: Requires an active Admin session.
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.['rm_admin_token'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookieToken;

  const session = sessionService.verifySession(token);
  if (!session || session.type !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized. Admin login required.' });
  }

  const admin = db.getAdminById(session.id);
  if (!admin) {
    return res.status(401).json({ error: 'Admin account not found or removed.' });
  }

  const role = db.getRoleById(admin.roleId);
  req.admin = admin;
  req.adminPermissions = role?.permissions || [];
  next();
}

/**
 * Middleware: Checks specific permission.
 */
export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const perms = req.adminPermissions || [];
    if (perms.includes('*') || perms.includes(permission)) {
      return next();
    }

    // Check wildcard prefix (e.g. "products.*" matches "products.create")
    const [domain] = permission.split('.');
    if (perms.includes(`${domain}.*`)) {
      return next();
    }

    return res.status(403).json({
      error: `Forbidden. Missing required permission: ${permission}`,
    });
  };
}

/**
 * Middleware: Optional customer authentication (populates req.customer if present).
 */
export function optionalCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.['rm_customer_token'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookieToken;

  const session = sessionService.verifySession(token);
  if (session && session.type === 'customer') {
    req.customer = db.getCustomerById(session.id);
  }
  next();
}
