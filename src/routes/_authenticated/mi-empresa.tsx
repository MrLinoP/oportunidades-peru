import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { getProfile, saveProfile, type ProfileInput } from "@/lib/tenders.functions";
import { REGION_OPTIONS, formatDate, isValidRucSyntax, profileReadyForScoring } from "@/lib/tender-rules";

export const Route = createFileRoute("/_authenticated/mi-empresa")({
  head: () => ({
    meta: [
      { title: "Mi empresa — Oportunidades Perú" },
      { name: "description", content: "Perfil declarado de tu empresa para evaluar oportunidades." },
      { property: "og:title", content: "Mi empresa — Oportunidades Perú" },
      { property: "og:description", content: "Perfil declarado de tu empresa para evaluar oportunidades." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

const empty: ProfileInput = {
  business_name: "",
  ruc: "",
  keywords: [],
  offerings: "",
  regions: [],
  capacity_amount: null,
  capacity_currency: "PEN",
  experience: [],
  staff: "",
  certifications: "",
  availability: "",
  restrictions: "",
  rnp_registrations: "",
  rnp_declared_at: null,
};

function ProfilePage() {
  const get = useServerFn(getProfile);
  const save = useServerFn(saveProfile);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["profile"], queryFn: () => get() });
  const [f, setF] = useState<ProfileInput>(empty);
  const [kw, setKw] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data) {
      setF({ ...empty, ...Object.fromEntries(Object.entries(data).filter(([k]) => k in empty)) } as ProfileInput);
      setKw((data.keywords ?? []).join(", "));
    }
  }, [data]);
  const up = <K extends keyof ProfileInput>(k: K, v: ProfileInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const rucBad = !!f.ruc && !isValidRucSyntax(f.ruc);
  const ready = profileReadyForScoring({
    ...f,
    keywords: kw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  });

  if (isLoading) return <p role="status">Cargando…</p>;
  return (
    <form
      className="w-full space-y-5 sm:space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        if (rucBad) {
          toast.error("Revisa el RUC: debe tener 11 dígitos");
          return;
        }
        setBusy(true);
        try {
          await save({
            data: {
              ...f,
              ruc: f.ruc || null,
              keywords: kw
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            },
          });
          qc.invalidateQueries({ queryKey: ["profile"] });
          toast.success("Perfil guardado");
        } catch {
          toast.error("No se pudo guardar. Reintenta.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <h1 className="text-2xl font-semibold">Mi empresa</h1>
        <p className="text-sm text-muted-foreground">
          Datos declarados por ti; no se verifican con fuentes oficiales.
          {data ? ` Versión ${data.version} · ${formatDate(data.updated_at)}` : ""}
        </p>
        <p
          role="status"
          className={`mt-2 rounded-md p-3 text-sm ${ready ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}`}
        >
          {ready
            ? "✓ Perfil completo para puntuar oportunidades."
            : "Borrador: completa razón social y RUC, rubros u oferta, regiones y capacidad económica para poder puntuar. Puedes guardar y explorar mientras tanto."}
        </p>
      </div>

      <section className="space-y-4 rounded-lg border bg-card p-4 sm:p-5">
        <h2 className="font-semibold">Identidad</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="bn">Razón social *</Label>
            <Input id="bn" value={f.business_name ?? ""} onChange={(e) => up("business_name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ruc">RUC *</Label>
            <Input
              id="ruc"
              inputMode="numeric"
              maxLength={11}
              value={f.ruc ?? ""}
              aria-invalid={rucBad}
              aria-describedby="ruc-h"
              onChange={(e) => up("ruc", e.target.value.replace(/\D/g, ""))}
            />
            <p id="ruc-h" className={`text-xs ${rucBad ? "text-destructive" : "text-muted-foreground"}`}>
              {rucBad ? "Debe tener 11 dígitos y empezar con 10, 15, 16, 17 o 20." : "Validación solo de formato."}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border bg-card p-4 sm:p-5">
        <h2 className="font-semibold">Oferta</h2>
        <div className="space-y-1.5">
          <Label htmlFor="kw">Rubros / palabras clave * (separadas por coma)</Label>
          <Input
            id="kw"
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            placeholder="equipos médicos, mantenimiento, software"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="of">Bienes o servicios ofrecidos *</Label>
          <Textarea id="of" rows={3} value={f.offerings ?? ""} onChange={(e) => up("offerings", e.target.value)} />
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4 sm:p-5">
        <fieldset>
          <legend className="font-semibold">Regiones de atención *</legend>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {REGION_OPTIONS.filter((r) => r !== "No informado").map((r) => (
              <div key={r} className="flex items-center gap-2">
                <Checkbox
                  id={`r-${r}`}
                  checked={f.regions.includes(r)}
                  onCheckedChange={(c) => up("regions", c ? [...f.regions, r] : f.regions.filter((x) => x !== r))}
                />
                <Label htmlFor={`r-${r}`} className="font-normal">
                  {r}
                </Label>
              </div>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="space-y-4 rounded-lg border bg-card p-4 sm:p-5">
        <h2 className="font-semibold">Capacidad y experiencia</h2>
        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="cap">Capacidad económica declarada *</Label>
              <Input
                id="cap"
                type="number"
                min={0}
                value={f.capacity_amount ?? ""}
                onChange={(e) => up("capacity_amount", e.target.value === "" ? null : Number(e.target.value))}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="cur">Moneda</Label>
              <select
                id="cur"
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={f.capacity_currency ?? "PEN"}
                onChange={(e) => up("capacity_currency", e.target.value)}
              >
                <option value="PEN">S/</option>
                <option value="USD">US$</option>
              </select>
            </div>
          </div>
          <fieldset className="min-w-0 space-y-2">
            <legend className="text-sm font-medium">Experiencia por especialidad</legend>
            {f.experience.map((x, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px_92px_auto]">
                <Input
                  aria-label="Especialidad"
                  placeholder="Especialidad"
                  value={x.specialty}
                  onChange={(e) =>
                    up(
                      "experience",
                      f.experience.map((y, j) => (j === i ? { ...y, specialty: e.target.value } : y)),
                    )
                  }
                />
                <div className="grid grid-cols-[minmax(0,1fr)_92px_auto] gap-2 sm:contents">
                  <Input
                    aria-label="Monto facturado"
                    type="number"
                    placeholder="Monto"
                    value={x.amount ?? ""}
                    onChange={(e) =>
                      up(
                        "experience",
                        f.experience.map((y, j) =>
                          j === i ? { ...y, amount: e.target.value === "" ? null : Number(e.target.value) } : y,
                        ),
                      )
                    }
                  />
                  <select
                    aria-label="Moneda"
                    className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                    value={x.currency ?? "PEN"}
                    onChange={(e) =>
                      up(
                        "experience",
                        f.experience.map((y, j) => (j === i ? { ...y, currency: e.target.value } : y)),
                      )
                    }
                  >
                    <option value="PEN">S/</option>
                    <option value="USD">US$</option>
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Quitar experiencia"
                    onClick={() =>
                      up(
                        "experience",
                        f.experience.filter((_, j) => j !== i),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => up("experience", [...f.experience, { specialty: "", amount: null, currency: "PEN" }])}
            >
              <Plus className="h-4 w-4" />
              Agregar experiencia
            </Button>
          </fieldset>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {(
            [
              ["staff", "Personal clave"],
              ["certifications", "Certificaciones"],
              ["availability", "Disponibilidad"],
              ["restrictions", "Restricciones"],
            ] as const
          ).map(([k, l]) => (
            <div key={k} className="min-w-0 space-y-1.5">
              <Label htmlFor={k}>{l}</Label>
              <Textarea
                id={k}
                rows={12}
                className="!h-48 !min-h-48 resize-y"
                value={(f[k] as string) ?? ""}
                onChange={(e) => up(k, e.target.value)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border bg-card p-4 sm:p-5">
        <h2 className="font-semibold">RNP declarado</h2>
        <p className="text-xs text-muted-foreground">
          Lo que declares aquí no se verifica con el Registro Nacional de Proveedores.
        </p>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="rnp">Registros RNP vigentes (bienes, servicios, obras, consultoría)</Label>
            <Textarea
              id="rnp"
              rows={2}
              value={f.rnp_registrations ?? ""}
              onChange={(e) => up("rnp_registrations", e.target.value)}
            />
          </div>
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="rnpd">Fecha de esta declaración</Label>
            <Input
              id="rnpd"
              type="date"
              value={f.rnp_declared_at ?? ""}
              onChange={(e) => up("rnp_declared_at", e.target.value || null)}
            />
          </div>
        </div>
      </section>

      <Button type="submit" disabled={busy}>
        {busy ? "Guardando…" : "Guardar perfil"}
      </Button>
    </form>
  );
}
