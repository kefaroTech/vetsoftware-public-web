# Handoff · Flujo Nueva Consulta (Vetrina)

Paquete de diseño para implementar en **Vue 3** desde **IntelliJ + Claude Code**.
Cubre el flujo completo de creación de consulta veterinaria (4 pasos) + 7 modales de acciones rápidas (Receta, Examen Lab, Imagen Dx, Vacunación, Hospitalización, Desparasitación, Cirugía) con desplegables buscables y creación inline de tipos.

---

## 1 · Cómo abrir el prototipo de referencia

1. Descomprimí el zip dentro de tu repo: `docs/design/nueva-consulta/`
2. Abrí `Flujo Interactivo.html` en el navegador (doble click) — es navegable real con state.

**Recorrido sugerido para entender el flujo:**

| Paso | Qué hacer |
|------|-----------|
| 1. Propietario | Escribí `carla` en el buscador → click en el resultado → "Continuar" |
| 1b. (Alt) Crear propietario | Click en "Registrar nuevo propietario" → completar formulario → guardar |
| 2. Mascota | Click en "Luna" (o cualquier mascota del owner) → "Continuar" |
| 2b. (Alt) Crear mascota | Click en "Registrar nueva mascota" → completar → guardar |
| 3. Datos consulta | Llenar tipo, motivo, signos vitales → probar **Acciones rápidas** abajo |
| 3a. Acción rápida | Click en cualquiera (Receta, Examen Lab…) → llenar → guardar |
| 3b. Crear nuevo tipo | Dentro del desplegable hay botón "+ Crear nuevo …" → form inline |
| 4. Resumen | Revisar todo → "Finalizar consulta" |

---

## 2 · Sistema de diseño

### 2.1 Tokens de color (OKLCH — copiar tal cual a tu `tokens.css`)

```css
:root {
  --hue: 300;  /* Amatista. Subí a 320 para más rosa, bajá a 280 para más azul */

  /* Amatista (acento principal) */
  --amatista-50:  oklch(97% 0.015 var(--hue));
  --amatista-100: oklch(94% 0.035 var(--hue));
  --amatista-200: oklch(88% 0.07  var(--hue));
  --amatista-300: oklch(78% 0.12  var(--hue));
  --amatista-400: oklch(68% 0.16  var(--hue));
  --amatista-500: oklch(58% 0.18  var(--hue));  /* botones, links */
  --amatista-600: oklch(50% 0.18  var(--hue));  /* hover */
  --amatista-700: oklch(42% 0.16  var(--hue));  /* sidebar bg */

  /* Warm neutrals (grises cálidos) */
  --warm-50:  oklch(99% 0.005 60);   /* superficies elevadas */
  --warm-100: oklch(97% 0.008 60);   /* fondo inputs */
  --warm-150: oklch(95% 0.01  60);
  --warm-200: oklch(92% 0.012 60);   /* bordes suaves */
  --warm-300: oklch(86% 0.015 60);   /* bordes fuertes */
  --warm-400: oklch(72% 0.015 60);   /* placeholder */
  --warm-500: oklch(58% 0.012 60);   /* texto sutil */
  --warm-600: oklch(45% 0.012 60);   /* texto secundario */
  --warm-700: oklch(35% 0.012 60);
  --warm-800: oklch(25% 0.012 60);   /* texto cuerpo */
  --warm-900: oklch(16% 0.012 60);   /* títulos */
}
```

### 2.2 Tipografía

