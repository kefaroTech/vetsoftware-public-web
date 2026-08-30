import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PLANS_CONTENT, SELLO } from '@/features/landing/content/plans.content'

/**
 * EL CONTRASTE CONTRA EL CATÁLOGO REAL.
 *
 * ── Por qué existe ─────────────────────────────────────────────────────────
 * `plans.content.ts` es una transcripción manual del catálogo comercial, y una
 * transcripción tiene exactamente un modo de fallo: separarse de la fuente sin
 * que nadie se entere. Eso ya pasó. El fichero declaraba los planes `ESENCIAL` /
 * `CLINICA` / `CADENA` y los módulos `AGENDA` / `HISTORIA` / `CAJA`; el catálogo
 * usa `PACK_SPA` / `PACK_CLINIC` / `PACK_FULL` y `SCHEDULING` /
 * `CLINICAL_HISTORY` / `CASH_REGISTER`. Ninguno de los seis coincidía, y
 * `contratacion.source.ts` manda ese `code` al servidor tal cual: el embudo de
 * compra estaba roto de punta a punta y fallaba DESPUÉS del registro, que es el
 * peor momento posible. Ninguna puerta lo comparaba con nada.
 *
 * ── Por qué NO se compara contra el contrato ───────────────────────────────
 * Era la primera idea y no funciona: `api.generated.d.ts` declara `code` como
 * `string` pelado. El contrato garantiza la FORMA de la respuesta, no el
 * VOCABULARIO del catálogo, así que no hay ni un solo `PACK_CLINIC` en los tipos
 * generados contra el que afirmar nada. Comprobado con `grep` sobre
 * `src/types/api.generated.d.ts` y `api/openapi.json`: cero apariciones.
 *
 * ── Contra qué se compara entonces ─────────────────────────────────────────
 * Contra las semillas del backend, que SON la fuente de verdad y se aplican en
 * todos los entornos: los changesets 308 (artículos y días de prueba), 309
 * (`bundle_components`) y 310 (la tarifa y sus 64 precios). Este repositorio no
 * los tiene, pero en el árbol de trabajo del equipo los cuatro repos son
 * hermanos, así que están un nivel más arriba.
 *
 * ── Qué pasa cuando el backend NO está al lado ─────────────────────────────
 * El bloque se SALTA, y se ve saltado en la salida de vitest. Es una puerta de
 * escritorio, no de CI: en el CI del front no hay backend que leer y fingir lo
 * contrario sería peor. Lo que sí corre siempre es el bloque de invariantes de
 * más abajo, que no depende de nada externo.
 *
 * <p><b>Y por eso el catálogo se lee PEREZOSAMENTE, dentro de cada caso.</b>
 * `describe.skipIf(...)` marca los casos como saltados pero **ejecuta igual el
 * cuerpo del `describe`** —es la fase de recolección, y ahí es donde vitest
 * descubre qué `it` hay dentro—. Con la lectura en el cuerpo, un árbol sin
 * backend al lado no saltaba nada: `readFileSync` lanzaba `ENOENT` durante la
 * recolección, el fichero entero fallaba como *suite* y **ni siquiera corrían
 * las invariantes de más abajo**, que son justo las que no dependen de nada.
 * Es decir, la única situación para la que se escribió el `skipIf` —el CI del
 * front— era la única en la que este fichero se ponía rojo. Comprobado
 * ejecutando un `describe.skipIf(true)` con un `throw` en el cuerpo: falla.
 *
 * ── La trampa que este fichero evita a propósito ───────────────────────────
 * Un analizador a base de expresiones regulares que deje de casar por un cambio
 * de formato en el XML no falla: devuelve cero filas y todas las afirmaciones
 * pasan en vacío. Eso es exactamente el instrumento que miente. Por eso lo
 * primero que se afirma son los CARDINALES —26 artículos, 27 componentes, 32
 * tramos—: si el análisis se rompe, se rompe RUIDOSAMENTE y en la primera línea.
 */

