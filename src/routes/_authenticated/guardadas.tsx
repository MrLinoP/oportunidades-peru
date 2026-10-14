import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { listSaved } from "@/lib/tenders.functions";
import { formatDate, formatMoney } from "@/lib/tender-rules";
import { SaveButton, StatusBadge } from "@/components/tender-ui";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { matchesSavedSearch } from "@/lib/saved-search";

export const Route = createFileRoute("/_authenticated/guardadas")({
  head: () => ({
    meta: [
      { title: "Guardadas — Oportunidades Perú" },
      { name: "description", content: "Tus oportunidades guardadas y su último análisis." },
      { property: "og:title", content: "Guardadas — Oportunidades Perú" },
      { property: "og:description", content: "Tus oportunidades guardadas y su último análisis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  const [query, setQuery] = useState("");
  const fn = useServerFn(listSaved);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["saved"], queryFn: () => fn() });
  const filtered = data?.filter(({ tender }) => matchesSavedSearch(tender, query));
  return (
    <div className="min-w-0 space-y-4">
      <h1 className="text-2xl font-semibold">Guardadas</h1>
      <form role="search" className="relative min-w-0" onSubmit={(event) => event.preventDefault()}>
        <Label htmlFor="saved-search" className="sr-only">Buscar guardadas por título, entidad, nomenclatura, objeto o región</Label>
        <Search aria-hidden className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input id="saved-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título, entidad, nomenclatura, objeto o región" className="pl-9" />
      </form>
      {isLoading && <p role="status">Cargando…</p>}
      {isError && <div role="alert">No se pudo cargar. <Button size="sm" variant="outline" onClick={() => refetch()}>Reintentar</Button></div>}
      {data?.length === 0 && <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">Aún no guardas oportunidades. <Link to="/oportunidades" className="text-primary underline">Explorar oportunidades</Link></div>}
      {!!data?.length && <p role="status" className="text-sm text-muted-foreground">{filtered?.length ?? 0} oportunidades guardadas</p>}
      {!!data?.length && filtered?.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No hay oportunidades guardadas que coincidan con tu búsqueda.</p>}
      <ul className="space-y-3">
        {filtered?.map(({ tender: t, analysis, outdated, savedAt }) => (
          <li key={t.id} className="flex min-w-0 flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-4 [overflow-wrap:anywhere]">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2"><StatusBadge t={t} /><span className="text-xs text-muted-foreground">Guardada {formatDate(savedAt)}</span></div>
              <Link to="/oportunidades/$id" params={{ id: t.id }} className="block font-medium text-primary hover:underline">{t.title}</Link>
              <p className="text-xs text-muted-foreground">{t.entity} · {formatMoney(t.amount, t.currency)} · Cierre {formatDate(t.closing_at, t.closing_date_only)}</p>
              <p className="text-xs">{analysis ? <>Último análisis {formatDate(analysis.created_at)}{outdated && <strong className="ml-1 text-destructive">· Desactualizado (cambió la oportunidad o tu perfil)</strong>}</> : "Sin análisis"}</p>
            </div>
            <SaveButton tenderId={t.id} saved />
          </li>
        ))}
      </ul>
    </div>
  );
}
