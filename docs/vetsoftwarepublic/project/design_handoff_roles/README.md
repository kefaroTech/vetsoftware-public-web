# Handoff · Roles y permisos (grid + modal)

Prototipo de la pantalla de gestión de roles para Vetrina. **Variación C: grid de tarjetas + modal grande de editar permisos**.

## Cómo abrir el prototipo

1. Descomprimí el zip dentro de tu repo (ej. `docs/design/roles/`)
2. Abrí `Roles Grid Interactivo.html` doble-click

**Probá:**
- Click en el switch de cualquier card → activa/desactiva el rol en vivo
- "Editar permisos →" → abre el modal
- En el modal: tri-state por sub-módulo, búsqueda, expandir/colapsar, guardar
- Nombre del rol editable inline (focus → línea amatista punteada)

---

## Stack target

- **Vue 3** + `<script setup>` + TypeScript
- **Pinia** para state (cache de catálogos + rol en edición)
- Sin UI kit — CSS scoped con tokens globales

---

## Modelo de datos (Vue/TS)

Mapea 1:1 con tu schema:

```ts
// types/role.ts
export interface Role {
  id: number;
  name: string;
  code: string;          // backend-only, no se muestra
  active: boolean;       // soft delete
  companyId: number;
  permissionIds: number[];
  color?: 'amatista' | 'green' | 'blue' | 'amber' | 'gray';
}

export interface Permission {
  id: number;
  name: string;
  code: string;
  subModuleId: number;
  companyId: number;
}

export interface SubModule {
  id: number;
  name: string;
  code: string;
  moduleId: number;
}

export interface Module {
  id: number;
  name: string;
  code: string;
}
```

---

## Estructura sugerida en Vue 3

```
src/
├─ views/
│  └─ RolesView.vue                 # Grid principal
├─ components/
│  └─ roles/
│     ├─ RoleCard.vue               # Tarjeta individual con switch
│     ├─ AddRoleCard.vue            # Card "+ crear nuevo"
│     ├─ EditPermissionsModal.vue   # Modal grande con tri-state
│     ├─ SubModuleAccordion.vue     # Una fila de sub-módulo
│     ├─ TristateCheckbox.vue       # Checkbox 3 estados
│     ├─ SwitchToggle.vue           # Switch on/off
│     ├─ RolePill.vue
│     └─ StatusPill.vue
├─ stores/
│  └─ roles.ts                      # Pinia: roles + permissions catalog
├─ services/
│  └─ roles.api.ts                  # axios calls
└─ types/role.ts
```

---

## Endpoints sugeridos

```
GET    /api/roles                       → Role[]
POST   /api/roles                       → crear (name + permissionIds)
PATCH  /api/roles/:id                   → editar (name, permissionIds)
POST   /api/roles/:id/activate
POST   /api/roles/:id/deactivate

GET    /api/permissions                 → Permission[]  (catálogo, cachear)
GET    /api/sub-modules                 → SubModule[]   (catálogo, cachear)
GET    /api/modules                     → Module[]      (catálogo, cachear)
```

---

## Comportamiento del modal

| Acción | Cómo se implementa |
|---|---|
| Click en checkbox tri-state | toggle: si todos están on → off; si no → on todos |
| Click en checkbox individual | toggle ese permiso |
| Click en chevron del sub-módulo | expandir/colapsar |
| Buscar "factura" | filtra módulos+subs+permisos por substring case-insensitive |
| Expandir todo / Colapsar todo | mantiene los checkboxes intactos |
| Cambiar nombre inline | input transparente con borde punteado al focus |
| Switch activo/inactivo | flag `active` |
| Guardar cambios | `PATCH /api/roles/:id` con `{ name, active, permissionIds }` |

---

## Tokens CSS (copiar a global)

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

**Tipografía:** `Geist` (UI) + `Instrument Serif` (números grandes y títulos).

---

## Pinia store (esqueleto)

```ts
// stores/roles.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Role, Permission, SubModule, Module } from '@/types/role';
import * as api from '@/services/roles.api';

export const useRolesStore = defineStore('roles', () => {
  const roles = ref<Role[]>([]);
  const permissions = ref<Permission[]>([]);
  const subModules = ref<SubModule[]>([]);
  const modules = ref<Module[]>([]);

  async function loadAll() {
    const [r, p, s, m] = await Promise.all([
      api.listRoles(), api.listPermissions(),
      api.listSubModules(), api.listModules(),
    ]);
    roles.value = r;
    permissions.value = p;
    subModules.value = s;
    modules.value = m;
  }

  async function updateRole(id: number, patch: Partial<Role>) {
    const updated = await api.updateRole(id, patch);
    const idx = roles.value.findIndex(r => r.id === id);
    if (idx >= 0) roles.value[idx] = updated;
  }

  async function setActive(id: number, active: boolean) {
    if (active) await api.activateRole(id);
    else await api.deactivateRole(id);
    const r = roles.value.find(x => x.id === id);
    if (r) r.active = active;
  }

  // Helpers para mapear permisos por sub-módulo
  function subModulesUsedBy(permissionIds: number[]) {
    return [...new Set(
      permissionIds
        .map(id => permissions.value.find(p => p.id === id)?.subModuleId)
        .filter(Boolean) as number[]
    )];
  }

  return { roles, permissions, subModules, modules,
           loadAll, updateRole, setActive, subModulesUsedBy };
});
```

---

## Prompt para Claude Code

> Tengo el handoff de la pantalla de **Roles y permisos** de Vetrina. Abrí `Roles Grid Interactivo.html` en navegador para ver el comportamiento exacto y consultá los `.jsx` como referencia visual.
>
> Implementá la pantalla en Vue 3 + TS + Pinia siguiendo el plan del README:
>
> 1. Tipos en `types/role.ts` + colores `constants/roleColors.ts`
> 2. Servicios `services/roles.api.ts` con los endpoints listados
> 3. Store Pinia `stores/roles.ts` con cache de permisos/sub-módulos/módulos
> 4. Componentes UI: `RolePill.vue`, `StatusPill.vue`, `SwitchToggle.vue`, `TristateCheckbox.vue`
> 5. `RoleCard.vue` con switch en vivo + stats serif + chips de sub-módulos
> 6. `EditPermissionsModal.vue` con búsqueda + acordeón por sub-módulo + tri-state
> 7. `RolesView.vue` componiendo el grid
>
> Tokens CSS al `:root` global (sección "Tokens CSS"). Tipografías Geist + Instrument Serif por Google Fonts. CSS scoped por componente.
>
> El comportamiento clave del modal: **tri-state** (vacío / parcial / lleno) por sub-módulo, búsqueda case-insensitive sobre módulo+sub+permiso, expand/collapse all preserva selecciones, contadores en tiempo real en toolbar y footer.

---

## Archivos en el zip

| archivo | contenido |
|---|---|
| `Roles Grid Interactivo.html` | entry — abrilo en el navegador |
| `roles-data.jsx` | mocks: módulos, sub-módulos, permisos, roles + helpers |
| `roles-grid-interactive.jsx` | componente raíz, RoleCard, EditPermissionsModal, Tristate, Switch |
