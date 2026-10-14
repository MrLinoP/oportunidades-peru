import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Menu, LogOut } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

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
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };
  return (
    <div className="min-h-screen bg-background">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2">Saltar al contenido</a>
      <header className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 lg:flex lg:gap-x-6">
          <Link to="/oportunidades" className="min-w-0 text-lg font-semibold">Oportunidades Perú</Link>
          <div className="shrink-0 lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" aria-label="Abrir menú de navegación" title="Menú"><Menu aria-hidden /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={10} className="w-56 max-w-[calc(100vw-2rem)]">
                {nav.map((n) => (
                  <DropdownMenuItem key={n.to} asChild>
                    <Link to={n.to} className="min-h-11" activeProps={{ className: "bg-accent text-accent-foreground", "aria-current": "page" }}>{n.label}</Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="min-h-11" onSelect={() => { void signOut(); }}><LogOut aria-hidden />Salir</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <nav aria-label="Principal" className="hidden min-w-0 flex-1 gap-1 lg:flex">
            {nav.map((n) => (
              <Link key={n.to} to={n.to}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-primary-foreground/80 hover:bg-primary-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
                activeProps={{ className: "bg-primary-foreground/15 text-primary-foreground underline underline-offset-4", "aria-current": "page" }}>
                {n.label}
              </Link>
            ))}
          </nav>
          <span className="hidden min-w-0 truncate text-sm text-primary-foreground/70 lg:inline">{user.email}</span>
          <Button size="sm" variant="secondary" className="hidden shrink-0 lg:inline-flex" onClick={signOut}><LogOut aria-hidden />Salir</Button>
        </div>
      </header>
      <main id="main" className="mx-auto w-full min-w-0 max-w-7xl px-2 py-4 sm:px-4 sm:py-6"><Outlet /></main>
    </div>
  );
}
