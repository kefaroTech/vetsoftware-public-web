# Handoff · Historia Clínica (Vetrina)

Flujo en 3 pasos: **Propietario → Mascota → Historia clínica** (timeline de `ClinicalEvent`).

## Cómo abrir el prototipo
1. Descomprimí en `docs/design/historia-clinica/` dentro de tu repo
2. Abrí `Historia Clinica Flujo.html` en el navegador
3. Probá con **Luna** (Carla Mendoza) — tiene 13 eventos de todos los tipos

---

## Modelo de datos (matchea con tu backend)

```ts
// Mirror exacto de ClinicalEventResponse y ClinicalEventType
export type ClinicalEventType =
  | 'CONSULTATION'
  | 'SURGERY'
  | 'VACCINATION'
  | 'DEWORMING'
  | 'HOSPITALIZATION'
  | 'LABORATORY_TEST'
  | 'DIAGNOSTIC_IMAGING'
  | 'PRESCRIPTION'
  | 'SPA';

export interface ClinicalEvent {
  sourceId: number;            // ID del registro original (consulta, cirugía, etc.)
  eventType: ClinicalEventType;
  eventDate: string;           // ISO yyyy-mm-dd
  summary: string;
}

export interface Owner {
  id: number;
  name: string;
  document: string;
  email: string;
  phone: string;
  address?: string;
  petsCount: number;
}

export interface Pet {
  id: number;
  ownerId: number;
  name: string;
  specie: 'Canino' | 'Felino' | 'Ave' | 'Roedor' | 'Otro';
  breed: string;
  sex: 'M' | 'F';
  weight: string;
  age: string;
  birthDate: string;
  color?: string;
}
```

---

## Endpoints sugeridos

```
GET /api/owners?q=…&page=…           → Owner[]
GET /api/owners/:id/pets             → Pet[]
GET /api/pets/:id                    → Pet
GET /api/pets/:id/clinical-history   → ClinicalEvent[]
GET /api/clinical-events/:type/:sourceId  → detalle por tipo (para abrir el evento)
```

---

## Estructura sugerida en Vue 3

```
src/
├─ views/historia-clinica/
│  ├─ HistoriaClinicaView.vue        # shell con breadcrumb + router-view
│  ├─ OwnerStep.vue
│  ├─ PetStep.vue
│  └─ HistoryStep.vue
├─ components/historia-clinica/
│  ├─ BreadcrumbStep.vue
│  ├─ OwnerSearchList.vue
│  ├─ PetCard.vue
│  ├─ EventCard.vue
│  ├─ EventTypeChip.vue              # con icon + color por tipo
│  └─ MonthTimelineGroup.vue
├─ stores/historia.ts                # owner/pet seleccionados + cache events
├─ services/historia.api.ts
├─ constants/eventTypes.ts           # mapa { label, color, icon } por enum
└─ types/historia.ts
```

---

## Rutas Vue Router

```ts
{
  path: '/historia-clinica',
  component: HistoriaClinicaView,
  children: [
    { path: '',                         component: OwnerStep,  name: 'historia.owner' },
    { path: ':ownerId/mascotas',        component: PetStep,    name: 'historia.pet' },
    { path: ':ownerId/mascotas/:petId', component: HistoryStep, name: 'historia.detail' },
  ],
}
```

El breadcrumb superior es navegable: click en "Propietario" vuelve a `''`, click en "Mascota" vuelve a `:ownerId/mascotas`.

---

## Mapa de tipos (constantes)

```ts
export const EVENT_TYPES: Record<ClinicalEventType, { label: string; color: string; icon: string }> = {
  CONSULTATION:       { label:'Consulta',        color:'amatista', icon:'🩺' },
  SURGERY:            { label:'Cirugía',         color:'red',      icon:'🔪' },
  VACCINATION:        { label:'Vacunación',      color:'green',    icon:'💉' },
  DEWORMING:          { label:'Desparasitación', color:'teal',     icon:'🪱' },
  HOSPITALIZATION:    { label:'Hospitalización', color:'amber',    icon:'🏥' },
  LABORATORY_TEST:    { label:'Laboratorio',     color:'blue',     icon:'🧪' },
  DIAGNOSTIC_IMAGING: { label:'Imagen Dx',       color:'indigo',   icon:'🩻' },
  PRESCRIPTION:       { label:'Receta',          color:'pink',     icon:'💊' },
  SPA:                { label:'Spa',             color:'gray',     icon:'🛁' },
};
```

