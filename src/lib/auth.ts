import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { db } from './db';

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'viewer';
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function getUserByUsername(username: string): { id: number; username: string; password_hash: string; role: string } | undefined {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
}

export function createSession(userId: number): { token: string; expiresAt: string } {
  const token = crypto.randomBytes(32).toString('hex');
  // 7 days expiry
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)').run(userId, token, expiresAt);
  // Clean old sessions for this user
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND expires_at < ?').run(userId, new Date().toISOString());
  return { token, expiresAt };
}

export function validateSession(token: string): User | null {
  const row = db.prepare(
    `SELECT s.id, s.expires_at, u.id as user_id, u.username, u.role
     FROM sessions s JOIN users u ON s.user_id = u.id
     WHERE s.token = ?`
  ).get(token) as any;

  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(row.id);
    return null;
  }

  return { id: row.user_id, username: row.username, role: row.role as 'admin' | 'viewer' };
}

export function deleteSession(token: string): void {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

/** Clean all expired sessions */
export function cleanExpiredSessions(): void {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(new Date().toISOString());
}
