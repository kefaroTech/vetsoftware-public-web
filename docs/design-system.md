# Design system

Tres capas, todas globales, cargadas en `src/main.ts` **en este orden**:

| Archivo                      | Capa       | Qué contiene                                                             |
| ---------------------------- | ---------- | ------------------------------------------------------------------------ |
| `assets/styles/tokens.css`   | Primitivos | Sólo variables CSS: color, tipografía, espaciado, radios, sombras, z-index |
| `assets/styles/primitives.css` | Clases   | `.ds-btn`, `.ds-banner`, `.ds-card`, `.ds-empty`, `.ds-page`, rejillas    |
| `assets/styles/main.css`     | Base       | Reset, scrollbar, focus rings, overrides de Vuetify                      |
| `assets/styles/public-auth.css` | Zona pública | Tokens `--pub-*` **y** sus primitivas `.pub-*` (ver abajo)           |

## Hay DOS lenguajes visuales, no uno

La zona pública (`auth`: login, recuperar y cambiar contraseña) no usa este
sistema y **no debe usarlo**. `public-auth.css` lo dice desde su cabecera: es
Inter + paleta amatista en hex (`--pub-ame-700: #7e22ce`), frente a Geist +
paleta warm en oklch de la app. Aplicar `ds-btn` ahí cambiaría la fuente y el
color de las pantallas de acceso.

Por eso `auth` tiene su propia capa de primitivas — `.pub-card`,
`.pub-eyebrow`, `.pub-title`, `.pub-sub`, `.pub-form`, `.pub-error` — al final
de `public-auth.css`. Mismo patrón, distinto lenguaje. Las pantallas que se
salen de la norma declaran sólo la diferencia encima (login y cambiar
contraseña llevan el titular a 34px; las de recuperación alinean la tarjeta a
la izquierda).

## Por qué el prefijo `ds-`

Las clases sin prefijo (`.btn`, `.card`, `.empty`, `.page`…) **ya existen** en los
260 SFC con cuerpos distintos entre sí — `.btn` solo tiene 13 definiciones
diferentes. Publicar `.btn` como clase global sería peligroso: un componente
cuyo `.btn` scoped únicamente declara `background` heredaría de golpe el
`display:inline-flex`, el `padding` y el `gap` de la primitiva, y cambiaría de
layout sin que nadie lo tocara.

Con prefijo eso no puede pasar. `primitives.css` es **inerte** hasta que un
componente cambia su markup a `ds-*` y borra sus reglas scoped. Además, el CSS
scoped de Vue añade un atributo (`[data-v-xxx]`), así que en cualquier empate
gana lo local: la migración es incremental, auditable con `grep ds-` y
reversible archivo por archivo.

## Cómo migrar un componente

1. **Comparar antes de sustituir.** Mira la regla scoped y la primitiva
   candidata. Si difieren en algo más que 1–2px, **no la migres a la fuerza**:
   o añades un modificador al sistema (si el patrón se repite en varios
   archivos) o dejas la regla local con un comentario que diga por qué.
2. **Cambiar el markup**: `class="btn-primary"` → `class="ds-btn ds-btn--primary ds-btn--lg"`.
3. **Borrar las reglas scoped** que la primitiva ya cubre, dejando un comentario
   de una línea que diga a dónde se fueron.
4. **Sustituir valores crudos por tokens** en el resto del archivo, pero **sólo
   cuando el valor es idéntico**. `oklch(95% 0.06 25deg)` → `var(--danger-100)` sí;
   `oklch(94% 0.05 25deg)` → `var(--danger-150)` (que es 0.06) **no**.
5. **Buscar reglas huérfanas.** Es el fallo más fácil de cometer: un `@media`
   o un selector descendiente que sigue apuntando a la clase que acabas de
   quitar del markup. Compilan sin error y rompen el responsive en silencio.
   Tras migrar, siempre:

   ```bash
   grep -nE '\.(btn-ghost|btn-primary|cta|empty|banner)\b' <archivo>
   ```

   Si el `@media` afectaba a varios botones, reapúntalo a un contenedor
   concreto (`.head-actions .ds-btn`), nunca a `.ds-btn` a secas: la regla
   scoped alcanzaría a todos los botones del componente.

   Comprueba también el **breakpoint**: `.ds-detail-grid` colapsa a 560px y
   `.ds-grid-2` a 640px, que son los que ya usaba el código. Si el componente
   usaba otro, migrarlo cambia cuándo se reordena el contenido.

   Y si el elemento vive en un contenedor `flex` con `gap`, el
   `margin-bottom` de `.ds-banner` se **suma** al hueco: usa `--flush`.

