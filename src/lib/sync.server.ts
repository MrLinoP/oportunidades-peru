import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  SOURCE, DOC_URL, buildTender, fetchAllRows, fetchFicha, fetchSegments, fetchUbigeoMap,
  sha256, stableStringify, type SeaceRow,
} from "./seace.server";
import { parseSeaceDate } from "./tender-rules";

const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

/** Idempotent full sync. A failing source never deletes rows; it only records the failure. */
export async function runSeaceSync() {
  const db = supabaseAdmin;
  const { data: run } = await db.from("sync_runs").insert({ source: SOURCE }).select("id").single();
  const runId = run!.id;
  try {
    const [rows, ubigeo] = await Promise.all([fetchAllRows(), fetchUbigeoMap()]);
    try {
      const segs = await fetchSegments();
      if (segs.length) await db.from("cubso_segments").upsert(segs.map((s) => ({ code: s.codigoSegmento, title: s.tituloSegmento, updated_at: new Date().toISOString() })));
    } catch { /* optional */ }

    const groups = new Map<string, SeaceRow[]>();
    for (const r of rows) {
      const k = String(r.idProcedimiento);
      (groups.get(k) ?? groups.set(k, []).get(k)!).push(r);
    }

    const existing = new Map<string, { id: string; source_hash: string | null; version: number }>();
    for (let from = 0; ; from += 1000) {
      const { data } = await db.from("tenders").select("id, source_id, source_hash, version").eq("source", SOURCE).range(from, from + 999);
      if (!data?.length) break;
      data.forEach((t) => existing.set(t.source_id, t));
      if (data.length < 1000) break;
    }

    const now = new Date().toISOString();
    let created = 0, changed = 0;
    const built = await Promise.all([...groups.entries()].map(async ([k, g]) => {
      const b = buildTender(g, ubigeo);
      const hash = await sha256(stableStringify(g));
      return { k, g, b, hash };
    }));

    for (const part of chunk(built, 300)) {
      const tenderRows = part.map(({ k, b, hash }) => {
        const ex = existing.get(k);
        if (!ex) created++; else if (ex.source_hash !== hash) changed++;
        return {
          ...b.tender, source_hash: hash,
          version: ex ? (ex.source_hash !== hash ? ex.version + 1 : ex.version) : 1,
          last_seen_at: now, last_checked_at: now, listed_in_source: true,
        };
      });
      const { data: up, error } = await db.from("tenders").upsert(tenderRows, { onConflict: "source,source_id" }).select("id, source_id");
      if (error) throw error;
      const idOf = new Map(up!.map((t) => [t.source_id, t.id]));

      const records = part.map(({ k, g, hash }) => ({ tender_id: idOf.get(k)!, source: SOURCE, source_id: k, kind: "listing", hash, payload: g as any, url: "https://prod4.seace.gob.pe:8086/api/oportunidades" }));
      await db.from("source_records").upsert(records, { onConflict: "source,source_id,kind,hash", ignoreDuplicates: true });

      const items = part.flatMap(({ k, b }) => {
        const seen = new Set<string>();
        return b.items.filter((i) => !seen.has(i.item_number) && seen.add(i.item_number)).map((i) => ({ ...i, tender_id: idOf.get(k)!, updated_at: now }));
      });
      const ie = await db.from("tender_items").upsert(items, { onConflict: "tender_id,item_number" });
      if (ie.error) throw ie.error;

      const docs = part.filter((p) => p.b.baseDoc).map(({ k, b }) => ({
        tender_id: idOf.get(k)!, source_code: b.baseDoc!, doc_type: "Bases (según listado)", url: DOC_URL + encodeURIComponent(b.baseDoc!),
      }));
      if (docs.length) await db.from("documents").upsert(docs, { onConflict: "tender_id,source_code", ignoreDuplicates: true });
    }

    // Tenders no longer listed stay stored but lose "listed" status.
    await db.from("tenders").update({ listed_in_source: false }).eq("source", SOURCE).lt("last_seen_at", now);

    await db.from("sync_runs").update({ status: "ok", finished_at: new Date().toISOString(), records_seen: groups.size, records_new: created, records_changed: changed }).eq("id", runId);
    return { ok: true, seen: groups.size, created, changed, items: rows.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.from("sync_runs").update({ status: "error", finished_at: new Date().toISOString(), error: msg }).eq("id", runId);
    return { ok: false, error: msg };
  }
}

/** Fetch the official ficha (schedule + documents) for one tender; cached 6h. */
export async function refreshTenderDetail(tenderId: string, force = false) {
  const db = supabaseAdmin;
  const { data: t } = await db.from("tenders").select("id, source_id, detail_fetched_at, schedule, closing_at").eq("id", tenderId).single();
  if (!t) return { ok: false, error: "No encontrado" };
  if (!force && t.detail_fetched_at && Date.now() - new Date(t.detail_fetched_at).getTime() < 6 * 3600 * 1000) return { ok: true, cached: true };
  try {
    const f = await fetchFicha(t.source_id);
    const json = stableStringify(f);
    const hash = await sha256(json);
    await db.from("source_records").upsert({ tender_id: t.id, source: SOURCE, source_id: t.source_id, kind: "ficha", hash, payload: f, url: `https://prod4.seace.gob.pe:8086/api/oportunidades/fichaProceso/idProceso/${t.source_id}` }, { onConflict: "source,source_id,kind,hash", ignoreDuplicates: true });
    const schedule = (f.listaCronograma ?? []).map((c: any) => ({
      stage: c.descripcionEtapa, start: c.fechaInicio, end: c.fechaFin, start_time: c.horaInicio, end_time: c.horaFin,
    }));
    const prevSchedule = JSON.stringify(t.schedule ?? null);
    const docs = (f.listaDocumentos ?? []).filter((d: any) => d.codigoAlfresco).map((d: any) => ({
      tender_id: t.id, source_code: d.codigoAlfresco, doc_type: d.tipoDocumento ?? null, file_name: d.nombreArchivo ?? null,
      extension: d.extension ?? null, size_label: d.tamanoArchivo ?? null, stage: d.etapa ?? null,
      published_at: parseSeaceDate(d.fechaPublicacion)?.iso ?? null, url: DOC_URL + encodeURIComponent(d.codigoAlfresco),
    }));
    if (docs.length) await db.from("documents").upsert(docs, { onConflict: "tender_id,source_code" });
    await db.from("tenders").update({
      schedule: { stages: schedule, entity: f.entidadConvocante ?? null, normativa: f.normativaAplica ?? null, tipoCompra: f.tipoCompra ?? null, convocatoria: f.numeroConvocatoria ?? null, changed: prevSchedule !== "null" && prevSchedule !== JSON.stringify({ stages: schedule, entity: f.entidadConvocante ?? null, normativa: f.normativaAplica ?? null, tipoCompra: f.tipoCompra ?? null, convocatoria: f.numeroConvocatoria ?? null }) },
      call_number: f.numeroConvocatoria ?? null,
      detail_fetched_at: new Date().toISOString(), last_checked_at: new Date().toISOString(),
    }).eq("id", t.id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Fuente no disponible" };
  }
}
