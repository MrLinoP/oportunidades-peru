// Pure, client-safe rules shared by sync, server functions and UI.

export const DEPARTMENTS: Record<string, string> = {
  "01": "Amazonas", "02": "Áncash", "03": "Apurímac", "04": "Arequipa", "05": "Ayacucho",
  "06": "Cajamarca", "07": "Callao", "08": "Cusco", "09": "Huancavelica", "10": "Huánuco",
  "11": "Ica", "12": "Junín", "13": "La Libertad", "14": "Lambayeque", "15": "Lima",
  "16": "Loreto", "17": "Madre de Dios", "18": "Moquegua", "19": "Pasco", "20": "Piura",
  "21": "Puno", "22": "San Martín", "23": "Tacna", "24": "Tumbes", "25": "Ucayali",
};
export const REGION_OPTIONS = [...Object.values(DEPARTMENTS), "Nacional", "No informado"];
export const OBJECT_TYPES = ["Bien", "Servicio", "Obra", "Consultoría de Obra"];

/** Parses SEACE "dd/mm/yyyy[ HH:MM[:SS]]" in America/Lima (UTC-5, no DST). */
export function parseSeaceDate(value: string | null | undefined): { iso: string; dateOnly: boolean } | null {
  if (!value) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(value.trim());
  if (!m) return null;
  const [, d, mo, y, h, mi, s] = m;
  const dateOnly = h === undefined;
  const iso = `${y}-${mo}-${d}T${h ?? "00"}:${mi ?? "00"}:${s ?? "00"}-05:00`;
  if (Number.isNaN(Date.parse(iso))) return null;
  return { iso: new Date(iso).toISOString(), dateOnly };
}

/** "---", "", null => null (never zero). */
export function parseAmount(value: string | null | undefined): number | null {
  if (value == null) return null;
  const v = String(value).trim();
  if (!v || v === "---") return null;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export type TenderStatus = "abierta" | "proxima" | "cerrada" | "por_confirmar";

export function tenderStatus(
  t: { closing_at: string | null; participation_start?: string | null; listed_in_source: boolean },
  now: Date = new Date(),
): TenderStatus {
  if (!t.closing_at) return "por_confirmar";
  const close = new Date(t.closing_at);
  if (close.getTime() <= now.getTime()) return "cerrada";
  if (!t.listed_in_source) return "por_confirmar";
  if (t.participation_start && new Date(t.participation_start).getTime() > now.getTime()) return "proxima";
  return "abierta";
}

export const STATUS_LABEL: Record<TenderStatus, string> = {
  abierta: "Abierta",
  proxima: "Próxima",
  cerrada: "Cerrada",
  por_confirmar: "Por confirmar",
};

export function isStale(lastChecked: string | null | undefined, now: Date = new Date()): boolean {
  if (!lastChecked) return true;
  return now.getTime() - new Date(lastChecked).getTime() > 24 * 3600 * 1000;
}

/** RUC: 11 digits, syntactic check only. */
export function isValidRucSyntax(ruc: string): boolean {
  return /^(10|15|16|17|20)\d{9}$/.test(ruc.trim());
}

export function profileReadyForScoring(p: {
  business_name?: string | null; ruc?: string | null; keywords?: string[] | null;
  offerings?: string | null; regions?: string[] | null; capacity_amount?: number | null;
} | null): boolean {
  if (!p) return false;
  return Boolean(
    p.business_name?.trim() && p.ruc && isValidRucSyntax(p.ruc) &&
    ((p.keywords?.length ?? 0) > 0 || p.offerings?.trim()) &&
    (p.regions?.length ?? 0) > 0 && p.capacity_amount != null,
  );
}

export function formatMoney(amount: number | null, currency: string | null): string {
  if (amount == null) return "No informado";
  return `${currency ?? ""} ${amount.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
}

const LIMA = { timeZone: "America/Lima" } as const;
export function formatDate(iso: string | null, dateOnly = false): string {
  if (!iso) return "No informado";
  const d = new Date(iso);
  return dateOnly
    ? d.toLocaleDateString("es-PE", { ...LIMA, day: "2-digit", month: "short", year: "numeric" })
    : d.toLocaleString("es-PE", { ...LIMA, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Lightweight suggestions deliberately exclude bases, amounts and legal eligibility. */
export function suggestionFacts(t: {
  id: string; title: string; object_type: string; regions: string[];
  tender_items: { description: string | null; cubso_label: string | null; region: string | null }[];
}) {
  return {
    id: t.id, titulo: t.title, objeto: t.object_type, regiones: t.regions,
    items: t.tender_items.map((i) => ({ nombre: i.description || i.cubso_label || "", region: i.region })),
  };
}

export function validSuggestionIds(ids: string[], candidates: { id: string }[]): string[] {
  const allowed = new Set(candidates.map((c) => c.id));
  return [...new Set(ids)].filter((id) => allowed.has(id));
}