/**
 * Se resuelve desde `process.cwd()` —la raíz del repositorio cuando vitest
 * arranca— y NO desde `import.meta.url`: bajo el entorno `jsdom` que configura
 * este proyecto, `import.meta.url` es una URL `http://`, y `fileURLToPath` la
 * rechaza con «The URL must be of scheme file». Si alguien lanza vitest desde
 * otro directorio, `existsSync` da falso y el bloque se salta avisando.
 */
const MIGRACIONES = resolve(
  process.cwd(),
  '../VetSoftware/src/main/resources/db/changelog/migrations',
)

const F_ITEMS = resolve(MIGRACIONES, '308_seed_commercial_catalog_items.xml')
const F_RELACIONES = resolve(MIGRACIONES, '309_seed_commercial_catalog_relations.xml')
const F_PRECIOS = resolve(MIGRACIONES, '310_seed_price_list_2026.xml')

const HAY_BACKEND = [F_ITEMS, F_RELACIONES, F_PRECIOS].every((f) => existsSync(f))

/** El cuerpo de un `<changeSet id="...">`, que es lo que acota cada consulta. */
function changeSet(xml: string, id: string): string {
  const inicio = xml.indexOf(`<changeSet id="${id}"`)
  if (inicio < 0) throw new Error(`No existe el changeSet «${id}»`)
  const fin = xml.indexOf('</changeSet>', inicio)
  if (fin < 0) throw new Error(`El changeSet «${id}» no cierra`)
  return xml.slice(inicio, fin)
}

/**
 * Trocea un `SELECT ... UNION ALL SELECT ...` en campos.
 *
 * Se escribe a mano y no con `split(',')` porque los nombres del catálogo llevan
 * comas dentro de las comillas —«Clientes, mascotas y administración de la propia
 * cuenta», «Servicios, tarifas y promociones»— y partir por comas los rompería
 * por la mitad sin avisar.
 */
function campos(fila: string): string[] {
  const salida: string[] = []
  let actual = ''
  let comillas = false
  let profundidad = 0
  for (let i = 0; i < fila.length; i += 1) {
    const c = fila[i]
    if (comillas) {
      if (c === "'" && fila[i + 1] === "'") {
        actual += "''"
        i += 1
        continue
      }
      if (c === "'") comillas = false
      actual += c
      continue
    }
    if (c === "'") {
      comillas = true
      actual += c
      continue
    }
    if (c === '(') profundidad += 1
    if (c === ')') profundidad -= 1
    if (c === ',' && profundidad === 0) {
      salida.push(actual)
      actual = ''
      continue
    }
    actual += c
  }
  salida.push(actual)
  return salida.map((s) => s.trim())
}

