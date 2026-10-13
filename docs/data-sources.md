# Fuentes de datos — verificación (13 oct 2026, desde el servidor)

## 1. SEACE – Oportunidades de negocio (fuente usada para convocatorias vigentes)
Portal: https://prod4.seace.gob.pe/openegocio/#/buscar (el `#/buscar` es una ruta del navegador, no API).
Los endpoints se identificaron en el JavaScript público del portal y se probaron con `curl`:

| Endpoint | Resultado |
|---|---|
| `GET https://prod4.seace.gob.pe:8086/api/oportunidades/codObjeto/codDepartamento/sintesisProceso/codTipoProceso/0/0/0/0` | 200 JSON, ~1,2 s, 3 047 filas (1 por ítem), 2 568 procedimientos. Sin paginación: devuelve todo lo vigente. |
| `.../codObjeto/codDepartamento/sintesisProceso/codTipoProceso/0/{01..25}/0/0` | 200, filtra por departamento (código INEI). Se usa para mapear el `ubigeo` interno a región. |
| `.../listaSegmentoCubso` | 200, segmentos CUBSO con título. |
| `.../fichaProceso/idProceso/{idProcedimiento}` | 200, ficha con cronograma (`listaCronograma`), documentos (`listaDocumentos`), ítems y normativa. |
| `GET https://prod1.seace.gob.pe/SeaceWeb-PRO/SdescargarArchivoAlfresco?fileCode={codigoAlfresco}` | 200 con User-Agent de navegador y Referer del portal (403 sin ellos). Probado: `10.BASES_LP022026DPCACFFAA_20260703_181210_263.docx` (23 MB, DOCX). |

Cobertura observada: Bien 1 192, Servicio 1 008, Obra 502, Consultoría de Obra 345 ítems; 17 tipos de procedimiento (Licitación Pública, Concurso Público, Subasta Inversa, Comparación de Precios, Adjudicación Simplificada, etc.). Solo procedimientos vigentes; no hay histórico.

Mapeo: `idProcedimiento` → `tenders.source_id`; `nroItem` → `tender_items.item_number`; `valorReferencial` "---" → `null` (nivel procedimiento), `valorReferencialItem` → monto del ítem; `fechaPresentacionPropuestas` → cierre; `fechaConvocatoria` → publicación; `codCubso[0:2]` → rubro (segmento CUBSO, dato original, no inferido); `ubigeo` → región vía consulta por departamento.

Limitaciones: API no documentada oficialmente (puede cambiar); puerto 8086 no estándar; el `ubigeo` representa la ubicación registrada del ítem, que puede no coincidir con el lugar de ejecución; sin OCID. Condiciones de uso: datos públicos, consultas limitadas (1 sincronización completa + 26 consultas, concurrencia 4, reintentos con backoff y `Retry-After`).

## 2. Contrataciones Abiertas (OCDS)
`GET https://contratacionesabiertas.oece.gob.pe/api/v1/releases?page=1` → 403 sin User-Agent, 200 con User-Agent de navegador (OCDS 1.1 con extensiones de OECE). Pendiente: evaluar si publica convocatorias abiertas con suficiente rapidez y vincular `ocid`. Hoy no se usa como fuente de vigentes.

## 3. Datos abiertos OECE (histórico mensual)
No sustituye una fuente de convocatorias vigentes. No integrado.
