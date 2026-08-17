# E2E de flujo (Playwright)

Recorridos de usuario de la app del tenant, ejecutados contra la aplicación real
y el backend real.

> **Esta suite NO corre en GitHub Actions, y es una decisión, no un olvido.**
> Se ejecuta **a mano, en local, cuando tú quieras**. El CI de este repositorio
> se queda con la puerta de calidad, las unitarias con cobertura, el build, el
> presupuesto de bundle y la regresión visual — que es otra suite distinta
> (`visual/`, `playwright.visual.config.ts`) y esa sí corre en cada PR.
>
> Los motivos son dos. Uno: necesitan un backend con datos, credenciales reales
> y, en dos specs, un contenedor de MySQL al que hablar — reproducir eso en un
> runner es caro y frágil. Dos: el único entorno remoto disponible es `dev`, que
> se apaga solo a las 20:00 (Bogotá, L-V) y cuyo RDS `t4g.micro` es inestable,
> así que **un fallo contra dev no dice nada sobre el código**.
>
> Si vas a tocar `.github/workflows/`, no las reintroduzcas ahí.

---

## Qué hay

| Spec                   | Flujo                                                  |   Casos | Cómo prueba           |
| ---------------------- | ------------------------------------------------------ | ------: | --------------------- |
| `consulta.spec.ts`     | Wizard de Nueva Consulta (propietario → mascota → …)   |     154 | UI                    |
| `kardex.spec.ts`       | Inventario por sede, kardex, multi-sede, POS y cuentas |      53 | API directa           |
| `historia.spec.ts`     | Historia clínica del paciente                          |      45 | UI (necesita siembra) |
| `acciones.spec.ts`     | Acciones clínicas rápidas del paso 3                   |      38 | UI                    |
| `modales-ux.spec.ts`   | Apertura, centrado, tamaño y desplegables de modales   |      13 | UI                    |
| `registro.spec.ts`     | Alta de veterinaria, roles base y visibilidad por rol  |      10 | UI (crea empresa)     |
| `medicamentos.spec.ts` | Catálogo de medicamentos                               |       9 | UI                    |
| `caja.spec.ts`         | Caja / arqueo: apertura, movimientos, cierre           |       9 | API directa           |
| `auth.spec.ts`         | Login y guard de sesión                                |       5 | UI                    |
| `agenda.spec.ts`       | Agendamiento de citas                                  |       3 | UI                    |
| `traza.spec.ts`        | Propagación de `traceparent` (TR-05)                   |       3 | UI                    |
| **Total**              |                                                        | **342** |                       |

Más `historia.setup.ts`, que no es un caso de prueba sino el **proyecto de
sembrado** (ver abajo). Comprobable en cualquier momento con:

```bash
npx playwright test --list
```

---

## Antes de la primera ejecución

Los cinco pasos, en orden. Ninguno es opcional salvo donde se diga.

### 1 · Dependencias y navegador

```bash
nvm use            # Node 24 (ver .nvmrc); npm >= 11
npm ci
npx playwright install chromium
```

Solo hace falta Chromium: `playwright.config.ts` declara un único proyecto sobre
`Desktop Chrome`. `npx playwright install` a secas se baja también Firefox y
WebKit, que aquí no se usan.

### 2 · Fichero de entorno

```bash
cp .env.local.example .env.local
```

**No es opcional.** `npm run dev` es `vite --mode localdev`, y `vite.config.ts`
lanza `Missing or mismatched environment file` si ningún fichero de entorno
declara ese perfil. `.env.local` está en `.gitignore` porque lleva la URL del
backend de cada quien, así que un clon recién hecho no lo tiene.

### 3 · Backend arriba en `localhost:8080`

Casi toda la suite habla con el backend real. Levanta el Spring Boot del
repositorio `VetSoftware` con su MySQL y espera a que responda:

```bash
curl -i http://localhost:8080/api/v1/species     # 401/403 vale: significa que está vivo
```

**Contra `localdev`, nunca contra el `dev` de AWS.** Ver el aviso de arriba.

La base tiene que tener los catálogos maestros sembrados (especies, razas,
colores, tipos de consulta, medicamentos globales). `medicamentos.spec.ts`, por
ejemplo, espera encontrar `Meloxicam`, que siembra la migración 173.

### 4 · Credenciales

```bash
# PowerShell
$env:E2E_EMPLOYEE_CODE = 'tu-codigo-o-correo'
$env:E2E_PASSWORD      = 'tu-contraseña'

# bash / Git Bash
export E2E_EMPLOYEE_CODE='tu-codigo-o-correo'
export E2E_PASSWORD='tu-contraseña'
```

`E2E_PASSWORD` **no tiene valor por defecto, a propósito**. Las suites que hacen
login llevan una guarda `test.skip(!PASSWORD, …)`: sin la variable **se saltan
solas** en vez de fallar con un login vacío y dejarte mirando 200 fallos que no
significan nada.