6. **Verificar**: `npm run ds:audit` (ver abajo), luego
   `npm run lint && npm run stylelint && npx vue-tsc -b && npx vitest run`.

## Verificación visual (`npm run ds:audit`)

`docs/ds-audit.html` es un harness que renderiza cada patrón **dos veces**: a la
izquierda con el CSS scoped original copiado literalmente, a la derecha con las
primitivas. `scripts/ds-audit.mjs` abre esa página con Playwright y compara
~42 propiedades computadas más el rectángulo real de cada elemento, en estado
base y en hover.

```bash
npm run dev        # en otra terminal
npm run ds:audit
```

Para auditar un patrón nuevo, añade un bloque `data-pair` al harness con el CSS
original a un lado y las clases `ds-*` al otro.

Dos trampas que este harness ya tiene resueltas y conviene no re-introducir:

- **Las transiciones falsean la lectura.** `getComputedStyle` justo después de
  `hover()` devuelve el valor interpolado a mitad de los 120ms, no el final.
  Por eso el script espera antes de leer.
- **El harness debe cargar `main.css`.** Sin él no se aplica
  `button { font-family: inherit }` y las medidas salen con métricas de Arial en
  vez de Geist, inventando diferencias de ancho que no existen.

## Estado de la migración

**Migrados y verificados: `cuentas`, `tienda`, `caja`, `compras`,
`dashboard/consulta`, `agenda`, `historia-clinica`, `acciones`, `facturacion`,
`roles`, `empresa`, `employees`, `hospitalizacion`, `laboratorio`,
`medicamentos` y los componentes compartidos de `src/components/ui`.**
`auth` y `registration` van sobre la capa `.pub-*` (ver arriba).

**La migración está terminada.** No queda ni una sola regla en el proyecto que
sea equivalente exacta a una primitiva: las 232 que aún existen (1.878 líneas,
desde las 743 / 6.231 del inicio) son variantes que difieren de verdad —
tarjetas interactivas, banners con paleta propia, chips y estados vacíos con
métricas distintas. Están inventariadas abajo.

`branches` y `landing` no usan ningún patrón del sistema: son una vista de
selector y una página de marketing con lenguaje propio.

En `hospitalizacion` el botón primario tiene **tres colores de acción**
(amatista, ámbar para avisos, verde para confirmar). No hicieron falta tres
variantes: cada modal declara `--ds-btn-solid-bg` sobre su propio botón, el
mismo mecanismo que usan `caja` y `compras` para su tono.

`roles` y `empresa` son las features menos uniformes: casi cada componente
tiene su propia variante, así que la migración ahí fue selectiva. La tarjeta
de `EmpresaView` sí resultó coincidencia exacta con `.ds-card`.

Los 7 componentes de detalle de `historia-clinica` (`DewormingDetail`,
`SurgeryDetail`…) se quedaron **sin bloque `<style>`**: su CSS entero era una
copia de `.detail-grid`.

`SearchableSelect` (primitiva compartida de `dashboard/components/ui/`) también
está migrada: sus botones de creación inline eran coincidencia exacta con
`--sm`.

### El tono de caja/compras y el Teleport

Esas dos features usan `--amatista-600` en el botón primario, un punto más
claro que el `--amatista-700` del resto. Como todos sus modales montan
`ModalShell`, que hace `<Teleport to="body">`, la variable **no** puede
declararse en el contenedor de la vista: el nodo sale del árbol y deja de
heredarla. Se declara sobre el propio botón, que sí conserva el atributo de
scope al viajar:

```css
.ds-btn--solid {
  --ds-btn-solid-bg: var(--amatista-600);
}
```

Verificado en navegador reproduciendo la forma exacta que genera Vue
(`.ds-btn--solid[data-v-x]` + nodo movido a `<body>`): el color resuelve a
`oklch(0.5 0.18 300)`, idéntico a `--amatista-600`.

Los 5 que se dejaron a propósito, porque su regla NO equivale a la primitiva:

