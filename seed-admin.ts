import dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function seed() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();

  if (!email) {
    console.error("❌ ADMIN_EMAIL not set in .env.local");
    process.exit(1);
  }

  if (!password) {
    console.error("❌ ADMIN_PASSWORD not set in .env.local");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("❌ ADMIN_PASSWORD must be at least 8 characters");
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error("❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
    process.exit(1);
  }

  try {
    console.log(`🌱 Creating admin user: ${email}`);
    const supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { error } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log(`✓ Admin user created successfully`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin user:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

seed();
