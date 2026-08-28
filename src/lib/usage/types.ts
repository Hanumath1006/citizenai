import type { Provider } from "@/lib/usage/pricing";

/**
 * The narrow slice of the usage recorder that the API wrappers depend on.
 *
 * The wrappers (places, routes, weather, planner) import this as a *type
 * only*, so instrumenting them costs nothing at runtime and never drags the
 * Supabase client into their module graph.
 */
export interface CallRecorder {
  recordFlat(args: {
    provider: Provider;
    operation: string;
    unitPrice: number;
    units?: number;
    latencyMs?: number;
    ok?: boolean;
    statusCode?: number;
  }): void;

  recordGemini(args: {
    operation: string;
    tokensIn: number;
    tokensOut: number;
    latencyMs: number;
    ok: boolean;
    statusCode?: number;
  }): void;
}
