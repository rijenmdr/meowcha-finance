import "server-only";
import bcrypt from "bcryptjs";
import { getSupabase } from "./supabase";

/**
 * Creates or updates an admin user with a plain password.
 * The password is hashed with bcrypt before storing in the database.
 *
 * Usage in Node.js:
 * ```bash
 * node -e "
 *   require('dotenv').config({ path: '.env.local' });
 *   const { createAdminUser } = require('./dist/lib/admin.js');
 *   createAdminUser('admin@meowcha.local', 'your-password')
 *     .then(() => console.log('Admin user created'))
 *     .catch(err => console.error('Error:', err.message))
 *     .finally(() => process.exit(0));
 * "
 * ```
 */
export async function createAdminUser(email: string, plainPassword: string): Promise<void> {
  if (!email || typeof email !== "string") {
    throw new Error("Invalid email");
  }
  if (!plainPassword || typeof plainPassword !== "string" || plainPassword.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const { error } = await getSupabase()
    .from("admin_users")
    .upsert({ email: normalizedEmail, password_hash: passwordHash });

  if (error) {
    throw new Error(`Failed to create admin user: ${error.message}`);
  }
}
