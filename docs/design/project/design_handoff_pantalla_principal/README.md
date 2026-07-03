# Handoff: Pantalla Principal — Software Veterinario (Vetrina)

## Overview
Pantalla principal post-login para un software de administración de clínicas veterinarias. Es la primera vista que ve el usuario al autenticarse. Por ahora solo existe **una opción de menú activa** ("Consulta", con submenú expandible); el resto de módulos están visibles pero deshabilitados como "Próximamente" para que el usuario sepa qué se viene.

## About the Design Files
Los archivos HTML/JSX en este bundle son **referencias de diseño**, no código de producción. Fueron creados como prototipo en React + Babel inline para mostrar el look & feel y comportamiento esperados. **La tarea es recrear estos diseños en el codebase Vue.js del usuario** usando sus convenciones, componentes y estructura de carpetas existentes.

No copies el código JSX directamente — entiende la intención visual y de comportamiento, y porteala a componentes Vue idiomáticos (Composition API recomendada, `<script setup>`).

## Fidelity
**High-fidelity (hifi).** Los colores, espaciados, tipografías y estados están definidos con precisión. Replica los valores exactos.

## Stack objetivo (target)
- **Framework:** Vue 3 + `<script setup>` (Composition API)
- **Estilos:** CSS con variables (los tokens están listos para usar) o el preprocesador que ya use el proyecto. Si usan Tailwind, mapea los tokens al config.
- **Iconos:** los mocks usan SVG inline minimalistas (estilo Lucide, stroke 1.5px). Recomendado: instalar `lucide-vue-next` y usar los nombres equivalentes (ver tabla abajo).
- **Fuentes:** Google Fonts — Geist (UI) + Instrument Serif (acento cálido) + JetBrains Mono (kbd / horas)
- **Routing:** Vue Router. La opción de menú "Consulta" debe abrir un submenú con 4 sub-rutas.

---

## Layout general

Layout de dos columnas, full-viewport, sin scroll horizontal:

```
┌─────────────────┬─────────────────────────────────────────────────┐
│                 │  TopBar (60px)                                   │
│   Sidebar       ├─────────────────────────────────────────────────┤
│   (248px fijo)  │                                                  │
│                 │  Contenido (scroll vertical interno)             │
│                 │   - Saludo + subtítulo                           │
│                 │   - Stats row (4 cards)                          │
│                 │   - CTA row (1.4fr / 1fr): primario + secundario │
│                 │   - Consultas recientes (tabla)                  │
│                 │                                                  │
└─────────────────┴─────────────────────────────────────────────────┘
```

- **Sidebar:** 248px de ancho, fijo, altura 100vh, no hace scroll. Fondo gradiente amatista oscuro.
- **Main:** flex 1, columna. TopBar 60px arriba (fijo). Debajo, área de contenido con `padding: 36px 48px` y `overflow: auto`.
- Usar `flex` y `gap`, no márgenes. Usar `display: grid` para stats y CTA row.

---

## Design Tokens

Coloca esto en un archivo global de estilos (ej. `src/assets/tokens.css`) e impórtalo en `main.ts/js`. Todos los valores son **OKLCH** (mejor consistencia perceptual que HSL); navegadores modernos los soportan nativamente.

```css
:root {
  --hue: 300; /* tono amatista; ajustable */

  /* Amatista (acento principal) */
  --amatista-50:  oklch(97% 0.015 var(--hue));
  --amatista-100: oklch(94% 0.035 var(--hue));
  --amatista-200: oklch(88% 0.07  var(--hue));
  --amatista-300: oklch(78% 0.12  var(--hue));
  --amatista-400: oklch(68% 0.16  var(--hue));
  --amatista-500: oklch(58% 0.18  var(--hue));
  --amatista-600: oklch(50% 0.18  var(--hue));
  --amatista-700: oklch(42% 0.16  var(--hue));
  --amatista-800: oklch(32% 0.12  var(--hue));
  --amatista-900: oklch(22% 0.08  var(--hue));

  /* Neutros cálidos (warm) */
  --warm-50:  oklch(99% 0.005 60);
  --warm-100: oklch(97% 0.008 60);
  --warm-150: oklch(95% 0.01  60);
  --warm-200: oklch(92% 0.012 60);
  --warm-300: oklch(86% 0.015 60);
  --warm-400: oklch(72% 0.015 60);
  --warm-500: oklch(58% 0.012 60);
  --warm-600: oklch(45% 0.012 60);
  --warm-700: oklch(35% 0.012 60);
  --warm-800: oklch(25% 0.012 60);
  --warm-900: oklch(16% 0.012 60);

  /* Estados */
  --success-bg: oklch(94% 0.04 145);
  --success-fg: oklch(40% 0.10 145);
  --success-dot: oklch(55% 0.15 145);

  /* Tipografía */
  --font-sans: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-serif: 'Instrument Serif', Georgia, serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Radios */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}
```

