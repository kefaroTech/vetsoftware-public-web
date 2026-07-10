# Handoff completo — VetSoftware (implementación en Vue.js)

> Paquete de handoff para implementar **todo el proyecto VetSoftware** en un codebase real usando **Vue 3 + Vuetify 3**. Documenta la superficie completa: página de inicio, flujo de registro (3 pantallas + estado en login), login, y el panel administrativo (dashboard, empleados, configuración).

---

## 1. Overview

VetSoftware es un **SaaS veterinario colombiano**. Este paquete cubre dos zonas:

1. **Zona pública / autenticación** (sin sesión): Inicio → Registro (auto-registro de empresa) → Verificación de correo → Login.
2. **Panel administrativo** (con sesión, super-admin): Dashboard, Empresas, Empleados, Membresías, Módulos, Permisos, Roles, Configuración.

Idioma: **español (Colombia)**. Moneda: **COP**. Es una app **operativa**, no de marketing.

### Entregables de esta iteración (lo más reciente y prioritario)
- **Inicio.html** — landing de decisión (registrarse / iniciar sesión), sobria e interactiva.
- **Registro.html** — flujo de registro estricto (Opción B, sin auto-login): Formulario → "Revisa tu correo" → Verificación (3 estados).
- **Login.html** — login + variante de alerta "cuenta no verificada".

El panel administrativo (**VetSoftware.html**) ya estaba documentado; ver también los handoffs hermanos `design_handoff_dashboard_equilibrada/` y `design_handoff_login_centered/`.

---

## 2. About the Design Files

Los archivos en `reference/` son **referencias de diseño hechas en HTML + React (Babel inline)** — prototipos que muestran aspecto y comportamiento finales, **no código de producción para copiar tal cual**.

La tarea es **recrear estos diseños en Vue 3** (Composition API con `<script setup>`) usando **Vuetify 3** como librería base + CSS/tokens propios donde Vuetify no alcance el look exacto. Respeta pixel a pixel los specs de abajo. Los datos y llamadas de red de los prototipos son **mock**; sustitúyelos por los endpoints reales indicados.

### Cómo previsualizar
Abre cualquier `reference/*.html` en un navegador (requiere internet para los CDNs de fuentes/React). Puntos de entrada:
- `reference/Inicio.html` — landing
- `reference/Registro.html` — flujo de registro (agrega `#verify` a la URL para entrar directo a la pantalla de verificación)
- `reference/Login.html` — login (prueba un correo que contenga `pendiente` para ver el estado "no verificada")
- `reference/VetSoftware.html` — panel administrativo completo (login demo con cualquier credencial)

---

## 3. Fidelity

**Alta fidelidad (hi-fi).** Colores, tipografías, espaciados, radios, sombras e interacciones están definidos. Implementa exacto usando los tokens de la sección 9.

---

## 4. Stack objetivo y arquitectura sugerida (Vue)

| Aspecto | Recomendación |
|---|---|
| Framework | **Vue 3** (Composition API, `<script setup>`) |
| Build | Vite |
| UI kit | **Vuetify 3** (el spec original lo pide) |
| Ruteo | **Vue Router 4** |
| Estado | **Pinia** (un store por dominio: `auth`, `employees`, `config`) |
| HTTP | `axios` o `fetch` envuelto en un cliente |
| Fuentes | Google Fonts: Inter, Instrument Serif, JetBrains Mono |
| Iconos | Ver §10 (mapear a `@mdi/js` / `mdi` — Vuetify ya trae MDI) |

### Estructura de carpetas sugerida
```
src/
├── main.js
├── router/index.js
├── stores/
│   ├── auth.js            # sesión, login, estado no-verificado
│   ├── employees.js       # lista + cambio de rol
│   └── config.js          # UVT (persistir en localStorage)
├── layouts/
│   ├── PublicLayout.vue   # fondo amatista + blobs + topbar + footer
│   └── AdminLayout.vue    # sidebar + topbar + <router-view>
├── views/
│   ├── public/
│   │   ├── LandingView.vue        # Inicio
│   │   ├── RegisterView.vue       # Pantalla 1
│   │   ├── CheckEmailView.vue     # Pantalla 2
│   │   ├── VerifyEmailView.vue    # Pantalla 3
│   │   └── LoginView.vue
│   └── admin/
│       ├── DashboardView.vue
│       ├── EmpleadosView.vue
│       ├── ConfiguracionView.vue
│       └── PlaceholderView.vue    # módulos en construcción
├── components/
│   ├── AppButton.vue      # botón primario gradiente
│   ├── FieldText.vue      # input con label/hint/error/contador/ícono
│   ├── FieldSelect.vue    # select con estado loading
│   ├── FieldPassword.vue  # con mostrar/ocultar
│   ├── AlertBanner.vue    # banner error/warning cerrable
│   ├── Recaptcha.vue      # widget reCAPTCHA (real en prod)
│   └── ...
└── styles/tokens.css      # variables CSS (§9)
```

