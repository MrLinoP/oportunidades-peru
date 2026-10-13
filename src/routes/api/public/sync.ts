import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { runSeaceSync } = await import("@/lib/sync.server");
        const result = await runSeaceSync();
        return Response.json(result, { status: result.ok ? 200 : 502 });
      },
    },
  },
});