| Archivo                   | Qué se dejó                | Por qué                                    |
| ------------------------- | -------------------------- | ------------------------------------------ |
| `ReceiptModal`            | `.btn-ghost`               | Fondo blanco, borde `--warm-300`           |
| `CategoryManagerModal`    | `.btn-*-sm`                | Padding 4px: 6px más bajo que `--sm`       |
| `OwnerPicker`             | `.empty`                   | Padding `12px 4px`, no centrado vertical   |
| `CuentasView`             | `.empty-state` y derivados | Estado vacío compuesto (icono + 2 textos)  |
| `POSView`                 | `.banner.warn`             | Tonos propios (hue 85/70)                  |
| `CashTerminalsPanel`      | `.empty`                   | Borde punteado y radio 12px                |
| Vistas de `compras`       | `.page-head`, `.empty-row` | `align-items: center` y color `--warm-400` |
| `AccionDetailModal`       | `.detail-grid`             | `gap` de fila 18px, no 10px                |
| `ReviewStep`, `StatusPanel` | `.cta`                   | Sin sombra / radio 10px                    |
| `HabilitacionView`        | `.page`                    | `gap` 22px, no 18px                        |
| Banners de `historia`     | `.banner.error`            | Paleta propia, más apagada que la del sistema |
| `ConfirmDeactivateRoleDialog` | `.danger`              | Borde del mismo tono que el texto, más marcado |
| `RolesView`, `RoleCard`   | `.banner-error`, `.card`   | Paleta y padding propios                   |
| `EditPermissionsModal`    | `.ghost`, `.card`          | Botón de texto sin borde; panel a pantalla completa |

## Deltas visuales aceptados

La convergencia no es gratis. Lo que cambia respecto a hoy, medido con
`ds:audit`:

| Patrón                    | Cambio                             | Motivo                                                                    |
| ------------------------- | ---------------------------------- | ------------------------------------------------------------------------- |
| Botón primario            | +2px alto, +2px ancho              | Lleva `border: 1px solid transparent` para igualar la caja con el fantasma |
| `.cta` / `.ghost-cta`     | +6px / +8px ancho                  | Padding horizontal converge a 18px (el dominante); antes 16 y 14           |
| Botones de caja/compras   | +2px alto, +4px ancho              | Misma unificación de caja                                                  |
| Botones compactos         | Ahora responden al hover           | Antes sólo la variante grande tenía `:hover`                               |
| Botón deshabilitado       | `opacity` 0.6 → 0.5                | 0.5 es la variante mayoritaria (15 copias vs 10)                           |
| Botones y banners         | `display` → `inline-flex` / `flex` | Alinea icono + texto; no altera ancho ni alto                              |
| `.ghost-cta` de tienda    | +4px ancho                         | Padding horizontal 14 → 16px                                              |
| `.cta` de tienda          | Sombra alfa 45% → 50%              | Un solo token `--shadow-primary` en vez de dos casi idénticos             |
| Botones con icono         | `gap` 7-8px → 6px                  | Un solo espaciado de icono en todo el sistema                             |
| Modales de caja/compras   | Fuente 13.5 → 13px                 | Colapsa dos tamaños de texto en el del cuerpo (el ancho no cambia)        |
| Botón deshabilitado       | `cursor: default` → `not-allowed`  | Es la señal correcta y la mayoritaria en el código                        |
| `.btn.sm` de compras      | Radio 9 → 7px, padding +1px        | El radio pequeño ya era el de `--sm`                                      |
| **Fantasma de consulta**  | **Texto `--warm-900` → `--warm-700`** | Es el cambio más visible de todos. `consulta` usaba texto casi negro en el botón secundario; el resto de la app ya usaba gris oscuro. Un botón fantasma es una acción secundaria y debe leerse como tal. Revertirlo es una línea en `.ds-btn--ghost`. |
| Botones de consulta       | Radio 8 → 9px                      | Un solo radio de control en todo el sistema                               |
| Botones de agenda         | +4px ancho                         | Padding horizontal 14 → 16px                                              |
| Fantasma de facturación   | Fondo `--warm-50` → transparente   | `--warm-50` es 99% de luminosidad: sobre un modal blanco no se distingue  |
| Modales de acciones       | `opacity` deshabilitado 0.55 → 0.5 | Un solo valor de deshabilitado                                            |
| Diálogo de roles          | Radio 7 → 9px                      | Un solo radio de control                                                  |
| **Primario de `employees`** | **Hover: oscurecía, ahora aclara** | Usaba `background: --amatista-800` (oscurecer) contra el `filter: brightness(1.05)` (aclarar) del resto de la app. Es el único cambio de *comportamiento*, no de estética, de toda la migración. |

El del primario **corrige** una desalineación existente: hoy un par
"Cancelar / Guardar" mide 40px y 38px de alto respectivamente.

## Convenciones

- Ningún valor de color, espaciado o radio nuevo fuera de `tokens.css`.
- Los modificadores (`--lg`, `--ghost`, `--strong`…) se añaden sólo cuando el
  patrón aparece en **varios archivos**. Una variación de un único componente se
  queda en su CSS scoped.
- `ModalShell` hace `<Teleport to="body">`: un botón dentro de un modal **no**
  hereda variables CSS declaradas en el contenedor de la vista. Si necesitas
  `--ds-btn-solid-bg` ahí, decláralo en el propio componente del modal.
