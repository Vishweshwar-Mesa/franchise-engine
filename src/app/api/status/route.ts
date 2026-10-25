import { aiConfigured } from "@/lib/server/openrouter";
import { supabaseAdmin } from "@/lib/server/supabase";
import { connection } from "next/server";

// Which optional services are configured. Never returns values, only true/false.
export async function GET() {
  await connection();
  return Response.json({
    ai: aiConfigured(),
    supabase: supabaseAdmin() !== null,
    places: !!process.env.GOOGLE_MAPS_API_KEY,
    email: !!process.env.RESEND_API_KEY && !!process.env.REVIEWER_EMAIL,
  });
}
