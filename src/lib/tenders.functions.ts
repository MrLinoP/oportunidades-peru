import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { currencyAliases, REGION_OPTIONS } from "@/lib/tender-rules";

export const searchSchema = z.object({
  q: z.string().max(200).optional(),
  objeto: z.array(z.string()).optional(),
  rubro: z.array(z.string()).optional(),
  region: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  moneda: z.string().optional(),
  cierreDesde: z.string().optional(),
  cierreHasta: z.string().optional(),
  estado: z.enum(["abiertas", "cerradas", "todas"]).optional(),
  orden: z.enum(["cierre", "publicacion"]).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().min(1).optional(),
  suggestionIds: z.array(z.string().uuid()).max(10000).optional(),
});
export type SearchParams = z.infer<typeof searchSchema>;

const LIST_COLS = "id, source_id, nomenclature, title, entity, object_type, procedure_type, currency, amount, amount_level, published_at, participation_start, closing_at, closing_date_only, regions, cubso_labels, listed_in_source, last_checked_at";
export const PAGE_SIZE = 25;

export const searchTenders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => searchSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const page = data.page ?? 1;
    let q = sb.from("tenders").select(LIST_COLS, { count: "exact" });
    if (data.suggestionIds) q = q.in("id", data.suggestionIds.length ? data.suggestionIds : ["00000000-0000-0000-0000-000000000000"]);
    const term = data.q?.replace(/[,()%*\\{}"]/g, " ").trim();
    if (term) {
      q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%,entity.ilike.%${term}%,nomenclature.ilike.%${term}%,object_type.ilike.%${term}%`);
      const regionHits = REGION_OPTIONS.filter((r) => r.toLowerCase().includes(term.toLowerCase()));
      if (regionHits.length) q = q.overlaps("regions", regionHits);
    }
    if (data.objeto?.length) q = q.in("object_type", data.objeto);
    if (data.rubro?.length) q = q.overlaps("cubso_segments", data.rubro);
    if (data.region?.length) q = q.overlaps("regions", data.region);
    if (data.min != null) q = q.gte("amount", data.min);
    if (data.max != null) q = q.lte("amount", data.max);
    if (data.moneda) q = q.in("currency", currencyAliases(data.moneda));
    if (data.cierreDesde) q = q.gte("closing_at", `${data.cierreDesde}T00:00:00-05:00`);
    if (data.cierreHasta) q = q.lte("closing_at", `${data.cierreHasta}T23:59:59-05:00`);
    const estado = data.estado ?? "abiertas";
    if (estado === "abiertas") q = q.eq("listed_in_source", true).gt("closing_at", new Date().toISOString());
    else if (estado === "cerradas") q = q.lt("closing_at", new Date().toISOString());
    const asc = data.dir ? data.dir === "asc" : data.orden !== "publicacion";
    q = data.orden === "publicacion"
      ? q.order("published_at", { ascending: asc, nullsFirst: false })
      : q.order("closing_at", { ascending: asc, nullsFirst: false });
    q = q.order("id").range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    const { data: rows, count, error } = await q;
    if (error) throw new Error("No se pudo consultar el catálogo");

    const ids = (rows ?? []).map((r) => r.id);
    const saved = ids.length ? (await sb.from("saved_tenders").select("tender_id").in("tender_id", ids)).data ?? [] : [];
    const savedSet = new Set(saved.map((s) => s.tender_id));
    const { data: lastSync } = await sb.from("sync_runs").select("status, started_at, finished_at, error").order("started_at", { ascending: false }).limit(5);
    const lastOk = lastSync?.find((s) => s.status === "ok") ?? null;
    return {
      rows: (rows ?? []).map((r) => ({ ...r, saved: savedSet.has(r.id) })),
      total: count ?? 0,
      page,
      lastSync: lastSync?.[0] ?? null,
      lastOk,
    };
  });

export const suggestTenders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ estado: z.enum(["abiertas", "todas"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: profile, error: profileError } = await sb.from("company_profiles")
      .select("keywords, offerings, regions, experience, restrictions, availability, rnp_registrations")
      .eq("user_id", context.userId).maybeSingle();
    if (profileError) throw new Error("No se pudo consultar Mi empresa");
    if (!profile || (!profile.offerings?.trim() && !profile.keywords.length)) throw new Error("Completa los bienes o servicios ofrecidos o las palabras clave en «Mi empresa» para recibir sugerencias.");
    const cols = "id, title, object_type, regions, tender_items(description, cubso_label, region)" as const;
    const candidates = [];
    const now = new Date().toISOString();
    for (let offset = 0; ; offset += 500) {
      let query = sb.from("tenders").select(cols).order("id").range(offset, offset + 499);
      if (data.estado === "abiertas") query = query.eq("listed_in_source", true).gt("closing_at", now);
      const { data: rows, error } = await query;
      if (error) throw new Error("No se pudo consultar el catálogo para sugerencias");
      candidates.push(...rows ?? []);
      if (!rows || rows.length < 500) break;
    }
    const { runSuggestions } = await import("./suggestions.server");
    return { ids: await runSuggestions(candidates, profile), reviewed: candidates.length };
  });

export const getFilterOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("cubso_segments").select("code, title").order("code");
    return { segments: data ?? [] };
  });

export const getTender = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), refresh: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    let refreshError: string | null = null;
    const { refreshTenderDetail } = await import("./sync.server");
    const r = await refreshTenderDetail(data.id, data.refresh ?? false);
    if (!r.ok) refreshError = r.error ?? "Fuente no disponible";
    const { data: tender } = await sb.from("tenders").select("*").eq("id", data.id).maybeSingle();
    if (!tender) return null;
    const [items, docs, saved, analysis] = await Promise.all([
      sb.from("tender_items").select("*").eq("tender_id", data.id).order("item_number"),
      sb.from("documents").select("id, doc_type, file_name, extension, size_label, stage, published_at, url").eq("tender_id", data.id).order("published_at", { ascending: true, nullsFirst: true }),
      sb.from("saved_tenders").select("id").eq("tender_id", data.id).maybeSingle(),
      sb.from("analyses").select("id, score, created_at, tender_version, profile_version, result").eq("tender_id", data.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    // Docs from the listing duplicate ficha docs with a better name; hide unnamed duplicates.
    const named = (docs.data ?? []).filter((d) => d.file_name);
    const documents = named.length ? named : docs.data ?? [];
    return { tender, items: items.data ?? [], documents, saved: !!saved.data, analysis: analysis.data, refreshError };
  });

export const toggleSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenderId: z.string().uuid(), save: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    if (data.save) {
      const { error } = await sb.from("saved_tenders").upsert({ tender_id: data.tenderId, user_id: context.userId }, { onConflict: "user_id,tender_id", ignoreDuplicates: true });
      if (error) throw new Error("No se pudo guardar");
    } else {
      const { error } = await sb.from("saved_tenders").delete().eq("tender_id", data.tenderId);
      if (error) throw new Error("No se pudo quitar");
    }
    return { saved: data.save };
  });

export const listSaved = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const { data } = await sb.from("saved_tenders").select(`created_at, tender:tenders(${LIST_COLS}, version)`).order("created_at", { ascending: false });
    const ids = (data ?? []).map((d: any) => d.tender?.id).filter(Boolean);
    const { data: analyses } = ids.length
      ? await sb.from("analyses").select("tender_id, score, created_at, tender_version, profile_version").in("tender_id", ids).order("created_at", { ascending: false })
      : { data: [] as any[] };
    const { data: profile } = await sb.from("company_profiles").select("version").maybeSingle();
    const latest = new Map<string, any>();
    for (const a of analyses ?? []) if (!latest.has(a.tender_id)) latest.set(a.tender_id, a);
    return (data ?? []).filter((d: any) => d.tender).map((d: any) => {
      const a = latest.get(d.tender.id) ?? null;
      return {
        savedAt: d.created_at, tender: d.tender, analysis: a,
        outdated: a ? a.tender_version !== d.tender.version || (profile && a.profile_version !== profile.version) : false,
      };
    });
  });

export const listAnalyzed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const { data: analyses } = await sb.from("analyses")
      .select("tender_id, score, created_at, tender_version, profile_version, result")
      .order("created_at", { ascending: false }).limit(1000);
    const latest = new Map<string, any>();
    const counts = new Map<string, number>();
    for (const a of analyses ?? []) {
      counts.set(a.tender_id, (counts.get(a.tender_id) ?? 0) + 1);
      if (!latest.has(a.tender_id)) latest.set(a.tender_id, a);
    }
    const ids = [...latest.keys()];
    if (!ids.length) return [];
    const [{ data: tenders }, { data: profile }] = await Promise.all([
      sb.from("tenders").select(`${LIST_COLS}, version`).in("id", ids),
      sb.from("company_profiles").select("version").maybeSingle(),
    ]);
    const byId = new Map((tenders ?? []).map((t: any) => [t.id, t]));
    return ids.filter((id) => byId.has(id)).map((id) => {
      const a = latest.get(id); const t: any = byId.get(id);
      return {
        tender: t, count: counts.get(id) ?? 1,
        analysis: { score: a.score, created_at: a.created_at, recommendation: (a.result as any)?.recommendation ?? null },
        outdated: a.tender_version !== t.version || (!!profile && a.profile_version !== profile.version),
      };
    });
  });

const profileSchema = z.object({
  business_name: z.string().max(200).nullable(),
  ruc: z.string().regex(/^\d{11}$/, "El RUC debe tener 11 dígitos").nullable().or(z.literal("").transform(() => null)),
  keywords: z.array(z.string().max(80)).max(50),
  offerings: z.string().max(4000).nullable(),
  regions: z.array(z.string()).max(30),
  capacity_amount: z.number().nonnegative().nullable(),
  capacity_currency: z.string().max(10).nullable(),
  experience: z.array(z.object({ specialty: z.string().max(200), amount: z.number().nullable(), currency: z.string().max(10).nullable() })).max(50),
  staff: z.string().max(4000).nullable(),
  certifications: z.string().max(4000).nullable(),
  availability: z.string().max(2000).nullable(),
  restrictions: z.string().max(2000).nullable(),
  rnp_registrations: z.string().max(2000).nullable(),
  rnp_declared_at: z.string().nullable(),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("company_profiles").select("*").maybeSingle();
    return data;
  });

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => profileSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: existing } = await sb.from("company_profiles").select("id").maybeSingle();
    const payload = { ...data, rnp_declared_at: data.rnp_declared_at || null };
    const res = existing
      ? await sb.from("company_profiles").update(payload).eq("id", existing.id).select("*").single()
      : await sb.from("company_profiles").insert({ ...payload, user_id: context.userId }).select("*").single();
    if (res.error) throw new Error("No se pudo guardar el perfil");
    return res.data;
  });

export const analyzeTender = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const [{ data: tender }, { data: items }, { data: docs }, { data: profile }] = await Promise.all([
      sb.from("tenders").select("*").eq("id", data.tenderId).maybeSingle(),
      sb.from("tender_items").select("*").eq("tender_id", data.tenderId).order("item_number"),
      sb.from("documents").select("*").eq("tender_id", data.tenderId).order("published_at", { ascending: true, nullsFirst: true }),
      sb.from("company_profiles").select("*").maybeSingle(),
    ]);
    if (!tender) throw new Error("Oportunidad no encontrada");
    if (!profile) throw new Error("Completa primero el perfil en «Mi empresa»");
    const named = (docs ?? []).filter((d) => d.file_name || d.storage_path);
    // Writes go through the service role after verifying the caller; users can only read their own rows.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: job, error: jobErr } = await supabaseAdmin.from("analysis_jobs").insert({
      user_id: context.userId, tender_id: tender.id, tender_version: tender.version, profile_version: profile.version, status: "procesando",
    }).select("id").single();
    if (jobErr || !job) throw new Error("No se pudo iniciar el análisis");
    try {
      const { runAnalysis } = await import("./analysis.server");
      const result = await runAnalysis({ tender, items: items ?? [], documents: named.length ? named : docs ?? [], profile });
      const { data: row, error } = await supabaseAdmin.from("analyses").insert({
        job_id: job.id, user_id: context.userId, tender_id: tender.id, tender_version: tender.version, profile_version: profile.version, score: result.score, result: result as any,
      }).select("id, score, created_at, tender_version, profile_version, result").single();
      if (error) throw new Error("No se pudo guardar el análisis");
      await supabaseAdmin.from("analysis_jobs").update({ status: "completado" }).eq("id", job.id);
      return row;
    } catch (e: any) {
      await supabaseAdmin.from("analysis_jobs").update({ status: "error", error: String(e?.message ?? e).slice(0, 500) }).eq("id", job.id);
      throw new Error(e?.message ?? "Error en el análisis");
    }
  });

export const uploadTenderDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    if (!(d instanceof FormData)) throw new Error("Formulario inválido");
    const tenderId = z.string().uuid().parse(d.get("tenderId"));
    const file = d.get("file");
    if (!(file instanceof File)) throw new Error("Selecciona un archivo PDF");
    if (file.size > 12 * 1024 * 1024) throw new Error("El PDF supera 12 MB");
    return { tenderId, file };
  })
  .handler(async ({ data, context }) => {
    const { data: tender } = await context.supabase.from("tenders").select("id").eq("id", data.tenderId).maybeSingle();
    if (!tender) throw new Error("Oportunidad no encontrada");
    const buf = new Uint8Array(await data.file.arrayBuffer());
    if (buf[0] !== 0x25 || buf[1] !== 0x50 || buf[2] !== 0x44 || buf[3] !== 0x46) throw new Error("El archivo no es un PDF válido");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = `upload:${crypto.randomUUID()}`;
    const path = `${tender.id}/${code.slice(7)}.pdf`;
    const up = await supabaseAdmin.storage.from("tender-documents").upload(path, buf, { contentType: "application/pdf" });
    if (up.error) throw new Error("No se pudo guardar el PDF");
    const name = (data.file.name || "bases.pdf").replace(/[^\w .()\-áéíóúñÁÉÍÓÚÑ]/g, "").slice(0, 200) || "bases.pdf";
    const { error } = await supabaseAdmin.from("documents").insert({
      tender_id: tender.id, source_code: code, doc_type: "Bases subidas (copia del portal SEACE)", file_name: name,
      extension: "pdf", size_label: String(Math.round(buf.byteLength / 1024)), stage: "Subido por usuario",
      published_at: new Date().toISOString(), url: "storage", storage_path: path,
    });
    if (error) throw new Error("No se pudo registrar el documento");
    return { ok: true };
  });