### Rutas
```
/                     → LandingView          (PublicLayout)
/registro             → RegisterView         (PublicLayout)
/registro/revisar     → CheckEmailView       (PublicLayout)  # o estado interno
/verify-email?token=  → VerifyEmailView      (PublicLayout)
/login                → LoginView            (PublicLayout)
/dashboard            → DashboardView        (AdminLayout, requiere auth)
/empresas /empleados /membresias /modulos /permisos /roles /configuracion  (AdminLayout, auth)
```
Guard de navegación: rutas admin requieren sesión; si no hay token → redirigir a `/login`.

---

## 5. Zona pública — layout compartido (`PublicLayout.vue`)

Las 5 vistas públicas comparten el mismo marco vertical de 3 zonas, full-viewport:

```
┌───────────────────────────────────────────────┐
│ TOPBAR  logo VetSoftware   ·   link contextual  │
├───────────────────────────────────────────────┤
│                                               │
│              CONTENIDO (centrado)             │
│                                               │
├───────────────────────────────────────────────┤
│ FOOTER  © 2026 VetSoftware · Colombia   ·  …   │
└───────────────────────────────────────────────┘
```

- **Fondo del viewport**: `radial-gradient(ellipse at top, #f3e8ff 0%, #f5f1fa 50%, #ede8f4 100%)`
- **Blobs decorativos** (absolute, `pointer-events:none`, contenedor con `overflow:hidden`):
  - Top-right: `500×500`, `top:-160 right:-140`, `radial-gradient(circle, rgba(192,132,252,.24), transparent 60%)`
  - Bottom-left: `460×460`, `bottom:-160 left:-140`, `radial-gradient(circle, rgba(168,85,247,.16), transparent 62%)`
- **Topbar**: padding `22px 40px`, flex space-between.
  - Brand: cuadrado `30×30` radius `8`, `linear-gradient(135deg,#a855f7,#581c87)`, ícono pata blanco (`IconPaw` 16px), sombra `0 2px 6px -1px rgba(126,34,206,.4)` + wordmark "VetSoftware" (Inter 700 14px, `letter-spacing:-.01em`). Enlaza a `/`.
  - Link derecho contextual (varía por pantalla): Inter 13px `#6b5b80`, ancla amatista `#7e22ce` 600.
- **Footer**: padding `16-20px 40px`, Inter 12px `#8578a0`. Izq: "© 2026 VetSoftware · Colombia". Der: link "Volver al inicio" (con flecha izquierda) o links legales.

---

## 6. PÁGINA DE INICIO (LandingView) — `reference/Inicio.html`, `landing.jsx`

### Propósito
Punto de entrada. El visitante decide **crear cuenta** o **iniciar sesión**.

### Layout
Contenido centrado (flex column, align/justify center), `text-align:center`, ancho de las tarjetas `max-width:720px`.

Orden vertical:
1. **Eyebrow pill**: pill `padding:6px 13px`, radius `999`, `background:rgba(255,255,255,.7)`, borde `1px solid #ecd9fb`, Inter 600 12px `#7e22ce` uppercase `letter-spacing:.04em`, ícono `IconSparkle` 13px. Texto: "Plataforma de gestión veterinaria".
2. **H1**: Instrument Serif 400, `clamp(38px,5.4vw,64px)`, `line-height:1.12`, `letter-spacing:-.02em`, `text-wrap:balance`, `max-width:820`. Texto: "Todo tu centro veterinario," + salto + "en un solo panel." (segunda línea en *itálica* color `#7e22ce`).
3. **Subtítulo**: Inter 16px `#6b5b80`, `line-height:1.55`, `max-width:500`. "Administra clínicas, empleados, membresías y permisos desde una sola plataforma clara y segura. Comienza en segundos."
4. **Dos tarjetas de decisión** (grid 2 col, gap `18`, `max-width:720`, apila en móvil):
   - **Crear cuenta** (primaria, destacada) → `/registro`. Fondo `linear-gradient(160deg,#9333ea,#7e22ce 70%,#6b1fa8)`, texto blanco. Kicker "NUEVO AQUÍ", título "Crear cuenta", desc "Registra tu centro y empieza a operar hoy mismo.", CTA "Registrarme →". Ícono `IconSparkle` en chip `rgba(255,255,255,.16)`.
   - **Iniciar sesión** (secundaria, blanca) → `/login`. Fondo `#fff`, borde `1px solid #ece5f4`. Kicker "YA TENGO CUENTA", título "Iniciar sesión", desc "Accede a tu panel administrativo de siempre.", CTA "Entrar →". Ícono `IconShieldCheck` en chip `linear-gradient(135deg,#f3e8ff,#e9d5ff)`.
5. **Fila de confianza**: 3 items inline (gap `24`), Inter 12.5px `#8578a0`, íconos 15px amatista `#a855f7`: "Multiclínica" (`IconBuilding`), "Gestión de equipo" (`IconUsers`), "Datos cifrados" (`IconShieldCheck`).