Hasta FE-05 esa guarda era código muerto — `helpers/auth.ts` traía una
contraseña personal escrita a mano en el fichero, así que `PASSWORD` era siempre
verdadera. Ya no. Si ves «Define E2E_PASSWORD para correr…», es esto y solo esto.

Necesitas un usuario **con permiso de administración** (`admin.all`): `caja` y
`kardex` togglean ajustes por empresa.

### 5 · Docker con MySQL — solo para `caja` y `kardex`

Esos dos specs fijan flags por empresa (`cashregister.required`,
`inventory.allow_negative_stock`) escribiendo **directamente en la base**, porque
el `PUT /company-settings` está gateado a `admin.all`. Lo hacen con
`docker exec vetsoftware_mysql mysql …`, así que necesitan:

- Docker corriendo,
- un contenedor llamado exactamente **`vetsoftware_mysql`**.

Si no lo encuentran, los casos que dependen del flag **se saltan** (no fallan).
El resto del spec sigue corriendo.

### ¿Y el servidor de desarrollo?

No lo levantes tú. `playwright.config.ts` declara un `webServer` con
`reuseExistingServer: true`: si ya tienes un `npm run dev` en el 5174 lo reusa, y
si no, lo arranca él y lo apaga al terminar. El puerto es **5174 fijo**
(`strictPort: true`): si está ocupado por otra cosa, el servidor falla en vez de
saltar al 5175.

---

## Ejecutar

| Comando                           | Para qué                                                      |
| --------------------------------- | ------------------------------------------------------------- |
| `npm run e2e`                     | La suite completa, headless. Es el comando por defecto.       |
| `npm run e2e -- historia.spec.ts` | **Un solo spec.** El nombre es un filtro sobre la ruta.       |
| `npm run e2e -- -g "arqueo"`      | Los casos cuyo título case con el patrón.                     |
| `npm run e2e:ui`                  | **Modo interactivo.** El que quieres para explorar o depurar. |
| `npm run e2e:headed`              | Igual que `e2e`, pero viendo el navegador.                    |
| `npm run e2e:debug`               | Paso a paso con el inspector de Playwright.                   |
| `npm run e2e:report`              | Abre el informe HTML de la última ejecución.                  |

El `--` de `npm run e2e -- …` es de npm, no de Playwright: separa los argumentos
del script de los que van al comando. Sin él, npm se los come.

Todo lo que acepta `playwright test` vale después del `--`: `--workers=1` para
serializar, `--repeat-each=3` para cazar intermitencias, `--last-failed` para
reintentar solo lo que falló.

### El proyecto de sembrado

`playwright.config.ts` declara dos proyectos: `setup` (solo `historia.setup.ts`)
y `chromium` (todo lo demás), y el segundo **depende** del primero. Es decir:
`setup` corre siempre antes, una única vez.

Lo que hace es crear, contra el backend real y a través de la UI, un paciente con
historia clínica completa (propietario + mascota + consulta con receta y
vacunación) y un propietario sin mascotas, y persistirlos en
**`e2e/.artifacts/historia-patient.json`** (gitignorado), que es lo que después
lee `historia.spec.ts`.

Se auto-salta si el run no incluye historia — mira los argumentos de la línea de
comandos — así que `npm run e2e -- consulta.spec.ts` no siembra nada. También se
salta sin `E2E_PASSWORD`. Se siembra una vez, y no por worker, para que catorce
workers no re-siembren en paralelo contra el mismo backend.

Si la siembra falla, los 45 casos de historia caen detrás: mira **primero** el
resultado del proyecto `setup`, no los fallos de historia.

---

## Qué le deja a tu base de datos

Esta suite **escribe**. No hay rollback ni limpieza automática, así que corre
contra tu entorno local y no contra nada que te importe.

- Lo que se crea lleva sufijo único por ejecución (`uniqueSuffix`) para no
  chocar con las restricciones `UNIQUE` de los catálogos.
- `registro.spec.ts` da de alta **una veterinaria nueva en cada corrida**, con
  sus roles base y sus empleados. No la borra.
- `caja` y `kardex` dejan los flags por empresa en el último valor que hayan
  fijado.
- El paciente sembrado por `setup` se queda en la base.

Si acumulas ruido, lo que hay que limpiar son las empresas de prueba, los
pacientes sembrados y los movimientos de caja/kardex del día.

---

## Cuando algo falla

1. **`npm run e2e:report`** — el informe HTML lleva el error, la captura del
   momento del fallo y, en el reintento, la traza navegable.
2. **¿Se saltó todo?** Falta `E2E_PASSWORD`. Ver el paso 4.
3. **¿Falla el login de todo?** Comprueba las credenciales contra la UI a mano.
   Los selectores de `helpers/auth.ts` apuntan al atributo `autocomplete` de cada
   campo, no a su etiqueta: `AuthField` pinta un `<label>` sin `for`, así que
   `getByLabel` no funciona hoy. Es un defecto de accesibilidad, y pertenece a
   FE-14.
