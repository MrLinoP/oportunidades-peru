import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Ingresar — Oportunidades Perú" },
      { name: "description", content: "Crea tu cuenta o ingresa para buscar contrataciones públicas." },
      { property: "og:title", content: "Ingresar — Oportunidades Perú" },
      { property: "og:description", content: "Crea tu cuenta o ingresa para buscar contrataciones públicas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "signup" | "forgot";

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const target = redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/oportunidades";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: target });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/oportunidades` } });
        if (error) throw error;
        setMsg("Te enviamos un correo para verificar tu cuenta. Ábrelo y luego ingresa.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setMsg("Si el correo existe, recibirás un enlace para cambiar tu contraseña.");
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : "Error";
      toast.error(m.includes("Invalid login") ? "Correo o contraseña incorrectos" : m.includes("not confirmed") ? "Primero verifica tu correo" : m);
    } finally { setBusy(false); }
  }

  const title = mode === "login" ? "Ingresar" : mode === "signup" ? "Crear cuenta" : "Recuperar contraseña";
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <p className="text-sm font-semibold text-primary">Oportunidades Perú</p>
        <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Contrataciones públicas reales de SEACE, filtradas para tu empresa.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" minLength={8} required autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
              {mode === "signup" && <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Procesando…" : title}</Button>
          {msg && <p role="status" className="rounded-md bg-accent p-3 text-sm text-accent-foreground">{msg}</p>}
        </form>
        <div className="mt-4 flex flex-col gap-1 text-sm">
          {mode !== "login" && <button className="text-left text-primary underline-offset-4 hover:underline" onClick={() => setMode("login")}>Ya tengo cuenta</button>}
          {mode !== "signup" && <button className="text-left text-primary underline-offset-4 hover:underline" onClick={() => setMode("signup")}>Crear una cuenta</button>}
          {mode !== "forgot" && <button className="text-left text-primary underline-offset-4 hover:underline" onClick={() => setMode("forgot")}>Olvidé mi contraseña</button>}
        </div>
      </div>
    </main>
  );
}
