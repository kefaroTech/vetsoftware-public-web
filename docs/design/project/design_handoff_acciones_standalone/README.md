# Handoff · Acciones clínicas standalone (Vetrina)

6 pantallas independientes para crear acciones clínicas **sin pasar por una consulta**: Examen laboratorio, Imagen diagnóstica, Vacunación, Hospitalización, Desparasitación, Cirugía.

> **Receta** queda excluida adrede — solo se crea dentro del flujo de Nueva Consulta.

## Cómo abrir el prototipo

1. Descomprimí el zip en tu repo (ej. `docs/design/acciones-standalone/`)
2. Abrí `Acciones Clinicas Standalone.html` en el navegador

**Probá:**
- Sidebar lateral → navega entre los 6 flujos
- Click en `+ Nueva …` (botón primary arriba a la derecha)
- Modal grande con `PatientPicker` (búsqueda multi-campo), `SearchableSelect` con creación inline de tipos nuevos, `DatePicker` con icono amatista
- Buscador en cada lista (filtra en vivo)
- Paginación: 8 filas por página, controles `« ‹ 1 2 3 › »` en el footer

---

## Stack target

- **Vue 3** + `<script setup>` + TypeScript
- **Pinia** para state (catálogos de tipos creables) + draft local de cada modal
- **Vue Router** con rutas hijas para cada acción
- Tokens CSS globales — sin UI kit

---

## Rutas

```ts
{
  path: '/acciones',
  component: AccionesShell,        // sidebar lateral con nav
  children: [
    { path: '',             redirect: 'laboratorio' },
    { path: 'laboratorio',  component: LabListView },
    { path: 'imagen',       component: ImagingListView },
    { path: 'vacunacion',   component: VaccineListView },
    { path: 'hospitalizacion', component: HospListView },
    { path: 'desparasitacion', component: DewormListView },
    { path: 'cirugia',      component: SurgeryListView },
  ],
}
```

Cada `*ListView` abre el modal correspondiente cuando se hace click en `+ Nueva …`.

---

## Modelo de datos (TS)

```ts
// Cada acción clínica vive sin Consultation.id (a diferencia del flujo desde consulta).
// El PatientPicker provee patientId obligatorio.

interface LabTest {
  id: number;
  patientId: number;
  date: string;
  suspicion?: string;
  tests: Array<{
    type: string;          // catálogo creable
    quantity: number;
    diagnosis?: string;
  }>;
  status: 'pendiente' | 'completado';
}

interface DiagnosticImaging {
  id: number;
  patientId: number;
  date: string;
  type: string;            // catálogo creable: Rayos X, Eco, TAC…
  studyType?: string;      // región / protocolo
  clinicalSigns: string;   // requerido
  diagnosis?: string;
  observations?: string;
  status: 'pendiente' | 'completado';
}

interface Vaccination {
  id: number;
  patientId: number;
  date: string;
  items: Array<{
    type: string;          // catálogo creable
    laboratory: string;
    lot: string;
    nextVaccination: string;
  }>;
}

interface Hospitalization {
  id: number;
  patientId: number;
  type: 'HOSPITALIZATION' | 'OUTPATIENT';
  startDate: string;
  endDate?: string;
  reasonLeaving?: 'MEDICAL_DISCHARGE' | 'HOME_TREATMENT' | 'TRANSFER' | 'TUTOR_WISH' | 'DEATH' | 'EUTHANASIA';
  reason: string;
  observations?: string;
  status: 'ACTIVE' | 'DISCHARGED';
}

interface Deworming {
  id: number;
  patientId: number;
  type: 'INTERNAL' | 'EXTERNAL' | 'MIX' | 'OTHER';
  date: string;
  product: string;
  dosage: string;
  lastDeworming?: string;
  nextControl: string;
  observations?: string;
}

interface Surgery {
  id: number;
  patientId: number;
  date: string;
  surgeryType: string;     // catálogo creable
  description: string;
  medicament?: string;
  observations?: string;
  complications?: string;
  status: 'scheduled' | 'completed';
}
```

---

## Estructura sugerida en Vue 3

```
src/
├─ views/acciones/
│  ├─ AccionesShell.vue          # sidebar + router-view
│  ├─ LabListView.vue
│  ├─ ImagingListView.vue
│  ├─ VaccineListView.vue
│  ├─ HospListView.vue
│  ├─ DewormListView.vue
│  └─ SurgeryListView.vue
├─ components/acciones/
│  ├─ modals/
│  │  ├─ LabCreateModal.vue
│  │  ├─ ImagingCreateModal.vue
│  │  ├─ VaccineCreateModal.vue
│  │  ├─ HospCreateModal.vue
│  │  ├─ DewormCreateModal.vue
│  │  └─ SurgeryCreateModal.vue
│  ├─ ListBody.vue              # tabla + buscador + paginación
│  ├─ Pagination.vue
│  ├─ PatientCell.vue
│  └─ StatusPill.vue
├─ components/form/             # ⭐ reutilizables (también para Nueva Consulta)
│  ├─ PatientPicker.vue
│  ├─ SearchableSelect.vue      # con onCreate inline
│  ├─ DatePicker.vue
│  ├─ Field.vue
│  └─ ModalShell.vue
├─ stores/
│  ├─ catalogs.ts               # tipos creables: lab, imaging, vaccine, surgery
│  └─ accionesClinicas.ts       # listas + filtros + paginación
├─ services/                    # axios
│  ├─ lab.api.ts
│  ├─ imaging.api.ts
│  ├─ vaccine.api.ts
│  ├─ hosp.api.ts
│  ├─ deworm.api.ts
│  └─ surgery.api.ts
└─ types/clinicalActions.ts
```

