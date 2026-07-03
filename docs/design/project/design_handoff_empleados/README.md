# Handoff · Pantalla de Empleados (Vetrina)

Prototipo navegable de la administración de empleados — abrí `Empleados.html` en el navegador para ver el flujo real (lista → click en fila → drawer → cambiar rol / desactivar / reactivar).

Implementación target: **Vue 3 + `<script setup>` + Pinia**, dentro del proyecto que ya estás trabajando con Claude Code en IntelliJ.

---

## 1 · Diseño

**Paleta** (igual que las pantallas anteriores — usá las CSS vars que ya tenés en el proyecto):
- Acento: amatista (`--amatista-100..900`, hue 300 en OKLCH)
- Neutros cálidos: `--warm-50..900` (hue 60)
- Estados: verde activo, rojo desactivar, ámbar warning

**Tipografía:**
- `Geist` para UI (300/400/500/600/700)
- `Instrument Serif` para títulos grandes ("Empleados", nombre en drawer)

**Componentes nuevos a crear:**
- `EmpleadosView.vue` — página + sidebar + banner
- `EmpleadosTable.vue` — tabla con search + filas
- `EmpleadoRow.vue` — fila individual
- `EmpleadoDrawer.vue` — panel lateral con tabs
- `RolePill.vue`, `StatusPill.vue`, `Avatar.vue` — ya pueden existir, si no acá tenés la spec
- `RoleSelector.vue` — selector de rol expandible (5 opciones con descripción)
- `ConfirmDialog.vue` — modal de confirmación reutilizable

---

## 2 · Modelo de datos

```ts
// types/employee.ts
export type RoleId = 'admin' | 'vet' | 'assistant' | 'reception' | 'aux';

export interface Role {
  id: RoleId;
  name: string;
  description: string;
  color: 'amatista' | 'green' | 'blue' | 'amber' | 'gray';
}

export interface Employee {
  id: number;
  fullName: string;
  document: string;       // "DNI 41.829.301"
  email: string;
  phone: string;
  hireDate: string;       // ISO yyyy-mm-dd
  role: RoleId;
  active: boolean;
  initials?: string;      // derivado de fullName si no viene
  lastLogin?: string;     // texto humano: "hace 12 min"
}
```

**Catálogo de roles** — está en `empleados-data.jsx` (descripciones listas para copiar).

---

## 3 · Estructura sugerida (Vue)

```
src/
├─ views/
│  └─ EmpleadosView.vue
├─ components/
│  ├─ empleados/
│  │  ├─ EmpleadosTable.vue
│  │  ├─ EmpleadoRow.vue
│  │  ├─ EmpleadoDrawer.vue
│  │  ├─ DrawerTabDatos.vue
│  │  ├─ DrawerTabRol.vue
│  │  ├─ RoleSelector.vue
│  │  └─ ConfirmDeactivate.vue
│  └─ ui/
│     ├─ RolePill.vue
│     ├─ StatusPill.vue
│     └─ Avatar.vue
├─ stores/
│  └─ empleados.ts        // Pinia: state + actions update/deactivate
├─ services/
│  └─ empleados.api.ts    // fetch / axios calls
└─ types/
   └─ employee.ts
```

---

## 4 · Comportamiento (lo que ves en el prototipo)

**Lista**
- Search en vivo filtra por `fullName | document | email` (case-insensitive)
- Click en fila → setea `selectedId` → abre drawer
- Inactivos: opacidad 0.7 + dot gris en avatar
- Filas alternadas (zebra ligera)
- Hover: fondo `--warm-100`
- Selected: fondo `--amatista-50` + borde izq amatista 3px

**Drawer**
- Slide-in desde la derecha (~480px), con overlay oscuro detrás
- Header: gradiente del color del rol → fondo neutro
- Tabs: Datos básicos · Rol & permisos
- **Tab Rol:**
  - Card del rol actual (color del rol) + botón "Cambiar rol"
  - Click en "Cambiar rol" → reemplaza el contenido por una lista de 5 roles seleccionables, cada uno con descripción
  - Click en un rol nuevo → llama a `updateRole(id, newRole)` y vuelve a la card
