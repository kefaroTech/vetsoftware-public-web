# Handoff: Flujo "Nueva Consulta" — Software Veterinario (Vetrina)

## Overview
Wizard de **4 pasos** para crear una consulta veterinaria desde cero, accesible desde el CTA primario "Nueva consulta" de la pantalla principal y desde la sub-ruta `/consulta/nueva`. Permite identificar al propietario, seleccionar/registrar la mascota, capturar los datos clínicos y confirmar antes de guardar.

El flujo está orientado a usuarios expertos (veterinarios y recepcionistas) pero debe ser cómodo en la primera vez. El paso 3 es el corazón del flujo: la consulta es el "hub" desde donde se generan recetas, exámenes, imágenes y vacunaciones vinculadas.

## Sobre los archivos de diseño
Los `.html` y `.jsx` de este bundle son **referencias visuales**, no código de producción. Fueron creados como prototipo en React + Babel inline. **La tarea es recrear estos diseños en el codebase Vue 3 + `<script setup>`** del usuario, siguiendo sus convenciones.

No portees el JSX literal — entiende intención visual y comportamiento, y portea a componentes Vue idiomáticos.

Este flujo **comparte tokens, fuentes y look & feel** con el handoff de la pantalla principal (`design_handoff_pantalla_principal`). Si ya hiciste ese handoff, **reutiliza** los mismos archivos de tokens, layout shell y componentes base.

## Fidelity
**High-fidelity (hifi).** Replicar valores exactos de color, espaciado, tipografía y radios.

## Stack objetivo
- **Framework:** Vue 3 + `<script setup>`
- **Estado:** Pinia recomendado para mantener el draft del wizard entre pasos
- **Routing:** Vue Router con sub-rutas anidadas
- **Estilos:** CSS vars + módulos / scoped styles
- **Iconos:** `lucide-vue-next`
- **Validación:** VeeValidate o Zod (lo que ya use el proyecto)
- **Fechas:** `date-fns` o `dayjs`

---

## Ruteo y arquitectura

```ts
// router/index.ts
{
  path: '/consulta',
  component: ConsultaShell,
  children: [
    { path: '', redirect: 'historial' },
    { path: 'nueva', component: NuevaConsultaWizard, name: 'consulta-nueva' },
    { path: 'historial', component: ConsultaHistorial },
    { path: 'borradores', component: ConsultaBorradores },
    { path: 'plantillas', component: ConsultaPlantillas },
  ],
}
```

`NuevaConsultaWizard` lee/escribe el step actual desde el query (`?paso=1`) para que sea linkeable y soporte refresh sin perder progreso.

```ts
// stores/nuevaConsultaDraft.ts (Pinia)
interface NuevaConsultaDraft {
  step: 1 | 2 | 3 | 4;
  owner: Owner | null;
  ownerCreating: Partial<Owner> | null;   // si está creando uno nuevo
  pet: Animal | null;
  petCreating: Partial<Animal> | null;
  consultation: Partial<Consultation>;
}
```

El draft se persiste en `localStorage` (clave `vetrina:nueva-consulta-draft`) para sobrevivir a refresh accidental. Se limpia al guardar o al confirmar "Descartar".

---

## Layout del wizard

Pantalla completa (no overlay). Tres zonas verticales:

```
┌─────────────────────────────────────────────────────────────────┐
│  Header (60px) — back · "Nueva consulta" · badge "Borrador"     │
│                                          · Cancelar             │
├─────────────────────────────────────────────────────────────────┤
│  Stepper (≈80px) — 4 pasos, separadores, max-width 720px        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Contenido scrollable                                           │
│  · padding: 32px 48px                                           │
│  · max-width: 880px (920px en paso 3) centrado                  │
│  · ContextHeader (chips no editables) en pasos 2-3              │
│  · PageHeading (title + subtitle)                               │
│  · SectionCards en stack vertical con gap 14-16                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Footer (60px) — Atrás · [Descartar] · Guardar y crear otra    │
│                                          · Siguiente →          │
└─────────────────────────────────────────────────────────────────┘
```