---

## Endpoints sugeridos

```
GET    /api/lab-tests              ?page=1&size=8&q=…
POST   /api/lab-tests              { patientId, date, suspicion, tests[] }

GET    /api/imaging                ?page&size&q
POST   /api/imaging                { patientId, date, type, studyType, signs, diagnosis, observations }

GET    /api/vaccinations           ?page&size&q
POST   /api/vaccinations           { patientId, date, items[] }

GET    /api/hospitalizations       ?page&size&q
POST   /api/hospitalizations       { patientId, type, startDate, endDate, reasonLeaving, reason, observations }

GET    /api/dewormings             ?page&size&q
POST   /api/dewormings             { patientId, type, date, product, dosage, lastDeworming, nextControl, observations }

GET    /api/surgeries              ?page&size&q
POST   /api/surgeries              { patientId, date, surgeryType, description, medicament, observations, complications }

# Catálogos creables (compartidos con el flujo de consulta)
GET    /api/laboratory-test-types
POST   /api/laboratory-test-types
GET    /api/diagnostic-imaging-types
POST   /api/diagnostic-imaging-types
GET    /api/vaccine-types
POST   /api/vaccine-types
GET    /api/surgery-types
POST   /api/surgery-types
```

---

## Paginación

El prototipo usa **8 filas por página**, con:

- Resumen: `Mostrando X–Y de Z`
- Navegación: `«` primera · `‹` anterior · números (máximo 7 visibles, `…` para el resto) · `›` siguiente · `»` última
- Resetea a página 1 al cambiar el filtro de búsqueda

Implementación Vue sugerida:

```ts
// composables/usePaged.ts
export function usePaged<T>(items: Ref<T[]>, pageSize = 8) {
  const page = ref(1);
  watch(() => items.value.length, () => { page.value = 1; });
  const slice = computed(() => items.value.slice((page.value-1)*pageSize, page.value*pageSize));
  const pageCount = computed(() => Math.max(1, Math.ceil(items.value.length / pageSize)));
  return { slice, page, pageCount, total: computed(() => items.value.length), pageSize };
}
```

---

## Comportamiento clave

| Acción | Detalle |
|---|---|
| Click `+ Nueva …` | Abre modal (80% viewport) con `PatientPicker` obligatorio arriba |
| Selección de paciente | Search multi-campo (nombre · propietario · raza), trigger compacto con avatar |
| Crear tipo nuevo dentro de SearchableSelect | Botón `+ Crear nuevo …` al fondo del dropdown → form inline (nombre + descripción) → Enter guarda, Esc cancela |
| Guardar acción | POST al endpoint, prepend a la lista local, toast de éxito (3.5s) |
| Validación | El botón primary se deshabilita si falta paciente o algún required |
| Buscador en lista | Filtro multi-campo en vivo (cliente o server-side) |
| Receta | **No** está en este flujo; solo dentro de Nueva Consulta |

---

## Tokens CSS (mismos que el resto del producto)

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

**Tipografía:** `Geist` (UI) + `Instrument Serif` (títulos serif amatista) + `JetBrains Mono` (lote / códigos).

---

## Prompt para Claude Code

> Tengo el handoff de las **acciones clínicas standalone** de Vetrina en `docs/design/acciones-standalone/`. Abrí `Acciones Clinicas Standalone.html` en navegador para ver el comportamiento exacto y consultá los `.jsx` como referencia visual.
>
> Implementá las 6 pantallas en Vue 3 + TS + Pinia siguiendo el plan del README:
>
> 1. Tipos en `types/clinicalActions.ts` (sección "Modelo de datos")
> 2. Servicios `services/*.api.ts` con los endpoints listados
> 3. Composables: `usePaged.ts` para paginación cliente-side; `useCatalog.ts` para tipos creables
> 4. Stores Pinia: `catalogs.ts` (cache de tipos creables) + uno por flujo si requieren state propio
> 5. Componentes form reutilizables en `components/form/` — **PatientPicker, SearchableSelect (con onCreate inline), DatePicker, Field, ModalShell**. Estos también deben servir al flujo de Nueva Consulta (si ya existen, reutilizalos).
> 6. `ListBody.vue` con buscador integrado + paginación; cada `*ListView.vue` solo provee columnas, filas y modal de creación
> 7. Routing con rutas hijas en `/acciones/*`
>
> Tokens CSS globales (sección "Tokens CSS"). CSS scoped por componente, **sin Tailwind**.
>
> Receta queda **excluida** — solo se crea dentro del flujo Nueva Consulta existente.

---

## Archivos en el zip

| archivo | qué contiene |
|---|---|
| `Acciones Clinicas Standalone.html` | entry — abrilo en el navegador |
| `flows-data.jsx` | mocks de pacientes + registros recientes por módulo + helpers |
| `flows-shell.jsx` | sidebar, header, PatientPicker, SearchableSelect, DatePicker, Field, ModalShell, Toast |
| `flows-screens.jsx` | las 6 listas + 6 modales + ListBody con paginación |
| `flows-app.jsx` | App raíz con navegación entre flujos y toast de éxito |
