import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Accepts LOVABLE_CRON_SECRET or the DB-held sync token used by the daily pg_cron job. */
async function isScheduledCaller(request: Request): Promise<boolean> {
  const token = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token || token.length < 32) return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("internal_settings").select("value").eq("key", "sync_token").maybeSingle();
  if (!data?.value) return false;
  const { createHash, timingSafeEqual } = await import("node:crypto");
  const d = (v: string) => createHash("sha256").update(v, "utf8").digest();
  return timingSafeEqual(d(token), d(data.value));
}

export const Route = createFileRoute("/api/public/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await isScheduledCaller(request))) {
          const denied = await authenticateCronRequest(request);
          if (denied) return denied;
        }
        const { runSeaceSync } = await import("@/lib/sync.server");
        const result = await runSeaceSync();
        return Response.json(result, { status: result.ok ? 200 : 502 });
      },
    },
  },
});