- **Header y Footer**: fondo `--warm-50`, separados por `1px solid --warm-200`.
- **Stepper**: ver sección "Stepper" abajo.
- **Contenido**: fondo `--warm-100`. Scroll vertical interno; header/footer son fijos.

---

## Stepper

Componente clave. 4 pasos lineales con separador horizontal entre ellos.

```
●Propietario ──── ②Mascota ──── ③Consulta ──── ④Resumen
```

Estados por paso:
- **Done** (`n < active`): círculo `--amatista-100` bg, ícono check `--amatista-700`, sin borde, label `--warm-600`
- **Current** (`n === active`): círculo `--amatista-700` bg, número blanco, label `--warm-900` weight 600
- **Future** (`n > active`): círculo `--warm-150` bg con borde `--warm-200`, número `--warm-500`, label `--warm-500`
- **Separador**: `1px` height. Cuando el paso anterior es done → `--amatista-700` con `opacity: 0.4`. Si no, `--warm-200`.

Tamaño círculo: 26px. Gap entre círculo y label: 10px. Gap entre items: 14px de separador (flex 1 con `min-width: 24px`).

El usuario puede hacer click en pasos **anteriores** para volver (no en futuros). Al volver, todos los datos persisten.

---

## Design Tokens

**Reutiliza los tokens del handoff de Pantalla Principal sin cambios.** Aquí van solo los que se usan en este flujo, para referencia rápida:

```css
:root {
  --hue: 300;

  --amatista-50:  oklch(97% 0.015 var(--hue));
  --amatista-100: oklch(94% 0.035 var(--hue));
  --amatista-200: oklch(88% 0.07  var(--hue));
  --amatista-700: oklch(42% 0.16  var(--hue));

  --warm-50:  oklch(99% 0.005 60);
  --warm-100: oklch(97% 0.008 60);
  --warm-150: oklch(95% 0.01  60);
  --warm-200: oklch(92% 0.012 60);
  --warm-300: oklch(86% 0.015 60);
  --warm-500: oklch(58% 0.012 60);
  --warm-600: oklch(45% 0.012 60);
  --warm-900: oklch(16% 0.012 60);

  /* Estados */
  --success-bg: oklch(94% 0.04 145);
  --success-fg: oklch(40% 0.10 145);
  --success-strong: oklch(50% 0.15 145);
  --warning-bg: oklch(96% 0.04 80);
  --warning-border: oklch(88% 0.07 80);
  --warning-fg: oklch(35% 0.10 80);
  --danger-bg: oklch(94% 0.06 25);
  --danger-fg: oklch(50% 0.18 25);
}
```

### Tipografía

- **Geist** (UI): 11–22px, weights 400/500/600
- **Instrument Serif** (acento): solo en pantalla de éxito (36px) y título del header (22px)
- **Geist Mono / JetBrains Mono**: opcional para códigos como `VTR-0247`

Tamaños usados:
- Page title: 22px / 500 / `--warm-900`
- Page subtitle: 13.5px / 400 / `--warm-600`
- Section title: 14px / 500 / `--warm-900`
- Section subtitle: 12px / 400 / `--warm-600`
- Field label: 12px / 500 / `--warm-900`
- Input text: 13.5px / 400
- Placeholder / muted: 13px / 400 / `--warm-500`
- UPPERCASE label: 11px / 500 / `--warm-500` / letter-spacing 0.04em

### Radios y bordes
- Cards/SectionCards: `border-radius: 14px`
- Inputs/buttons: `border-radius: 8px`
- Chips/pills: `border-radius: 999px` (8 horizontal, 2-3 vertical padding)
- Iconos en círculo de avatar/header: `border-radius: 8-12px` (cuadrado con esquinas suaves) o `50%` (avatares de personas)
- Hairlines: siempre `1px solid --warm-200`

