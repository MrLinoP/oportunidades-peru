import { createFileRoute } from "@tanstack/react-router";

// Proxies a public official SEACE document that is already registered in our catalog.
// Only URLs stored by the sync (official SEACE host) can be fetched; no arbitrary URLs.
export const Route = createFileRoute("/api/public/documents/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new Response("No encontrado", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: doc } = await supabaseAdmin.from("documents").select("url, file_name").eq("id", params.id).single();
        if (!doc || !doc.url.startsWith("https://prod1.seace.gob.pe/")) return new Response("No encontrado", { status: 404 });
        const { seaceFetch } = await import("@/lib/seace.server");
        try {
          const res = await seaceFetch(doc.url, { headers: { Accept: "*/*" } }, 2);
          if (!res.ok || !res.body) return new Response("La fuente oficial no entregó el documento. Intente más tarde.", { status: 502 });
          const name = doc.file_name ?? /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "documento";
          return new Response(res.body, {
            headers: {
              "content-type": res.headers.get("content-type") ?? "application/octet-stream",
              "content-disposition": `attachment; filename="${name.replace(/"/g, "")}"`,
              ...(res.headers.get("content-length") ? { "content-length": res.headers.get("content-length")! } : {}),
            },
          });
        } catch {
          return new Response("Fuente oficial no disponible. Intente más tarde.", { status: 502 });
        }
      },
    },
  },
});
