// SEACE "Oportunidades de negocio" adapter (server-only).
import { DEPARTMENTS, parseAmount, parseSeaceDate } from "./tender-rules";

export const SOURCE = "seace_oportunidades";
const API = "https://prod4.seace.gob.pe:8086/api/oportunidades";
const LIST = `${API}/codObjeto/codDepartamento/sintesisProceso/codTipoProceso`;
export const DOC_URL = "https://prod1.seace.gob.pe/SeaceWeb-PRO/SdescargarArchivoAlfresco?fileCode=";
export const PORTAL_URL = "https://prod4.seace.gob.pe/openegocio/#/buscar";
export const UA = "Mozilla/5.0 (compatible; OportunidadesPeru/1.0; +consulta de datos publicos)";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function seaceFetch(url: string, init: RequestInit = {}, attempts = 3): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "User-Agent": UA, Referer: "https://prod4.seace.gob.pe/openegocio/", Accept: "application/json, */*", ...(init.headers ?? {}) },
      });
      if (res.status === 429 || res.status >= 500) {
        const ra = Number(res.headers.get("retry-after"));
        await sleep(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 1000 * 2 ** i);
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      await sleep(1000 * 2 ** i);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Fuente no disponible");
}

async function getJson<T>(url: string): Promise<T> {
  const res = await seaceFetch(url);
  if (!res.ok) throw new Error(`SEACE respondió ${res.status} en ${url}`);
  return (await res.json()) as T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SeaceRow = any;

export async function fetchAllRows(): Promise<SeaceRow[]> {
  return getJson<SeaceRow[]>(`${LIST}/0/0/0/0`);
}

/** Maps SEACE internal ubigeo id -> department name by querying each department (concurrency 4). */
export async function fetchUbigeoMap(): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  const codes = Object.keys(DEPARTMENTS);
  for (let i = 0; i < codes.length; i += 4) {
    await Promise.all(
      codes.slice(i, i + 4).map(async (c) => {
        try {
          const rows = await getJson<SeaceRow[]>(`${LIST}/0/${c}/0/0`);
          for (const r of rows) if (r.ubigeo != null) map.set(r.ubigeo, DEPARTMENTS[c]!);
        } catch { /* partial map is acceptable; unmapped => No informado */ }
      }),
    );
  }
  return map;
}

export async function fetchSegments(): Promise<{ codigoSegmento: string; tituloSegmento: string }[]> {
  return getJson(`${API}/listaSegmentoCubso`);
}

export async function fetchFicha(idProceso: string): Promise<any> {
  return getJson(`${API}/fichaProceso/idProceso/${encodeURIComponent(idProceso)}`);
}

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${stableStringify((v as any)[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

export function buildTender(rows: SeaceRow[], ubigeo: Map<number, string>) {
  const r = rows[0]!;
  const close = parseSeaceDate(r.fechaPresentacionPropuestas);
  const regions = [...new Set(rows.map((x) => (x.ubigeo != null ? ubigeo.get(x.ubigeo) : undefined) ?? "No informado"))];
  const codes = rows.map((x) => x.codCubso).filter(Boolean) as string[];
  return {
    tender: {
      source: SOURCE,
      source_id: String(r.idProcedimiento),
      nomenclature: r.nomenclatura ?? null,
      title: (r.sintesisProceso || r.detItem || r.nomenclatura || "Sin título").trim(),
      description: r.sintesisProceso ?? null,
      entity: r.detEntidad ?? null,
      object_type: r.detObjeto ?? null,
      procedure_type: r.detTipoProceso ?? null,
      selection_modality: r.detModalidadSeleccion ?? null,
      currency: r.monedaProceso ?? null,
      amount: parseAmount(r.valorReferencial),
      amount_level: "procedimiento",
      published_at: parseSeaceDate(r.fechaConvocatoria)?.iso ?? null,
      participation_start: parseSeaceDate(r.fecInicioParticipantes ?? r.fechaInicio)?.iso ?? null,
      participation_end: parseSeaceDate(r.fecFinParticipantes ?? r.fechaFin)?.iso ?? null,
      closing_at: close?.iso ?? null,
      closing_date_only: close?.dateOnly ?? false,
      regions,
      cubso_segments: [...new Set(codes.map((c) => c.slice(0, 2)))],
      cubso_labels: [...new Set(rows.map((x) => x.detCubso).filter(Boolean))] as string[],
      source_url: PORTAL_URL,
    },
    items: rows.map((x) => ({
      item_number: String(x.nroItem ?? "1"),
      description: x.detItem ?? null,
      cubso_code: x.codCubso ?? null,
      cubso_label: x.detCubso ?? null,
      quantity: x.cantItem ?? null,
      unit: x.detUnidadMedida ?? null,
      currency: x.detMonedaItem ?? null,
      amount: parseAmount(x.valorReferencialItem),
      item_type: x.tipoItem ?? null,
      status_code: x.estadoItem ?? null,
      region: (x.ubigeo != null ? ubigeo.get(x.ubigeo) : undefined) ?? "No informado",
    })),
    baseDoc: r.documentoBase as string | null,
  };
}