```html
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

| Uso | Familia | Tamaños / pesos |
|------|---------|-----------------|
| UI / cuerpo | **Geist** | 11.5–14px · 400 / 500 / 600 |
| Títulos de modal / sección | **Instrument Serif** | 22–32px · 400 (italic opcional) |
| Datos clínicos / códigos | **JetBrains Mono** | 12–14px · 500 |

### 2.3 Espaciado y radios

- **Padding base:** 24px (modales 24/32, secciones 14–18)
- **Gaps:** 6 / 8 / 10 / 14 (form), 18–24 (entre secciones)
- **Radios:** 8 (inputs/botones), 10–11 (cards de item), 16 (modales)
- **Sombra modal:** `0 30px 80px rgba(20,15,30,0.35)`

### 2.4 Estados de input

```css
input, select, textarea {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13.5px;
  font-family: inherit;
  color: var(--warm-800);
  transition: border-color .15s, box-shadow .15s;
}
input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--amatista-500);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--amatista-500) 18%, transparent);
}
```

---

## 3 · Estructura sugerida en Vue 3

```
src/
├── views/
│   └── nueva-consulta/
│       ├── NuevaConsultaView.vue         # Wizard shell + router
│       ├── steps/
│       │   ├── Step1Owner.vue
│       │   ├── Step2Pet.vue
│       │   ├── Step3Consultation.vue
│       │   └── Step4Summary.vue
│       └── modals/
│           ├── RecetaModal.vue
│           ├── LabTestModal.vue
│           ├── ImagingModal.vue
│           ├── VaccinationModal.vue
│           ├── HospitalizationModal.vue
│           ├── DewormingModal.vue
│           └── SurgeryModal.vue
├── components/
│   ├── form/
│   │   ├── SearchableSelect.vue          # ⭐ con onCreate + creación inline
│   │   ├── DatePicker.vue                # wrapper de @vuepic/vue-datepicker
│   │   ├── Field.vue                     # label + required + hint + error
│   │   └── PillSelector.vue              # toggle de opciones (Macho/Hembra, etc.)
│   ├── feedback/
│   │   ├── Modal.vue                     # ModalShell con header/footer
│   │   └── ItemHeader.vue                # contador + título + remove
│   └── layout/
│       ├── WizardShell.vue
│       └── Stepper.vue
├── composables/
│   ├── useConsultaDraft.ts               # estado del wizard (pinia)
│   └── useCatalogs.ts                    # fetch+cache catálogos creables
├── stores/
│   └── consultaStore.ts                  # Pinia: owner, pet, consulta, items
├── api/
│   ├── owners.ts
│   ├── pets.ts
│   ├── consultations.ts
│   └── catalogs.ts                       # tipos de examen, vacuna, etc.
└── tokens.css
```

---

## 4 · Modelo de datos (alineado con el back)

```ts
// Owner
interface Owner {
  id: string;
  name: string;
  document: string;        // DNI / RUC / pasaporte
  phone: string;
  email?: string;
  address?: string;
  petsCount?: number;
}

// Pet
interface Pet {
  id: string;
  ownerId: string;
  name: string;
  specie: 'Perro' | 'Gato' | 'Ave' | 'Conejo' | 'Otro';
  breed?: string;
  sex: 'M' | 'F';
  reproductiveStatus: 'INTACT' | 'NEUTERED';
  birthDate?: string;       // ISO
  weight?: number;          // kg
  microchip?: string;
  color?: string;
  observations?: string;
}

// Consulta (entidad raíz del flujo)
interface Consultation {
  id?: string;
  petId: string;
  ownerId: string;
  type: 'Control' | 'Urgencia' | 'Cirugía' | 'Vacunación' | 'Desparasitación'
      | 'Chequeo geriátrico' | 'Control post-operatorio' | 'Eutanasia'
      | 'Telemedicina' | 'Otra';
  date: string;             // ISO
  reason: string;           // motivo
  vitalSigns: {
    weight?: number;        // kg
    temperature?: number;   // °C
    heartRate?: number;     // bpm
    respiratoryRate?: number; // rpm
    crt?: number;           // segundos
    mucousMembranes?: 'Rosadas' | 'Pálidas' | 'Cianóticas' | 'Ictéricas' | 'Congestivas';
  };
  anamnesis?: string;
  physicalExam?: string;
  diagnosis?: string;
  treatment?: string;
  observations?: string;

  // Items vinculados (acciones rápidas)
  prescriptions?: Prescription[];
  laboratoryTests?: LaboratoryTest[];
  diagnosticImaging?: DiagnosticImaging[];
  vaccinations?: Vaccination[];
  hospitalizations?: Hospitalization[];
  deworming?: Deworming[];
  surgeries?: Surgery[];
}