Los colores OKLCH para cada `color` están en `history-data.jsx` (constante `TYPE_COLORS`). Cópialos a tu `tokens.css` o a un composable `useEventTypeColor()`.

---

## Comportamiento clave

| Acción | Detalle |
|---|---|
| Búsqueda de propietario | Filtro multi-campo (nombre, documento, email, teléfono) case-insensitive |
| Click en propietario | navega a `:ownerId/mascotas`, carga `getPets(ownerId)` |
| Click en mascota | navega a `:ownerId/mascotas/:petId`, carga `getClinicalHistory(petId)` |
| Chips de filtro | Filtran el timeline por `eventType`; conteo dinámico por tipo |
| Buscador interno | filtra por `summary + label` del tipo |
| Agrupación | timeline agrupada por **mes** descendente; línea vertical conecta los puntos |
| Click en evento | navega a vista de detalle según `eventType` y `sourceId` (ej. `/consulta/123` o `/cirugia/456`) |
| Botón "+ Nueva consulta" | abre wizard de Nueva Consulta con el paciente preseleccionado |

---

## Tokens CSS (los mismos del resto del producto)

```css
:root {
  --hue: 300;
  --amatista-50:  oklch(97% 0.015 var(--hue));
  --amatista-100: oklch(94% 0.035 var(--hue));
  --amatista-200: oklch(88% 0.07 var(--hue));
  --amatista-300: oklch(78% 0.12 var(--hue));
  --amatista-500: oklch(58% 0.18 var(--hue));
  --amatista-600: oklch(50% 0.18 var(--hue));
  --amatista-700: oklch(42% 0.16 var(--hue));
  --warm-50:  oklch(99% 0.005 60);
  --warm-100: oklch(97% 0.008 60);
  --warm-150: oklch(95% 0.01 60);
  --warm-200: oklch(92% 0.012 60);
  --warm-300: oklch(86% 0.015 60);
  --warm-400: oklch(72% 0.015 60);
  --warm-500: oklch(58% 0.012 60);
  --warm-600: oklch(45% 0.012 60);
  --warm-700: oklch(35% 0.012 60);
  --warm-800: oklch(25% 0.012 60);
  --warm-900: oklch(16% 0.012 60);
}
```

**Tipografía:** `Geist` (UI) + `Instrument Serif` (títulos y nombres).

---

## Prompt para Claude Code

> Tengo el handoff del flujo de **Historia clínica** de Vetrina en `docs/design/historia-clinica/`. Abrí `Historia Clinica Flujo.html` en navegador para ver el comportamiento exacto.
>
> Implementá las 3 pantallas en Vue 3 + TS + Pinia siguiendo el README:
>
> 1. Tipos en `types/historia.ts` mirror de `ClinicalEventResponse` y `ClinicalEventType` del backend
> 2. Constantes en `constants/eventTypes.ts` con label, color e icon por enum
> 3. Servicio `services/historia.api.ts` con los endpoints
> 4. Store Pinia `stores/historia.ts` para el contexto (owner/pet seleccionados, cache de events)
> 5. Vistas + componentes según la estructura
> 6. Routing con rutas hijas en `/historia-clinica/*`
> 7. **Reutilizar PatientPicker/SearchableSelect/DatePicker** si ya existen del flujo de Nueva Consulta
>
> Receta del timeline navega al detalle de Prescription. Cada tipo de evento debe abrir la vista de detalle correspondiente al hacer click (`/consultas/:sourceId`, `/cirugias/:sourceId`, etc.) — usa el `sourceId` que viene en el evento.
>
> El timeline está agrupado por mes descendente con línea vertical amatista conectando los puntos. Cada evento tiene icono + color únicos según `eventType`.

---

## Archivos en el zip

| archivo | contenido |
|---|---|
| `Historia Clinica Flujo.html` | entry — abrir en navegador |
| `history-data.jsx` | mocks de owners, pets, events + mapa de tipos + helpers de fecha |
| `history-flow.jsx` | App raíz con los 3 pasos, breadcrumb, timeline, filtros |
