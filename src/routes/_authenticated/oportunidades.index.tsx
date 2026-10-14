import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { X, Search, ExternalLink, Sparkles, LoaderCircle, ChevronLeft, ChevronRight, ChevronDown, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { searchSchema, searchTenders, suggestTenders, getFilterOptions, PAGE_SIZE, type SearchParams } from "@/lib/tenders.functions";
import { OBJECT_TYPES, REGION_OPTIONS, formatDate, formatMoney, currencyLabel } from "@/lib/tender-rules";
import { FreshnessNote, SaveButton, StatusBadge } from "@/components/tender-ui";
import { paginationPages } from "@/lib/pagination";

export const Route = createFileRoute("/_authenticated/oportunidades/")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Oportunidades — Oportunidades Perú" },
      { name: "description", content: "Convocatorias vigentes de SEACE con filtros por rubro, objeto, monto, región y cierre." },
      { property: "og:title", content: "Oportunidades — Oportunidades Perú" },
      { property: "og:description", content: "Convocatorias vigentes de SEACE con filtros por rubro, objeto, monto, región y cierre." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OpportunitiesPage,
});

function MultiCheck({ legend, options, value, onChange }: { legend: string; options: { v: string; l: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
        {options.map((o) => {
          const id = `${legend}-${o.v}`;
          return (
            <div key={o.v} className="flex items-start gap-2">
              <Checkbox id={id} checked={value.includes(o.v)} onCheckedChange={(c) => onChange(c ? [...value, o.v] : value.filter((x) => x !== o.v))} className="mt-0.5" />
              <Label htmlFor={id} className="text-sm font-normal leading-tight">{o.l}</Label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

function OpportunitiesPage() {
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/oportunidades/" });
  const search = useServerFn(searchTenders);
  const options = useServerFn(getFilterOptions);
  const suggest = useServerFn(suggestTenders);
  const [suggestions, setSuggestions] = useState<{ ids: string[]; reviewed: number; estado: string } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const activeSuggestions = suggestions?.estado === (params.estado ?? "abiertas") ? suggestions : null;
  async function showSuggestions() {
    setSuggesting(true); setSuggestionError(null);
    try {
      const result = await suggest({ data: { estado: params.estado ?? "abiertas" } });
      setSuggestions({ ...result, estado: params.estado ?? "abiertas" });
      await set({ page: 1 });
    } catch (error) {
      setSuggestionError(error instanceof Error ? error.message : "No se pudieron obtener las sugerencias");
    } finally { setSuggesting(false); }
  }
  const [q, setQ] = useState(params.q ?? "");
  useEffect(() => setQ(params.q ?? ""), [params.q]);

  const set = (patch: Partial<SearchParams>) => navigate({ search: (prev) => ({ ...prev, ...patch, page: patch.page ?? undefined }) });
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["search", params, activeSuggestions?.ids], queryFn: () => search({ data: { ...params, suggestionIds: activeSuggestions?.ids } }), placeholderData: keepPreviousData,
  });
  const opts = useQuery({ queryKey: ["filter-options"], queryFn: () => options(), staleTime: 3600_000 });
  const segName = new Map((opts.data?.segments ?? []).map((s) => [s.code, s.title]));

  const chips: { label: string; clear: () => void }[] = [];
  if (params.q) chips.push({ label: `Texto: ${params.q}`, clear: () => set({ q: undefined }) });
   params.objeto?.forEach((o) => chips.push({ label: o, clear: () => set({ objeto: params.objeto?.filter((x) => x !== o) }) }));
   params.rubro?.forEach((o) => chips.push({ label: `Rubro: ${segName.get(o) ?? o}`, clear: () => set({ rubro: params.rubro?.filter((x) => x !== o) }) }));
   params.region?.forEach((o) => chips.push({ label: `Región: ${o}`, clear: () => set({ region: params.region?.filter((x) => x !== o) }) }));
  if (params.min != null) chips.push({ label: `Mín ${params.min}`, clear: () => set({ min: undefined }) });
  if (params.max != null) chips.push({ label: `Máx ${params.max}`, clear: () => set({ max: undefined }) });
  if (params.moneda) chips.push({ label: currencyLabel(params.moneda), clear: () => set({ moneda: undefined }) });
  if (params.cierreDesde) chips.push({ label: `Cierre desde ${params.cierreDesde}`, clear: () => set({ cierreDesde: undefined }) });
  if (params.cierreHasta) chips.push({ label: `Cierre hasta ${params.cierreHasta}`, clear: () => set({ cierreHasta: undefined }) });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const page = params.page ?? 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Oportunidades</h1>
          <p className="text-sm text-muted-foreground">
            Fuente: <a className="underline" href="https://prod4.seace.gob.pe/openegocio/#/buscar" target="_blank" rel="noreferrer">SEACE – Oportunidades de negocio</a> (bienes, servicios, obras y consultorías vigentes).
          </p>
        </div>
        {data?.lastOk && <FreshnessNote checked={data.lastOk.finished_at} />}
      </div>
      {data?.lastSync?.status === "error" && (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          La última actualización desde SEACE falló. Mostramos la última copia real guardada{data.lastOk ? ` (${formatDate(data.lastOk.finished_at)})` : ""}.
        </div>
      )}

      <form role="search" className="flex gap-2" onSubmit={(e) => { e.preventDefault(); set({ q: q.trim() || undefined }); }}>
        <Label htmlFor="q" className="sr-only">Buscar por título, descripción o entidad</Label>
        <Input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título, descripción o entidad" />
        <Button type="submit"><Search className="h-4 w-4" aria-hidden />Buscar</Button>
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={showSuggestions} disabled={suggesting || !!activeSuggestions} aria-busy={suggesting}>
          {suggesting ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
          {suggesting ? "Buscando sugerencias…" : "Mostrar sugerencias para mi"}
        </Button>
        {activeSuggestions && <Button variant="outline" onClick={() => { setSuggestions(null); set({ page: 1 }); }}>Ver todas las oportunidades</Button>}
        {activeSuggestions && <span className="text-sm text-primary" role="status">Sugerencias para mi empresa · {activeSuggestions.ids.length} coincidencias</span>}
      </div>
      {suggestionError && <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">{suggestionError} <Link to="/mi-empresa" className="underline">Mi empresa</Link></div>}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside aria-label="Filtros" className="rounded-lg border bg-card p-4">
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            aria-controls="filtros-contenido"
            className="flex w-full items-center justify-between lg:hidden"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              Filtros
              {chips.length > 0 && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{chips.length}</span>
              )}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${filtersOpen ? "rotate-180" : ""}`} aria-hidden />
          </button>
          <div id="filtros-contenido" className={filtersOpen ? "mt-4 space-y-5 lg:mt-0" : "hidden space-y-5 lg:mt-0 lg:block"}>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Estado</legend>
            {(["abiertas", "todas"] as const).map((v) => (
              <label key={v} className="flex items-center gap-2 text-sm">
                <input type="radio" name="estado" checked={(params.estado ?? "abiertas") === v} onChange={() => set({ estado: v === "abiertas" ? undefined : v })} />
                {v === "abiertas" ? "Solo abiertas (cierre futuro)" : "Todas, incluidas cerradas y por confirmar"}
              </label>
            ))}
          </fieldset>
          <MultiCheck legend="Objeto" options={OBJECT_TYPES.map((o) => ({ v: o, l: o }))} value={params.objeto ?? []} onChange={(v) => set({ objeto: v.length ? v : undefined })} />
          <MultiCheck legend="Rubro (segmento CUBSO)" options={(opts.data?.segments ?? []).map((s) => ({ v: s.code, l: s.title }))} value={params.rubro ?? []} onChange={(v) => set({ rubro: v.length ? v : undefined })} />
          <MultiCheck legend="Región" options={REGION_OPTIONS.map((o) => ({ v: o, l: o }))} value={params.region ?? []} onChange={(v) => set({ region: v.length ? v : undefined })} />
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Monto del procedimiento</legend>
            <div className="grid grid-cols-2 gap-2">
              <div><Label htmlFor="min" className="text-xs">Mínimo</Label><Input id="min" type="number" min={0} defaultValue={params.min} onBlur={(e) => set({ min: e.target.value ? Number(e.target.value) : undefined })} /></div>
              <div><Label htmlFor="max" className="text-xs">Máximo</Label><Input id="max" type="number" min={0} defaultValue={params.max} onBlur={(e) => set({ max: e.target.value ? Number(e.target.value) : undefined })} /></div>
            </div>
            <Label htmlFor="moneda" className="text-xs">Moneda</Label>
            <select id="moneda" className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={params.moneda ?? ""} onChange={(e) => set({ moneda: e.target.value || undefined })}>
              <option value="">Todas</option><option value="Soles">S/</option><option value="Dólares">US$</option>
            </select>
            <p className="text-xs text-muted-foreground">Sin conversión de moneda. Los procedimientos sin monto publicado no aparecen al filtrar por monto.</p>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Fecha de cierre (presentación de ofertas)</legend>
            <Label htmlFor="cd" className="text-xs">Desde</Label>
            <Input id="cd" type="date" value={params.cierreDesde ?? ""} onChange={(e) => set({ cierreDesde: e.target.value || undefined })} />
            <Label htmlFor="ch" className="text-xs">Hasta</Label>
            <Input id="ch" type="date" value={params.cierreHasta ?? ""} onChange={(e) => set({ cierreHasta: e.target.value || undefined })} />
          </fieldset>
          </div>
        </aside>

        <section aria-label="Resultados" className="min-w-0 space-y-3">
          {chips.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Filtros activos">
              {chips.map((c) => (
                <li key={c.label}><button onClick={c.clear} className="inline-flex items-center gap-1 rounded-full border bg-secondary px-2.5 py-1 text-xs text-secondary-foreground hover:bg-accent" aria-label={`Quitar filtro ${c.label}`}>{c.label}<X className="h-3 w-3" aria-hidden /></button></li>
              ))}
              <li><button className="px-2 py-1 text-xs underline" onClick={() => navigate({ search: {} })}>Limpiar todo</button></li>
            </ul>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p aria-live="polite">{data ? `${data.total.toLocaleString("es-PE")} resultados` : "Cargando…"}{isFetching && data ? " · actualizando…" : ""}</p>
            <label className="flex items-center gap-2">Ordenar por
              <select className="h-8 rounded-md border bg-background px-2" value={params.orden ?? "cierre"} onChange={(e) => set({ orden: e.target.value === "cierre" ? undefined : "publicacion" })}>
                <option value="cierre">Cierre más próximo</option><option value="publicacion">Publicación más reciente</option>
              </select>
            </label>
          </div>

          {isError && <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">No se pudo cargar el catálogo. <Button size="sm" variant="outline" onClick={() => refetch()}>Reintentar</Button></div>}
          {data && data.rows.length === 0 && <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">{activeSuggestions ? "No hay sugerencias para tu empresa con estos filtros." : "No hay oportunidades con estos filtros."}</div>}

          {data && data.rows.length > 0 && (
            <>
              <div className="hidden overflow-x-auto rounded-lg border bg-card md:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3">Oportunidad</th><th className="p-3">Objeto</th><th className="p-3">Monto</th><th className="p-3">Región</th><th className="p-3">Cierre</th><th className="p-3">Estado</th><th className="p-3"><span className="sr-only">Acciones</span></th></tr>
                  </thead>
                  <tbody>
                    {data.rows.map((t) => (
                      <tr key={t.id} className="border-t align-top hover:bg-muted/50">
                        <td className="max-w-md p-3">
                          <Link to="/oportunidades/$id" params={{ id: t.id }} className="line-clamp-2 font-medium text-primary hover:underline">{t.title}</Link>
                          <p className="mt-1 text-xs text-muted-foreground">{t.entity} · {t.nomenclature}</p>
                        </td>
                        <td className="p-3">{t.object_type}<p className="text-xs text-muted-foreground">{t.procedure_type}</p></td>
                        <td className="whitespace-nowrap p-3">{formatMoney(t.amount, t.currency)}</td>
                        <td className="p-3 text-xs">{t.regions.join(", ") || "No informado"}</td>
                        <td className="whitespace-nowrap p-3">{formatDate(t.closing_at, t.closing_date_only)}</td>
                        <td className="p-3"><StatusBadge t={t} /></td>
                        <td className="p-3"><SaveButton tenderId={t.id} saved={t.saved} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="space-y-3 md:hidden">
                {data.rows.map((t) => (
                  <li key={t.id} className="rounded-lg border bg-card p-4">
                    <div className="flex items-start justify-between gap-2"><StatusBadge t={t} /><span className="text-xs text-muted-foreground">{t.object_type}</span></div>
                    <Link to="/oportunidades/$id" params={{ id: t.id }} className="mt-2 block font-medium text-primary hover:underline">{t.title}</Link>
                    <p className="mt-1 text-xs text-muted-foreground">{t.entity}</p>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div><dt className="text-muted-foreground">Monto</dt><dd>{formatMoney(t.amount, t.currency)}</dd></div>
                      <div><dt className="text-muted-foreground">Cierre</dt><dd>{formatDate(t.closing_at, t.closing_date_only)}</dd></div>
                      <div className="col-span-2"><dt className="text-muted-foreground">Región</dt><dd>{t.regions.join(", ")}</dd></div>
                    </dl>
                    <div className="mt-3"><SaveButton tenderId={t.id} saved={t.saved} /></div>
                  </li>
                ))}
              </ul>
              <nav aria-label="Paginación" className="flex flex-wrap items-center justify-center gap-1.5">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => set({ page: page - 1 })} aria-label="Página anterior"><ChevronLeft className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Anterior</span></Button>
                {paginationPages(page, totalPages).map((entry, index) => entry === "ellipsis" ? (
                  <span key={`gap-${index}`} className="flex h-9 w-6 shrink-0 items-center justify-center text-muted-foreground" aria-hidden="true">…</span>
                ) : (
                  <Button key={entry} variant={entry === page ? "default" : "ghost"} size="sm" className="h-9 min-w-9 shrink-0 px-2" aria-label={`Ir a la página ${entry}`} aria-current={entry === page ? "page" : undefined} onClick={() => set({ page: entry })}>{entry}</Button>
                ))}
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => set({ page: page + 1 })} aria-label="Página siguiente"><span className="hidden sm:inline">Siguiente</span><ChevronRight className="h-4 w-4" aria-hidden /></Button>
              </nav>
            </>
          )}
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><ExternalLink className="h-3 w-3" aria-hidden />Región = ubicación registrada por SEACE para cada ítem. Confirma el lugar de ejecución en las bases.</p>
        </section>
      </div>
    </div>
  );
}
