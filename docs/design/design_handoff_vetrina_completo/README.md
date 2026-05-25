# Handoff: Vetrina — Refresh visual del frontend Vue 3

## Resumen

Esta carpeta contiene un **prototipo HTML interactivo** (`Vetrina App.html` + carpeta `vetrina/`) que recrea **toda la app actual** y le aplica un pase de polish visual. El objetivo de este handoff es que Claude Code lleve esas mejoras al **codebase Vue 3 + Vuetify + TypeScript existente** (la carpeta `src/`) — sin reemplazar la arquitectura, solo refinando estilos, espaciado, consistencia de patrones, añadiendo un sistema de toasts e implementando un nuevo flujo de **Spa**.

> El HTML es **referencia visual y de comportamiento**, no código a copiar tal cual.
> El trabajo final vive en `src/features/...` siguiendo los patrones Vue 3 + Vuetify ya establecidos.

> **Nuevo en esta versión**: flujo completo de **Spa** (acción clínica adicional) — ver §14 al final del documento.

---

## Fidelidad

**Alta fidelidad**. El prototipo usa exactamente los mismos tokens, colores, fuentes y radios que están en `src/assets/styles/tokens.css`. Las mejoras introducidas son refinamientos sobre lo que ya existe — espaciado, contraste, consistencia entre features — no un rediseño.

---

## Cómo está organizado el prototipo (referencia)

```
Vetrina App.html                ← entry point
vetrina/
  tokens.css                    ← espejo de src/assets/styles/tokens.css
  states.css                    ← hover/active globales
  historia.css / consulta.css /
  empleados.css / acciones.css /
  roles.css                     ← un CSS por feature
  polish.css                    ← CAPA DE MEJORAS (ver §"Cambios a aplicar")
  *.jsx                         ← componentes React (referencia visual)
```

Cada archivo `.jsx` mapea conceptualmente a un componente/vista Vue. La tabla de mapeo está en §"Mapeo prototipo → código Vue".

---

## Cambios a aplicar (ordenados por impacto)

### 🟣 1. Cambiar la ruta por defecto a Login

**Archivo**: `src/router/index.ts`

Actualmente:
```ts
{ path: '/', name: 'signup', component: () => import('@/features/registration/views/SignupView.vue'), meta: { guestOnly: true } },
{ path: '/login', name: 'login', component: () => import('@/features/auth/views/LoginView.vue'), meta: { guestOnly: true } },
```

Cambiar a:
```ts
{ path: '/', name: 'login', component: () => import('@/features/auth/views/LoginView.vue'), meta: { guestOnly: true } },
{ path: '/signup', name: 'signup', component: () => import('@/features/registration/views/SignupView.vue'), meta: { guestOnly: true } },
```

Y en el catch-all al final, redirigir a `login` en vez de `signup`:
```ts
{ path: '/:pathMatch(.*)*', redirect: { name: 'login' } },
```

### 🎨 2. Alinear Auth (Login/Signup) con el sistema Amatista

Las pantallas de Login y Signup actualmente usan **Vuetify con tema índigo (`#4F46E5`)** mientras el resto de la app usa **Amatista** (`oklch(...)` con `--hue: 300`). Esto rompe la identidad de marca al entrar.

**Archivos a tocar**:
- `src/features/auth/views/LoginView.vue`
- `src/features/auth/components/LoginForm.vue`
- `src/features/registration/views/SignupView.vue`
- `src/features/registration/components/SignupForm.vue`
- `src/features/registration/components/SignupSuccessCard.vue`

**Plan**:
- Reemplazar `<v-main class="bg-background">` por un wrapper propio con el fondo cálido degradado (ver `vetrina/polish.css` rules §1, selector `.vet-auth-shell`).
- Tipografía del título: `var(--font-serif)` (`Instrument Serif`), 28px, peso 400, letter-spacing -0.01em.
- Botón principal del form: gradiente `linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)))` con sombra suave amatista (mismo patrón de `home/CtaPrimary.vue` y `dashboard/views/consulta/nueva/components/QuickActionsCard`).
- Links: `color: var(--amatista-700)` en lugar de `--v-theme-primary`.
- Inputs `v-text-field`: aún se mantienen pero override del `--v-theme-primary` localmente a amatista (o estilizar bordes y focus ring con CSS scoped a la vista).

