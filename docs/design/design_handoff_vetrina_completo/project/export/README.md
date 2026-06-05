# Vetrina · Prototipo navegable

Prototipo HTML interactivo recreado a partir del frontend Vue 3 de tu sistema veterinario.
Replica fielmente el sistema de diseño Amatista (fuentes Geist + Instrument Serif,
paleta warm + amatista, tokens y componentes).

## Cómo abrirlo

1. Abre `Vetrina App.html` directamente en cualquier navegador moderno
   (Chrome, Edge, Firefox, Safari recientes).
   - Funciona en `file://` o servido por cualquier static server.
2. **No requiere build**: usa React 18 + Babel en runtime (CDN) y JSX como
   `<script type="text/babel">`.

## Para integrarlo en IntelliJ

- Arrastra la carpeta `export/` completa al árbol del proyecto.
- En IntelliJ: clic derecho sobre `Vetrina App.html` → **Open in Browser**
  (o usa el botón Chrome/Edge en la esquina superior derecha del editor).
- Si quieres servirlo con un servidor local: clic derecho → **Run** o usa el
  Built-in HTTP Server de IntelliJ Ultimate.

## Estructura

```
export/
├── Vetrina App.html           ← entry point único
└── vetrina/
    ├── tokens.css             ← variables CSS (espejo de tokens.css de Vue)
    ├── states.css             ← estados hover/active globales
    ├── historia.css           ← Historia Clínica
    ├── consulta.css           ← Consulta Nueva (wizard + modales)
    ├── empleados.css          ← Empleados
    ├── acciones.css           ← 6 vistas de Acciones
    ├── roles.css              ← Roles y permisos
    ├── polish.css             ← refinamientos cross-feature
    ├── icons.jsx              ← set Lucide-style inline SVG
    ├── data.jsx               ← mock del usuario y consultas recientes
    ├── data-historia.jsx      ← mock dueños/mascotas/eventos clínicos
    ├── data-employees.jsx     ← mock empleados + roles catalog
    ├── data-acciones.jsx      ← mock registros por tipo de acción
    ├── data-roles.jsx         ← mock módulos / sub-módulos / permisos
    ├── router.jsx             ← hash router con 18 rutas
    ├── shell.jsx              ← AppLayout + Sidebar + Topbar
    ├── toast.jsx              ← sistema global de notificaciones
    ├── historia-core.jsx      ← Historia Clínica: store, modal, breadcrumb
    ├── historia-details.jsx   ← 8 vistas de detalle de evento
    ├── screens-home.jsx       ← Home dashboard
    ├── screens-auth.jsx       ← Login + Signup
    ├── screens-historia.jsx   ← 3 pasos de Historia
    ├── consulta-store.jsx     ← draft store + catálogos
    ├── consulta-ui.jsx        ← Base inputs / fields / section card
    ├── consulta-pieces.jsx    ← OwnerForm, PetForm, PetCard, QuickActions
    ├── consulta-pasos.jsx     ← 4 pasos del wizard
    ├── consulta-modals.jsx    ← 7 modales de acciones rápidas
    ├── screens-consulta.jsx   ← NuevaView + ConsultaGuardada + dialogs
    ├── screens-empleados.jsx  ← Empleados completo
    ├── screens-acciones.jsx   ← 6 list views + 6 form modales
    ├── screens-roles.jsx      ← Roles + EditPermissionsModal
    ├── screens-placeholders.jsx ← rutas no implementadas (placeholders)
    └── app.jsx                ← mount + router dispatch
```

## Rutas navegables

Todas las rutas del `router/index.ts` de tu Vue funcionan vía hash:

| Ruta Vue | Hash en este HTML | Estado |
|---|---|---|
| `/` (login) | `#/` | ✓ |
| `/signup` | `#/signup` | ✓ |
| `/dashboard` (Home) | `#/dashboard` | ✓ |
| `/dashboard/consulta/nueva` | `#/dashboard/consulta/nueva` | ✓ wizard 4 pasos |
| `/dashboard/consulta/historial` | `#/dashboard/consulta/historial` | ✓ |
| `/dashboard/empleados` | `#/dashboard/empleados` | ✓ |
| `/dashboard/roles` | `#/dashboard/roles` | ✓ |
| `/dashboard/acciones/laboratorio` | `#/dashboard/acciones/laboratorio` | ✓ |
| `/dashboard/acciones/imagen` | `#/dashboard/acciones/imagen` | ✓ |
| `/dashboard/acciones/vacunacion` | `#/dashboard/acciones/vacunacion` | ✓ |
| `/dashboard/acciones/hospitalizacion` | `#/dashboard/acciones/hospitalizacion` | ✓ |
| `/dashboard/acciones/desparasitacion` | `#/dashboard/acciones/desparasitacion` | ✓ |
| `/dashboard/acciones/cirugia` | `#/dashboard/acciones/cirugia` | ✓ |

## Limitaciones

- **Sin backend**: todos los datos son mocks en memoria. CRUD funciona durante
  la sesión pero se reinicia al refrescar.
- **Sin auth real**: login acepta cualquier credencial y navega a Home.
- **Rutas `consulta-vacunacion` / `consulta-hospital`** muestran placeholders
  (puedes pedirme que los implemente cuando los necesites).

## Cambios respecto al original

El prototipo es fiel al código Vue pero:

- React (Babel inline) en lugar de Vue 3 con build.
- Vuetify components recreados con CSS puro + tokens Amatista (no se importa Vuetify).
- Las llamadas API se reemplazan por mocks con `setTimeout` para simular latencia.
- Toast system añadido en los puntos de guardado (no estaba en Vue original).