### Espaciado
Múltiplos de 4px. Valores usados: `4, 6, 8, 10, 12, 14, 16, 20, 22, 24, 28, 30, 32, 36, 48`.

### Sombras
- Topbar/cards: `none` (uso de borde `1px solid var(--warm-200)`)
- CTA primario gradiente: `0 1px 2px rgba(50,20,80,0.08), 0 8px 24px -8px oklch(40% 0.18 var(--hue) / 0.5)`
- Avatar topbar: `0 0 0 2px var(--warm-50), 0 0 0 3px var(--warm-200)` (anillo)

---

## Pantallas

### 1. Sidebar (siempre visible)

**Estructura:**
```
[Brand: V + "Vetrina" + "Clínica Norte"]
─────────────
TRABAJO
  ▸ Consulta (activo, expandible)
      · Nueva consulta (sub-activo por defecto)
      · Historial clínico
      · Plan de vacunación
      · Hospitalización
─────────────
PRÓXIMAMENTE  (todos disabled, badge "Pronto")
  · Pacientes
  · Agenda
  · Inventario
  · Facturación
  · Reportes
─────────────
[spacer flex]
[User card: avatar + nombre + rol + chevron]
```

**Estilo:**
- Background: `linear-gradient(180deg, oklch(28% 0.10 var(--hue)) 0%, oklch(22% 0.08 var(--hue)) 100%)`
- Color texto base: `oklch(94% 0.02 var(--hue))`
- Padding: `20px 14px`
- Display flex column

**Brand mark:**
- Cuadrado 30×30, `border-radius: 8px`
- Fondo `oklch(72% 0.16 var(--hue))`, color texto `oklch(20% 0.05 var(--hue))`
- Letra "V" en `Instrument Serif italic`, `font-weight: 700`, `font-size: 15px`

**Section labels (`TRABAJO`, `PRÓXIMAMENTE`):**
- Font-size 10.5px, letter-spacing 0.1em, uppercase
- Color: `oklch(75% 0.04 var(--hue) / 0.55)`
- Padding `14px 10px 8px`

**Nav item activo (Consulta):**
- Padding `9px 10px`, border-radius 8px, font-size 13.5px, font-weight 500
- Background: `oklch(45% 0.16 var(--hue) / 0.4)`
- Color: `oklch(98% 0.01 var(--hue))`
- `box-shadow: inset 0 0 0 1px oklch(70% 0.14 var(--hue) / 0.3)`
- Icon 17px (Lucide `FileText` o similar)
- Chevron a la derecha (rotación 0deg expandido / -90deg colapsado, transition 0.2s)

**Nav item inactivo:** color `oklch(88% 0.03 var(--hue) / 0.85)`, fondo transparente, hover sutil.

**Nav item disabled:** color `oklch(70% 0.03 var(--hue) / 0.4)`, cursor `not-allowed`, badge "Pronto" a la derecha:
- Badge: font-size 9.5px, padding `2px 6px`, background `oklch(70% 0.04 var(--hue) / 0.18)`, color `oklch(78% 0.04 var(--hue) / 0.7)`, letter-spacing 0.04em, uppercase