### Sombras
Mínimas. Solo:
- Modal de cancelar: `0 20px 60px rgba(40,20,80,0.3)`
- Pantalla éxito (badge check): `0 8px 32px -8px oklch(50% 0.15 145 / 0.4)`
- Estado focus de search: `box-shadow: 0 0 0 3px var(--amatista-50)` con border `--amatista-700`

---

## Estructura de archivos sugerida (Vue)

```
src/
├── views/
│   └── consulta/
│       ├── NuevaConsultaWizard.vue          ← shell (header + stepper + footer + <router-view>)
│       ├── pasos/
│       │   ├── PasoPropietario.vue          ← paso 1 (orquesta búsqueda / selección / crear)
│       │   ├── PasoMascota.vue              ← paso 2
│       │   ├── PasoConsulta.vue             ← paso 3
│       │   └── PasoResumen.vue              ← paso 4
│       └── exito/
│           └── ConsultaGuardada.vue         ← pantalla post-guardado
├── components/
│   └── consulta/
│       ├── WizardStepper.vue
│       ├── WizardFooter.vue
│       ├── ContextHeader.vue                ← chip de owner+pet en pasos 2-3
│       ├── OwnerSearchInput.vue
│       ├── OwnerResultRow.vue
│       ├── OwnerSummaryCard.vue             ← versión "seleccionado" del paso 1
│       ├── OwnerForm.vue                    ← crear/editar owner
│       ├── PetCard.vue                      ← tarjeta seleccionable de mascota
│       ├── PetForm.vue                      ← crear/editar mascota
│       ├── ConsultaForm.vue                 ← formulario completo del paso 3
│       ├── QuickActionsCard.vue             ← receta / lab / imagen / vacuna
│       ├── SummarySection.vue               ← bloque editable del paso 4
│       └── DiscardConsultaDialog.vue
├── components/ui/                            ← reutilizable (compartido con pantalla principal)
│   ├── SectionCard.vue
│   ├── BaseField.vue
│   ├── BaseInput.vue
│   ├── BaseSelect.vue
│   ├── BaseTextarea.vue
│   ├── BaseChip.vue
│   ├── DateInput.vue
│   └── SegmentedRadio.vue                    ← para "Esterilizada / No / Desconocido"
├── stores/
│   └── nuevaConsultaDraft.ts                 ← Pinia
├── composables/
│   ├── useConsultaWizard.ts                  ← navegación, validación por paso
│   ├── useOwnerSearch.ts                     ← debounced search
│   └── useGeoCascade.ts                      ← País → Estado → Ciudad
└── types/
    └── domain.ts                             ← tu modelo (Owner, Animal, Consultation, etc.)
```

---

## Especificaciones por paso

### Paso 1 — Propietario

**4 sub-estados**, controlados por una máquina simple en `PasoPropietario.vue`:

1. **Búsqueda inicial (vacía)** — search input grande + estado vacío con CTA "Registrar nuevo propietario".
2. **Resultados** — search con borde acento + ring (estado focus visible aunque no haya focus real), lista de filas con avatar inicial, nombre, doc, teléfono, email, chip de "X mascotas". Última fila CTA secundaria "¿No encuentras a 'X'?" con fondo `--warm-150`.
3. **Seleccionado** — `OwnerSummaryCard` con icono `User` accent, datos en grid 2 cols (Phone/Mail/MapPin), banner suave `--amatista-50` "X mascotas registradas". Botón "Cambiar" arriba a la derecha.
4. **Creando** — `OwnerForm` en dos `SectionCard`s: "Datos personales" (nombre, doc, tel, email en grid 2 cols) y "Dirección" (país/estado/ciudad en grid 3 cols + dirección en row completo). Footer con botón extra "Descartar" + "Guardar y continuar".

**Search** (`OwnerSearchInput.vue`):
- Debounce 250ms
- Busca por `name`, `document`, `phone`, `email` (substring case-insensitive del lado servidor)
- Counter "X resultados" a la derecha
- Tecla `Enter` selecciona el primer resultado si hay uno solo

**Validación para "Siguiente":** owner con id (no creating). Si está creando, primero "Guardar y continuar" valida y avanza.

