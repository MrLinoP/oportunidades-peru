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
- Pendiente: hito 4 (análisis con OpenAI), cron programado, despliegue en Vercel.
