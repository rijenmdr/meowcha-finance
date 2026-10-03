import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getAuthEnv() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set");
    }

    return { url, anonKey };
}

export async function createSupabaseServerAuthClient() {
    const cookieStore = await cookies();
    const { url, anonKey } = getAuthEnv();

    return createServerClient(url, anonKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                    });
                } catch {
                    // Read-only server contexts cannot persist refreshed cookies.
                }
            },
        },
    });
}

export async function requireSupabaseUser() {
    const supabase = await createSupabaseServerAuthClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(error.message);

    const user = data.user;
    if (!user?.email) throw new Error("Unauthorized");

    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (adminEmail && user.email.toLowerCase() !== adminEmail) {
        throw new Error("Unauthorized");
    }

    return user;
}