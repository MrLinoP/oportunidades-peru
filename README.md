# Oportunidades Perú

Descubre contrataciones vigentes del Estado peruano (SEACE), fíltralas, guárdalas y (próximo hito) analiza sus bases contra el perfil de tu empresa.

- Fuentes verificadas: ver `docs/data-sources.md`.
- Sincronización: `POST /api/public/sync` con `Authorization: Bearer $LOVABLE_CRON_SECRET` (idempotente; una caída no borra registros).
- Documentos: `/api/public/documents/:id` reenvía solo URLs oficiales registradas.

## Supuestos
- Español, zona horaria America/Lima; una cuenta = una empresa.
- Backend: Lovable Cloud (Supabase gestionado) en lugar de un Supabase propio; migraciones en `drizzle/migrations`.
- "Abierta" = listada en la última sincronización de SEACE y con cierre futuro; si no, "Por confirmar" o "Cerrada".
- Cierre = fecha de presentación de propuestas de SEACE.
- Región = ubicación registrada por SEACE para el ítem (no la sede del comprador, pero puede diferir del lugar de ejecución).
- Rubro = segmento CUBSO original (2 primeros dígitos).
- Montos sin conversión de moneda; "---" se guarda como no informado.
- Catálogo visible solo a usuarios autenticados (lectura); perfil, guardadas y análisis privados por RLS.
- Sincronización automática diaria a las 00:00 (Lima) desde la versión publicada. Pendiente: despliegue en Vercel.

## Análisis (Hito 4)
- Usa OpenAI directo con `OPENAI_API_KEY` (modelo `OPENAI_MODEL`, por defecto gpt-4.1-mini).
- Lee hasta 3 bases PDF (máx. 12 MB c/u) descargadas de SEACE; si no hay, analiza solo con datos oficiales y lo indica.
- Resultado: puntaje 0–100, recomendación, requisitos con estado/evidencia/fuente, riesgos e información faltante. Se guarda por usuario y versión de oportunidad/perfil.