**Submenu de Consulta (cuando expandido):**
- Padding-left 28px, items con padding `7px 10px`, border-radius 6px, font-size 12.5px, gap 9px
- Activo (Nueva consulta): background `oklch(50% 0.10 var(--hue) / 0.25)`, color `oklch(95% 0.02 var(--hue))`, font-weight 500
- Inactivos: color `oklch(82% 0.04 var(--hue) / 0.72)`
- Iconos 14px

**User card (al final con `margin-top: auto`):**
- Padding 10px, border-radius 10px, background `oklch(35% 0.10 var(--hue) / 0.4)`
- Display flex, gap 10px
- Avatar circular 32×32, gradient `linear-gradient(135deg, oklch(78% 0.14 30), oklch(65% 0.16 350))`, iniciales centradas en blanco font-weight 600 font-size 12px
- Texto: nombre 12.5px font-weight 500, rol 11px opacity 0.6
- Chevron 14px a la derecha, opacity 0.5

---

### 2. TopBar (60px alto)

- Background: `var(--warm-50)`
- Border-bottom: `1px solid var(--warm-200)`
- Padding `0 28px`, display flex align center, gap 16px

**Search box (izquierda):**
- Display flex, gap 8px, padding `7px 12px`
- Background `var(--warm-150)`, border `1px solid var(--warm-200)`, border-radius 8px
- Width 320px, color `var(--warm-500)`, font-size 13px
- Icono `Search` 15px, placeholder "Buscar paciente, dueño, código…"
- KBD `⌘K`: font-mono 10px, padding `2px 6px`, background `var(--warm-50)`, border `1px solid var(--warm-200)`, border-radius 4px, color `var(--warm-600)`

**Acciones (derecha, `margin-left: auto`):**
- Botón icono `Bell` (notificaciones)
- Botón icono `Settings`
- Divider vertical 1×22px `var(--warm-200)` con margen `0 4px`
- Avatar 34×34 circular con anillo doble (mismo gradient que sidebar user card)

**Botón icono estilo:**
- 34×34, border-radius 8px, border `1px solid var(--warm-200)`, background `var(--warm-50)`, color `var(--warm-600)`, cursor pointer

---

### 3. Área de contenido

**Padding:** `36px 48px`. Scroll vertical.

#### 3.1 Saludo
- Font-family: `Instrument Serif`, font-size 44px, line-height 1.05, letter-spacing -0.015em, font-weight 400
- Color `var(--warm-900)`
- Texto: "Buenos días, [nombre]." donde el nombre va en `font-style: italic` y color `var(--amatista-700)`
- El saludo debe variar según hora: <12 "Buenos días", <19 "Buenas tardes", else "Buenas noches"

**Subtítulo:**
- Font-size 14px, color `var(--warm-600)`, margin-bottom 32px
- Texto: "Sábado 2 de mayo · 8 consultas previstas hoy" (formato fecha localizado a es-ES + conteo)

#### 3.2 Stats Row (4 cards en grid)
`grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;`

Cada card:
- Background `var(--warm-50)`, border `1px solid var(--warm-200)`, border-radius 12px, padding `14px 16px`
- Label: font-size 11.5px, color `var(--warm-500)`, margin-bottom 6px
- Value: font-size 26px, font-weight 500, letter-spacing -0.02em
- Sub: font-size 11.5px, margin-top 4px, color según tono:
  - `ok` → `oklch(50% 0.13 145)` (verde)
  - `amatista` → `var(--amatista-700)`
  - `neutral` → `var(--warm-500)`

Datos demo:
1. "Consultas hoy" — 8 — "+2 vs ayer" (ok)
2. "En curso" — 1 — "Luna · 09:30" (amatista)
3. "Pendientes" — 5 — "Próxima 11:00" (neutral)
4. "Completadas" — 2 — "esta mañana" (neutral)

#### 3.3 CTA Row (grid 1.4fr / 1fr, gap 16px, margin-bottom 28px)