**Alternativa más limpia (recomendada)**: actualizar el tema Vuetify global en `src/plugins/vuetify.ts` para que `primary` sea el amatista del sistema:
```ts
primary: '#7C3AED',   // ≈ oklch(50% 0.18 300)
// o mejor, leer el computed de --amatista-600
```
Esto haría que TODOS los `v-btn color="primary"`, `v-text-field`, `v-checkbox`, etc. tomen el color correcto sin tocar cada vista individualmente.

### 🧭 3. Reforzar el estado activo del sidebar

**Archivo**: `src/features/dashboard/components/sidebar/SidebarNavItem.vue`

El `.nav-item.active` actual usa alpha 0.4 que se confunde con hover. Reemplazar el bloque:
```css
.nav-item.active {
  background: oklch(48% 0.16 var(--hue) / 0.55);
  color: oklch(98% 0.01 var(--hue));
  box-shadow:
    inset 0 0 0 1px oklch(75% 0.14 var(--hue) / 0.35),
    inset 3px 0 0 oklch(80% 0.18 var(--hue));
  font-weight: 500;
}
```

### 🐾 4. PetCard de Consulta Nueva — usar iniciales en lugar de icono pata

**Archivo**: `src/features/dashboard/views/consulta/nueva/components/PetCard.vue`

Actualmente:
```vue
<div class="avatar">
  <PawPrint :size="22" :stroke-width="1.6" />
</div>
```

Cambiar a:
```vue
<div class="avatar">{{ initials(pet.name) }}</div>
```
(Reutiliza el helper `initials` de `composables/format.ts`.)

Y en el CSS del avatar:
```css
.avatar {
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 500;
  background: var(--amatista-100);
  color: var(--amatista-700);
}
```

Esto unifica el avatar con el de `historia-clinica/components/PetCard.vue` (que ya usa iniciales).

### 📏 5. Inputs no pegados a los bordes en Consulta Nueva

Bumpear padding interno de inputs base y body de section cards.

**Archivos**:
- `src/features/dashboard/components/ui/BaseInput.vue` → padding del `.input`: `10px 14px` (antes ~9/12)
- `src/features/dashboard/components/ui/BaseTextarea.vue` → `12px 14px`
- `src/features/dashboard/components/ui/BaseSelect.vue` → `10px 14px`
- `src/features/dashboard/components/ui/SectionCard.vue` → en `.body.padded`: `padding: clamp(22px, 2vw + 12px, 36px) clamp(22px, 2vw + 12px, 36px)`
- `src/features/dashboard/views/consulta/nueva/components/ContentWrap.vue` → `padding: 28px clamp(20px, 3vw + 8px, 56px)`

### 🔔 6. Toast system global al guardar acciones

Hoy no hay feedback visual tras guardar (excepto el redirect a `consulta-nueva-exito`). Añadir un sistema de toasts para empleados, roles y acciones clínicas.

**Plan**:
1. Crear `src/components/ui/ToastStack.vue` (componente global que se monta en `App.vue` junto al `PageLoader` y `ConsultaActiveBanner`).
2. Crear `src/composables/useToast.ts` con `useToast()` que expone `success/info/warn/error(title, message?)`.
3. Estilos: ver `vetrina/polish.css` reglas §26 (selector `.vet-toast-stack`).
4. Wirearlo en:
   - `src/features/employees/views/EmpleadosView.vue` — en `handleSubmit`, `confirmDeactivate`, `handleActivate`.
   - `src/features/roles/views/RolesView.vue` — tras `roles.createWithPermissions` / `roles.updateNameAndPermissions` / `roles.setActive`.
   - `src/features/acciones/views/*ListView.vue` (las 6) — tras `onSaved`, `onConfirmDelete`.

Ejemplos de copy a usar (tomados del prototipo):
- `toast.success('Empleado creado', 'Mariana Soto se añadió al equipo.')`
- `toast.info('Empleado desactivado', 'No podrá iniciar sesión hasta reactivarlo.')`
- `toast.success('Rol actualizado', 'Los cambios se guardaron.')`
- `toast.success('Vacuna guardada', 'Se añadió correctamente al paciente.')`
- `toast.info('Examen eliminado', 'El registro fue removido.')`

### 🟪 7. Page headers unificados en features (Empleados / Roles / Acciones)