### Interacciones (clave para el "muy interactivo")
- **Glow que sigue el cursor**: capa absolute con `radial-gradient(560px circle at Xpos% Ypos%, rgba(168,85,247,.18), transparent 62%)` donde X/Y derivan de la posición del mouse sobre el stage (`x=50+(px-.5)*40`, `y=30+(py-.5)*30`), `transition: background .18s`.
- **Blobs a la deriva**: animación CSS `drift` 18s ease-in-out infinite (translate + scale suave), con `animation-delay` distinto por blob (0s, -7s, -3.5s).
- **Grid sutil de fondo**: dos linear-gradients `1px` a `rgba(126,34,206,.045)`, `background-size:56px 56px`, enmascarado con `radial-gradient(ellipse at center,#000 30%,transparent 78%)` (mask-image).
- **Tarjetas hover**: `translateY(-4px)` + sombra expandida + flecha del CTA `translateX(4px)`; la tarjeta primaria además escala su glow interno. `transition .2s cubic-bezier(.2,.8,.2,1)`.
- **Entradas escalonadas**: clase `.reveal` (keyframes `reveal`: opacity 0→1 + translateY 14→0, `.7s`), con `animation-delay` incremental (.05s, .12s, .19s, .28s, .38s).
- **Accesibilidad**: todo se desactiva bajo `@media (prefers-reduced-motion: reduce)`.

En Vue: implementa el glow con un `mousemove` sobre el contenedor y estilos reactivos; blobs/reveal/grid como CSS puro.

---

## 7. FLUJO DE REGISTRO — `reference/Registro.html` + `reg-fields.jsx` / `reg-form.jsx` / `reg-flow.jsx`

> **Regla de oro (Opción B):** al enviar el registro **NO hay auto-login**. El backend responde `{ companyId, employeeId, email, status: "PENDING_VERIFICATION" }` (sin token). Tras éxito se **reemplaza el formulario por la Pantalla 2** (no navegar al dashboard).

Máquina de estados del flujo: `form → check → verify`. En Vue puede ser rutas separadas o un estado en `RegisterView`; se recomienda rutas (`/registro`, `/registro/revisar`, `/verify-email`) pasando el email por store/query.

### 7.1 PANTALLA 1 — Formulario de registro (`RegisterForm`)

**Contenedor**: card `max-width:720px`, `#fff`, radius `16`, borde `1px solid #ece5f4`, sombra `0 24px 48px -18px rgba(91,33,182,.18), 0 4px 12px -4px rgba(91,33,182,.07)`, padding `clamp(24px,4vw,40px)`. La card scrollea verticalmente si excede el alto.

**Encabezado**: eyebrow "VETSOFTWARE" (Inter 600 11px `#7e22ce` uppercase `.1em`), H1 "Crear cuenta" (Instrument Serif 400 30px `-.02em`), subtítulo "Registra tu empresa y tu primer usuario administrador." (Inter 13.5px `#6b5b80`).

**Banner global de error** (cerrable) aparece bajo el encabezado cuando hay error global o de validación general.

#### Sección "Empresa" (encabezado con ícono `IconBuilding` en chip amatista + título + desc "Datos fiscales y ubicación del centro veterinario.")

| # | Campo | Control | Requerido | Reglas / detalle |
|---|---|---|---|---|
| 1 | **Tipo de documento** | Select | Sí | Opciones: `NIT (31)` *(default)*, `Cédula de ciudadanía (13)`, `Cédula de extranjería (22)`, `Pasaporte (41)`. El value es el código (`31`/`13`/`22`/`41`). |
| 2 | **Número de documento** | Texto | Sí | `maxlength 20` + contador `n/20`. Si tipo=NIT(31) → `^\d{5,15}$` ("Para NIT debe ser numérico, 5 a 15 dígitos."). Si no → `^[a-zA-Z0-9]{4,20}$` ("Alfanumérico, 4 a 20 caracteres."). **Hint dinámico**: NIT → "El dígito de verificación se calcula automáticamente."; otros → "Debe ser único en todo el sistema." Ícono `IconFileText`. |
| 3 | **Razón social** | Texto | Sí | `maxlength 100` + contador. Ícono `IconBuilding`. |
| 4 | **Régimen tributario** | Select | Sí | Opciones: "Responsable de IVA", "No responsable de IVA". Placeholder "Selecciona…". |
| 5 | **Correo fiscal** | Email | Sí | `maxlength 255`. Hint: "Correo donde llegan las facturas y documentos electrónicos." Ícono `IconReceipt`. |
| 6 | **Dirección** | Texto | No | `maxlength 200`. Hint "Opcional". Ícono `IconMapPin`. |
| 7 | **Teléfono de contacto** | Texto (tel) | No | `maxlength 30`. Si se llena valida `^[+\d][\d\s\-()]{6,29}$` ("Teléfono no válido (7–15 dígitos)."). Ícono `IconPhone`. |
| 8 | **País** | Select | Sí | Se "carga del backend". Al cambiar → **resetea Departamento y Ciudad** y recarga departamentos (spinner). |
| 9 | **Departamento** | Select | Sí | Deshabilitado hasta elegir país. Al cambiar → resetea Ciudad y recarga ciudades (spinner). |
| 10 | **Ciudad** | Select | Sí | Deshabilitado hasta elegir departamento. **Es el único de la cascada que se envía al backend (`cityId`).** |