**CTA Primario (izquierda):**
- Background gradient: `linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 295))`
- Color texto: white
- Border-radius 16px, padding `28px 30px`, position relative, overflow hidden
- Box-shadow: `0 1px 2px rgba(50,20,80,0.08), 0 8px 24px -8px oklch(40% 0.18 var(--hue) / 0.5)`
- Decoración: círculo radial absolute top-right `220×220`, `radial-gradient(circle, oklch(70% 0.18 var(--hue) / 0.4), transparent 60%)`, pointer-events none
- Eyebrow: "ACCIÓN RÁPIDA" — 11px, letter-spacing 0.12em, uppercase, opacity 0.7, font-weight 500
- Title: "Iniciar una nueva consulta" — 22px, font-weight 500, letter-spacing -0.01em
- Desc: "Registra el motivo, examen físico, diagnóstico y tratamiento del paciente en una sola pantalla." — 13px, opacity 0.75, line-height 1.5, max-width 380px
- Botones (gap 8px, margin-top 22px):
  - **Primario:** background white, color `var(--amatista-700)`, padding `9px 16px`, border-radius 8px, font-size 13px font-weight 500, icono `Plus` 14px + "Nueva consulta"
  - **Ghost:** background `oklch(60% 0.10 var(--hue) / 0.25)`, color white, border `1px solid oklch(80% 0.06 var(--hue) / 0.3)`, "Ver historial"

**CTA Secundario (derecha):**
- Background `var(--warm-50)`, border `1px solid var(--warm-200)`, border-radius 16px, padding 24px, flex column
- Header: icono 36×36 border-radius 10px en `var(--amatista-100)` con `History` icon en `var(--amatista-700)`, junto a título "Historial clínico" (15px, font-weight 500)
- Desc: "Busca consultas previas por paciente, dueño o fecha. Exporta resúmenes en PDF." — 12.5px, color `var(--warm-600)`, line-height 1.5, flex 1
- Link al final: "Abrir historial →" — 12.5px, color `var(--amatista-700)`, font-weight 500, gap 5px, margin-top 14px

#### 3.4 Consultas recientes

Header (display flex, justify-content space-between, margin-bottom 14px):
- Título: "Consultas recientes" — 13px, font-weight 500, color `var(--warm-800)`
- Link: "Ver todas →" — 12px, color `var(--amatista-700)`

Lista (background `var(--warm-50)`, border `1px solid var(--warm-200)`, border-radius 12px, overflow hidden):

Cada fila:
- Grid: `32px 1.4fr 1fr 1fr 1fr auto`, gap 14px, align center, padding `12px 16px`, font-size 13px
- Border-bottom `1px solid var(--warm-150)` (excepto última)
- Col 1: avatar 32×32 border-radius 8px, fondo `var(--amatista-100)`, color `var(--amatista-700)`, icon `PawPrint` 16px
- Col 2: nombre (font-weight 500, color `var(--warm-900)`) + especie/edad (11.5px, `var(--warm-500)`)
- Col 3: dueño — 12.5px, `var(--warm-600)`
- Col 4: motivo — 12.5px, `var(--warm-600)`
- Col 5: fecha — 12.5px, `var(--warm-600)`
- Col 6: pill de estado — display inline-flex gap 6px, font-size 11px, padding `3px 8px`, border-radius 999px, font-weight 500
  - **En curso (amatista):** bg `var(--amatista-100)`, fg `var(--amatista-700)`, dot `var(--amatista-600)`
  - **Programada (wait):** bg `var(--warm-150)`, fg `var(--warm-600)`, dot `var(--warm-500)`
  - **Completada (ok):** bg `oklch(94% 0.04 145)`, fg `oklch(40% 0.10 145)`, dot `oklch(55% 0.15 145)`
  - El "dot" es un span 6×6 circular antes del label

Datos demo:
1. Luna · Felina · 4 a · Carla Mendoza · Control vacunación · Hoy · 09:30 · En curso
2. Rocco · Canino · 7 a · Luis Paredes · Cojera pata trasera · Hoy · 11:00 · Programada
3. Mishi · Felina · 2 a · Andrea Solís · Esterilización post-op · Ayer · 16:20 · Completada
4. Toby · Canino · 11 a · Jorge Vargas · Chequeo geriátrico · Ayer · 14:00 · Completada