- **Footer:**
  - "Restablecer contraseña" + "Editar"
  - Si está activo: botón rojo "Desactivar" → abre `ConfirmDeactivate` modal → confirmar llama a `deactivate(id)`
  - Si está inactivo: botón amatista "Reactivar" → llama a `update(id, { active: true })` directo

---

## 5 · Endpoints sugeridos

```
GET    /api/employees                  → Employee[]
POST   /api/employees                  → crear
PATCH  /api/employees/:id              → editar (incluye role, active)
POST   /api/employees/:id/deactivate   → desactivar
POST   /api/employees/:id/activate     → reactivar
POST   /api/employees/:id/reset-password
GET    /api/roles                      → Role[]
```

---

## 6 · Tokens CSS (copiar al `:root` global)

```css
:root {
  --hue: 300;
  --amatista-50:  oklch(97% 0.015 var(--hue));
  --amatista-100: oklch(94% 0.035 var(--hue));
  --amatista-200: oklch(88% 0.07 var(--hue));
  --amatista-300: oklch(78% 0.12 var(--hue));
  --amatista-400: oklch(68% 0.16 var(--hue));
  --amatista-500: oklch(58% 0.18 var(--hue));
  --amatista-600: oklch(50% 0.18 var(--hue));
  --amatista-700: oklch(42% 0.16 var(--hue));
  --amatista-800: oklch(32% 0.12 var(--hue));
  --amatista-900: oklch(22% 0.08 var(--hue));

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

  --green-bg: oklch(94% 0.06 150);
  --green-fg: oklch(40% 0.13 150);
  --red-bg:   oklch(94% 0.05 25);
  --red-fg:   oklch(48% 0.18 25);
  --amber-bg: oklch(94% 0.07 80);
  --amber-fg: oklch(45% 0.13 70);
}
```

---

## 7 · Prompt para Claude Code

> Estoy trabajando en un proyecto Vue 3 + `<script setup>` + Pinia.
>
> En esta carpeta tenés el handoff de la pantalla de **Empleados** de mi software veterinario. El archivo `Empleados.html` es el prototipo navegable — abrilo para ver el comportamiento exacto. Los `.jsx` son el código React fuente, úsalos como referencia visual y de lógica, no para copiar literal.
>
> Implementá la pantalla siguiendo el plan del `README.md` (sección 3 "Estructura sugerida") y el modelo de datos de la sección 2.
>
> Empezá por:
> 1. Tipos en `types/employee.ts` + catálogo de roles en `constants/roles.ts`
> 2. Componentes UI base: `Avatar.vue`, `RolePill.vue`, `StatusPill.vue` (si no existen ya en el proyecto)
> 3. Store Pinia `empleados.ts` con state `{ employees, selectedId }` + actions `updateEmployee`, `deactivate`, `activate`
> 4. `EmpleadosView.vue` montando la tabla + drawer (composición igual al prototipo)
> 5. `EmpleadoDrawer.vue` con tabs Datos/Rol y el `RoleSelector` inline
> 6. `ConfirmDeactivate.vue` reutilizando el patrón de modal que ya tengamos
>
> Mantené:
> - Las CSS vars (`--amatista-*`, `--warm-*`) — agregalas al `:root` global si todavía no están
> - La tipografía: `Instrument Serif` para títulos grandes, `Geist` para todo lo demás
> - El comportamiento exacto de drawer, cambio de rol inline y confirmación de desactivar
>
> Por ahora la data puede ser mockeada en el store; los endpoints están en la sección 5 para cuando enchufemos al backend.

---

## 8 · Archivos en este zip

| archivo | qué es |
|---|---|
| `Empleados.html` | entry — abrilo en el navegador para ver el prototipo |
| `icons.jsx` | iconos compartidos (Lucide-style) |
| `empleados-data.jsx` | datos mock + catálogo de roles + permisos |
| `empleados-shell.jsx` | sidebar + banner consulta activa + iconos extra |
| `empleados-list.jsx` | tabla principal + search + componentes Avatar/Pills |
| `empleados-drawer.jsx` | drawer lateral + tabs + selector de rol + confirm modal |
| `empleados-app.jsx` | composición raíz + state |
