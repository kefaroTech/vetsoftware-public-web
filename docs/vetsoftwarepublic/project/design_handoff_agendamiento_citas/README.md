# Handoff: Agendamiento de citas (feature `appointment`)

## Overview
Módulo de **agenda de citas** para Vetrina: reservar, confirmar, atender, reprogramar y cancelar citas. Cada cita es un punto en el tiempo (`start_at` con hora) con un veterinario asignado. Cubre los 4 P0 del plan backend (entidad `Appointment`, estados + transiciones, permisos `appointment.*`, endpoints) desde el lado de la UI.

## Sobre los archivos de diseño
Los archivos en `prototype/` son **referencias de diseño creadas en HTML/React (JSX)** — un prototipo que muestra el aspecto y el comportamiento deseado, **no código para copiar tal cual**. La tarea es **recrear estos diseños en el codebase real de Vetrina, que es Vue** (el prototipo replica la estructura Vue existente: componentes `Vet*`, tokens, router hash, etc.), usando sus patrones y librerías (Vuetify/estilos propios, Pinia/store, vue-router, composables). El estado del prototipo es en memoria; en la app real se conecta a los endpoints REST del `PLAN_BACKEND.md`.

## Fidelidad
**Alta (hi-fi).** Colores, tipografía, espaciados e interacciones son finales. Reproducir pixel-perfect con el sistema de diseño existente (tokens en `tokens.css`). Todo en español.

## Stack objetivo
- **Vue 3** + el design system actual de Vetrina (mismos tokens `--amatista-*`, `--warm-*`, fuentes Geist / Instrument Serif / JetBrains Mono).
- Reutilizar el shell/rutas existentes: la Agenda vive en la ruta `/dashboard/agenda` dentro del layout con sidebar (ítem "Agenda", sección TRABAJO).
- Reutilizar el **modal genérico** existente (en el prototipo `VetModalShell`; en Vue será vuestro componente de diálogo centrado con header icono+título+subtítulo, body scrollable y footer con `footerLeft` + acciones).

---

## Pantallas / Vistas

### 1. Agenda (contenedor)
- **Header**: kicker "TRABAJO · CITAS", título serif "Agenda" (36px, Instrument Serif), lead descriptivo, y botón CTA **"Nueva cita"** (gradiente amatista) arriba a la derecha.
- **Toolbar** (tarjeta `--warm-50`, borde `--warm-200`, radio 11px): botón "Hoy" + flechas ‹ › + etiqueta de rango (serif 21px, capitalize) a la izquierda; toggle segmentado **Mes / Semana / Día** a la derecha.
- **Filtros**: icono filtro + dos `select` — "Todos los vets" y "Todos los estados".
- **Resumen** (solo en vista Día): 4 tarjetas — Citas del día, Pendientes (REQUESTED+CONFIRMED+ARRIVED), En curso (IN_PROGRESS), Cerradas (COMPLETED+NO_SHOW+CANCELLED).
- **Body**: renderiza la vista activa (mes/semana/día) dentro de una tarjeta con borde, radio 12px, min-height 600px.

### 2. Vista Mes
- Grid 7 columnas × 6 filas (42 celdas), cabecera Lun…Dom. Celda: número de día (círculo amatista si es hoy) + contador de citas + hasta 3 "chips densos".
- **Chip denso**: fondo del color del tipo (claro), borde izquierdo 3px del color del tipo, muestra `HH:MM` + nombre mascota/contacto + punto de color del **estado** a la derecha. `+N más` si excede.
- Click en celda → cambia a vista Día de ese día. Click en chip → abre modal Detalle.

### 3. Vista Semana
- 7 columnas (una por día). Cabecera con día, número (círculo amatista si hoy) y conteo de citas. Lista de "chips" por día ordenados por hora.
- **Chip**: `HH:MM` mono + `icono tipo + nombre` + label del tipo. Fondo/borde por tipo.