---

## Iconos (mapeo a `lucide-vue-next`)

| Uso | Nombre Lucide |
|---|---|
| Consulta | `FileText` |
| Nueva consulta | `FilePlus` |
| Historial clínico | `History` |
| Vacunación | `Syringe` |
| Hospitalización / Mascota | `PawPrint` |
| Pacientes | `User` o `UserCircle` |
| Agenda | `Calendar` |
| Inventario | `Package` |
| Facturación | `Receipt` |
| Reportes | `BarChart3` |
| Ajustes | `Settings` |
| Búsqueda | `Search` |
| Notificaciones | `Bell` |
| Chevron abajo | `ChevronDown` |
| Chevron derecha | `ChevronRight` |
| Plus | `Plus` |
| Flecha derecha | `ArrowRight` |

Tamaños usados: 13, 14, 15, 16, 17, 18 px. Stroke 1.5.

---

## Estructura de componentes Vue sugerida

```
src/
├── assets/
│   └── tokens.css
├── layouts/
│   └── AppLayout.vue          # shell sidebar + main
├── components/
│   ├── sidebar/
│   │   ├── AppSidebar.vue
│   │   ├── SidebarBrand.vue
│   │   ├── SidebarNavItem.vue
│   │   ├── SidebarSubItem.vue
│   │   └── SidebarUserCard.vue
│   ├── topbar/
│   │   ├── AppTopbar.vue
│   │   ├── SearchBox.vue
│   │   └── UserMenu.vue       # avatar con dropdown
│   ├── home/
│   │   ├── GreetingHeader.vue
│   │   ├── StatsRow.vue
│   │   ├── StatCard.vue
│   │   ├── CtaPrimary.vue
│   │   ├── CtaSecondary.vue
│   │   ├── RecentConsultations.vue
│   │   └── ConsultationStatusPill.vue
├── views/
│   └── HomeView.vue            # compone home/* dentro de AppLayout
├── router/
│   └── index.ts
└── main.ts
```

### Ejemplo `AppLayout.vue`
```vue
<script setup lang="ts">
import AppSidebar from '@/components/sidebar/AppSidebar.vue'
import AppTopbar from '@/components/topbar/AppTopbar.vue'
</script>

<template>
  <div class="app-shell">
    <AppSidebar />
    <div class="app-main">
      <AppTopbar />
      <main class="app-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  width: 100%;
  height: 100vh;
  display: flex;
  background: var(--warm-100);
  color: var(--warm-900);
  font-family: var(--font-sans);
  overflow: hidden;
}
.app-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.app-content { flex: 1; padding: 36px 48px; overflow: auto; }
</style>
```

### Routing sugerido
```ts
// router/index.ts
const routes = [
  {
    path: '/',
    component: AppLayout,
    children: [
      { path: '', name: 'home', component: () => import('@/views/HomeView.vue') },
      {
        path: 'consulta',
        children: [
          { path: 'nueva',       name: 'consulta-nueva',       component: () => import('@/views/consulta/NuevaView.vue') },
          { path: 'historial',   name: 'consulta-historial',   component: () => import('@/views/consulta/HistorialView.vue') },
          { path: 'vacunacion',  name: 'consulta-vacunacion',  component: () => import('@/views/consulta/VacunacionView.vue') },
          { path: 'hospital',    name: 'consulta-hospital',    component: () => import('@/views/consulta/HospitalView.vue') },
        ]
      }
    ]
  }
]
```

Cuando el usuario hace click en CTA "Nueva consulta" → `router.push({ name: 'consulta-nueva' })`.

---

## Estado e Interacciones

### Estado del sidebar
- `consultaOpen: boolean` (default `true`) — controla si el submenú está expandido
- `activeSubItem: string` (default `'nueva'`) — derivable de `route.name` con un computed; no necesita ser estado independiente