/** `'texto'` → texto · `NULL` / `CAST(NULL AS …)` → `null` · `TRUE`/`FALSE` → booleano · cifra → número. */
function valor(bruto: string): string | number | boolean | null {
  // La primera fila de cada `UNION ALL` lleva alias (`'CORE' AS code`): sobran.
  const sinAlias = bruto.replace(/\s+AS\s+[a-z_]+\s*$/i, '').trim()
  if (/^CAST\s*\(\s*NULL\b/i.test(sinAlias) || /^NULL$/i.test(sinAlias)) return null
  if (/^TRUE$/i.test(sinAlias)) return true
  if (/^FALSE$/i.test(sinAlias)) return false
  if (/^'.*'$/s.test(sinAlias)) return sinAlias.slice(1, -1).replace(/''/g, "'")
  const n = Number(sinAlias)
  return Number.isNaN(n) ? sinAlias : n
}

/**
 * Las filas de la tabla derivada `) seed`. Se busca el cierre y se retrocede
 * hasta su paréntesis de apertura, que es lo único que funciona igual en los tres
 * ficheros: en 308 la tabla cuelga de un `FROM (`, en 310 de un `JOIN (` que va
 * detrás de otro `JOIN (…) cyc`.
 */
function filasSeed(sql: string): (string | number | boolean | null)[][] {
  const cierre = sql.indexOf(') seed')
  if (cierre < 0) throw new Error('No se encontró la tabla derivada `) seed`')
  let profundidad = 0
  let apertura = -1
  for (let i = cierre; i >= 0; i -= 1) {
    if (sql[i] === ')') profundidad += 1
    if (sql[i] === '(') {
      profundidad -= 1
      if (profundidad === 0) {
        apertura = i
        break
      }
    }
  }
  if (apertura < 0) throw new Error('La tabla derivada `) seed` no abre')
  return sql
    .slice(apertura + 1, cierre)
    .split(/UNION\s+ALL\s+SELECT/i)
    .map((trozo) => trozo.replace(/^\s*SELECT\b/i, ''))
    .map((trozo) => campos(trozo).map(valor))
}

interface Articulo {
  name: string
  itemType: string
  capacityUnit: string | null
  trialEligibility: string
  defaultTrialDays: number | null
}

interface Tramo {
  tierMin: number
  monthly: number
  annual: number
  setup: number
}

function leerCatalogo() {
  const items = new Map<string, Articulo>()
  for (const f of filasSeed(
    changeSet(readFileSync(F_ITEMS, 'utf8'), '308_seed_commercial_catalog_items'),
  )) {
    // code, name, short_description, item_type, capacity_unit, is_core,
    // min_quantity, max_quantity, sort_order, trial_eligibility,
    // default_trial_days, trial_outcome, service_nature
    items.set(String(f[0]), {
      name: String(f[1]),
      itemType: String(f[3]),
      capacityUnit: f[4] === null ? null : String(f[4]),
      trialEligibility: String(f[9]),
      defaultTrialDays: typeof f[10] === 'number' ? f[10] : null,
    })
  }

  const componentes: { paquete: string; componente: string }[] = filasSeed(
    changeSet(readFileSync(F_RELACIONES, 'utf8'), '309_seed_bundle_components'),
  ).map((f) => ({ paquete: String(f[0]), componente: String(f[1]) }))

  const precios = new Map<string, Tramo>()
  for (const f of filasSeed(
    changeSet(readFileSync(F_PRECIOS, 'utf8'), '310_seed_catalog_prices_2026'),
  )) {
    // code, tier_min, tier_max, included_quantity, monthly, annual, setup
    const code = String(f[0])
    const tierMin = Number(f[1])
    if (tierMin !== 1) continue // solo el tramo de ENTRADA: es lo único que el contrato publica
    precios.set(code, {
      tierMin,
      monthly: Number(f[4]),
      annual: Number(f[5]),
      setup: Number(f[6]),
    })
  }

  const listaSql = changeSet(readFileSync(F_PRECIOS, 'utf8'), '310_seed_price_list_2026')
  const lista = campos(
    listaSql.slice(listaSql.indexOf('SELECT ') + 'SELECT '.length, listaSql.indexOf('WHERE NOT')),
  ).map(valor)

  return {
    items,
    componentes,
    precios,
    // code, name, currency, valid_from, valid_to, status
    lista: {
      code: String(lista[0]),
      currency: String(lista[2]),
      validFrom: String(lista[3]),
    },
  }
}

/**
 * El catálogo leído una sola vez, y **solo cuando alguien lo pide**. Ver la nota
 * del encabezado: leerlo en el cuerpo del `describe` hundía el fichero entero en
 * el único entorno donde el `skipIf` tenía que servir de algo.
 */
let cacheCatalogo: ReturnType<typeof leerCatalogo> | null = null
function catalogo(): ReturnType<typeof leerCatalogo> {
  cacheCatalogo ??= leerCatalogo()
  return cacheCatalogo
}

describe.skipIf(!HAY_BACKEND)('plans.content · contraste contra las semillas del backend', () => {
  it('el análisis del XML encontró lo que tiene que encontrar', () => {
    // ESTA PRUEBA VA PRIMERA A PROPÓSITO. Si el formato del XML cambia y las
    // expresiones regulares dejan de casar, todo lo demás pasaría EN VACÍO. Los
    // cardinales convierten ese silencio en un fallo.
    expect(catalogo().items.size, 'el changeset 308 siembra 26 artículos').toBe(26)
    expect(catalogo().componentes, 'el changeset 309 siembra 27 componentes').toHaveLength(27)
    // 32 filas en el changeset 310, de las que 6 son tramos superiores de
    // EXTRA_USER / EXTRA_BRANCH / EXTRA_TERMINAL / EXTRA_STORAGE y se descartan.
    expect(catalogo().precios.size, 'el changeset 310 tiene 26 tramos de entrada').toBe(26)
    expect(catalogo().items.get('CORE')?.name).toBe('Núcleo: clientes y mascotas')
  })

  it('el sello nombra la lista de precio que de verdad existe', () => {
    // Decía `PUB-2026-COP`, que no es el código de ninguna lista sembrada.
    expect(SELLO.listaDePrecioCodigo).toBe(catalogo().lista.code)
  })

  it('la moneda y la fecha de vigencia son las de la lista', () => {
    expect(PLANS_CONTENT.currency).toBe(catalogo().lista.currency)
    expect(PLANS_CONTENT.priceValidFrom).toBe(catalogo().lista.validFrom)
  })

  it('los tres planes son paquetes del catálogo, con su nombre y su precio', () => {
    for (const plan of PLANS_CONTENT.plans) {
      const articulo = catalogo().items.get(plan.code)
      expect(articulo, `«${plan.code}» no es un artículo del catálogo`).toBeDefined()
      expect(articulo!.itemType, `«${plan.code}» no es un BUNDLE`).toBe('BUNDLE')
      expect(plan.name, `el nombre de «${plan.code}»`).toBe(articulo!.name)

      const tramo = catalogo().precios.get(plan.code)
      expect(tramo, `«${plan.code}» no tiene precio de entrada en la tarifa`).toBeDefined()
      expect(plan.monthlyFromAmount, `el mensual de «${plan.code}»`).toBe(tramo!.monthly)
      expect(plan.annualFromAmount, `el anual de «${plan.code}»`).toBe(tramo!.annual)
      expect(plan.setupAmount, `la implantación de «${plan.code}»`).toBe(tramo!.setup)
    }
  })

  it('los `includes` son exactamente los módulos que trae cada paquete', () => {
    for (const plan of PLANS_CONTENT.plans) {
      const modulos = catalogo()
        .componentes.filter((c) => c.paquete === plan.code)
        .map((c) => c.componente)
        .filter((code) => catalogo().items.get(code)?.itemType === 'MODULE')
      expect(
        [...plan.includes.map((i) => i.code)].sort(),
        `los módulos de «${plan.code}» no son los de bundle_components`,
      ).toEqual([...modulos].sort())
    }
  })

  it('cada módulo lleva su nombre y sus días de prueba REALES', () => {
    for (const plan of PLANS_CONTENT.plans) {
      for (const incluido of plan.includes) {
        const articulo = catalogo().items.get(incluido.code)
        expect(articulo, `«${incluido.code}» no existe en el catálogo`).toBeDefined()
        expect(incluido.name, `el nombre de «${incluido.code}»`).toBe(articulo!.name)

        // El mismo `CASE` que `JpaPublicPlanQueryPort.SQL_COMPONENTS`: los días
        // solo cuentan si el artículo es ELIGIBLE.
        const esperado =
          articulo!.trialEligibility === 'ELIGIBLE' ? articulo!.defaultTrialDays : null
        expect(
          incluido.trialDays,
          `«${incluido.code}» es ${articulo!.trialEligibility} en el catálogo`,
        ).toBe(esperado)
      }
    }
  })

  it('la facturación electrónica DIAN nunca anuncia prueba', () => {
    // Regresión con nombre propio. `ELECTRONIC_INVOICING` es NEVER_FREE y esta
    // pantalla prometía 14 días gratis sobre ella: regalar la facturación
    // electrónica que un paquete lleva dentro es justo lo que el catálogo
    // prohíbe, y `chk_catalog_items_trial_policy` lo impone en el esquema.
    expect(catalogo().items.get('ELECTRONIC_INVOICING')?.trialEligibility).toBe('NEVER_FREE')
    for (const plan of PLANS_CONTENT.plans) {
      const dian = plan.includes.find((i) => i.code === 'ELECTRONIC_INVOICING')
      if (dian) expect(dian.trialDays, `«${plan.code}» promete prueba de DIAN`).toBeNull()
    }
  })

  it('las capacidades nombran el artículo que vende la unidad, con su precio', () => {
    for (const plan of PLANS_CONTENT.plans) {
      for (const capacidad of plan.capacities) {
        const articulo = catalogo().items.get(capacidad.code)
        expect(articulo, `«${capacidad.code}» no existe en el catálogo`).toBeDefined()
        expect(articulo!.itemType, `«${capacidad.code}» no es CAPACITY`).toBe('CAPACITY')
        expect(articulo!.capacityUnit, `el eje de «${capacidad.code}»`).toBe(capacidad.unit)
        expect(capacidad.name, `el nombre de «${capacidad.code}»`).toBe(articulo!.name)

        const tramo = catalogo().precios.get(capacidad.code)
        expect(tramo, `«${capacidad.code}» no tiene tramo de entrada`).toBeDefined()
        expect(capacidad.monthlyExtraUnitAmount, `el mensual de «${capacidad.code}»`).toBe(
          tramo!.monthly,
        )
        expect(capacidad.annualExtraUnitAmount, `el anual de «${capacidad.code}»`).toBe(
          tramo!.annual,
        )
      }
    }
  })
})

/**
 * Lo que sí corre siempre, backend o no. Son las invariantes que el defecto de
 * los seis códigos habría roto sin necesidad de leer ninguna semilla: nada de
 * esto habría dejado pasar `ESENCIAL` ni `AGENDA`.
 */
describe('plans.content · invariantes que no dependen del backend', () => {
  it('los planes son paquetes y todo código va en el vocabulario del catálogo', () => {
    const CODIGO = /^[A-Z][A-Z0-9_]*$/
    for (const plan of PLANS_CONTENT.plans) {
      expect(plan.code, `«${plan.code}» no parece un paquete del catálogo`).toMatch(
        /^PACK_[A-Z_]+$/,
      )
      for (const incluido of plan.includes) {
        expect(incluido.code, `«${incluido.code}»`).toMatch(CODIGO)
      }
      for (const capacidad of plan.capacities) {
        expect(capacidad.code, `«${capacidad.code}»`).toMatch(CODIGO)
        // El eje NO es el código del artículo: `USER` es la unidad, `EXTRA_USER`
        // el artículo que la vende. Confundirlos fue la mitad del defecto.
        expect(capacidad.code, `«${capacidad.code}» es el eje, no el artículo`).not.toBe(
          capacidad.unit,
        )
      }
    }
  })

  it('deja constancia de si el contraste con el backend llegó a ejecutarse', () => {
    // Un bloque saltado se ve en la salida de vitest, pero solo si alguien mira.
    // Esta línea existe para que «no se comparó nada» quede escrito en el log en
    // vez de parecerse a «todo bien».
    if (!HAY_BACKEND) {
      console.warn(
        `[plans.content] Sin contraste: no hay backend en ${MIGRACIONES}. ` +
          'Los códigos y los días de prueba NO se han comparado contra el catálogo.',
      )
    }
    expect(typeof HAY_BACKEND).toBe('boolean')
  })
})
