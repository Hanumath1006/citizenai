import { handleAuthRedirect } from "@/lib/authRedirect";

/**
 * Alias of /auth/callback. Kept so custom email templates using the
 * `token_hash` style (available once custom SMTP is configured) work too.
 */
export const GET = handleAuthRedirect;