**Cascada País→Depto→Ciudad**: dependiente con **estado de carga** (spinner dentro del select mientras trae datos, ~650ms en el mock). Datos de referencia en `reg-fields.jsx` (`GEO`); en prod vienen de endpoints (`GET /countries`, `GET /countries/:id/departments`, `GET /departments/:id/cities`).

**Layout de la sección** (grid, responsive — ver §11):
- Fila: `[Tipo de documento | Número de documento]` (2 col)
- Fila: `Razón social` (1 col ancho completo)
- Fila: `[Régimen tributario | Correo fiscal]` (2 col)
- Fila: `[Dirección | Teléfono]` (2 col)
- Fila: `[País | Departamento | Ciudad]` (3 col)

Divisor `1px #f0eaf7` entre secciones (margin `28px 0`).

#### Sección "Usuario administrador" (encabezado con ícono `IconUserPlus` + desc "La persona que gestionará la cuenta.")

| Campo | Control | Requerido | Reglas |
|---|---|---|---|
| **Nombre completo** | Texto | Sí | `maxlength 100` + contador. Ícono `IconUsers`. |
| **Email** | Email | Sí | `maxlength 100`. Hint "A este correo llega el enlace de verificación." Ícono `IconMail`. |
| **Contraseña** | Password | Sí | `min 8, max 100`. Mostrar/ocultar (`IconEye`/`IconEyeOff`). Hint "Mínimo 8 caracteres." |

Layout: `Nombre completo` (ancho completo), luego `[Email | Contraseña]` (2 col).

#### reCAPTCHA
- Widget **reCAPTCHA v2** (checkbox "No soy un robot") **centrado**, antes del botón. Obligatorio. En prod usar reCAPTCHA real; el mock muestra spinner ~900ms al marcar.
- Estado de error si no se completa: texto rojo bajo el widget "Completa la verificación para continuar."
- **Estado si el widget no carga**: banner tipo *warning* — "No se pudo cargar el reCAPTCHA. Verifica tu conexión y recarga la página." (usar `AlertBanner tone="warning"`).

#### Botón + validación
- **Botón primario** ancho completo "Crear cuenta" (con ícono flecha). Estado *loading*: fondo `#a78bce`, texto "Creando cuenta…" + spinner, `cursor:wait`, deshabilitado.
- **Validación reactiva por campo**: borde rojo `#dc2626` + mensaje bajo el campo (Inter 11.5px rojo con ícono `IconAlertCircle`) al **perder foco** y al **intentar enviar**. Requeridos muestran `*` (rojo) en el label. Focus-ring de error: `0 0 0 3px rgba(220,38,38,.10)`.
- **Banner global superior** (rojo, cerrable) para errores globales, p. ej.:
  - "Revisa los campos marcados en rojo antes de continuar." (validación local)
  - "El número de documento ya está en uso." (demo: probar con `900000000`)
  - "No pudimos verificar el captcha. Inténtalo de nuevo."
  - "Demasiados intentos, inténtalo más tarde." (rate limit)
- Al enviar con errores, hacer scroll al top de la card.
- Pie: "¿Ya tienes cuenta? **Inicia sesión**" → `/login`.

#### Comportamiento al enviar
```
POST /register
body: { docType, docNumber, razonSocial, taxRegime, fiscalEmail, address?, phone?, cityId, adminName, adminEmail, password, recaptchaToken }
→ 200: { companyId, employeeId, email, status: "PENDING_VERIFICATION" }   # SIN token, SIN login
   ⇒ ir a Pantalla 2, pasando `email`.
→ 409: documento en uso            ⇒ error en campo docNumber + banner global
→ 400: captcha inválido            ⇒ banner global
→ 429: rate limit                  ⇒ banner global
```

### 7.2 PANTALLA 2 — "Revisa tu correo" (`CheckEmailScreen`)

Card centrada más angosta (`max-width:560px`), centrada verticalmente:
- **Ícono** grande mail-check (`IconMailCheck` 36px) en cuadro `74×74` radius `18`, `linear-gradient(135deg,#f3e8ff,#e9d5ff)`, borde `#ecd9fb`, color `#7e22ce`.
- **Título** "Revisa tu correo" (Instrument Serif 400 30px).
- **Texto**: "Te enviamos un enlace de verificación a **{email}**. Ábrelo para activar tu cuenta; después podrás iniciar sesión." (Inter 14.5px `#4a3d63`, el email en `#1a1325` bold).
- **Texto secundario**: "¿No lo ves? Revisa la carpeta de spam. El enlace vence en unas horas." (Inter 12.5px `#8578a0`).
- **Botón primario** ancho completo "Ir a iniciar sesión" → `/login`.
- **Link texto** "Reenviar correo" (con `IconRefresh`); al pulsarlo muestra confirmación "Correo reenviado" con check. `POST /register/resend-verification`.
- *(En el prototipo hay además un link demo "Simular clic en el enlace del correo" que salta a la Pantalla 3; en prod ese salto lo hace el usuario desde su email.)*