### Paso 2 — Mascota

`ContextHeader` arriba con datos del propietario + chip "Paso 1 ✓" + botón "Editar" que vuelve al paso 1.

**Sub-estados:**

1. **Lista** — grid 3 columnas con tarjetas (`PetCard.vue`). Última celda es card discontinua "+ Nueva mascota" (border-dashed `--warm-300`). Tarjeta seleccionada: borde `--amatista-700` 1.5px + `box-shadow: 0 0 0 3px --amatista-50` + checkmark circular arriba a la derecha.
2. **Vacío** — cuando `owner.pets.length === 0`. Estado vacío central con icono `Paw` grande, copy "Sin mascotas registradas", CTA primario "Registrar primera mascota".
3. **Creando** — `PetForm` en dos `SectionCard`s: "Identificación" (nombre, código autogenerable, especie, raza dependiente, género, color, fecha nacimiento, tipo) y "Características físicas y reproductivas" (peso + unidad + tamaño en grid 3 cols, estado reproductivo como `SegmentedRadio` de 3 opciones).

**`PetCard`** muestra: avatar de especie (`Paw` en cuadro `--amatista-100`), nombre + chip "Fallecido" si aplica (con `opacity: 0.7` toda la card), especie/raza, y grid 2x2 con Edad / Género / Peso / Última consulta.

**Mascotas fallecidas** se muestran al final, con opacidad reducida y chip "Fallecido". Son seleccionables pero al hacerlo aparece un confirm: "¿Crear consulta para una mascota fallecida? (necropsia, registro post-mortem)".

**Cascadas:**
- Especie → Raza: el select de raza se deshabilita hasta que se seleccione especie. Al cambiar especie, `breed = null`.
- País → Estado → Ciudad (en formulario de owner): igual.

### Paso 3 — Consulta

`ContextHeader` con avatar de mascota + nombre + chip de especie/raza/edad + propietario debajo + chip success "Pasos 1-2 ✓".

**Secciones (todas visibles, no colapsables por defecto):**

1. **Información general** (icono `Stethoscope` accent) — `date` (default hoy) + `type` (select de `ConsultationType`). Grid `1fr 2fr`.
2. **Anamnesis** (icono `Consulta` propio) — `Textarea rows=4`. **Required.**
3. **Diagnóstico** — `Textarea rows=3`.
4. **Plan diagnóstico** + **Plan terapéutico** — dos cards lado a lado, grid `1fr 1fr`, cada uno `Textarea rows=4`.
5. **Próximo control** — date opcional + notas. Grid `1fr 2fr`.
6. **Acciones rápidas** (icono `Sparkles`) — grid 4 columnas con 4 botones: Receta, Examen lab., Imagen Dx, Vacunación. Cada uno abre un drawer/modal aparte (fuera del scope de este wizard). Los registros generados se vinculan a la `Consultation` por `consultationId`.

**Validación para "Revisar resumen":** `type !== null && anamnesis.trim().length > 0`.

**Autocompletado:** `createdBy` se setea automáticamente al `currentUser.employeeId` (no se muestra al usuario, viene del store de auth).

### Paso 4 — Resumen

Sin `ContextHeader` (porque la pantalla ya muestra todo el resumen).

3 `SectionCard`s, una por entidad (Propietario / Mascota / Consulta), cada una con un botón ghost "Editar" (`Edit3`) en el header que regresa al paso correspondiente con los datos cargados.

**Filas de resumen** (`SummaryRow`): grid `160px 1fr`, gap 12, padding `8px 0`, separador `1px solid --warm-200` entre filas, sin separador en la última. Label en uppercase 11.5px `--warm-500`. Valor en 13px `--warm-900`.

**Campos vacíos**: muestran italic `--warm-500` "Sin completar".

**Banner de advertencia** (warning) si hay campos opcionales sin completar (diagnóstico/planes), con icono `AlertTriangle`. Es informativo, no bloquea guardar.

