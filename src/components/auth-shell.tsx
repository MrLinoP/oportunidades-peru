import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import peruIllustration from "@/assets/peru-auth.jpg";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth-page">
      <header className="auth-header">
        <a href="/auth" className="auth-brand"><span className="auth-brand-mark"><MapPin aria-hidden="true" /></span><span>Oportunidades <strong>Perú</strong></span></a>
        <span className="auth-header-note">Un país de oportunidades</span>
      </header>
      <div className="auth-layout">
        <section className="auth-form-section">{children}</section>
        <aside className="auth-art" aria-label="Ilustración del Perú">
          <img src={peruIllustration} alt="Mapa ilustrado del Perú con Machu Picchu, los Andes, la costa y la Amazonía" width={1024} height={1280} fetchPriority="high" />
          <div className="auth-art-caption"><span className="auth-caption-line" /><span>Costa. Sierra. Selva.</span></div>
        </aside>
      </div>
      <footer className="auth-footer"><span>Oportunidades Perú</span><span>Contrataciones públicas · SEACE</span></footer>
    </main>
  );
}