### Comportamientos
- **Click en "Consulta" (nav item activo):** toggle del submenu con animación de chevron (rotate 0 ↔ -90deg, 0.2s)
- **Click en sub-item:** navega a la sub-ruta y marca como activo
- **Click en items "Próximamente":** cursor `not-allowed`, no hace nada (o muestra tooltip "Próximamente disponible")
- **Click en CTA "Nueva consulta":** navega a `/consulta/nueva`
- **Click en CTA "Ver historial" o card secundario:** navega a `/consulta/historial`
- **Avatar topbar:** abre dropdown con: Mi perfil / Configuración / Cerrar sesión
- **Búsqueda (⌘K):** abrir command palette (puede ser TODO inicial — placeholder o `<dialog>`)
- **Click en fila de consulta reciente:** navega al detalle de esa consulta

### Animaciones
- Transition chevron submenu: `transform 0.2s ease`
- Hover en nav items inactivos: background `oklch(70% 0.04 var(--hue) / 0.08)` con transition 0.12s
- Hover en CTAs: subir 1px (`transform: translateY(-1px)`) + sombra ligeramente más fuerte, transition 0.15s

---

## Datos / API (mock por ahora)

Estructura sugerida para los modelos:

```ts
interface User {
  id: string
  firstName: string
  lastName: string
  role: 'veterinario' | 'recepcionista' | 'admin'
  clinic: string
}

interface Patient {
  id: string
  name: string
  species: 'canino' | 'felino' | 'otro'
  age: number  // en años
  ownerName: string
}

interface Consultation {
  id: string
  patient: Patient
  reason: string
  date: string  // ISO
  status: 'programada' | 'en_curso' | 'completada'
}

interface DayStats {
  total: number
  inProgress: number
  pending: number
  completed: number
}
```

Por ahora todos los datos pueden venir de un store Pinia con valores mock; conectarlos a backend real después.

---

## Responsive

El diseño está optimizado para escritorio (≥1280px). Para anchos menores:
- <1280px: stats row pasa a `grid-template-columns: repeat(2, 1fr)`
- <1024px: sidebar colapsable (botón hamburguesa en topbar) y CTA row apila a 1 columna
- <768px: tabla de consultas recientes pasa a tarjetas verticales

No es prioridad inicial — implementa primero desktop pixel-perfect.

---

## Asset Files
Los archivos HTML/JSX originales del prototipo están en este folder como referencia:
- `Pantalla Principal.html` — entry point
- `vetrina-app.jsx` — componente principal con toda la lógica
- `icons.jsx` — definiciones de iconos SVG (úsalos como referencia, pero usa `lucide-vue-next` en producción)
- `tweaks-panel.jsx` — panel de tweaks del prototipo (ignóralo, era solo para exploración de variantes)

---

## Checklist de implementación

- [ ] Instalar fuentes (Google Fonts en `index.html` o `@fontsource`)
- [ ] Crear `tokens.css` con variables OKLCH e importarlo global
- [ ] Instalar `lucide-vue-next`
- [ ] Configurar Vue Router con rutas anidadas para `/consulta/*`
- [ ] Implementar `AppLayout` (sidebar + topbar + slot)
- [ ] Implementar `AppSidebar` con nav items, submenu de Consulta y user card
- [ ] Implementar `AppTopbar` con search y avatar dropdown
- [ ] Implementar `HomeView` componiendo: GreetingHeader, StatsRow, CTAs, RecentConsultations
- [ ] Hookear datos mock a un store (Pinia recomendado)
- [ ] Estados hover en nav items y botones
- [ ] Validar accesibilidad: roles ARIA en sidebar nav, foco visible, contraste de "Pronto" badge

---

## Notas finales para el desarrollador

- El acento amatista (oklch hue 300) es la decisión de marca. Mantenlo consistente.
- La tipografía mezcla **Geist** (sans neutral, UI) con **Instrument Serif** italic para el saludo — ese contraste es intencional y aporta la calidez profesional pedida. No reemplaces el serif por sans.
- Los items "Próximamente" deben quedar visibles aunque deshabilitados — comunican el roadmap del producto al usuario.
- Solo hay una opción activa hoy ("Consulta"). Cuando agregues nuevos módulos, mueve el ítem de "Próximamente" a "Trabajo" y quítale el badge.
