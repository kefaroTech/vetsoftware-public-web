# Estado de solo lectura en las primitivas de campo — especificación

**Origen.** [kefaroTech/vetsoftware-public-web#159](https://github.com/kefaroTech/vetsoftware-public-web/issues/159)
— «las primitivas de campo del tenant no tienen estado de solo lectura: un campo bloqueado se ve
idéntico a uno editable».

**Qué es este documento.** La especificación con la que se implementa. No es el arreglo: es el
contrato repartido entre los tres agentes que lo aplican (`front-parity` la primitiva,
`front-feature` las props, `front-e2e-visual` la cobertura). Cuando esté implementado, la regla
permanente entra como **R16** en el gemelo `docs/ux/reglas-de-interfaz.md` de **los dos** repos.

**Árbol verificado.** `develop`, 2026-08-21, con el lote A11Y-09/A11Y-10/DS-01 ya en el árbol de
trabajo (`--warm-450`, `--text-placeholder`, `.ds-field`, `.ds-field-rest`). `tokens.css` y
`primitives.css` se comprobaron idénticos byte a byte entre `VetSoftwareFront` y
`VetSoftwarePublicFront` (`diff -q`, sin salida): siguen siendo gemelos TR-02 y por eso la parte CSS
va a los dos.

**Qué se midió de verdad.** Los contrastes de la §4 están **calculados**, no estimados: script
desechable en el scratchpad que importa `tests/helpers/wcag-contrast.ts` (OKLCH → sRGB → luminancia
relativa → ratio WCAG 2.x) y resuelve los tokens leyendo `src/assets/styles/tokens.css`. Es la misma
aritmética que sujeta `tests/unit/tokens-contrast.spec.ts`. **Qué NO se ejecutó:** ni `npm run
build`, ni Vitest, ni Playwright, ni Stylelint, ni `css-budget.mjs`, ni el dev server. Nada de lo
que sigue se ha visto renderizado.

---

## 1. El defecto de fondo: `disabled` se está usando como si fuera solo lectura

El estado no falta solo en las primitivas. **Ya se está consumiendo**, mal, por la única vía
disponible. Estos son los primeros clientes, y prueban que el estado hace falta.

### 1.1 El caso que lo dice todo — `OrderFormModal`

```
VetSoftwarePublicFront/src/features/hospitalizacion/modals/OrderFormModal.vue:270-285
```

```vue
<BaseField
  :label="hasApplied ? 'Fecha de inicio 🔒' : 'Fecha de inicio'"
  :hint="hasApplied ? 'Bloqueada: inicio histórico' : undefined"
>
  <DateInput v-model="draft.startDate" :disabled="hasApplied" />
</BaseField>
```

`hasApplied` es `appliedCount > 0` (`OrderFormModal.vue:44`) y el comentario de la línea 40 lo
define sin ambigüedad: *«Dosis/ejecuciones ya aplicadas = registro histórico inmutable»*. Eso es
**solo lectura**, literalmente: un dato clínico que hay que poder leer, seleccionar y copiar, y que
sigue formando parte del documento. Se implementó con `disabled`, y para compensar la falta de
señal visual se metió **un emoji de candado dentro del texto de la etiqueta**. Consecuencias, las
tres verificables:

1. El campo sale del orden de tabulación. Un auxiliar con teclado —o con lector de pantalla— **no
   puede llegar a la fecha de inicio de un tratamiento en curso**. El dato existe y es inalcanzable.
2. El emoji está dentro de `<label :for="id">` (`BaseField.vue:17-20`), así que entra en el **nombre
   accesible**: NVDA y VoiceOver en español lo verbalizan («candado cerrado»). El estado viaja como
   ruido en el nombre en vez de como estado programático.
3. Y en la línea 275 el `DateInput` **no recibe `:id="id"`** del slot, así que el `for` de la
   etiqueta apunta a un `id` que ningún control tiene: la etiqueta está huérfana (ver §8, hallazgo
   colateral).

### 1.2 `EmployeeFormModal` — dos semánticas distintas colapsadas en un booleano

```
VetSoftwarePublicFront/src/features/employees/components/EmployeeFormModal.vue:65-70, 314-325
```

```ts
// En edición el código NO se puede modificar; en alta se bloquea mientras no haya nombre.
const codeDisabled = computed(() => isEditing.value || !draft.value.name.trim())
```

Son **dos estados distintos** con el mismo nombre y el mismo píxel:

| Rama | Semántica real | Estado correcto |
| --- | --- | --- |
| `isEditing` | el código ya existe y es inmutable; el usuario tiene que poder leerlo y copiarlo | **solo lectura** |
| `!name.trim()` | todavía no se puede generar; es temporal y se resuelve escribiendo el nombre | **deshabilitado** (correcto hoy) |

El propio `hint` lo delata: `EmployeeFormModal.vue:68` dice «El código no se puede modificar una vez
creado el empleado». Eso es la definición de `readonly`. Y en la línea 316 el `BaseField` lleva
`required` en la misma rama — combinación que el HTML no permite con `readonly` (§5.4).

### 1.3 `ResolutionFormModal` — tipo de documento fijado por el contexto

```
VetSoftwarePublicFront/src/features/facturacion/components/enablement/ResolutionFormModal.vue:173
<BaseSelect :id="id" v-model="draft.documentType" :options="docTypeOptions" :disabled="!!presetType && !initial" />
```

El valor lo fija quien abre el modal y viaja en el envío (`draft.documentType` es parte del
`payload`). No es «no disponible», es «ya decidido»: solo lectura.

### 1.4 El precedente que ya resolvió esto por su cuenta — `roles`

`roles` tiene un modo de solo lectura completo (`RolesView.vue:156,169` → `EditPermissionsModal` →
`EditRoleHeader` / `PermissionTree`) y **no usa las primitivas de campo para el nombre**:

```
VetSoftwarePublicFront/src/features/roles/components/EditRoleHeader.vue:55-63
<input :value="name" type="text" class="name-input" :readonly="readOnly" … />
```

Un `<input>` a pelo con su CSS propio, y la única regla `:read-only` de todo el monorepo
(`EditRoleHeader.vue:167`, que solo cambia el cursor). **La ausencia de `readonly` en `BaseInput` ya
costó un componente a medida.** Y `EditPermissionsModal.vue:271-277` ya tiene el banner con el icono
`Lock` de Lucide y la redacción correcta: *«Este es un rol del sistema. Sus permisos y datos pueden
consultarse pero no modificarse.»* — de ahí sale el vocabulario visual que fija esta spec.

### 1.5 Lo que NO hay que tocar

El censo completo (24 usos de `disabled` en las primitivas de campo, con el script del scratchpad
sobre `src/**/*.vue` de los dos repos) deja **21 usos correctos**. Son de dos tipos y ambos son
`disabled` legítimo:

- **Cascada sin origen**: `PetForm.vue:243` (`!draft.specieId`), `OwnerForm.vue:269,288`,
  `SedeFormModal.vue:164,170`, `FeCustomerCreateForm.vue:250,261`,
  `AppointmentSubjectFields.vue:97`, `CashTerminalsPanel.vue:135,141`. No hay nada que leer ni que
  copiar: el control aún no aplica. Deshabilitado es correcto.
- **Carga en vuelo**: `OpenCashModal.vue:222,243`, `PasoConsulta.vue:178`, `PetForm.vue:230`,
  `CajaHistoryPanel.vue:78,88`, `TimeInput.vue:42,50`. Estado transitorio de segundos.
  Deshabilitado es correcto.

**Solo lectura no sustituye a deshabilitado.** Se añade al lado.

---

## 2. La distinción, y por qué es de usabilidad y no de estética

| | `disabled` | `readonly` |
| --- | --- | --- |
| Orden de tabulación | **fuera** | **dentro** |
| Se puede seleccionar y copiar | no | **sí** |
| Se envía con el formulario | **no** | **sí** |
| Validación de restricciones | no participa | no participa |
| Árbol de accesibilidad | «no disponible» / atenuado | **«solo lectura»**, sigue siendo navegable |
| §1.4.11 de WCAG | **exento** (componente inactivo) | **NO exento** (ver §5.1) |

Fuentes verificadas el 2026-08-21:

- MDN, atributo `readonly` — lista de tipos soportados y tabla de diferencias frente a `disabled`:
  <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/readonly>
- MDN, `aria-readonly` — cita textual que fija el criterio de diseño de esta spec:
  > *«When `aria-readonly` is set to `true`, it means the user can read but not set the value of the
  > widget. Read-only elements are still relevant to the user, so you should not prevent the user
  > from navigating to the element or its focusable descendants or copying the value.»*
  <https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-readonly>

En una clínica esto no es teórico. El caso de la §1.1 es exactamente el escenario del encargo:
alguien con el animal delante quiere confirmar **cuándo empezó** el tratamiento y copiar la fecha.
Con `disabled` no llega al campo con teclado y el lector de pantalla se lo salta.

> **Fuente que falló.** `WebFetch` sobre `https://www.w3.org/TR/wai-aria-1.2/#aria-readonly` y
> `#combobox` devolvió el documento truncado antes de la §6.7 (las dos veces): la especificación
> normativa no se pudo citar de primera mano y se cita MDN, que sí enumera «Used in roles» e
> incluye `combobox`. La página del APG de combobox se leyó entera y **no documenta el estado de
> solo lectura**: <https://www.w3.org/WAI/ARIA/apg/patterns/combobox/> no menciona `aria-readonly`
> en su tabla de roles, estados y propiedades. El diseño del §5.3 se apoya, por tanto, en ARIA 1.2
> vía MDN y no en un patrón del APG, y así queda declarado.

---

## 3. Los cuatro estados y por qué no se confunden entre sí

Cuatro estados, tres pares que hay que poder distinguir de un vistazo. **Ningún par se distingue por
un solo canal, y ningún par se distingue solo por color** (WCAG 2.2 §1.4.1 Use of Color, A).

| Canal | Editable (reposo) | **Solo lectura** | Deshabilitado | Inválido |
| --- | --- | --- | --- | --- |
| Borde | `--warm-450` | **`--warm-450`** | `--warm-450` | `oklch(60% .2 25)` rojo |
| Fondo | `--warm-50` | **`--surface-sunken` (`--warm-150`)** | `--warm-100` | `oklch(98.5% .02 25)` |
| Texto del valor | `--warm-900` | **`--warm-900` (pleno)** | `--warm-500` (atenuado) | `--warm-900` |
| Candado en la etiqueta | no | **sí** (`Lock`, Lucide, 13px) | no | no |
| Enfocable / anillo de foco | sí | **sí** | **no** | sí (rojo) |
| Cursor | `text` / `pointer` | **`text` / `default`** | `not-allowed` | `text` |
| Borde al pasar el ratón | cambia a `--warm-300` | **no cambia** | no cambia | no cambia |
| Marcador de posición | sí | **suprimido** | sí | sí |
| Mensaje bajo el campo | `hint` opcional | **`hint` con el motivo** | `hint` opcional | `error` obligatorio |

Y el desempate par a par, que es lo que el encargo pide garantizar:

- **Solo lectura vs editable** — candado + fondo hundido + sin hover + sin marcador de posición.
  Cuatro canales, tres de ellos independientes del color.
- **Solo lectura vs deshabilitado** — el texto del valor: `--warm-900` (16,76:1) frente a
  `--warm-500` (5,06:1). Es una diferencia de luminosidad de 16 % contra 52 %, imposible de
  confundir; y además el de solo lectura recibe foco y el deshabilitado no.
- **Solo lectura vs inválido** — tono (neutro contra rojo), temblor (`.ds-field-shake` solo en
  inválido) y el mensaje de error, que en inválido es obligatorio.

**El fondo NO es el canal principal, y está medido:** `--warm-150` contra `--warm-50` da **1,125:1**
y `--warm-150` contra `--warm-100` da **1,061:1**. Un campo de solo lectura y uno deshabilitado, uno
al lado del otro, son indistinguibles por su fondo. Por eso el candado no es decoración: es el
canal que hace legible el estado sin leer. Quien implemente esto **no puede quitarlo** «porque el
fondo ya se ve distinto» — no se ve.

---

## 4. Contraste: los números exactos

**La trampa que hay que no pisar:** atenuar el texto para «indicar que no se edita». El valor de un
campo de solo lectura es **contenido que el usuario tiene que leer**, así que WCAG 2.2 §1.4.3
Contrast (Minimum), nivel AA, le exige **4,5:1** completo. No hay excepción de «control inactivo»
para él (§5.1).

Todo lo siguiente está calculado sobre `tokens.css` con el helper del repo:

| Par | Ratio medido | Umbral | Veredicto |
| --- | --- | --- | --- |
| `--warm-900` sobre `--warm-150` (**texto de solo lectura**) | **16,76:1** | 4,5:1 (§1.4.3 AA) | pasa con 3,7× de margen |
| `--warm-450` sobre `--warm-150` (**borde de solo lectura**) | **3,15:1** | 3:1 (§1.4.11 AA) | pasa |
| `--warm-450` sobre `--warm-50` (borde contra la superficie de al lado) | 3,55:1 | 3:1 | pasa |
| `--warm-500` sobre `--warm-100` (texto deshabilitado, sin cambios) | 5,06:1 | — (exento) | legible de todos modos |
| `--warm-500` sobre `--warm-150` (candado con `.ds-icon-muted`) | 4,77:1 | 3:1 (§1.4.11) | pasa |
| **`--text-placeholder` sobre `--warm-150`** | **4,38:1** | 4,5:1 | **NO pasa** |
| `--warm-150` contra `--warm-50` (fondo contra fondo) | 1,125:1 | — | por eso hace falta el candado |
| `--warm-150` contra `--warm-100` (solo lectura contra deshabilitado) | 1,061:1 | — | ídem |

**Decisión que sale del último número rojo:** en solo lectura **el marcador de posición no se
renderiza**. No es una preferencia estética: `--text-placeholder` mide 4,38:1 sobre `--warm-150` e
incumple §1.4.3, y el propio token lo dice en su contrato (`tokens.css:148-153`: *«CONTRATO: solo
sobre `--warm-50`/`--surface`/blanco […] NO usar sobre `--warm-150` (4,38:1, incumple)»*). Además un
marcador de posición invita a escribir en un campo donde no se puede escribir. Si el valor viene
vacío, el consumidor pasa el marcador de dato ausente `'—'` (la convención de
`src/composables/format.ts`) como valor, o no renderiza el campo.

**Nada de esto cambia un token.** El estado nuevo se construye entero con tokens que ya existen: no
hay que tocar `tokens.css` y por tanto no hay riesgo nuevo para `tests/unit/tokens-contrast.spec.ts`.

---

## 5. La parte accesible

### 5.1 Por qué el borde de un campo de solo lectura NO puede aflojarse

WCAG 2.2 §1.4.11 Non-text Contrast (AA) exime a los componentes inactivos, y la Understanding lo
acota con una frase que decide el caso (verificada hoy en
<https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html>):

> *«User Interface Components that are not available for user interaction (e.g., a disabled control
> in HTML) are not required to meet contrast requirements.»* — y *«An inactive user interface
> component is visible but not currently operable.»*

Un campo de solo lectura **sí es operable**: recibe foco, se selecciona, se copia. **La excepción no
le alcanza.** Su borde mantiene los 3:1 (`--warm-450`, medido en 3,15:1 sobre su propio fondo). Un
campo deshabilitado sí está exento — por eso `.ds-field-disabled` puede seguir como está.

### 5.2 `readonly` frente a `aria-readonly`, y qué anuncia cada uno

- **`readonly` nativo** (`<input>`, `<textarea>`) — es el que hay que usar siempre que exista.
  Expone el estado en el árbol de accesibilidad sin ARIA, conserva el foco, conserva la selección,
  y el valor **se envía**. NVDA y JAWS lo anuncian como «solo lectura» / «read only»; VoiceOver
  igual — y crucialmente **no** como «atenuado/no disponible», que es lo que dicen del `disabled`.
- **`aria-readonly="true"`** — solo para el widget que no tiene equivalente nativo. Según ARIA 1.2
  (vía MDN, §2) los roles que lo admiten incluyen `combobox`, `textbox`, `listbox`, `checkbox`,
  `spinbutton`, `grid` y `gridcell`. **Es el caso de `BaseSelect`.**
- **Nunca los dos a la vez** en el mismo elemento, y **nunca `disabled` junto a cualquiera de los
  dos**: son estados excluyentes y ponerlos juntos gana `disabled`, que es justo lo que se está
  corrigiendo.

Criterio que lo exige: **WCAG 2.2 §4.1.2 Name, Role, Value (A)** — «states […] can be
programmatically determined». Un candado dibujado (o peor, un emoji en la etiqueta) no es un estado
programático. También **§1.3.1 Info and Relationships (A)**: la relación «este campo no se edita»
tiene que estar en el marcado, no solo en los píxeles.

### 5.3 `BaseSelect`: `readonly` nativo no existe, y aquí tampoco hay `<select>`

MDN es explícito: `readonly` **no aplica** a `<select>` ni a `<button>` (ni a `checkbox`, `radio`,
`file`, `range`, `color`). Y `BaseSelect` no es ni un `<select>`: es un `<button role="combobox">`
(`BaseSelect.vue:215-231`) con un `<ul role="listbox">` teletransportado. Así que:

1. **`aria-readonly="true"` en el elemento con `role="combobox"`** (el `<button>`), que es donde
   ARIA 1.2 lo admite.
2. **`:disabled` sigue en `false`.** El disparador tiene que conservar el foco: es la única forma de
   que un lector de pantalla lea el valor seleccionado.
3. **El panel no se abre.** Los tres guardas que hoy miran `props.disabled` pasan a mirar también
   `props.readonly`: `openPanel()` (`BaseSelect.vue:79`), `toggle()` (`:96`, indirecto vía
   `openPanel`) y `onKeydown()` (`:134`). Enseñar opciones que no se pueden elegir es peor que no
   enseñarlas.
4. **Limitación honesta que hay que declarar en el issue:** el valor de un combobox de botón **no es
   texto seleccionable**. Solo lectura le da a `BaseSelect` foco, anuncio y estado; no le da
   «copiar». Si un consumidor necesita copiar el valor, la respuesta correcta no es este estado: es
   renderizar el dato como texto.

### 5.4 `required` y `readonly` no conviven

MDN: *«The `required` attribute is not permitted on inputs with the `readonly` attribute
specified.»* Un campo de solo lectura no se valida y no puede fallar. Por tanto `BaseField` **oculta
el asterisco** cuando `readonly` es `true`, y el consumidor no debe pasar `required`. Esto afecta
directamente a `EmployeeFormModal.vue:314-316`, que hoy lleva `required` en la misma rama en la que
el campo está bloqueado.

### 5.5 Trampa de CSS: no usar la pseudoclase `:read-only`

`:read-only` de CSS Selectors 4 casa con **todo lo que no es editable**, incluidos los controles
`disabled` y cualquier elemento que no sea un campo. Usarla borraría exactamente la distinción que
esta spec construye. **El estado viaja como clase desde el marcado**, igual que el resto de la
familia `.ds-field-*` y por el mismo motivo de especificidad de `AGENTS.md:103-122`. La única
regla `:read-only` que existe hoy en el monorepo (`EditRoleHeader.vue:167`) queda fuera de alcance:
es un input titular a medida, no un campo de la familia.

---

## 6. El reparto — qué toca cada agente

### 6.1 `front-parity` — **una** regla, en el `primitives.css` gemelo

Va **inmediatamente después de `.ds-field-rest`**, que hoy termina en la línea **1569** de
`src/assets/styles/primitives.css`, y **antes** del bloque «ESQUELETO DE CARGA» (línea 1571). Byte a
byte en los dos repos.

```css
/* Solo lectura — issue public-web#159. NO es lo mismo que deshabilitado: el
   campo SIGUE siendo operable (recibe foco, se selecciona, se copia) y su
   valor SÍ se envía. Por eso conserva el texto a contraste pleno
   (`--warm-900`, 16,76:1 sobre esta superficie) en vez de atenuarlo como
   `.ds-field-disabled`, y conserva el borde a 3:1 (`--warm-450`, 3,15:1): la
   excepción de «componentes inactivos» de WCAG 2.2 §1.4.11 exime a lo que
   «is visible but not currently operable», y esto es operable.
   Lo que cambia frente a `.ds-field-rest` es la superficie hundida — que por
   sí sola NO es señal suficiente: mide 1,125:1 contra `--warm-50` y 1,061:1
   contra el fondo de `.ds-field-disabled` —, así que el canal que de verdad
   distingue el estado es el candado que `BaseField` pinta en la etiqueta.
   Quitarlo deja el estado invisible. */
.ds-field-readonly {
  border-color: var(--warm-450);
  background: var(--surface-sunken);
  color: var(--warm-900);
}
```

Nada más. Sin `cursor`: el cursor lo resuelve cada componente excluyendo el estado de su propia
regla con `:not()`, que es la R07 vigente. No se añade primitiva para el candado: se reutiliza
`.ds-icon-muted` (`primitives.css:878`), que mide 4,77:1 sobre la superficie hundida y cumple los
3:1 de §1.4.11 con margen.

**Peso.** `(0,1,0)`, igual que sus hermanas. Gana a `.ds-field` y `.ds-field-rest` por orden de
aparición y pierde contra `.ds-focus-ring:focus-within` `(0,2,0)` — que es exactamente lo que se
quiere: al enfocar, el anillo amatista manda.

### 6.2 `front-feature` — las props y los atributos, componente a componente

Precedencia única y excluyente en los tres, en este orden: **`invalid` > `disabled` > `readonly` >
reposo**. `readonly` e `invalid` son mutuamente excluyentes por contrato; si llegan juntos gana
`invalid`, porque un error tiene que verse.

#### `src/components/ui/BaseInput.vue`

| Dónde | Cambio |
| --- | --- |
| `:5-17` | añadir `readonly?: boolean` a las props |
| `:44-50` | insertar `if (props.readonly) return ['ds-field-readonly', 'ds-focus-ring']` entre la rama de `disabled` y el `return` de reposo. **Sin `tone-border` ni `tone-bg`**: la primitiva ya trae borde y fondo |
| `:56` | `:class="[toneClass, { disabled, invalid, readonly }]"` — la clase `readonly` en el envoltorio es lo que alimenta el `:not()` de abajo |
| `:61-73` | en el `<input>` real (no en el `<label>`): `:readonly="readonly || undefined"`; y `:placeholder="readonly ? undefined : placeholder"` |
| `:107` | `.input:not(.disabled)` → `.input:not(.disabled, .readonly)`; añadir `.input.readonly { cursor: text; }` no hace falta: el `cursor: text` del navegador ya es el de un input de solo lectura, y así el usuario ve que puede seleccionar |
| `:125` | `.input:hover:not(.disabled, .invalid, :focus-within)` → `.input:hover:not(.disabled, .readonly, .invalid, :focus-within)` |

**Motivo de que el atributo vaya en el `<input>` y no en el componente:** hoy la raíz de `BaseInput`
es `<label class="input ds-flex-row">` (`:54`), así que un `readonly` suelto en el sitio de llamada
cae por *fallthrough* en el `<label>`, donde no significa nada. Es el defecto que abre el issue.

#### `src/components/ui/BaseTextarea.vue`

| Dónde | Cambio |
| --- | --- |
| `:5-12` | añadir `readonly?: boolean` |
| `:32-38` | rama `if (props.readonly) return ['ds-field-readonly', 'ds-focus-ring']` — sin `tone-*` |
| `:47-59` | `:readonly="readonly || undefined"`, `:placeholder="readonly ? undefined : placeholder"`, y `:class="[toneClass, { invalid, readonly }]"` |
| `:101` | `.textarea:hover:not(:focus, :disabled, .invalid)` → `.textarea:hover:not(:focus, :disabled, .readonly, .invalid)`. **Usar la clase, no `:read-only`** (§5.5) |

Matiz que hay que conocer: en este componente la raíz **sí** es el `<textarea>` (`:47`), así que un
`readonly` suelto hoy **sí llega** al control. El defecto aquí no es que el atributo se pierda: es
que llega y **no cambia ni un píxel** — el campo bloqueado se ve idéntico al editable. Mismo issue,
distinta causa.

#### `src/components/ui/BaseSelect.vue`

| Dónde | Cambio |
| --- | --- |
| `:10-20` | añadir `readonly?: boolean` |
| `:50-54` | rama `if (props.readonly) return ['ds-field-readonly']` — sin `tone-*` |
| `:79` | `if (props.disabled || props.readonly || open.value) return` en `openPanel()` |
| `:134` | `if (props.disabled || props.readonly) return` en `onKeydown()` |
| `:214` | `:class="{ disabled, invalid, open, readonly }"` en el `.select` |
| `:215-231` | en el `<button role="combobox">`: `:aria-readonly="readonly || undefined"`. **`:disabled` se queda como está** — un solo lectura NO se deshabilita |
| `:290` | `.trigger:not(:disabled)` → `.trigger:not(:disabled, .ds-field-readonly)`, para que el cursor deje de prometer que se abre |
| `:311` | `.select:not(.open, .disabled, .invalid) .trigger:hover` → `.select:not(.open, .disabled, .readonly, .invalid) .trigger:hover` |

#### `src/components/ui/BaseField.vue` — el candado y la supresión del asterisco

| Dónde | Cambio |
| --- | --- |
| `:5-10` | añadir `readonly?: boolean` |
| `:2` | `import { Lock, TriangleAlert } from 'lucide-vue-next'` |
| `:17-20` | dentro del `<label>`: `<Lock v-if="readonly" :size="13" :stroke-width="1.8" class="ds-icon-muted" aria-hidden="true" />` y cambiar el asterisco a `v-if="required && !readonly"` (§5.4) |
| `:21` | `<slot :id="id" :readonly="readonly" />` — así el consumidor escribe `v-slot="{ id, readonly }"` y el estado tiene **una sola** fuente de verdad en el sitio de llamada |

**`aria-hidden="true"` en el candado no es opcional.** El estado ya lo lleva `readonly` /
`aria-readonly` del control; si el icono aportara texto, el lector diría «Fecha de inicio, candado,
solo lectura». El icono es el canal visual; ARIA es el canal auditivo; no se duplican.

**Texto exacto del `hint`.** Un campo de solo lectura lleva siempre el motivo, en presente y sin
disculpas, siguiendo la redacción que ya usa `EditPermissionsModal.vue:271-277`:

- `OrderFormModal` → `'El tratamiento ya tiene dosis aplicadas: el inicio es histórico.'`
- `EmployeeFormModal` (rama `isEditing`) → `'El código no se puede modificar una vez creado el empleado.'` (ya existe, `:68`, se conserva literal)
- `ResolutionFormModal` → `'El tipo lo fija el documento desde el que se abrió.'`

Prohibido: `'Campo bloqueado'` a secas (no dice por qué) y cualquier emoji en `label` o `hint`.

#### Migración de los consumidores (mismo agente, mismo PR)

| Fichero:línea | Hoy | Debe quedar |
| --- | --- | --- |
| `features/hospitalizacion/modals/OrderFormModal.vue:270-277` | `label` con 🔒 + `DateInput :disabled="hasApplied"` | `label` limpia + `BaseField :readonly="hasApplied"` + `DateInput :id="id" :readonly="hasApplied"` (⚠️ el `:id` falta hoy) |
| `features/hospitalizacion/modals/OrderFormModal.vue:278-285` | `label` con 🔒 + `BaseInput :disabled="hasApplied"` | `label` limpia + `BaseField :readonly` + `BaseInput :readonly` (`type="time"` **sí** admite `readonly`, MDN) |
| `features/employees/components/EmployeeFormModal.vue:65-66` | `codeDisabled = isEditing \|\| !name.trim()` | partir en dos: `codeReadonly = isEditing` y `codeDisabled = !isEditing && !name.trim()` |
| `features/employees/components/EmployeeFormModal.vue:314-325` | `required` + `:disabled="codeDisabled"` | `:required="!codeReadonly"`, `:readonly="codeReadonly"`, `:disabled="codeDisabled"` |
| `features/facturacion/…/ResolutionFormModal.vue:173` | `:disabled="!!presetType && !initial"` | `:readonly="!!presetType && !initial"` + `hint` con el motivo |

**`DateInput` queda fuera de este lote y necesita ficha propia.** Su control real lo pinta
`vue-datepicker-next` en un nodo `.mx-input` teletransportado a `<body>`, que es justo el motivo por
el que `DateInput` ya se quedó fuera de `.ds-field-invalid` (`primitives.css:730-734`). Además la
librería usa `:editable="false"` como sinónimo de `readonly` y eso **ya causó una regresión de
teclado documentada en el propio fichero** (`DateInput.vue:79-83`, A11Y-02, WCAG 2.2 §2.1.1). Se
resuelve pasando `readonly` por `input-attr` (`DateInput.vue:74-77`), **no** por `editable`, y
bloqueando la apertura del calendario aparte. Es un cambio con su propio riesgo y sus ~55
consumidores: **issue separado, propuesto en la §8.**

### 6.3 `front-e2e-visual` — qué se fotografía y qué se mide

**Bloque nuevo en la galería.** `visual/Gallery.vue` — sección nueva `data-shot="campos-bloqueados"`
con la **matriz 3×3 completa**, que es lo que hace la captura útil: si los tres estados se
confunden, se ve en una sola imagen.

```
              editable        solo lectura      deshabilitado
BaseInput        ▢                ▢                  ▢
BaseTextarea     ▢                ▢                  ▢
BaseSelect       ▢                ▢                  ▢
```

Los tres de solo lectura, dentro de `BaseField :readonly` con etiqueta, candado y `hint`, y **con
valor no vacío** (si va vacío no se ve el color del texto, que es el canal que separa solo lectura
de deshabilitado).

- **Sección nueva, no ampliar `campos`.** El bloque `campos` (`Gallery.vue:241-287`) ya cubre reposo,
  inválido y deshabilitado y tiene línea base. Meter ahí tres filas más invalida su base por un
  cambio que no le afecta y estropea la señal de la prueba.
- **Registrar el nombre** en el array `SHOTS` de `visual/gallery.visual.spec.ts:26-60`, junto a
  `'campos'`.
- El campo deshabilitado que ya existe en `Gallery.vue:279-281` **se queda donde está**: sirve de
  control de que este cambio no lo tocó.

**Guarda de contraste, en Vitest.** En `tests/unit/tokens-contrast.spec.ts` (o fichero hermano),
tres aserciones que sujetan lo que esta spec decidió — y que fallarían si alguien «atenúa» el estado
más adelante, que es la regresión probable:

1. el color de texto de `.ds-field-readonly` mide **≥ 4,5:1** sobre su propio `background`
   (§1.4.3 AA) — hoy 16,76:1;
2. su `border-color` mide **≥ 3:1** sobre ese mismo `background` **y** sobre `--warm-50`
   (§1.4.11 AA) — hoy 3,15:1 y 3,55:1;
3. el color de texto de `.ds-field-readonly` es **estrictamente más oscuro** que el de
   `.ds-field-disabled`: es el canal que separa los dos estados y ninguna medida de contraste
   absoluta lo protege.

La (3) es la importante. Las dos primeras las pasaría también un diseño equivocado.

**Y una guarda de comportamiento, en Vitest, no en Playwright** (barata y precisa):

4. `BaseInput`/`BaseTextarea` con `readonly` renderizan el atributo `readonly` **en el control**, no
   en el envoltorio, y **no** renderizan `disabled` — el defecto literal del issue #159;
5. `BaseSelect` con `readonly` renderiza `aria-readonly="true"`, **no** `disabled`, el disparador
   **sigue siendo enfocable**, y `Enter`/`ArrowDown`/click **no** abren el `role="listbox"`.

La (5) es la que impide que «solo lectura» se implemente como un `disabled` con otro nombre.

---

## 7. Compatibilidad con las puertas que ya existen

| Puerta | Efecto esperado | Verificado |
| --- | --- | --- |
| `stylelint vetsoftware/no-duplicate-primitive` (FE-08) | ninguno: **todo** el color nuevo vive en `primitives.css` y **cero** en `<style scoped>`. Los únicos cambios en los SFC son ampliar listas de `:not()`, que es la R07 vigente | no ejecutado |
| `scripts/css-budget.mjs` — `maxStyleMinusScript: 0` | debería **bajar**: los cambios suman líneas de script y plantilla y **no suman ni una línea de `<style>`** | no ejecutado |
| `maxDuplicateGroups: 0` | ninguno: una sola regla, en un solo sitio, en los dos gemelos | no ejecutado |
| `maxSfcLines: 500` / `maxOversizedSfc: 0` | los cuatro componentes de `ui/` están muy por debajo; `OrderFormModal` y `EmployeeFormModal` hay que **medirlos antes de empujar** | **no medido** |
| `tests/unit/tokens-contrast.spec.ts` | ninguno: **no se toca `tokens.css`** | no ejecutado |

Ninguna recomendación de este documento sube un techo del presupuesto.

---

## 8. Hallazgos colaterales e issues propuestos

**No he abierto ninguno.** Van redactados para que decidas.

> **[Grave]** La etiqueta de «Fecha de inicio» no está asociada a ningún control —
> `VetSoftwarePublicFront/src/features/hospitalizacion/modals/OrderFormModal.vue:270-277`
> **Criterio:** WCAG 2.2 §1.3.1 Info and Relationships (A) y §4.1.2 Name, Role, Value (A).
> **Impacto:** `BaseField` genera un `id` con `useId()` y lo expone por el slot, pero la línea 275
> no se lo pasa al `DateInput` (el `BaseInput` hermano de la línea 283 sí lo hace). El `for` apunta
> a un `id` inexistente: el campo de fecha se queda **sin nombre accesible** y el clic en la
> etiqueta no le da el foco. Es independiente del estado de solo lectura y se arregla en la misma
> línea que ya hay que tocar.
> **Arreglo:** `<template #default="{ id }">` + `<DateInput :id="id" … />`.

> **Issue propuesto A — `DateInput`: estado de solo lectura sin repetir la regresión de teclado**
> El estado que esta spec define no se puede aplicar a `DateInput` con el mismo patrón: su control
> real lo pinta `vue-datepicker-next` en un `.mx-input` teletransportado a `<body>`, fuera del
> alcance de las clases del envoltorio — el mismo motivo por el que ya quedó fuera de
> `.ds-field-invalid` (`primitives.css:730-734`). Y su vía «obvia», `:editable="false"`, ya provocó
> una regresión documentada en `DateInput.vue:79-83`: dejaba la fecha inalcanzable con teclado en
> los ~55 consumidores (WCAG 2.2 §2.1.1). La vía correcta es `input-attr` (`DateInput.vue:74-77`)
> más un bloqueo explícito de la apertura del calendario. Alcance: 55 llamadas. Merece issue y PR
> propios; el primer consumidor es `OrderFormModal.vue:275`.

> **Issue propuesto B — `SwitchToggle` en modo consulta: `disabled` es lo correcto, pero por
> accidente**
> `EditRoleHeader.vue:69` deshabilita el interruptor activo/inactivo cuando el rol es de sistema.
> `readonly` **no existe** para `checkbox`/`switch` en HTML (MDN), y `aria-readonly` sobre `switch`
> tiene soporte irregular, así que `disabled` es hoy la opción pragmática. Pero deja el estado del
> rol fuera del orden de tabulación: quien navega con teclado no puede confirmar si un rol del
> sistema está activo. Alternativa a evaluar: `aria-disabled="true"` + `@click.prevent`, que
> conserva el foco y el anuncio. Es una decisión de patrón, no un arreglo obvio.

> **Issue propuesto C — el ojo de contraseña de `BaseInput` en solo lectura**
> `BaseInput.vue:75-84` renderiza el botón ver/ocultar cuando `type === 'password'`. En solo lectura
> **debe conservarse** (leer el valor es justo el objetivo), pero `.input.disabled .reveal`
> (`:177-180`) lo apaga en deshabilitado y no hay regla equivalente para el estado nuevo — el
> comportamiento correcto sale por defecto. Verificar en la galería, no arreglar a ciegas.

---

## 9. Resumen ejecutable

| Agente | Ficheros | Tamaño |
| --- | --- | --- |
| `front-parity` | `src/assets/styles/primitives.css` **en los dos repos**, tras la línea 1569 | **1 regla, 4 declaraciones** |
| `front-feature` | `ui/BaseInput.vue`, `ui/BaseTextarea.vue`, `ui/BaseSelect.vue`, `ui/BaseField.vue` + 3 consumidores | 1 prop y 1 rama de tono por primitiva; 4 listas de `:not()`; 3 migraciones |
| `front-e2e-visual` | `visual/Gallery.vue`, `visual/gallery.visual.spec.ts`, `tests/unit/tokens-contrast.spec.ts` | 1 `data-shot` nuevo (matriz 3×3), 3 guardas de contraste, 2 de comportamiento |

Cuando esté implementado: **R16 en el gemelo `docs/ux/reglas-de-interfaz.md` de los dos repos** —
*«Un campo que se lee pero no se edita lleva `readonly`/`aria-readonly`, nunca `disabled`: el
usuario tiene que poder enfocarlo, leerlo y copiarlo, y su valor sigue viajando en el envío.»*