### 7.3 PANTALLA 3 — Verificación de correo (`VerifyEmailScreen`, ruta `/verify-email?token=…`)

Es la pantalla a la que llega el usuario desde el enlace del email. Card centrada `max-width:520px`, **3 estados**:

1. **Verificando** (inicial): spinner grande (`46×46`, borde `4px #e9d5ff`, top amatista), título "Verificando tu cuenta…", texto "Un momento, estamos confirmando tu correo." Al montar: `GET /verify-email?token=…`, luego transiciona a éxito/error.
2. **Éxito**: ícono `IconCheckCircle` 40px verde `#16a34a` en círculo `#ecfdf3` borde `#bbf7d0`; título "¡Cuenta verificada!"; texto "Tu correo quedó confirmado. Ya puedes iniciar sesión."; botón primario "Iniciar sesión" → `/login`.
3. **Error** (token inválido/expirado/ya usado): ícono `IconAlertCircle` 40px rojo `#dc2626` en círculo `#fef2f2` borde `#fecaca`; título "No pudimos verificar"; texto "El enlace de verificación no es válido o expiró."; botón primario "Volver a registrarme" → `/registro` + link texto "Ir a iniciar sesión" → `/login`.

*(El prototipo incluye toggles "Vista previa: Verificando / Éxito / Error" para revisar los 3 estados; NO llevar a producción.)*

### 7.4 Estado extra en LOGIN — cuenta no verificada
En `LoginView`, si un usuario **no verificado** intenta iniciar sesión, mostrar un **banner de error específico** (no el genérico), arriba del formulario:
- Estilo: `background:#fef2f2`, borde `1px solid #fecaca`, texto `#b91c1c`, radius `10`, ícono `IconAlertCircle`, cerrable (`IconX`).
- Texto: "Tu cuenta aún no está verificada. Abre el enlace que te enviamos por correo para activarla." + enlace "Reenviar enlace".
- Disparador real: respuesta `403 { code: "EMAIL_NOT_VERIFIED" }` del login. (En el prototipo se dispara si el correo contiene "pendiente".)

---

## 8. LOGIN (`LoginView`) — `reference/Login.html`, `login-centered.jsx`

Card centrada `max-width:440px`, `#fff`, radius `16`, borde `#ece5f4`, padding `40px 44px`, misma sombra que las demás cards.
- Eyebrow "PANEL ADMINISTRATIVO", H1 "Inicia sesión" (Instrument Serif 30-34px), subtítulo "Accede al panel para administrar VetSoftware."
- Banner "cuenta no verificada" (§7.4) cuando aplique.
- Campos: **Correo electrónico** (`IconMail`) y **Contraseña** (`IconLock`), con label 12px `#3d2e57`, caja input padding `10px 12px` radius `8`, borde `#ece5f4`→`#a855f7` en foco, focus-ring `0 0 0 4px rgba(168,85,247,.12)`.
- Botón primario "Iniciar sesión" (flecha).
- **Divisor "o"** + botón secundario **"Crear una cuenta nueva"** (borde `#ece5f4`, hover fondo `#faf6ff` borde `#d6c8ea`, ícono `IconSparkle`) → `/registro`.
- Link superior derecho: "¿Eres nuevo? **Crea una cuenta**" → `/registro`.
- Detalle completo (validación, API) en `design_handoff_login_centered/README.md`.

---

## 9. PANEL ADMINISTRATIVO — `reference/VetSoftware.html` + `app-*.jsx`

Layout con sesión: **grid `244px 1fr`** = sidebar + área de vista. Fondo `#fbfaff`.

### 9.1 Sidebar (`AppSidebar` → `AdminLayout.vue`)
`#fff`, borde derecho `#ece5f4`, padding `20px 16px`, flex column.
- **Brand** arriba (logo pata + "VetSoftware" / "Panel administrativo"), separado por borde inferior. Click → dashboard.
- **Navegación agrupada** (`NAV`), grupos: *General* (Dashboard `IconGrid`, Empresas `IconBuilding` `128`, Empleados `IconUsers` `1.8k`), *Suscripciones* (Membresías `IconTicket` `6`), *Configuración* (Módulos `IconModule` `14`, Permisos base `IconKey` `38`, Roles base `IconShield` `9`), *Sistema* (Configuración `IconSettings`).
  - Título de grupo: Inter 600 10px `#a89bbd` uppercase `.1em`.
  - Item: padding `7px 12px`, radius `7`, Inter 13px. **Activo**: fondo `#f3e8ff`, texto `#1a1325` 600, barra lateral amatista `#7e22ce` 2px a la izquierda. Hover inactivo: fondo `#faf5ff`. `count` en JetBrains Mono 10px a la derecha.
