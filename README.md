# Trazabilidad Cronos

App web/móvil para la trazabilidad de carrocerías con defectos retiradas de la línea regular.
Reemplaza el control en Excel con estados, timestamps y operarios registrados en cada paso.

## Flujo de estados

```
detectada (revisión final) → en_box → en_reparacion ⇄ espera_particularidad → liberada
                                └──────────── caso_especial (scrap / JyP / sin documento)
```

Cada transición queda en la tabla `eventos` con fecha, hora, turno y operario.
De ahí salen los tiempos de ciclo: espera de box, reparación y total en piso.

## Correr en desarrollo

```bash
export PATH="$HOME/.local/node/bin:$PATH"   # node portable local
npm install
npm run dev
```

## Modo demo (actual)

La app funciona hoy **sin backend**: los datos viven en `localStorage` del navegador,
inicializados con los datos reales migrados del Excel (`src/data/seed.json`).
Sirve para validar el flujo con revisión final, el box y la jefatura antes de decidir hosting.

- "Restaurar datos de demo" (en el Panel) vuelve al estado del Excel.
- Para regenerar el seed desde el Excel: `python3 scripts/migrar_excel.py [ruta] --sql`
  (también genera `supabase/seed.sql` con el histórico para la base real).

## Paso a producción (cuando IT defina)

El modelo está en Postgres puro (`supabase/schema.sql`), así que las dos opciones usan el mismo esquema:

- **Plan A — Supabase (cloud):** crear proyecto, correr `schema.sql` y `seed.sql` en el SQL editor,
  y reemplazar `src/data/repo.js` por llamadas a `@supabase/supabase-js` (la interfaz de funciones ya
  está pensada para eso: `crearIncidencia`, `transicion`, `incidencias`, `kpis`…). Realtime de Supabase
  actualiza el tablero del box en vivo.
- **Plan B — On-premise:** un Postgres en un servidor de planta + PostgREST o una API Node mínima.

## Power BI

Conectar Power BI directo al Postgres y usar las vistas:

- `v_en_piso` — foto actual del piso con días y semáforo (verde / ámbar >7d / rojo >40d)
- `v_tiempos_ciclo` — horas de espera, reparación y total por incidencia liberada
- `v_pareto_fallas` — conteo por tipo de falla, particularidad, color, turno y mes

## Estructura

```
src/data/seed.json      datos demo migrados del Excel real
src/data/repo.js        lógica de negocio (estados, eventos, KPIs)
src/screens/            Registrar (revisión final) · Box · Buscar · Panel
scripts/migrar_excel.py migración Excel → seed.json / seed.sql
supabase/schema.sql     esquema Postgres + vistas para Power BI
supabase/seed.sql       histórico del Excel listo para insertar
```

## Próximos pasos sugeridos

1. Relevamiento del documento físico ("lasagna") para confirmar si el CIS tiene código de barras
   → agregar escáner con la cámara (`@zxing/browser`).
2. Alertas por email/Telegram cuando una unidad supere umbrales (Supabase Edge Functions + cron).
3. Foto del defecto desde la cámara (Supabase Storage).
4. Pedidos de particularidades a chapistería con su propio estado.
5. ABM de operarios desde el Panel.
