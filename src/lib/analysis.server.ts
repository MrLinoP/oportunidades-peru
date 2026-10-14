import { DOC_URL, UA } from "./seace.server";

const MAX_DOCS = 3;
const MAX_BYTES = 12 * 1024 * 1024;

export type AnalysisResult = {
  score: number;
  recommendation: "participar" | "evaluar" | "no_participar";
  summary: string;
  requirements: { requirement: string; status: "cumple" | "no_cumple" | "por_verificar"; reason: string; evidence: string; source: string }[];
  risks: string[];
  missing_info: string[];
  action_plan: { action: string; addresses: string; category: string; priority: "alta" | "media" | "baja"; detail: string }[];
  documents_used: string[];
};

const schema = {
  type: "object", additionalProperties: false,
  required: ["score", "recommendation", "summary", "requirements", "risks", "missing_info", "action_plan"],
  properties: {
    score: { type: "integer", description: "0-100 compatibilidad empresa-oportunidad" },
    recommendation: { type: "string", enum: ["participar", "evaluar", "no_participar"] },
    summary: { type: "string" },
    requirements: {
      type: "array", items: {
        type: "object", additionalProperties: false,
        required: ["requirement", "status", "reason", "evidence", "source"],
        properties: {
          requirement: { type: "string" },
          status: { type: "string", enum: ["cumple", "no_cumple", "por_verificar"] },
          reason: { type: "string" },
          evidence: { type: "string", description: "Cita textual breve de las bases o de los datos oficiales" },
          source: { type: "string", description: "Documento y página/sección, o 'Datos SEACE'" },
        },
      },
    },
    risks: { type: "array", items: { type: "string" } },
    missing_info: { type: "array", items: { type: "string" } },
    action_plan: {
      type: "array", description: "Acciones concretas para cerrar brechas de requisitos no_cumple o por_verificar",
      items: {
        type: "object", additionalProperties: false,
        required: ["action", "addresses", "category", "priority", "detail"],
        properties: {
          action: { type: "string", description: "Acción concreta y realista" },
          addresses: { type: "string", description: "Requisito o brecha que resuelve" },
          category: { type: "string", enum: ["certificacion", "rnp", "personal", "experiencia", "consorcio_alianza", "capacidad_financiera", "documentacion", "otro"] },
          priority: { type: "string", enum: ["alta", "media", "baja"] },
          detail: { type: "string", description: "Cómo hacerlo y si es viable antes del cierre" },
        },
      },
    },
  },
};

async function fetchPdf(url: string): Promise<string | null> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Referer: "https://prod4.seace.gob.pe/openegocio/" } });
  if (!res.ok) return null;
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > MAX_BYTES || buf[0] !== 0x25 || buf[1] !== 0x50) return null; // %P = PDF
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

export async function runAnalysis(input: { tender: any; items: any[]; documents: any[]; profile: any }): Promise<AnalysisResult> {
  const key = process.env["OPENAI_API_KEY"];
  if (!key) throw new Error("Falta configurar la clave de OpenAI");
  const model = process.env["OPENAI_MODEL"] || "gpt-4.1-mini";

  const pdfDocs = input.documents.filter((d) => !d.extension || /pdf/i.test(d.extension)).slice(-MAX_DOCS);
  const files: { name: string; data: string }[] = [];
  for (const d of pdfDocs) {
    try {
      const data = await fetchPdf(d.url ?? DOC_URL + d.source_code);
      if (data) files.push({ name: d.file_name ?? d.doc_type ?? "documento.pdf", data });
    } catch { /* documento no disponible */ }
  }

  const t = input.tender;
  const facts = {
    nomenclatura: t.nomenclature, titulo: t.title, entidad: t.entity, objeto: t.object_type, procedimiento: t.procedure_type,
    valor_referencial: t.amount, moneda: t.currency, regiones: t.regions, cierre: t.closing_at, cronograma: t.schedule,
    items: input.items.map((i) => ({ n: i.item_number, cubso: i.cubso_label, descripcion: i.description, cantidad: i.quantity, unidad: i.unit, valor: i.amount, region: i.region })),
  };
  const p = input.profile;
  const perfil = p ? {
    razon_social: p.business_name, palabras_clave: p.keywords, oferta: p.offerings, regiones: p.regions,
    capacidad: p.capacity_amount, moneda_capacidad: p.capacity_currency, experiencia: p.experience, personal: p.staff,
    certificaciones: p.certifications, disponibilidad: p.availability, restricciones: p.restrictions, rnp: p.rnp_registrations,
  } : null;

  const instructions = `Eres analista de contrataciones públicas del Perú. Evalúa si la empresa (perfil autodeclarado) puede competir en esta oportunidad.
Reglas: responde en español; usa SOLO los datos oficiales y las bases adjuntas; cada requisito debe tener evidencia textual y su fuente (documento y página/sección o "Datos SEACE"). Si algo no consta, marca "por_verificar" y no lo inventes. No das asesoría legal. Puntaje 0-100.`;

  const content: any[] = [
    { type: "input_text", text: `DATOS OFICIALES SEACE:\n${JSON.stringify(facts)}\n\nPERFIL DE LA EMPRESA:\n${JSON.stringify(perfil)}\n\n${files.length ? `Bases adjuntas: ${files.map((f) => f.name).join(", ")}` : "No se pudieron obtener bases en PDF; analiza solo con los datos oficiales e indícalo."}` },
    ...files.map((f) => ({ type: "input_file", filename: f.name.endsWith(".pdf") ? f.name : `${f.name}.pdf`, file_data: `data:application/pdf;base64,${f.data}` })),
  ];

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model, instructions, store: false,
      input: [{ role: "user", content }],
      text: { format: { type: "json_schema", name: "analisis", strict: true, schema } },
    }),
  });
  const body: any = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    if (res.status === 401) throw new Error("La clave de OpenAI no es válida");
    if (res.status === 429) throw new Error("OpenAI está limitando solicitudes o no hay saldo. Intenta más tarde.");
    throw new Error(`OpenAI: ${msg}`);
  }
  const text = body?.output_text ?? body?.output?.flatMap((o: any) => o.content ?? []).find((c: any) => c.type === "output_text")?.text;
  if (!text) throw new Error("OpenAI no devolvió resultado");
  const parsed = JSON.parse(text);
  parsed.score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
  return { ...parsed, documents_used: files.map((f) => f.name) };
}