4. **¿Falla solo `historia`?** Mira el proyecto `setup`.
5. **¿Falla solo `caja`/`kardex`?** Docker y el contenedor `vetsoftware_mysql`.
6. **¿El servidor no arranca?** Puerto 5174 ocupado, o falta `.env.local`.

---

## Estado de salud (auditoría de FE-05, agosto 2026)

La suite lleva meses sin ejecutarse entera. Se auditaron los selectores y los
endpoints de los 11 specs **leyéndolos contra el código actual** — sin
ejecutarlos, porque eso exige el backend. Es una estimación, no un resultado;
pero los fallos que se listan son deterministas y están verificados uno a uno.

| Spec           | Estado | Qué le pasa                                                                                                                                                                                                                                                                                                  |
| -------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `acciones`     | verde  | Nada. 7 flujos verificados campo por campo.                                                                                                                                                                                                                                                                  |
| `auth`         | verde  | Nada.                                                                                                                                                                                                                                                                                                        |
| `traza`        | verde  | Nada. Es el único **100 % mockeado** con `page.route`: no necesita backend.                                                                                                                                                                                                                                  |
| `agenda`       | verde  | Nada.                                                                                                                                                                                                                                                                                                        |
| `medicamentos` | verde  | Nada.                                                                                                                                                                                                                                                                                                        |
| `modales-ux`   | verde  | Nada.                                                                                                                                                                                                                                                                                                        |
| `consulta`     | verde  | 1 caso de 154: `editLabel: 'Editar receta'` quedó de un rename; hoy el botón es «Editar plan terapéutico».                                                                                                                                                                                                   |
| `kardex`       | ámbar  | `GET /animals` devuelve `PageResponseAnimalResponse`, y el spec lo lee como array plano. Los 2 casos de cuenta abierta **se saltan siempre en silencio**. 24/25 endpoints correctos.                                                                                                                         |
| `historia`     | rojo   | `helpers/historia.ts::robustLogin` tiene su **propia copia** del login, con las etiquetas viejas («Código de empleado \*»); el arreglo de `bc2a865` solo se aplicó a `helpers/auth.ts`. El `setup` no puede loguearse → nunca escribe el JSON → caen los 45. Aparte, `button.btn-close` no existe (2 casos). |
| `caja`         | rojo   | `POST /cash-sessions/open` exige `terminalId` desde que existe el catálogo `/cash-terminals`, y `openCaja()` no lo manda → 400. Y `GET /open-accounts` ya es `PageResponse`, así que el `.find()` del `beforeAll` revienta. Corre en `serial`: arrastra el describe.                                         |
| `registro`     | rojo   | Va a `/signup`; la ruta real es **`/registro`** → cae en el catch-all y acaba en `/login`. Además el alta ya no auto-loguea (verificación por correo), y el formulario dejó de ser Vuetify: `.v-input`, `.v-list-item` y `.v-alert` no existen en él.                                                        |

En bruto: **~250 de 342 casos deberían pasar** con el entorno bien montado; ~64
caen por el login duplicado de historia, ~9 por caja, ~10 por registro, y 2 se
saltan mudos en kardex.

Nada de esto se arregló en FE-05 — el alcance era sacar la suite del CI y dejarla
cómoda de correr a mano, no repararla. Las tres reparaciones rojas son mecánicas
y están acotadas arriba si quieres abordarlas.

Dos cosas que conviene saber antes de fiarte de un verde:

- **Un verde es «los selectores resuelven», no «el caso pasa».** Salvo `traza`,
  todos hablan con el backend real y dependen de catálogos sembrados.
- **`acciones` asume que el usuario de prueba tiene una sola sede.** El campo
  «Sede» solo se auto-oculta en ese caso; con dos o más, esa auditoría falla por
  precondición de datos, no por código.

---

## Si escribes o reparas un spec

- **Selectores por rol o `data-testid`.** Nunca por clase CSS, y con mucho
  cuidado con el texto: es traducible y se reescribe. Varios selectores de esta
  suite ya se rompieron una vez por buscar «Código de empleado \*».
- **Nada de `waitForTimeout`.** Espera por estado observable (`toBeVisible`, una
  respuesta de red). Ten en cuenta el loader global al esperar por el velo o por
  su desaparición: `SHOW_DELAY_MS = 200`, `MIN_VISIBLE_MS = 300`.
- **Credenciales por entorno, jamás en el código.** Ya pasó una vez.
- **Deja el sistema como lo encontraste**, y marca lo que crees como dato de
  prueba reconocible.
- **Un test intermitente se arregla o se borra, nunca se reintenta.** Si lo
  desactivas, deja escrito el motivo y el enlace al issue.
