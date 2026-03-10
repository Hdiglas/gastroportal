import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/db/prisma";

let cachedClient: SupabaseClient | null = null;
let cachedUrl = "";
let cachedKey = "";

export async function getSupabaseSettings() {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: ["supabase_url", "supabase_anon_key", "supabase_reservation_table"],
      },
    },
  });
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  return {
    url: map["supabase_url"] || "",
    anonKey: map["supabase_anon_key"] || "",
    reservationTable: map["supabase_reservation_table"] || "reservations",
  };
}

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  const { url, anonKey } = await getSupabaseSettings();
  if (!url || !anonKey) return null;

  if (cachedClient && cachedUrl === url && cachedKey === anonKey) {
    return cachedClient;
  }

  cachedClient = createClient(url, anonKey);
  cachedUrl = url;
  cachedKey = anonKey;
  return cachedClient;
}
