import crypto from 'crypto';
import { db } from '../../lib/database/index.ts';
import { AdminUser, CustomerUser } from '../../lib/database/types.ts';

export interface SessionPayload {
  type: 'admin' | 'customer';
  id: string;
  email: string;
  username: string;
  role?: string;
  roleId?: string;
  roleName?: string;
  permissions?: string[];
  expiresAt: number;
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'reachmarket-super-secure-session-key-2026';
const sessionsStore = new Map<string, SessionPayload>();

export class SessionService {
  private sign(payloadStr: string): string {
    return crypto.createHmac('sha256', SESSION_SECRET).update(payloadStr).digest('hex');
  }

  /**
   * Generates a signed session token for an Admin user.
   */
  public createAdminSession(admin: AdminUser, ttlHours = 72): string {
    const expiresAt = Date.now() + ttlHours * 60 * 60 * 1000;
    const role = db.getRoleById(admin.roleId);
    const payload: SessionPayload = {
      type: 'admin',
      id: admin.id,
      email: admin.email,
      username: admin.username,
      role: 'admin',
      roleId: admin.roleId,
      roleName: admin.roleName,
      permissions: role?.permissions || ['*'],
      expiresAt,
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = this.sign(payloadBase64);
    const token = `${payloadBase64}.${signature}`;

    sessionsStore.set(token, payload);
    return token;
  }

  /**
   * Generates a signed session token for a Customer user.
   */
  public createCustomerSession(customer: CustomerUser, ttlHours = 72): string {
    const expiresAt = Date.now() + ttlHours * 60 * 60 * 1000;
    const payload: SessionPayload = {
      type: 'customer',
      id: customer.id,
      email: customer.email,
      username: customer.username,
      role: 'customer',
      expiresAt,
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = this.sign(payloadBase64);
    const token = `${payloadBase64}.${signature}`;

    sessionsStore.set(token, payload);
    return token;
  }

  /**
   * Verifies a session token, either from memory or by cryptographic signature.
   */
  public verifySession(token?: string): SessionPayload | null {
    if (!token || typeof token !== 'string') return null;

    // Check fast cache first
    const cached = sessionsStore.get(token);
    if (cached) {
      if (Date.now() > cached.expiresAt) {
        sessionsStore.delete(token);
        return null;
      }
      return cached;
    }

    // Verify cryptographic signature
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadBase64, signature] = parts;
    const expectedSig = this.sign(payloadBase64);
    if (signature !== expectedSig) return null;

    try {
      const payload: SessionPayload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8'));
      if (Date.now() > payload.expiresAt) return null;

      // Verify that the user still exists in DB
      if (payload.type === 'admin') {
        const admin = db.getAdminById(payload.id);
        if (!admin) return null;
      } else {
        const customer = db.getCustomerById(payload.id);
        if (!customer) return null;
      }

      sessionsStore.set(token, payload);
      return payload;
    } catch {
      return null;
    }
  }

  public revokeSession(token?: string): void {
    if (token) {
      sessionsStore.delete(token);
    }
  }
}

export const sessionService = new SessionService();