Hoy las 3 vistas tienen el mismo patrón visual (kicker uppercase, título serif grande, lead, CTA gradient en la derecha) pero con tamaños levemente distintos: 38px vs 36px, diferentes paddings.

**Plan**: extraer a un componente compartido `src/components/ui/PageHeader.vue`:

```vue
<script setup lang="ts">
defineProps<{ kicker: string; title: string; lead?: string }>()
</script>

<template>
  <header class="page-head">
    <div class="kicker">{{ kicker }}</div>
    <div class="title-row">
      <div>
        <h1 class="title">{{ title }}</h1>
        <p v-if="lead" class="lead">{{ lead }}</p>
      </div>
      <div class="action">
        <slot name="action" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.page-head { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
.kicker { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--warm-500); font-weight: 500; }
.title-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
.title { margin: 0; font-family: var(--font-serif); font-size: 36px; font-weight: 400; letter-spacing: -0.015em; color: var(--warm-900); line-height: 1.05; }
.lead { margin: 6px 0 0; font-size: 13.5px; color: var(--warm-600); max-width: 540px; line-height: 1.5; }
</style>
```

Y reemplazar en:
- `EmpleadosView.vue`
- `RolesView.vue`
- Las 6 `*ListView.vue` de acciones

### 🟢 8. Focus rings unificados en inputs

Todos los inputs de la app deben tener:
```css
border-color: var(--amatista-500);
box-shadow: 0 0 0 3px var(--amatista-50);
```
al `focus`. Hoy hay 3-4 variantes (algunas con `--v-theme-primary` indigo, otras con `--amatista-500` directo).

**Plan**: añadir reglas globales en `src/assets/styles/main.css`:
```css
input:focus,
textarea:focus,
select:focus,
.v-field--focused .v-field__outline {
  outline: none;
  border-color: var(--amatista-500);
  box-shadow: 0 0 0 3px var(--amatista-50);
}
```

### 🟡 9. Espaciado más generoso en tabla de Empleados

**Archivo**: `src/features/employees/components/EmpleadoRow.vue`

Cambiar `.row` padding de `12px 15px 12px 18px` a `14px 16px 14px 18px`.

### 🟡 10. RoleCard — stats más grandes y card con más respiración

**Archivo**: `src/features/roles/components/RoleCard.vue`

- `.card` padding: 18px → 20px
- `.stat-num` font-size: 26px → 28px
- `.name` font-size: 17px → 18px

### 🟡 11. HistoryStep — patient head más equilibrado

**Archivo**: `src/features/historia-clinica/views/HistoryStep.vue`

- `.patient-head` padding: `24px 36px` → `28px 36px 24px`
- `.avatar` size: 72×72 → 64×64 con border-radius 16px y sombra suave amatista
- `.patient-name` font-size: 32px → 28px line-height 1.05

### 🟢 12. Modal overlays más profundos

En `src/features/dashboard/components/ui/ModalShell.vue` y `EmpleadoDrawer.vue`:
- `.overlay` background: `rgba(20, 15, 30, 0.55)` → mantener
- En `EditPermissionsModal.vue`: `.overlay`: `oklch(15% 0.05 var(--hue) / 0.45)` — ya está bien.

### 🟢 13. Misc polish

- `.vet-event-bullet` (Historia timeline) → añadir `box-shadow: 0 2px 6px -2px rgba(20, 15, 30, 0.12);` en `EventCard.vue`.
- `.cta-primary` (Home) → ya tiene buena sombra, no tocar.
- `.success-badge` en `ConsultaGuardada.vue`: usar gradiente `linear-gradient(135deg, oklch(58% 0.16 145), oklch(48% 0.18 150))` en lugar del color plano.
- Animación de entrada del drawer de empleado: ya está bien (slide desde derecha 0.22s cubic-bezier).

---

## Mapeo prototipo → código Vue

