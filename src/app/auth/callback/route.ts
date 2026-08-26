import { handleAuthRedirect } from "@/lib/authRedirect";

/**
 * Return target for OAuth sign-in and for Supabase's default email
 * templates (verification + password recovery).
 */
export const GET = handleAuthRedirect;
