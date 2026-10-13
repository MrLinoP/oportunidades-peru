import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth-shell";
import { isExistingSignup } from "@/lib/auth-result";

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
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const target = redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/oportunidades";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null); setError(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: target });
      } else if (mode === "signup") {
        const result = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
        if (isExistingSignup(result)) {
          setError("Está cuenta ya está registrada");
          return;
        }
        if (result.error) throw result.error;
        setMsg("Te enviamos un correo para verificar tu cuenta. Ábrelo y luego ingresa.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setMsg("Si el correo existe, recibirás un enlace para cambiar tu contraseña.");
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : "Error";
      setError(m.includes("Invalid login") ? "Correo o contraseña incorrectos" : m.includes("not confirmed") ? "Primero verifica tu correo" : m.includes("rate limit") || m.includes("after") ? "Has realizado varios intentos. Espera un momento y vuelve a intentarlo." : m);
    } finally { setBusy(false); }
  }

  const title = mode === "login" ? "Ingresar" : mode === "signup" ? "Crear cuenta" : "Recuperar contraseña";
  function switchMode(next: Mode) {
    setMode(next); setMsg(null); setError(null); setShowPassword(false); setPassword("");
  }
  return (
    <AuthShell>
      <div key={mode} className="auth-content">
        <p className="auth-kicker">{mode === "login" ? "Bienvenido de nuevo" : mode === "signup" ? "Tu próximo paso" : "Volvamos a conectar"}</p>
        <h1 className="auth-title">{mode === "login" ? "Tu próxima oportunidad está aquí." : mode === "signup" ? "Un nuevo comienzo para tu empresa." : "Recupera el acceso a tu cuenta."}</h1>
        <p className="auth-subtitle">{mode === "login" ? "Ingresa a Oportunidades Perú." : mode === "signup" ? "Crea tu cuenta en Oportunidades Perú." : "Te enviaremos un enlace a tu correo para restablecer tu contraseña."}</p>
        <form onSubmit={submit} className="auth-form">
          <div className="auth-field">
            <Label htmlFor="email">Correo</Label>
            <Input className="auth-input" id="email" type="email" autoComplete="email" placeholder="nombre@empresa.com" disabled={busy} required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {mode !== "forgot" && (
            <div className="auth-field">
              <Label htmlFor="password">Contraseña</Label>
              <div className="auth-password">
                <Input className="auth-input" id="password" type={showPassword ? "text" : "password"} placeholder={mode === "signup" ? "Crea una contraseña" : "Tu contraseña"} disabled={busy} minLength={mode === "signup" ? 8 : undefined} required autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
                <Button className="auth-password-toggle" variant="ghost" size="icon" type="button" disabled={busy} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</Button>
              </div>
              {mode === "signup" && <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>}
            </div>
          )}
          {mode === "login" && <div className="auth-forgot-link"><Button type="button" variant="link" className="auth-text-button" disabled={busy} onClick={() => switchMode("forgot")}>Olvidé mi contraseña</Button></div>}
          {error && <div role="alert" className="auth-feedback auth-error"><AlertCircle aria-hidden="true" /><span>{error}</span></div>}
          {msg && <div role="status" className="auth-feedback auth-success"><CheckCircle2 aria-hidden="true" /><span>{msg}</span></div>}
          <Button type="submit" className="auth-submit" disabled={busy}>{busy ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : null}{busy ? "Procesando…" : mode === "forgot" ? "Enviar enlace" : title}{!busy && <ArrowRight aria-hidden="true" />}</Button>
        </form>
        <div className="auth-links">
          {mode === "login" ? <><span>¿Aún no tienes cuenta?</span><Button variant="link" className="auth-text-button" disabled={busy} onClick={() => switchMode("signup")}>Crear una cuenta</Button></> : <Button variant="link" className="auth-text-button" disabled={busy} onClick={() => switchMode("login")}><ArrowLeft aria-hidden="true" />{mode === "signup" ? "Ya tengo cuenta" : "Volver a ingresar"}</Button>}
        </div>
      </div>
    </AuthShell>
  );
}