| Prototipo (`vetrina/*.jsx`) | Vue equivalente | Notas |
|---|---|---|
| `shell.jsx` → AppSidebar/AppTopbar | `src/features/dashboard/components/sidebar/*` + `topbar/*` + `layouts/AppLayout.vue` | Tal cual |
| `screens-home.jsx` | `src/features/dashboard/views/HomeView.vue` + `components/home/*` | Tal cual |
| `screens-auth.jsx` (LoginView) | `src/features/auth/views/LoginView.vue` + `components/LoginForm.vue` | Ver §2 (cambiar styling) |
| `screens-auth.jsx` (SignupView) | `src/features/registration/views/SignupView.vue` + `components/*` | Ver §2 |
| `historia-core.jsx` + `historia-details.jsx` + `screens-historia.jsx` | `src/features/historia-clinica/**` | Ver §11 |
| `consulta-store.jsx` + `consulta-ui.jsx` + `consulta-pieces.jsx` + `consulta-pasos.jsx` + `consulta-modals.jsx` + `screens-consulta.jsx` | `src/features/dashboard/views/consulta/nueva/**` | Ver §4, §5 |
| `screens-empleados.jsx` | `src/features/employees/**` | Ver §6, §7, §9 |
| `screens-roles.jsx` | `src/features/roles/**` | Ver §6, §7, §10 |
| `screens-acciones.jsx` | `src/features/acciones/**` (6 list views + 6 modales) | Ver §6, §7 |
| `toast.jsx` | **A crear**: `src/components/ui/ToastStack.vue` + `src/composables/useToast.ts` | Ver §6 |

---

## Design tokens (NO CAMBIAR — ya están en `src/assets/styles/tokens.css`)

```css
--hue: 300;
--amatista-50  … --amatista-900    (oklch con hue 300)
--warm-50      … --warm-900        (oklch con hue 60, chroma muy bajo)
--success-bg   = oklch(94% 0.04 145)
--success-fg   = oklch(40% 0.10 145)
--success-dot  = oklch(55% 0.15 145)

--font-sans    = 'Geist', system-ui...
--font-serif   = 'Instrument Serif', Georgia, serif
--font-mono    = 'JetBrains Mono', ui-monospace, monospace

--radius-sm    = 6px
--radius-md    = 8px
--radius-lg    = 12px
--radius-xl    = 16px
```

**Gradiente CTA reutilizable**:
```css
background: linear-gradient(135deg,
  oklch(45% 0.18 var(--hue)),
  oklch(38% 0.18 calc(var(--hue) - 5)));
box-shadow:
  0 1px 2px rgba(50, 20, 80, 0.08),
  0 6px 16px -6px oklch(40% 0.18 var(--hue) / 0.45);
```

---

## Cómo verificar el resultado

1. Abrir `Vetrina App.html` en el navegador como referencia visual.
2. Tras cada cambio, `pnpm dev` y comparar lado a lado pantalla por pantalla.
3. Pantallas críticas a revisar:
   - `/` (Login) — debe tener fondo cálido amatista, botón gradient
   - `/dashboard` — sidebar item activo claramente visible
   - `/dashboard/empleados` — header coincide con Acciones/Roles
   - `/dashboard/roles` — RoleCards con stats grandes
   - `/dashboard/consulta/nueva` — inputs con respiración, padding 28px en section card
   - Cualquier guardado → toast en esquina superior derecha (3s autodescartar)

---

## Limitaciones del prototipo

- **Mocks en memoria**: el prototipo no llama APIs; los datos se reinician al refrescar. Esto NO se debe replicar en Vue — usar los stores y APIs reales.
- **Sin auth real**: el prototipo acepta cualquier credencial. Vue ya tiene el auth flow correcto en `useAuth.ts`.
- **Vuetify recreado en CSS puro**: el prototipo no importa Vuetify. En Vue se debe seguir usando Vuetify nativo con los overrides de tema descritos.

---

## Archivos en este bundle

- `Vetrina App.html` — entry point del prototipo
- `vetrina/` — carpeta con todos los JSX y CSS (referencia visual y de comportamiento)
- `vetrina/polish.css` — **archivo más importante**: contiene todas las reglas CSS de polish a portar a los `.vue` files correspondientes

Cuando Claude Code lea el polish.css, debe extraer las reglas y aplicarlas a los archivos Vue indicados en cada sección comentada (`/* ---------- N. NOMBRE ---------- */`).

---

## 🆕 §14. Nuevo flujo: Spa

El modelo de datos del backend incluye las entidades `Spa` y `SpaType` que aún no están implementadas en el frontend Vue. Este prototipo añade el flujo completo como referencia. Debe implementarse en Vue siguiendo el mismo patrón que las otras 6 vistas de `src/features/acciones/`.

### Entidad