### 4. Vista Día (por defecto)
- **Timeline** agrupado por hora: rail izquierdo con `HH:00` (mono) y línea vertical; a la derecha las tarjetas de cita.
- **Tarjeta de cita** (grid 52px | 1fr | auto): columna de hora (`HH:MM` mono 15px bold + icono tipo) · centro (nombre paciente/contacto + chip de tipo + bandera "Choque" si aplica; segunda línea: dueño o "Contacto libre" + notas) · derecha (píldora de estado + badge del vet con avatar de iniciales).
- Terminal (COMPLETED/NO_SHOW/CANCELLED) → opacidad reducida; CANCELLED → título tachado.
- Vacío → estado con emoji 📭 y botón "Agendar una cita".

### 5. Modal "Agendar / Editar cita" (centrado)
Modal ancho (~800px) con layout de **2 columnas**:
- Fila superior: **Fecha** | **Hora de inicio** (col izq) · **Veterinario/a asignado** (col der).
- Banda a todo el ancho: **Tipo de cita** — grid de botones (icono emoji + label) de los 9 tipos; seleccionado con borde/fondo amatista.
- Aviso de **choque de horario** (banner ámbar) si el vet ya tiene cita a esa hora — informativo, no bloquea.
- Dos columnas: izq = **"¿A quién es la cita?"** toggle *Cliente registrado / Contacto libre*; der = **Notas** (textarea, ≤1000, con contador).
  - *Cliente registrado*: **buscador de propietario** (input con lupa) que filtra por **nombre, ID o documento**, dropdown con avatar+nombre+ID+documento+teléfono; al elegir queda una tarjeta con botón "Cambiar". Debajo, **select de mascota** habilitado solo con dueño elegido, con opción "Por confirmar".
  - *Contacto libre*: inputs **Nombre del contacto** (≤120) y **Teléfono** (≤30).
- Footer: `footerLeft` = leyenda "Los campos con * son obligatorios"; acciones = Cancelar + **Agendar cita / Guardar cambios**.
- Validación: fecha, hora, tipo, vet requeridos + al menos uno de {mascota, dueño, nombre de contacto}. Banner rojo si falta el sujeto.

### 6. Modal "Detalle de cita" (centrado)
- Header: icono calendario, título `Cita #ID · Tipo`, subtítulo con día largo + hora.
- 2 columnas:
  - **Izquierda (datos)**: hero con `HH:MM` grande (mono) + píldora de estado; banner de choque si aplica; Veterinario (badge), Paciente (o "Por confirmar"), Propietario/Contacto (con "Sin registrar" si libre), Notas, y motivo de cancelación si CANCELLED.
  - **Derecha (acciones)**: título "Siguiente paso" y **botones de transición** válidos según el estado actual (p. ej. Solicitada → Confirmada / No asistió / Cancelar). "Cancelar la cita" abre un textarea de motivo. Si es terminal, nota "no admite más cambios".
- Footer: `footerLeft` = Reprogramar + Editar (si no terminal); acciones = Eliminar (con confirmación inline).

---

## Interacciones & comportamiento
- **Navegación temporal**: flechas mueven mes/semana/día según la vista; "Hoy" vuelve al día de hoy.
- **Máquina de estados**: solo se ofrecen transiciones válidas (ver PLAN_BACKEND §2). El cambio de estado usa `PATCH /status`; cancelar usa `PATCH /cancel` con motivo.
- **Reprogramar** = `PATCH /reschedule` (fecha/hora + vet). En el prototipo abre el mismo formulario de edición.
- **Solape**: al crear/editar/reprogramar, si hay choque (mismo vet + misma hora de inicio, citas activas no terminales) se muestra aviso; **nunca bloquea** el guardado. Los ids en choque llegan en `overlappingAppointmentIds`.
- **Eliminar** = soft delete (`enabled=false`).
- **Filtros** por vet y por estado se aplican a las tres vistas.
- **Toasts** de confirmación tras cada acción (crear, actualizar, cambiar estado, cancelar, eliminar).
- **Cerrar modales**: botón X o tecla Esc.