**Footer:**
- Botón "Atrás"
- Botón "Guardar y crear otra" (secundario, ghost) — guarda y reinicia el wizard manteniendo al mismo propietario
- Botón "Guardar consulta" (primario, fondo verde `--success-strong`) — guarda y redirige a la pantalla de éxito

### Estados especiales

**Modal Cancelar** (`DiscardConsultaDialog.vue`):
- Aparece cuando se hace click en "Cancelar" del header *si hay datos en el draft*. Si el draft está vacío, sale directo.
- Backdrop: `rgba(30, 20, 50, 0.45)` + `backdrop-filter: blur(2px)`.
- Card: 440px ancho, `border-radius: 16px`, padding 28, sombra `0 20px 60px rgba(40,20,80,0.3)`.
- Icono `AlertTriangle` en cuadro `--danger-bg` 44x44.
- Título "¿Descartar esta consulta?" 18px / 500.
- Botones "Seguir editando" (ghost) + "Descartar" (rojo `--danger-fg` con icono `Trash2`).

**Pantalla guardado exitoso** (`ConsultaGuardada.vue`):
- Centrada en viewport. Icono check 72x72 en círculo verde `--success-bg` con sombra suave.
- Título en **Instrument Serif 36px** "Consulta guardada".
- Línea "Mascota · Propietario", luego fecha / tipo / código `#C-2026-XXXX`.
- Dos CTAs: "Ver detalle" (primary amatista) y "Crear otra consulta" (ghost).

---

## Mapeo de iconos a Lucide

| En el mock              | Lucide                   |
|-------------------------|--------------------------|
| `IconArrowLeft`         | `ArrowLeft`              |
| `IconArrowRight`        | `ArrowRight`             |
| `IconCheck`             | `Check`                  |
| `IconCheckCircle`       | `CircleCheck`            |
| `IconX`                 | `X`                      |
| `IconUser`              | `User`                   |
| `IconPaw`               | `PawPrint`               |
| `IconPhone`             | `Phone`                  |
| `IconMail`              | `Mail`                   |
| `IconId`                | `IdCard`                 |
| `IconMapPin`            | `MapPin`                 |
| `IconCalendar`          | `Calendar`               |
| `IconScale`             | `Scale`                  |
| `IconAlert`             | `TriangleAlert`          |
| `IconEdit`              | `Pencil` o `Edit3`       |
| `IconStethoscope`       | `Stethoscope`            |
| `IconConsulta`          | `ClipboardList`          |
| `IconPill`              | `Pill`                   |
| `IconFlask`             | `FlaskConical`           |
| `IconScan`              | `ScanLine`               |
| `IconVacuna`            | `Syringe`                |
| `IconSparkles`          | `Sparkles`               |
| `IconTrash`             | `Trash2`                 |
| `IconPlus`              | `Plus`                   |
| `IconSearch`            | `Search`                 |
| `IconChevronDown`       | `ChevronDown`            |

Stroke: 1.5–2px. Tamaños usados: 11, 13, 14, 15, 16, 17, 18, 22, 26, 30, 34.

---

## Mocks de datos sugeridos (TypeScript)

Tu modelo de dominio ya tiene las entidades. Para datos mock realistas en desarrollo:

