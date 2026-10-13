import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Oportunidades Perú — Contrataciones públicas reales" },
      { name: "description", content: "Busca, guarda y analiza convocatorias vigentes de SEACE para tu empresa." },
      { property: "og:title", content: "Oportunidades Perú" },
      { property: "og:description", content: "Busca, guarda y analiza convocatorias vigentes de SEACE para tu empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => { throw redirect({ to: "/oportunidades" }); },
});
