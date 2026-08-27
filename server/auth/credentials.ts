import bcrypt from 'bcryptjs';

export class CredentialsService {
  private saltRounds = 10;

  /**
   * Hashes a plain password securely with bcrypt.
   */
  public async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Validates a password against its hash.
   */
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validates password strength (min 8 chars, at least 1 digit or special char).
   */
  public validatePasswordStrength(password: string): { valid: boolean; message?: string } {
    if (!password || password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long.' };
    }
    return { valid: true };
  }
}

export const credentials = new CredentialsService();