## State management (mapear a Pinia/composable)
- `appointments` (lista; en real: fetch por rango `from/to` + filtros).
- `view` (`month|week|day`), `cursor` (fecha), `vetFilter`, `statusFilter`.
- `selectedId` (detalle abierto), `form` (`{mode:'create'|'edit', appt?}`).
- Acciones → llamadas a los endpoints REST; refetch o update optimista de la lista.

## Modelo de datos
Ver `PLAN_BACKEND.md` (tabla, enums, transiciones, permisos, endpoints y contratos). Enums y transiciones están además codificados en `prototype/appt-model.jsx` (`APPT_TYPES`, `APPT_STATUS`, `APPT_TRANSITIONS`, `APPT_TERMINAL`) — cópialos como fuente de verdad del front.

## Permisos en el front
Gatear por `appointment.*` (ver matriz en PLAN_BACKEND §3): botón "Nueva cita" y acciones del detalle según permisos del rol (`create/update/cancel/delete`). El prototipo integrado asume admin (todo habilitado); en Vue usar el store de permisos existente.

## Design tokens (ya existentes en el codebase)
- **Amatista** (primario): escala `--amatista-50..900` en `oklch(L C var(--hue))`, `--hue: 300`.
- **Warm** (neutros): `--warm-50..900`.
- **Colores por tipo de cita**: reutilizan `VET_TYPE_COLORS` (amatista/red/green/teal/amber/blue/indigo/pink/gray) → ver `prototype/appt-model.jsx`.
- **Colores por estado**: definidos en `APPT_STATUS` (bg/fg/dot) en `prototype/appt-model.jsx`.
- **Tipografía**: Geist (sans), Instrument Serif (títulos), JetBrains Mono (horas/códigos).
- **Radios**: 6/8/12/16px. **Sombras**: suaves, ver `appt.css`.

## Mapeo de componentes (prototipo React → Vue)
| Prototipo (React/JSX) | Equivalente en Vue |
|---|---|
| `VetAgendaView` (screens-agenda.jsx) | Vista/página `Agenda.vue` en `/dashboard/agenda` |
| `VetModalShell` | Vuestro componente de diálogo centrado (header/body/footer) |
| `ApptForm` | `AppointmentFormModal.vue` |
| `ApptDetail` | `AppointmentDetailModal.vue` |
| `ApptOwnerSearch` | `OwnerSearchAutocomplete.vue` (busca por nombre/ID/documento) |
| `ApptStatusPill`, `ApptTypeChip`, `ApptVetBadge` | componentes de presentación pequeños |
| `VetIcons.*` | vuestro set de iconos (estilo Lucide, stroke 1.5–1.7) |
| Toast `useVetToast` | vuestro sistema de notificaciones |

## Archivos en este bundle
- `PLAN_BACKEND.md` — spec backend (tabla, enums, transiciones, permisos, endpoints, contratos).
- `prototype/appt-model.jsx` — enums, estados, transiciones, colores, lookups y componentes de presentación (**fuente de verdad del modelo de UI**).
- `prototype/appt-form.jsx` — modal de crear/editar (`ApptForm`), detalle (`ApptDetail`) y buscador de dueño (`ApptOwnerSearch`).
- `prototype/screens-agenda.jsx` — vista Agenda: mes/semana/día, filtros, resumen, datos semilla y orquestación.
- `prototype/appt.css` — estilos específicos de citas (tarjetas, píldoras, modal 2 columnas, buscador, transiciones).
- `prototype/agenda.css` — estilos del calendario mes/semana/día reutilizados.
- `prototype/tokens.css` — tokens del design system (colores, fuentes, radios).

## Cómo usarlo en Claude Code (IntelliJ)
1. Abre tu proyecto Vue en IntelliJ y arranca Claude Code.
2. Copia esta carpeta dentro del repo (o adjúntala) y pide: *"Implementa la feature de agendamiento (citas) en Vue siguiendo `design_handoff_agendamiento_citas/README.md` y `PLAN_BACKEND.md`, recreando el diseño de `prototype/` con nuestros componentes y conectándolo a los endpoints REST."*
3. Empieza por el modelo/enums (`appt-model.jsx` → constantes/tipos), luego la vista Agenda y por último los dos modales.