```ts
import type { Owner, Animal, Consultation, ConsultationType } from '@/types/domain';

export const mockOwner: Owner = {
  id: 'own_001',
  name: 'Carla Mendoza Ríos',
  document: '45.231.908',
  phone: '+51 987 654 321',
  email: 'carla.mendoza@gmail.com',
  address: 'Av. Salaverry 2580, Dpto 502',
  city: { id: 'lima_lima', name: 'Lima', state: { id: 'lima', name: 'Lima', country: { id: 'pe', name: 'Perú' } } },
  pets: ['ani_001', 'ani_002'],
};

export const mockAnimals: Animal[] = [
  {
    id: 'ani_001',
    code: 'VTR-0182',
    name: 'Luna',
    specie: { id: 'sp_cat', name: 'Felino' },
    breed:  { id: 'br_dom_short', name: 'Mestizo doméstico' },
    gender: 'F',
    bod: '2022-03-14',
    color: 'Atigrado gris',
    weight: 4.2, weightType: 'kg',
    size: 28, animalType: 'pet',
    reproductiveState: 'sterilized',
    deceased: false,
    ownerId: 'own_001',
  },
  {
    id: 'ani_002',
    code: 'VTR-0093',
    name: 'Rocco',
    specie: { id: 'sp_dog', name: 'Canino' },
    breed:  { id: 'br_lab',  name: 'Labrador retriever' },
    gender: 'M',
    bod: '2019-07-02',
    weight: 32, weightType: 'kg',
    reproductiveState: 'unsterilized',
    deceased: false,
    ownerId: 'own_001',
  },
];

export const mockConsultationTypes: ConsultationType[] = [
  { id: 'ct_routine', name: 'Control de rutina' },
  { id: 'ct_emerg',   name: 'Emergencia' },
  { id: 'ct_followup',name: 'Seguimiento' },
  { id: 'ct_vacc',    name: 'Vacunación' },
  { id: 'ct_pre_op',  name: 'Prequirúrgica' },
  { id: 'ct_post_op', name: 'Postquirúrgica' },
];
```

---

## Ejemplo de componente Vue (referencia)

```vue
<!-- src/components/consulta/PetCard.vue -->
<script setup lang="ts">
import { PawPrint, Check } from 'lucide-vue-next';
import type { Animal } from '@/types/domain';
import BaseChip from '@/components/ui/BaseChip.vue';

defineProps<{ pet: Animal & { age: string; lastVisit: string }; selected: boolean }>();
defineEmits<{ select: [id: string] }>();
</script>

<template>
  <button class="pet-card" :class="{ selected, deceased: pet.deceased }"
          @click="$emit('select', pet.id)">
    <div v-if="selected" class="check"><Check :size="12" /></div>
    <div class="head">
      <div class="avatar"><PawPrint :size="22" /></div>
      <div class="meta">
        <div class="name">
          {{ pet.name }}
          <BaseChip v-if="pet.deceased" variant="neutral">Fallecido</BaseChip>
        </div>
        <div class="sub">{{ pet.specie.name }} · {{ pet.breed.name }}</div>
      </div>
    </div>
    <div class="grid">
      <div><span>Edad</span><strong>{{ pet.age }}</strong></div>
      <div><span>Género</span><strong>{{ pet.gender === 'F' ? 'Hembra' : 'Macho' }}</strong></div>
      <div><span>Peso</span><strong>{{ pet.weight }} {{ pet.weightType }}</strong></div>
      <div><span>Última consulta</span><strong>{{ pet.lastVisit }}</strong></div>
    </div>
  </button>
</template>

<style scoped>
.pet-card { background: var(--warm-50); border: 1px solid var(--warm-200);
  border-radius: 12px; padding: 16px; cursor: pointer; position: relative;
  text-align: left; font-family: inherit; transition: all .15s; }
.pet-card.selected { border: 1.5px solid var(--amatista-700);
  box-shadow: 0 0 0 3px var(--amatista-50); }
.pet-card.deceased { opacity: .7; }
.check { position: absolute; top: 12px; right: 12px; width: 22px; height: 22px;
  border-radius: 50%; background: var(--amatista-700); color: white;
  display: grid; place-items: center; }
.head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.avatar { width: 44px; height: 44px; border-radius: 11px;
  background: var(--amatista-100); color: var(--amatista-700);
  display: grid; place-items: center; }
.name { font-size: 15px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
.sub { font-size: 12px; color: var(--warm-500); margin-top: 2px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11.5px; }
.grid span { color: var(--warm-500); text-transform: uppercase;
  letter-spacing: .04em; font-size: 10px; }
.grid strong { display: block; color: var(--warm-900); margin-top: 2px;
  font-size: 12.5px; font-weight: 500; }
</style>
```

---

## Comportamientos clave