// ─── Items ───
interface Prescription {
  date: string;
  medications: Array<{
    product: string;
    activeIngredient?: string;
    dosage: string;
    route: string;          // VO, IM, SC, IV…
    frequency: string;      // c/8h, c/12h…
    duration: string;       // días
    quantity?: number;
    notes?: string;
  }>;
  generalNotes?: string;
}

interface LaboratoryTest {
  date: string;
  clinicalSuspicion?: string;
  tests: Array<{
    type: string;           // catálogo creable
    quantity: number;
    diagnosis?: string;     // diagnóstico presuntivo
  }>;
}

interface DiagnosticImaging {
  date: string;
  type: string;             // catálogo creable: Rayos X, Ecografía, TAC…
  studyType?: string;       // región/protocolo
  clinicalSigns: string;
  diagnosis?: string;
  observations?: string;
}

interface Vaccination {
  date: string;
  items: Array<{
    type: string;           // catálogo creable
    laboratory: string;
    lot: string;
    notes?: string;
    nextVaccination: string; // ISO
    route?: string;          // SC, IM, intranasal
  }>;
}

interface Hospitalization {
  startDate: string;
  endDate?: string;
  reason: string;
  diagnosis?: string;
  treatmentPlan?: string;
  cageNumber?: string;
  status: 'ACTIVE' | 'DISCHARGED';
}

interface Deworming {
  type: 'INTERNAL' | 'EXTERNAL' | 'MIX' | 'OTHER';
  date: string;
  product: string;
  dosage: string;
  lastDeworming?: string;
  nextControl: string;
}

interface Surgery {
  date: string;
  surgeryType: string;      // catálogo creable
  description: string;
  medicament?: string;      // anestesia + premedicación
  observations?: string;
  complications?: string;
}
```

---

## 5 · Componentes clave a portar

### 5.1 `SearchableSelect.vue` ⭐

Es el componente más importante del paquete. Usado en:

| Modal | Campo | Catálogo |
|-------|-------|----------|
| Step3Consultation | Tipo de consulta | `consultationTypes` |
| LabTestModal | Tipo de examen | `laboratoryTestTypes` |
| ImagingModal | Tipo de estudio | `diagnosticImagingTypes` |
| VaccinationModal | Tipo de vacuna | `vaccineTypes` |
| SurgeryModal | Tipo de cirugía | `surgeryTypes` |

**Props:**
```ts
interface SearchableSelectProps {
  modelValue: string;
  options: Array<{ value: string; label: string; hint?: string }>;
  placeholder?: string;
  // Si se pasa, muestra "+ Crear nuevo" al fondo del dropdown
  onCreate?: (option: { value: string; label: string; hint?: string }) => void | Promise<void>;
  createLabel?: string;     // ej. "Crear nuevo tipo de examen"
}
```

**Comportamiento (replicar exactamente):**
1. Click en trigger → abre panel debajo con input de búsqueda autoFocus + lista filtrada.
2. Búsqueda case-insensitive sobre `label + hint`.
3. Si `onCreate` está presente → al fondo del panel aparece botón en amatista:
   - Sin texto en buscador: `+ Crear nuevo …` (usa `createLabel`)
   - Con texto: `+ Crear "{texto}"` (pre-rellena el nombre)
4. Click en crear → reemplaza el panel con form inline (Nombre + Descripción opcional).
5. **Enter** = guardar · **Esc** = cancelar.
6. Al guardar: `onCreate({ value, label, hint })` + auto-selecciona el nuevo valor + cierra panel.
7. Click fuera del componente cierra panel y cancela creación.

**Implementación Vue (esqueleto):**

```vue
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps<SearchableSelectProps>();
const emit = defineEmits<{ 'update:modelValue': [string] }>();

const open = ref(false);
const q = ref('');
const creating = ref(false);
const newName = ref('');
const newHint = ref('');
const root = ref<HTMLElement>();

const selected = computed(() =>
  props.options.find(o => o.value === props.modelValue),
);