- **Tarjeta de usuario** abajo (avatar "AD", "Admin / Super administrador", botón logout `IconLogout`).

### 9.2 Topbar de contenido (`AppTopBar`)
padding `16px 32px`, borde inferior `#ece5f4`, `#fff`. Buscador pill `#f5f1fa` (ícono `IconSearch`, placeholder, atajo `⌘K` en mono). Botón campana `IconBell` con punto amatista de notificación. Slot derecho para acciones (p. ej. botón "Invitar empleado").

### 9.3 Dashboard
Documentado en detalle en `design_handoff_dashboard_equilibrada/README.md`. (KPIs, actividad, etc.)

### 9.4 Empleados (`EmpleadosView`) — master-detail
- Topbar con botón oscuro "Invitar empleado" (`#1a1325`, `IconPlus`).
- `PageHeader` (eyebrow "Panel administrativo", título "Empleados", count "N registros").
- **Grid `380px 1fr`**, gap `16`, ambos paneles card `#fff` borde `#ece5f4` radius `12`:
  - **Lista (master)**: buscador arriba; filas con `Avatar` (initials + status), nombre (13px 600), código (mono 10px `#a89bbd`), rol. Fila seleccionada: fondo `#faf5ff` + barra amatista izquierda. Hover: `#fbfaff`.
  - **Detalle**: código (mono `#7e22ce`), botones "Editar datos" / "Desactivar" (borde rojo `#fecaca`). Cabecera con `Avatar 72`, nombre (Instrument Serif 30px), email, `StatusPill` + `RolePill`. Grid `1fr 1fr` de metadatos (Código, Empresa, Correo, Estado, Ingreso, Última actividad; algunos en mono). Sección **Rol asignado**: vista con card gradiente `#faf5ff→#f3e8ff` + desc del rol; modo edición → grid `1fr 1fr` de opciones de rol con radio, al elegir dispara `changeRole` + toast.

### 9.5 Configuración (`ConfigView`) — editor de UVT
- `PageHeader` (eyebrow "Sistema", título "Configuración") + **tabs** (Facturación electrónica `IconReceipt`, General, Seguridad) con subrayado amatista en el activo.
- Tab **Facturación** = `UvtEditor`, grid `1.3fr 1fr`:
  - **Card principal**: cabecera (ícono `IconReceipt`, "Valor UVT — {año}", pill "Vigente" verde). Valor grande en Instrument Serif 56px + "COP / UVT" (mono). Metadatos "Vigencia desde" / "Última actualización". Botón "Modificar valor" (gradiente).
    - **Modo edición**: input grande (Instrument Serif 40px con "$" prefijo), formatea miles `es-CO`, valida `>= 1000` COP ("Ingresa un valor válido en pesos (COP)."), Enter guarda / Esc cancela. Guarda vía store + **persiste en localStorage** (`vetsoftware_uvt`) + toast "UVT {año} actualizada a {valor}".
    - **Histórico** de vigencias (años anteriores, solo lectura).
  - **Lateral**: card oscura `linear-gradient(135deg,#581c87,#3b0764)` explicando qué es la UVT + card "Importante".

### 9.6 Estado / store del panel (mapear a Pinia)
De `app-store.jsx`:
- `auth`: `authed`, `login()`, `logout()`.
- navegación: `view` (con Vue Router esto es la ruta).
- `employees`: lista + `changeRole(code, role)`.
- `config`: `uvt` (`{ currentYear, byYear:{ [year]:{ value, vigencia, updatedAt, editable } } }`), `saveUvt(year, value)` → persiste en `localStorage['vetsoftware_uvt']`.
- `toast`: `showToast(msg, kind)` — toast global abajo-centro (`#1a1325`, check verde, auto-oculta ~3.2s).
- Helpers: `formatCOP` (`$` + `toLocaleString('es-CO')`), `formatDate` (`es-CO`, "día mes año").
- Módulos aún no construidos (Empresas, Membresías, Módulos, Permisos, Roles) usan `PlaceholderView` (ícono en cuadro `#f3e8ff`, título serif, desc, pill "Módulo en construcción").

---

## 10. Design Tokens