- **Persistencia del draft**: cada cambio en el store se sincroniza con `localStorage`. Al cargar el wizard, si hay draft, se ofrece "Continuar consulta en progreso" (sutil banner arriba) o "Empezar de cero".
- **Atajos de teclado**:
  - `Esc` → abre modal de cancelar
  - `Enter` en search del paso 1 → selecciona primer resultado si hay solo uno
  - `Cmd/Ctrl + Enter` en paso 4 → guardar consulta
- **Beforeunload**: si hay draft con cambios, prevenir navegación con confirmación nativa.
- **Loading states**: cada acción async (guardar owner, guardar pet, guardar consulta) muestra spinner en el botón "Guardar y continuar" / "Guardar consulta", deshabilita los demás.
- **Errores de servidor**: banner rojo arriba del contenido, no toast. Persistente hasta que se cierre o se reintente.
- **Nuevo propietario / mascota → vuelven seleccionados**: tras "Guardar y continuar" en los formularios de creación, el paso queda con la entidad recién creada como `selected` y se avanza al siguiente paso automáticamente.

---

## Accesibilidad

- Cada `SectionCard` con título usa `<section>` + `<h2>` (visualmente del tamaño 14px pero semánticamente h2).
- Labels asociados con `for`/`id` o envolviendo el input.
- Stepper: aria `role="progressbar"` con `aria-valuenow={step}` `aria-valuemax={4}`.
- Modal cancelar: `role="alertdialog"` con focus trap, focus inicial en "Seguir editando", `Esc` cierra (= "Seguir editando").
- Foco visible: outline `2px solid --amatista-700` con `outline-offset: 2px` en todos los interactivos.
- Contraste verificado AA en todos los pares de color usados.

---

## Checklist de implementación

- [ ] Tokens en `tokens.css` (reutilizar los de pantalla principal)
- [ ] Fuentes Google Fonts cargadas en `index.html`
- [ ] `lucide-vue-next` instalado, mapeo aplicado
- [ ] Pinia store `nuevaConsultaDraft` con persistencia en localStorage
- [ ] Sub-rutas de `/consulta/*` configuradas
- [ ] `NuevaConsultaWizard.vue` con header + stepper + footer + slot
- [ ] **Paso 1**: search + 4 sub-estados (vacío, resultados, seleccionado, crear)
- [ ] **Paso 2**: lista en grid + caso vacío + crear con cascada especie→raza
- [ ] **Paso 3**: 6 secciones, validación tipo+anamnesis, atajos a otros módulos
- [ ] **Paso 4**: 3 SummarySections con "Editar", banner de campos vacíos opcionales, botones "Guardar" / "Guardar y crear otra"
- [ ] Modal `DiscardConsultaDialog`
- [ ] Pantalla `ConsultaGuardada` con Instrument Serif
- [ ] Atajos de teclado (Esc, Enter en search, Cmd+Enter)
- [ ] Beforeunload con draft no vacío
- [ ] Loading + error states en cada submit
- [ ] Foco visible y aria roles
- [ ] Contraste AA verificado
- [ ] Empty state cuando propietario no tiene mascotas
- [ ] Cascada País → Estado → Ciudad

---

## Archivos de referencia incluidos

- `Flujo Nueva Consulta.html` — abre en navegador para ver todas las pantallas en el design canvas (pan/zoom, click para fullscreen)
- `flow-shell.jsx` — wizard shell, stepper, footer, primitives (Field, Input, SectionCard, Chip)
- `step1-owner.jsx` — los 4 sub-estados del paso 1
- `step2-pet.jsx` — paso 2 con todos los sub-estados
- `step3-4-states.jsx` — paso 3, paso 4 y estados especiales (cancelar / éxito)
- `flow-app.jsx` — orquestación del canvas
- `icons-flow.jsx` + `icons.jsx` — SVGs minimalistas usados en los mocks (mapear a Lucide en producción)

---

**Cualquier duda sobre intención de un componente, abre el HTML y mira el mock correspondiente. Si dos enfoques son válidos en Vue, elige el que ya use el resto del proyecto.**
