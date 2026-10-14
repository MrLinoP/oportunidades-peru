import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FilterCategory({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  return (
    <div className="min-w-0 border-b border-border/50 last:border-b-0 lg:border-0">
      <Button
        type="button"
        variant="ghost"
        className="h-auto w-full justify-between gap-2 whitespace-normal px-0 py-3 text-left lg:hidden"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span>{title}</span>
          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground" aria-label={`${count} opciones seleccionadas`}>{count}</span>
        </span>
        <ChevronDown aria-hidden className={`shrink-0 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
      </Button>
      <div id={contentId} className={open ? "pb-4 lg:pb-0" : "hidden lg:block"}>
        {children}
      </div>
    </div>
  );
}