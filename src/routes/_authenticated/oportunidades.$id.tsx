import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Download, ExternalLink, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTender } from "@/lib/tenders.functions";
import { formatDate, formatMoney } from "@/lib/tender-rules";
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
          <Button variant="outline" disabled title="Disponible en la siguiente etapa (análisis con OpenAI)"><Sparkles className="h-4 w-4" aria-hidden />Analizar (próximamente)</Button>
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

      <Tabs defaultValue="resumen">
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
                  <li key={i} className="flex flex-wrap justify-between gap-2 border-b pb-2 last:border-0"><span>{s.stage}</span><span className="text-muted-foreground">{s.start}{s.start_time ? ` ${s.start_time}` : ""} – {s.end}{s.end_time ? ` ${s.end_time}` : ""}</span></li>
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
          <section className="rounded-lg border bg-card p-5 text-sm">
            {data.analysis ? <p>Último análisis: {formatDate(data.analysis.created_at)} · puntaje {data.analysis.score ?? "—"}</p> : <p className="text-muted-foreground">Aún no hay análisis. El análisis de las bases con OpenAI se habilita en la siguiente etapa.</p>}
          </section>
        </TabsContent>
      </Tabs>
    </article>
  );
}
