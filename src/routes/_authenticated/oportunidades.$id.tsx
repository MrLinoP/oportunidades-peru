import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Download, ExternalLink, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { analyzeTender, getTender } from "@/lib/tenders.functions";
import { toast } from "sonner";
import { formatDate, formatMoney, currencyDescription, formatStageRange } from "@/lib/tender-rules";
import { FreshnessNote, SaveButton, StatusBadge } from "@/components/tender-ui";

export const Route = createFileRoute("/_authenticated/oportunidades/$id")({
  head: () => ({
    meta: [
      { title: "Detalle de oportunidad — Oportunidades Perú" },
      { name: "description", content: "Datos oficiales, cronograma, bases y análisis de una contratación pública." },
      { property: "og:title", content: "Detalle de oportunidad — Oportunidades Perú" },
      { property: "og:description", content: "Datos oficiales, cronograma, bases y análisis de una contratación pública." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DetailPage,
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-0.5 text-sm">{children ?? "No informado"}</dd></div>;
}

function DetailPage() {
  const { id } = Route.useParams();
  const fn = useServerFn(getTender);
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("resumen");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const analyzeFn = useServerFn(analyzeTender);
  async function analyze() {
    setAnalyzing(true); setAnalyzeError(null); setTab("analisis");
    try {
      const a = await analyzeFn({ data: { tenderId: id } });
      qc.setQueryData(["tender", id], (old: any) => old ? { ...old, analysis: a } : old);
      qc.invalidateQueries({ queryKey: ["saved"] });
      toast.success("Análisis listo");
    } catch (e: any) { setAnalyzeError(e?.message ?? "No se pudo analizar"); }
    finally { setAnalyzing(false); }
  }
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["tender", id], queryFn: () => fn({ data: { id } }) });

  if (isLoading) return <p role="status">Cargando oportunidad…</p>;
  if (isError) return <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-4">No se pudo cargar. <Button size="sm" variant="outline" onClick={() => refetch()}>Reintentar</Button></div>;
  if (!data) return <p>Oportunidad no encontrada. <Link to="/oportunidades" className="underline">Volver</Link></p>;
  const { tender: t, items, documents } = data;
  const sched = (t.schedule as any) ?? null;

  return (
    <article className="space-y-5">
      <Link to="/oportunidades" className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden />Volver a oportunidades</Link>
      <header className="space-y-3 rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-center gap-3"><StatusBadge t={t} /><FreshnessNote checked={t.last_checked_at} /></div>
        <h1 className="text-xl font-semibold leading-snug">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.entity}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild><a href={t.source_url ?? "https://prod4.seace.gob.pe/openegocio/#/buscar"} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" aria-hidden />Ver en fuente oficial</a></Button>
          <SaveButton tenderId={t.id} saved={data.saved} size="default" />
          <Button variant="secondary" disabled={analyzing} onClick={analyze}><Sparkles className={`h-4 w-4 ${analyzing ? "animate-pulse" : ""}`} aria-hidden />{analyzing ? "Analizando…" : data.analysis ? "Volver a analizar" : "Analizar"}</Button>
          <Button variant="ghost" disabled={refreshing} onClick={async () => {
            setRefreshing(true);
            const r = await fn({ data: { id, refresh: true } });
            qc.setQueryData(["tender", id], r); setRefreshing(false);
          }}><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />Volver a comprobar</Button>
        </div>
        {data.refreshError && <p role="alert" className="text-sm text-destructive">No pudimos consultar SEACE ahora ({data.refreshError}). Mostramos la última copia guardada.</p>}
        {sched?.changed && <p role="status" className="text-sm font-medium">El cronograma cambió desde la comprobación anterior.</p>}
        <p className="text-xs text-muted-foreground">En el portal oficial, busca por la nomenclatura <strong>{t.nomenclature}</strong>.</p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="documentos">Documentos ({documents.length})</TabsTrigger>
          <TabsTrigger value="analisis">Análisis</TabsTrigger>
        </TabsList>
        <TabsContent value="resumen" className="space-y-5">
          <dl className="grid gap-4 rounded-lg border bg-card p-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Nomenclatura">{t.nomenclature}</Field>
            <Field label="ID SEACE (procedimiento)">{t.source_id}</Field>
            <Field label="N.º convocatoria">{t.call_number}</Field>
            <Field label="Objeto">{t.object_type}</Field>
            <Field label="Procedimiento">{t.procedure_type}</Field>
            <Field label="Modalidad">{t.selection_modality}</Field>
            <Field label="Valor referencial (procedimiento)">{formatMoney(t.amount, t.currency)}</Field>
            <Field label="Moneda">{currencyDescription(t.currency)}</Field>
            <Field label="Regiones (ubicación SEACE)">{t.regions.join(", ")}</Field>
            <Field label="Publicación">{formatDate(t.published_at)}</Field>
            <Field label="Registro de participantes">{formatDate(t.participation_start)} – {formatDate(t.participation_end)}</Field>
            <Field label="Cierre (presentación de ofertas)">{formatDate(t.closing_at, t.closing_date_only)}</Field>
            <Field label="Normativa">{sched?.normativa}</Field>
          </dl>
          {sched?.stages?.length > 0 && (
            <section className="rounded-lg border bg-card p-5">
              <h2 className="mb-3 font-semibold">Cronograma oficial</h2>
              <ol className="space-y-2 text-sm">
                {sched.stages.map((s: any, i: number) => (
                  <li key={i} className="flex flex-wrap justify-between gap-2 border-b pb-2 last:border-0"><span>{s.stage}</span><span className="text-muted-foreground">{formatStageRange(s.start, s.end, s.start_time, s.end_time)}</span></li>
                ))}
              </ol>
            </section>
          )}
          <section className="rounded-lg border bg-card p-5">
            <h2 className="mb-3 font-semibold">Ítems ({items.length})</h2>
            <ul className="space-y-3 text-sm">
              {items.map((i) => (
                <li key={i.id} className="border-b pb-3 last:border-0">
                  <p className="font-medium">Ítem {i.item_number}: {i.cubso_label ?? "Sin CUBSO"}</p>
                  <p className="text-muted-foreground">{i.description}</p>
                  <p className="mt-1 text-xs">CUBSO {i.cubso_code ?? "—"} · Cantidad {i.quantity ?? "—"} {i.unit ?? ""} · Valor del ítem {formatMoney(i.amount, i.currency)} · {i.region}</p>
                </li>
              ))}
            </ul>
          </section>
        </TabsContent>
        <TabsContent value="documentos">
          <section className="rounded-lg border bg-card p-5">
            {documents.length === 0 ? <p className="text-sm text-muted-foreground">SEACE no publica documentos para esta oportunidad todavía.</p> : (
              <ul className="space-y-3">
                {documents.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{d.doc_type ?? "Documento"}</p>
                      <p className="text-xs text-muted-foreground">{d.file_name ?? "Nombre no informado"}{d.stage ? ` · ${d.stage}` : ""}{d.published_at ? ` · ${formatDate(d.published_at)}` : ""}</p>
                    </div>
                    <Button asChild size="sm" variant="outline"><a href={`/api/public/documents/${d.id}`}><Download className="h-4 w-4" aria-hidden />Descargar</a></Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </TabsContent>
        <TabsContent value="analisis">
          <AnalysisPanel analysis={data.analysis} analyzing={analyzing} error={analyzeError} outdated={!!data.analysis && data.analysis.tender_version !== t.version} />
        </TabsContent>
      </Tabs>
    </article>
  );
}

const REC: Record<string, string> = { participar: "Recomendado participar", evaluar: "Evaluar con cuidado", no_participar: "No recomendado" };
const ST: Record<string, { label: string; cls: string }> = {
  cumple: { label: "Cumple", cls: "bg-success/15 text-success" },
  no_cumple: { label: "No cumple", cls: "bg-destructive/15 text-destructive" },
  por_verificar: { label: "Por verificar", cls: "bg-warning/15 text-warning" },
};

function AnalysisPanel({ analysis, analyzing, error, outdated }: { analysis: any; analyzing: boolean; error: string | null; outdated: boolean }) {
  const r = analysis?.result as any;
  return (
    <section className="space-y-4 rounded-lg border bg-card p-5 text-sm">
      {analyzing && <p role="status">Leyendo las bases y comparando con tu perfil… puede tardar hasta un minuto.</p>}
      {error && <p role="alert" className="text-destructive">{error}{/perfil/i.test(error) && <> — <Link to="/mi-empresa" className="underline">ir a Mi empresa</Link></>}</p>}
      {!analysis && !analyzing && !error && <p className="text-muted-foreground">Aún no hay análisis. Pulsa «Analizar» para evaluar esta oportunidad frente a tu perfil.</p>}
      {r && (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-3xl font-semibold">{analysis.score}<span className="text-base text-muted-foreground">/100</span></div>
            <div><p className="font-medium">{REC[r.recommendation] ?? r.recommendation}</p><p className="text-xs text-muted-foreground">Analizado el {formatDate(analysis.created_at)}{r.documents_used?.length ? ` · Bases leídas: ${r.documents_used.join(", ")}` : " · Sin bases en PDF, solo datos oficiales"}</p></div>
          </div>
          {outdated && <p role="status" className="font-medium text-warning">La oportunidad cambió desde este análisis. Conviene volver a analizar.</p>}
          <p>{r.summary}</p>
          {r.requirements?.length > 0 && (
            <div><h3 className="mb-2 font-semibold">Requisitos y evidencia</h3>
              <ul className="space-y-3">{r.requirements.map((q: any, i: number) => (
                <li key={i} className="border-b pb-3 last:border-0">
                  <div className="flex flex-wrap items-center gap-2"><span className={`rounded px-2 py-0.5 text-xs font-medium ${ST[q.status]?.cls ?? ""}`}>{ST[q.status]?.label ?? q.status}</span><span className="font-medium">{q.requirement}</span></div>
                  <p className="mt-1 text-muted-foreground">{q.reason}</p>
                  {q.evidence && <blockquote className="mt-1 border-l-2 pl-3 text-xs italic">“{q.evidence}” <span className="not-italic text-muted-foreground">— {q.source}</span></blockquote>}
                </li>))}</ul>
            </div>)}
          {r.risks?.length > 0 && <div><h3 className="mb-1 font-semibold">Riesgos</h3><ul className="list-disc pl-5">{r.risks.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></div>}
          {r.missing_info?.length > 0 && <div><h3 className="mb-1 font-semibold">Información faltante</h3><ul className="list-disc pl-5">{r.missing_info.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></div>}
          <p className="text-xs text-muted-foreground">Análisis automático orientativo; no constituye asesoría legal. Verifica siempre en las bases oficiales.</p>
        </>
      )}
    </section>
  );
}