### Colores (paleta amatista + neutros cálidos)
| Token | Hex | Uso |
|---|---|---|
| amatista-300 | `#d8b4fe` | bordes/acentos sutiles |
| amatista-400 | `#c084fc` | puntos/acento |
| amatista-500 | `#a855f7` | foco, gradientes, íconos acento |
| amatista-600 | `#9333ea` | gradiente botón (top) |
| amatista-700 | `#7e22ce` | **primario**: eyebrows, links, gradiente botón (bottom), activos |
| amatista-800 | `#6b1fa8` | hover de links / gradiente |
| amatista-900 | `#581c87` | logo/gradientes oscuros |
| amatista-950 | `#3b0764` | card oscura config |
| purple-50 | `#faf5ff` / `#f3e8ff` / `#e9d5ff` | fondos suaves, chips, hovers |
| ink-900 | `#1a1325` | texto principal, botón oscuro |
| ink-700 | `#3d2e57` | labels |
| ink-600 | `#4a3d63` | texto de párrafos |
| ink-500 | `#6b5b80` | texto secundario |
| ink-400 | `#8578a0` | footer, hints |
| ink-300 | `#a89bbd` / `#a08bbd` | íconos normales, placeholders |
| line | `#ece5f4` | borde por defecto |
| line-2 | `#f0eaf7` / `#f3eef9` | divisores suaves |
| surface | `#ffffff` | cards, inputs |
| paper | `#f5f1fa` / `#fbfaff` | fondos de app |
| Fondo público | `radial-gradient(ellipse at top,#f3e8ff 0%,#f5f1fa 50%,#ede8f4 100%)` | viewport auth |
| **Semántico — error** | texto `#dc2626`/`#b91c1c`, bg `#fef2f2`, borde `#fecaca` | validación, banners |
| **Semántico — éxito** | `#16a34a`/`#166534`, bg `#ecfdf3`/`#dcfce7`, borde `#bbf7d0` | verificado, "Vigente" |
| **Semántico — warning** | texto `#92600a`, bg `#fffbeb`, borde `#fde68a` | reCAPTCHA no carga |

### Tipografía (Google Fonts)
- **Inter** (400/500/600/700) — UI general y cuerpo (14px base).
- **Instrument Serif** (400, normal + italic) — títulos display (H1, valores grandes).
- **JetBrains Mono** (400/500) — códigos, cifras, atajos, contadores.

| Uso | Familia | Tamaño | Weight | Otros |
|---|---|---|---|---|
| H1 display | Instrument Serif | 30–34px (landing `clamp(38,5.4vw,64)`) | 400 | `-.02em`, lh 1.05–1.12 |
| Valor UVT | Instrument Serif | 56px | 400 | `-.02em` |
| Eyebrow | Inter | 11px | 600 | `.1em` uppercase |
| Título sección | Inter | 14.5px | 700 | `-.01em` |
| Label | Inter | 12px | 600 | `.01em` |
| Body / input | Inter | 13–16px | 400 | lh 1.5 |
| Error/hint | Inter | 11.5px | 400 | — |
| Código/cifra | JetBrains Mono | 10–13px | 400/500 | — |

### Spacing (px)
`4 · 6 · 8 · 10 · 12 · 14 · 15 · 16 · 18 · 20 · 22 · 24 · 26 · 28 · 32 · 40 · 44`

### Border-radius
`5px` (recaptcha) · `7px` (nav item) · `8px` (inputs/chips) · `9px` (botones) · `10–11px` (banners/chips icono) · `12–14px` (cards internas) · `16px` (cards principales) · `999px` (pills)

### Sombras
- Card principal: `0 24px 48px -18px rgba(91,33,182,.18), 0 4px 12px -4px rgba(91,33,182,.07)`
- Logo: `0 2px 6px -1px rgba(126,34,206,.4)`
- Botón primario: normal `0 4px 12px -2px rgba(126,34,206,.4), inset 0 1px 0 rgba(255,255,255,.15)`; hover `0 8px 20px -4px rgba(126,34,206,.5), inset 0 1px 0 rgba(255,255,255,.15)`
- Toast: `0 12px 32px -8px rgba(26,19,37,.5)`
- Focus-ring amatista (inputs auth): `0 0 0 4px rgba(168,85,247,.12)`; en formularios de registro: `0 0 0 3px rgba(168,85,247,.14)`; error: `0 0 0 3px rgba(220,38,38,.10)`

### Gradientes recurrentes
- Botón primario: `linear-gradient(180deg,#9333ea,#7e22ce)`
- Logo / tarjeta primaria landing: `linear-gradient(135deg,#a855f7,#581c87)` / `linear-gradient(160deg,#9333ea,#7e22ce 70%,#6b1fa8)`
- Chip ícono suave: `linear-gradient(135deg,#f3e8ff,#e9d5ff)`

---

## 11. Responsividad y accesibilidad

- **Móvil (≤720px)**: los grids `2 col` y `3 col` del registro pasan a **1 columna** (`.reg-grid-2`, `.reg-grid-3` → `grid-template-columns:1fr`). Padding de cards reducido (usan `clamp`). Landing: tarjetas apilan.
- **Escritorio**: pares en 2 columnas; cascada país/depto/ciudad en 3 columnas.
- Cada input con `<label>` asociado (`for`/`id`); orden de tabulación lógico; foco visible (focus-ring amatista); mensajes de error con `role="alert"` / `aria-live`; `aria-invalid` en campos inválidos; iconos decorativos `aria-hidden`.
- Contraste AA (amatista-700 sobre blanco cumple).
- Botones con estados `loading`/`disabled` claros.
- Respetar `prefers-reduced-motion` (desactivar drift/reveal/hover-translate; spinners con duración mayor).

