import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, CircleCheck, CircleDashed, CircleX, Clock, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleSave } from "@/lib/tenders.functions";
import { STATUS_LABEL, isStale, tenderStatus, formatDate, type TenderStatus } from "@/lib/tender-rules";

const STATUS_STYLE: Record<TenderStatus, { cls: string; Icon: typeof CircleCheck }> = {
  abierta: { cls: "bg-success text-success-foreground", Icon: CircleCheck },
  proxima: { cls: "bg-accent text-accent-foreground", Icon: Clock },
  cerrada: { cls: "bg-muted text-muted-foreground", Icon: CircleX },
  por_confirmar: { cls: "bg-warning text-warning-foreground", Icon: CircleDashed },
};

export function StatusBadge({ t }: { t: { closing_at: string | null; participation_start?: string | null; listed_in_source: boolean } }) {
  const s = tenderStatus(t);
  const { cls, Icon } = STATUS_STYLE[s];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden /> {STATUS_LABEL[s]}
    </span>
  );
}

export function FreshnessNote({ checked }: { checked: string | null }) {
  const stale = isStale(checked);
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${stale ? "font-medium text-destructive" : "text-muted-foreground"}`}>
      {stale && <TriangleAlert className="h-3.5 w-3.5" aria-hidden />}
      {stale ? "Desactualizado: " : "Comprobado: "}{formatDate(checked)}
    </span>
  );
}

export function SaveButton({ tenderId, saved, size = "sm" }: { tenderId: string; saved: boolean; size?: "sm" | "default" }) {
  const fn = useServerFn(toggleSave);
  const qc = useQueryClient();
  const [value, setValue] = useState(saved);
  const [busy, setBusy] = useState(false);
  return (
    <Button size={size} variant={value ? "secondary" : "outline"} aria-pressed={value} disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await fn({ data: { tenderId, save: !value } });
          setValue(r.saved);
          toast.success(r.saved ? "Guardada" : "Quitada de guardadas");
          qc.invalidateQueries({ queryKey: ["saved"] });
          qc.invalidateQueries({ queryKey: ["search"] });
          qc.invalidateQueries({ queryKey: ["tender", tenderId] });
        } catch { toast.error("No se pudo actualizar. Reintenta."); }
        finally { setBusy(false); }
      }}>
      {value ? <BookmarkCheck className="h-4 w-4" aria-hidden /> : <Bookmark className="h-4 w-4" aria-hidden />}
      {value ? "Guardada" : "Guardar"}
    </Button>
  );
}
