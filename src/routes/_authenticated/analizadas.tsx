import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listAnalyzed } from "@/lib/tenders.functions";
import { formatDate, formatMoney } from "@/lib/tender-rules";
import { StatusBadge } from "@/components/tender-ui";

export const Route = createFileRoute("/_authenticated/analizadas")({
  head: () => ({
    meta: [
      { title: "Analizadas — Oportunidades Perú" },
      { name: "description", content: "Historial de oportunidades que analizaste con su puntaje y recomendación." },
      { property: "og:title", content: "Analizadas — Oportunidades Perú" },
      { property: "og:description", content: "Historial de oportunidades que analizaste con su puntaje y recomendación." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyzedPage,
});

const REC: Record<string, string> = { participar: "Recomendado participar", evaluar: "Evaluar con cuidado", no_participar: "No recomendado" };
const FILTERS = [["todas", "Todas"], ["participar", "Participar"], ["evaluar", "Evaluar"], ["no_participar", "No participar"]] as const;

function AnalyzedPage() {
  const fn = useServerFn(listAnalyzed);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["analyzed"], queryFn: () => fn() });
  const [q, setQ] = useState("");
  const [rec, setRec] = useState<string>("todas");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data ?? []).filter(({ tender: t, analysis: a }) =>
      (rec === "todas" || a.recommendation === rec) &&
      (!s || [t.title, t.entity, t.nomenclature].some((x: any) => x?.toLowerCase().includes(s))));
  }, [data, q, rec]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Analizadas</h1>
      <div className="flex flex-wrap items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título, entidad o nomenclatura" aria-label="Buscar en analizadas" className="max-w-sm" />
        {FILTERS.map(([v, l]) => <Button key={v} size="sm" variant={rec === v ? "default" : "outline"} onClick={() => setRec(v)}>{l}</Button>)}
      </div>
      {isLoading && <p role="status">Cargando…</p>}
      {isError && <div role="alert">No se pudo cargar. <Button size="sm" variant="outline" onClick={() => refetch()}>Reintentar</Button></div>}
      {data?.length === 0 && <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">Aún no analizas oportunidades. <Link to="/oportunidades" className="text-primary underline">Explorar oportunidades</Link></div>}
      {!!data?.length && list.length === 0 && <p className="text-sm text-muted-foreground">Ningún análisis coincide con el filtro.</p>}
      <ul className="space-y-3">
        {list.map(({ tender: t, analysis: a, outdated, count }) => (
          <li key={t.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-4">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2"><StatusBadge t={t} /><span className="text-xs text-muted-foreground">Analizada {formatDate(a.created_at)}{count > 1 ? ` · ${count} análisis` : ""}</span></div>
              <Link to="/oportunidades/$id" params={{ id: t.id }} className="block font-medium text-primary hover:underline">{t.title}</Link>
              <p className="text-xs text-muted-foreground">{t.entity} · {formatMoney(t.amount, t.currency)} · Cierre {formatDate(t.closing_at, t.closing_date_only)}</p>
              {outdated && <p className="text-xs font-medium text-destructive">Desactualizado (cambió la oportunidad o tu perfil)</p>}
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold">{a.score ?? "—"}<span className="text-sm text-muted-foreground">/100</span></div>
              <p className="text-xs">{a.recommendation ? REC[a.recommendation] ?? a.recommendation : ""}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
