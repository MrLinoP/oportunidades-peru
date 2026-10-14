import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: location.pathname } });
    return { user: data.user };
  },
  component: AppLayout,
});

const nav = [
  { to: "/oportunidades", label: "Oportunidades" },
  { to: "/guardadas", label: "Guardadas" },
  { to: "/analizadas", label: "Analizadas" },
  { to: "/mi-empresa", label: "Mi empresa" },
] as const;

function AppLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2">Saltar al contenido</a>
      <header className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/oportunidades" className="flex-1 text-lg font-semibold tracking-tight md:flex-none">Oportunidades Perú</Link>
          <nav aria-label="Principal" className="order-last flex w-full flex-wrap gap-1 md:order-none md:w-auto md:flex-1">
            {nav.map((n) => (
              <Link key={n.to} to={n.to}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-primary-foreground/80 hover:bg-primary-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
                activeProps={{ className: "bg-primary-foreground/15 text-primary-foreground underline underline-offset-4", "aria-current": "page" }}>
                {n.label}
              </Link>
            ))}
          </nav>
          <span className="hidden text-sm text-primary-foreground/70 md:inline">{user.email}</span>
          <Button size="sm" variant="secondary" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}>Salir</Button>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-7xl px-2 py-4 sm:px-4 sm:py-6"><Outlet /></main>
    </div>
  );
}