const filtered = computed(() => {
  if (!q.value) return props.options;
  const needle = q.value.toLowerCase();
  return props.options.filter(o =>
    `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(needle),
  );
});

const showCreate = computed(() => !!props.onCreate && !creating.value);

function startCreate() {
  newName.value = q.value;
  newHint.value = '';
  creating.value = true;
}

async function confirmCreate() {
  const name = newName.value.trim();
  if (!name) return;
  await props.onCreate?.({ value: name, label: name, hint: newHint.value.trim() || undefined });
  emit('update:modelValue', name);
  reset();
}

function reset() {
  open.value = false;
  creating.value = false;
  q.value = '';
  newName.value = '';
  newHint.value = '';
}

function onDocClick(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) reset();
}
onMounted(() => document.addEventListener('mousedown', onDocClick));
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick));
</script>

<template>
  <div ref="root" class="ss">
    <button type="button" class="ss-trigger" @click="open = !open">
      <span :class="{ placeholder: !selected }">
        {{ selected?.label ?? placeholder ?? 'Seleccione…' }}
      </span>
      <span class="caret">▾</span>
    </button>
    <div v-if="open" class="ss-panel">
      <template v-if="!creating">
        <input class="ss-search" autofocus v-model="q" placeholder="Buscar…" />
        <div class="ss-list">
          <div v-if="filtered.length === 0" class="ss-empty">Sin coincidencias</div>
          <div
            v-for="o in filtered" :key="o.value"
            class="ss-item" :class="{ selected: o.value === modelValue }"
            @mousedown="$emit('update:modelValue', o.value); reset()"
          >
            <div class="ss-item-label">{{ o.label }}</div>
            <div v-if="o.hint" class="ss-item-hint">{{ o.hint }}</div>
          </div>
        </div>
      </template>
      <button v-if="showCreate" class="ss-create" type="button" @click.stop="startCreate">
        <span class="plus">+</span>
        <template v-if="q">Crear <strong>"{{ q }}"</strong></template>
        <template v-else>{{ createLabel ?? 'Crear nuevo' }}</template>
      </button>
      <div v-if="creating" class="ss-form" @click.stop>
        <div class="ss-form-title">{{ createLabel ?? 'Crear nuevo' }}</div>
        <input
          autofocus v-model="newName" placeholder="Nombre"
          @keydown.enter.prevent="confirmCreate"
          @keydown.esc="creating = false"
        />
        <input
          v-model="newHint" placeholder="Descripción (opcional)"
          @keydown.enter.prevent="confirmCreate"
          @keydown.esc="creating = false"
        />
        <div class="ss-form-actions">
          <button type="button" class="btn-ghost" @click="creating = false">Cancelar</button>
          <button type="button" class="btn-primary" :disabled="!newName.trim()" @click="confirmCreate">
            Crear y seleccionar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
```

### 5.2 `DatePicker.vue`

En el prototipo es un wrapper sobre `<input type="date">` con icono de calendario en bloque amatista. **Para producción usá `@vuepic/vue-datepicker`**:

```bash
pnpm add @vuepic/vue-datepicker
```

```vue
<script setup lang="ts">
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';

defineProps<{ modelValue: string | null }>();
defineEmits<{ 'update:modelValue': [string | null] }>();
</script>

<template>
  <VueDatePicker
    :model-value="modelValue"
    @update:model-value="(v) => $emit('update:modelValue', v ? v.toISOString().slice(0,10) : null)"
    locale="es"
    format="dd MMM yyyy"
    auto-apply
    :enable-time-picker="false"
    placeholder="Seleccionar fecha"
    teleport="body"
  >
    <template #trigger>
      <div class="date-trigger">
        <span class="date-icon"><CalendarIcon /></span>
        <span class="date-text">{{ modelValue || 'Seleccionar fecha' }}</span>
      </div>
    </template>
  </VueDatePicker>
</template>
```

### 5.3 `Modal.vue` (ModalShell)

- Width: `min(1600px, 80vw)` · Height: `80vh` (fijo)
- Header sticky: icono cuadrado amatista 38px + título serif 22px + subtítulo + ✕
- Body scrolleable interior con `padding: 32px`
- Footer sticky: contador a la izq + botones (Cancelar + Primary) a la der

### 5.4 `Field.vue`

```vue
<template>
  <div class="field">
    <div class="field-head">
      <label>{{ label }} <span v-if="required" class="req">*</span></label>
      <span v-if="hint" class="field-hint">{{ hint }}</span>
    </div>
    <slot />
    <div v-if="error" class="field-error">{{ error }}</div>
  </div>
</template>
```

---

## 6 · Detalle de modales

| # | Modal | Campos requeridos | Validación adicional |
|---|-------|-------------------|----------------------|
| 1 | Receta | Al menos 1 medicamento (producto + dosis + frecuencia + duración) | Producto buscable contra catálogo de medicamentos |
| 2 | Examen Lab | Fecha, ≥1 examen (tipo + cantidad) | Tipo de examen creable inline |
| 3 | Imagen Dx | Fecha, tipo de estudio, signos clínicos (>3 chars) | Tipo de estudio creable inline |
| 4 | Vacunación | Fecha, ≥1 vacuna (tipo + laboratorio + lote) | Tipo de vacuna creable inline · próxima fecha auto +365d |
| 5 | Hospitalización | Fecha ingreso, motivo | Status auto: ACTIVE si no hay endDate |
| 6 | Desparasitación | Tipo, fecha, producto, dosis, próximo control | — |
| 7 | Cirugía | Fecha, tipo, descripción (>3 chars) | Tipo de cirugía creable inline |

**Patrón común:**
- Header con icono + título + subtítulo (`pet.name · pet.specie · Hoy, fecha`)
- Footer con `{count} {label} · Se vinculará a la consulta` a la izq
- Botón primary se deshabilita con `valid === false`
- Al guardar: `emit('save', payload)` + cerrar modal + push al draft de consulta

---

## 7 · Catálogos creables — endpoints sugeridos

```ts
// api/catalogs.ts
export const catalogsApi = {
  laboratoryTestTypes: {
    list: () => http.get<TestType[]>('/api/laboratory-test-types'),
    create: (data: { name: string; description?: string }) =>
      http.post<TestType>('/api/laboratory-test-types', data),
  },
  diagnosticImagingTypes: {
    list: () => http.get<ImagingType[]>('/api/diagnostic-imaging-types'),
    create: (data) => http.post('/api/diagnostic-imaging-types', data),
  },
  vaccineTypes: {
    list: () => http.get<VaccineType[]>('/api/vaccine-types'),
    create: (data) => http.post('/api/vaccine-types', data),
  },
  surgeryTypes: {
    list: () => http.get<SurgeryType[]>('/api/surgery-types'),
    create: (data) => http.post('/api/surgery-types', data),
  },
};
```

**Composable de cache + creación:**

```ts
// composables/useCatalogs.ts
import { ref, onMounted } from 'vue';

export function useCatalog<T extends { id: string; name: string; description?: string }>(
  fetcher: () => Promise<T[]>,
  creator: (data: { name: string; description?: string }) => Promise<T>,
) {
  const items = ref<T[]>([]);
  const loading = ref(false);

  async function load() {
    loading.value = true;
    try { items.value = await fetcher(); }
    finally { loading.value = false; }
  }

  async function create(data: { name: string; description?: string }) {
    const created = await creator(data);
    items.value = [...items.value, created];
    return created;
  }

  onMounted(load);
  return { items, loading, create, reload: load };
}
```

**Uso en modal:**

```vue
<script setup lang="ts">
const { items: testTypes, create: createTestType } = useCatalog(
  catalogsApi.laboratoryTestTypes.list,
  catalogsApi.laboratoryTestTypes.create,
);
</script>

<template>
  <SearchableSelect
    v-model="form.type"
    :options="testTypes.map(t => ({ value: t.name, label: t.name, hint: t.description }))"
    placeholder="Seleccione un examen…"
    create-label="Crear nuevo tipo de examen"
    :on-create="async (opt) => { await createTestType({ name: opt.value, description: opt.hint }); }"
  />
</template>
```

---

## 8 · Banner "Consulta activa" (ya integrado en pantalla principal)

Cuando se inicia una consulta y el usuario navega fuera, mostrar banner persistente arriba con:
- Icono de huella latiente (loader del proyecto)
- Texto: `Consulta en curso · {petName} · {ownerName}`
- CTA: `Volver a la consulta` → vuelve al wizard en el paso donde quedó
- ✕ → cierra el banner pero la consulta sigue en draft

Persistir el draft en `localStorage` con key `vetrina:consulta-draft` + sincronizar contra back cada N segundos.

---

## 9 · Prompt para Claude Code

Pegá esto en Claude Code dentro de IntelliJ después de abrir el proyecto Vue:

> Tengo un paquete de diseño en `docs/design/nueva-consulta/` con un prototipo HTML interactivo (`Flujo Interactivo.html`) y archivos JSX de referencia. Quiero implementar este flujo en mi front Vue 3 + TypeScript siguiendo la estructura propuesta en el README.
>
> Empezá leyendo el README completo. Después:
>
> 1. Creá los tokens en `src/styles/tokens.css` copiando exactamente las variables OKLCH del README.
> 2. Implementá los componentes base en este orden, validando cada uno antes de pasar al siguiente:
>    - `components/form/Field.vue`
>    - `components/feedback/Modal.vue` (ModalShell)
>    - `components/form/SearchableSelect.vue` ⭐ (replicar el comportamiento exacto del prototipo: búsqueda + creación inline con onCreate)
>    - `components/form/DatePicker.vue` (wrapper de @vuepic/vue-datepicker)
>    - `components/form/PillSelector.vue`
> 3. Definí los tipos TypeScript en `src/types/consultation.ts` según la sección 4 del README.
> 4. Implementá el store con Pinia en `stores/consultaStore.ts` con persistencia en localStorage (key `vetrina:consulta-draft`).
> 5. Implementá los 4 pasos del wizard como vistas separadas con router child-routes.
> 6. Implementá los 7 modales en `views/nueva-consulta/modals/`. Para cada uno consultá el archivo JSX correspondiente (`receta-modal.jsx` y `quick-action-modals.jsx`) y mantené:
>    - Layout y proporciones idénticas
>    - Validaciones idénticas
>    - El mismo patrón de SearchableSelect con `onCreate` para los catálogos creables
> 7. Conectá los catálogos creables a los endpoints `/api/laboratory-test-types`, `/api/vaccine-types`, etc., usando el composable `useCatalog` del README.
>
> No uses Tailwind ni un UI kit pre-armado — escribí CSS plano con las variables del tokens.css. Usá `<style scoped>` en cada componente.
>
> Cuando tengas dudas sobre comportamiento o look de algo, abrí `docs/design/nueva-consulta/Flujo Interactivo.html` en el navegador y probá la interacción ahí — es la fuente de verdad.

---

## 10 · Archivos del paquete

| Archivo | Qué contiene |
|---------|--------------|
| `Flujo Interactivo.html` | Entry HTML — abrir en navegador para ver/probar |
| `flow-interactive.jsx` | Componente raíz `<InteractiveWizard />` + state global del wizard |
| `flow-interactive-steps.jsx` | Pasos 1–4 con state real (search, selección, validación) |
| `flow-shell.jsx` | `WizardShell`, `Stepper`, `Field`, `PillSelector` y tokens |
| `quick-action-modals.jsx` | **Los 6 modales** (Lab, Imaging, Vac, Hosp, Desp, Cirugía) + `SearchableSelect` + `DatePicker` |
| `receta-modal.jsx` | Modal de Receta (separado por complejidad del autocomplete) |
| `icons.jsx` · `icons-flow.jsx` | Set de iconos SVG inline |

---

**Creado para:** VetSoftwarePublic · Mayo 2026
**Stack target:** Vue 3 + TypeScript + Pinia + vue-router + @vuepic/vue-datepicker