```ts
// src/types/domain.ts — añadir:
export interface SpaType {
  id: string
  name: string
  description?: string
}

export interface Spa {
  date: string
  spaTypeId: string
  reason: string
  details: string
  observations: string
  // animal, company, consultation? — según el modelo
}
```

> **Nota del modelo**: a diferencia de las otras acciones, `Spa` **no está vinculado a una Consultation** (no aparece `Spa --> Consultation` en el diagrama). Es una acción standalone como `DayCare`. Mantén esto al diseñar la API.

### Archivos a crear en `src/features/acciones/`

```
src/features/acciones/
├── views/
│   └── SpaListView.vue              ← Lista con cascada de paciente
├── modals/
│   └── SpaFormModal.vue             ← Form crear/editar
├── api/
│   ├── spa.api.ts                   ← CRUD endpoints
│   └── spaType.api.ts               ← Catálogo de tipos
└── composables/
    └── useSpaTypes.ts               ← Catálogo cacheable
```

### Ruta nueva en `src/router/index.ts`

```ts
{
  path: 'acciones/spa',
  name: 'acciones-spa',
  component: () => import('@/features/acciones/views/SpaListView.vue'),
  meta: { permission: PERMISSIONS.SPA_CREATE }, // crear el permiso correspondiente
},
```

### Sidebar — agregar item

**Archivo**: `src/features/dashboard/components/sidebar/AppSidebar.vue`

Añadir al array `accionesItems` (después de Cirugía):

```ts
{
  label: 'Spa',
  icon: Sparkles, // import { Sparkles } from 'lucide-vue-next'
  to: { name: 'acciones-spa' as const },
  show: canSpa.value,
},
```

Y añadir el permiso `canSpa = can(PERMISSIONS.SPA_CREATE)` arriba con los otros.

### Form fields del modal

Según el modelo `Spa`:

| Campo | Tipo | Required | Notas |
|---|---|---|---|
| `date` | Date | ✓ | Default = hoy |
| `spaType` | Select | ✓ | Catálogo `SpaType` (Baño completo, Baño medicado, Corte de pelo, Limpieza de oídos, Corte de uñas, Peinado, Estética completa) |
| `reason` | Input | – | "Mantenimiento mensual", "Dermatitis", etc. |
| `details` | Textarea | – | Productos, técnica, tiempos |
| `observations` | Textarea | – | Comportamiento del paciente, recomendaciones |

### Tabla — columnas

| Columna | Source |
|---|---|
| Fecha | `formatDateShort(date)` |
| Servicio | `spaType.name` |
| Motivo | `reason` (truncar con ellipsis) |
| Detalles | `details` (truncar con ellipsis) |
| Acciones | Editar + Eliminar |

### Búsqueda

Filtrar por: `spaType.name`, `reason`, `details`.

### Mocks de referencia

Ver `vetrina/data-acciones.jsx` (constantes `VET_SPA_TYPES` y `VET_ACCIONES_SPA`) para ejemplos de datos realistas.

### Permisos a añadir

En `src/constants/permissions.ts`:
```ts
SPA_CREATE: 'spa.create',
SPA_UPDATE: 'spa.update',
SPA_DELETE: 'spa.delete',
```

Y registrarlos en el catálogo de `BasePermission` del backend con el sub-módulo correspondiente (probablemente uno nuevo "Spa" bajo el módulo "Clínica").

### Integración con Historia Clínica

El `ClinicalEventType` ya tiene la entrada `SPA` en `src/features/historia-clinica/constants/eventTypes.ts`:
```ts
SPA: { label: 'Spa', color: 'gray', icon: '🛁' },
```

Solo falta:
1. Añadir el handler en `EventDetailModal.vue` para fetcher `spaApi.findById()` cuando `eventType === 'SPA'`.
2. Crear `SpaDetail.vue` en `src/features/historia-clinica/components/detail/` siguiendo el patrón de los otros.
3. Añadir `SPA` al `EVENT_TYPE_DETAILABLE` set.

Campos del detail (mismo formato que los otros):
```vue
<DetailField label="Tipo de servicio" :value="data.spaType.name" />
<DetailField label="Fecha" :value="formatEventDate(data.date)" />
<DetailField label="Motivo" :value="data.reason" span="full" />
<DetailField label="Detalles" :value="data.details" span="full" />
<DetailField label="Observaciones" :value="data.observations" span="full" />
```
