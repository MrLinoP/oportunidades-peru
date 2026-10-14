import { createFileRoute } from "@tanstack/react-router";

// Proxies a public official SEACE document that is already registered in our catalog.
// Only URLs stored by the sync (official SEACE host) can be fetched; no arbitrary URLs.
export const Route = createFileRoute("/api/public/documents/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new Response("No encontrado", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: doc } = await supabaseAdmin.from("documents").select("url, file_name, storage_path").eq("id", params.id).single();
        if (doc?.storage_path) {
          const { data: signed } = await supabaseAdmin.storage.from("tender-documents").createSignedUrl(doc.storage_path, 300, { download: doc.file_name ?? true });
          return signed ? Response.redirect(signed.signedUrl, 302) : new Response("No encontrado", { status: 404 });
        }
        if (!doc || !doc.url.startsWith("https://prod1.seace.gob.pe/")) return new Response("No encontrado", { status: 404 });
        const { seaceFetch } = await import("@/lib/seace.server");
        try {
          const res = await seaceFetch(doc.url, { headers: { Accept: "*/*" } }, 2);
          // SEACE sometimes blocks server-side downloads (403); fall back to the official link in the user's browser.
          if (!res.ok || !res.body) return Response.redirect(doc.url, 302);
          const name = doc.file_name ?? /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "documento";
          return new Response(res.body, {
            headers: {
              "content-type": res.headers.get("content-type") ?? "application/octet-stream",
              "content-disposition": `attachment; filename="${name.replace(/"/g, "")}"`,
              ...(res.headers.get("content-length") ? { "content-length": res.headers.get("content-length")! } : {}),
            },
          });
        } catch {
          return Response.redirect(doc.url, 302);
        }
      },
    },
  },
});