---

## 12. Assets e iconos

Iconos: SVGs lineales stroke ~1.7 (ver `reference/icons.jsx`). Vuetify trae **MDI**; mapeo recomendado:

| Prototipo | MDI | Prototipo | MDI |
|---|---|---|---|
| IconPaw | `mdi-paw` | IconMailCheck | `mdi-email-check-outline` |
| IconMail | `mdi-email-outline` | IconCheckCircle | `mdi-check-circle-outline` |
| IconLock | `mdi-lock-outline` | IconAlertCircle | `mdi-alert-circle-outline` |
| IconEye / IconEyeOff | `mdi-eye-outline` / `mdi-eye-off-outline` | IconAlertTriangle | `mdi-alert-outline` |
| IconArrow | `mdi-arrow-right` | IconRefresh | `mdi-refresh` |
| IconArrowLeft | `mdi-arrow-left` | IconSparkle | `mdi-star-four-points-outline` |
| IconShieldCheck | `mdi-shield-check-outline` | IconBuilding | `mdi-office-building-outline` |
| IconUsers / IconUserPlus | `mdi-account-multiple` / `mdi-account-plus-outline` | IconFileText | `mdi-file-document-outline` |
| IconReceipt | `mdi-receipt-text-outline` | IconMapPin | `mdi-map-marker-outline` |
| IconPhone | `mdi-phone-outline` | IconSearch | `mdi-magnify` |
| IconGrid | `mdi-view-grid-outline` | IconSettings | `mdi-cog-outline` |
| IconX | `mdi-close` | IconCheck | `mdi-check` |

- **Logo**: placeholder gradiente + pata. Sustituir por el logo oficial de VetSoftware si existe.
- **Fuentes**: importar Inter, Instrument Serif, JetBrains Mono (Google Fonts) en `index.html` o vía `@fontsource`.
- **reCAPTCHA**: en producción integrar reCAPTCHA v2 real (site key + verificación backend).

---

## 13. Archivos de referencia (`reference/`)

**Públicas (auth):**
- `Inicio.html` + `landing.jsx` — página de inicio
- `Registro.html` + `reg-fields.jsx` (controles + datos GEO/catálogos) + `reg-form.jsx` (Pantalla 1) + `reg-flow.jsx` (orquestador + Pantallas 2 y 3)
- `Login.html` + `login-centered.jsx` (+ `login-split.jsx` define `FormField`)
- `icons.jsx` — set de iconos SVG (compartido por todo)

**Panel administrativo:**
- `VetSoftware.html` — app completa (entry point)
- `app-store.jsx` — estado global (→ Pinia)
- `app-shell.jsx` — sidebar, topbar, toast, placeholder
- `app-login.jsx` — login embebido en la SPA
- `app-dashboard.jsx` · `app-empleados.jsx` · `app-config.jsx` — vistas
- `emp-shared.jsx` — `empData` (mock) + `Avatar`, `StatusPill`, `RolePill`, `PageHeader`, `roleName`

**Handoffs relacionados (misma identidad visual):**
- `../design_handoff_login_centered/` — login a detalle
- `../design_handoff_dashboard_equilibrada/` — dashboard a detalle

---

## 14. Notas para el desarrollador (Vue)

1. **Vuetify + look exacto**: Vuetify da la base accesible (`v-select`, `v-text-field`, `v-btn`). Para clavar el diseño, define un **tema** con la paleta amatista y sobreescribe estilos (radius, sombras, focus-ring, gradiente del botón) con CSS scoped o utilidades. El botón primario gradiente probablemente sea un `AppButton.vue` propio en vez de `v-btn` puro.
2. **Componentes de campo reutilizables**: crea `FieldText/FieldSelect/FieldPassword` con props `label/required/hint/error/counter/icon` para no repetir la lógica de validación/estilos (equivale a `Field`+controles de `reg-fields.jsx`).
3. **Validación**: puedes usar **VeeValidate + Zod/Yup** o validación manual reactiva (como el prototipo). Reglas exactas en §7.1. Validar en blur y en submit.
4. **Cascada geográfica**: `watch` sobre país→depto→ciudad; al cambiar el padre, resetea hijos y dispara fetch con estado `loading` por select.
5. **No auto-login tras registro** (crítico): respeta el flujo de 3 pantallas y el estado `PENDING_VERIFICATION`.
6. **Persistencia UVT**: replica el guardado en `localStorage['vetsoftware_uvt']` (o mejor, backend real).
7. **Quitar del build**: toggles "Vista previa" de la Pantalla 3 y el link demo "Simular clic…" de la Pantalla 2; el disparo del banner "no verificada" por la palabra "pendiente" (usar el código de error real del backend).
8. **Seguridad**: HTTPS + POST para credenciales, rate-limiting backend, verificación de reCAPTCHA en el servidor, tokens de verificación de un solo uso con expiración.
```
