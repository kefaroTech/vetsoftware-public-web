import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { MAX_CANTIDAD_LINEA, MAX_CANTIDAD_LINEA_TXT } from '@/constants/cantidades'
import PlanesConfigurador from '@/features/landing/components/PlanesConfigurador.vue'
import { PLANS_CONTENT } from '@/features/landing/content/plans.content'
import { exigir } from '../helpers/exigir'

/**
 * LOS DOS CAMPOS QUE EL CLIENTE RELLENA EN EL EMBUDO, Y SUS BORDES.
 *
 * ── Por qué merecen prueba propia ──────────────────────────────────────────
 * «Sedes» y «personas» son los únicos campos que un humano teclea en todo el
 * embudo de contratación, y lo que escriba **viaja al servidor**: acaba siendo
 * la `quantity` de una línea de `POST /quotes/self-serve`. Todo lo demás de la
 * pantalla es una elección entre opciones cerradas.
 *
 * <p>El borde de abajo lo cubre `normalizar()` y es el que rompía primero: un
 * `<input type="number">` devuelve **cadena vacía** al borrarlo, y sin saneado
 * `Number('')` es `0`. Con cero personas el estimado sale más barato que el plan
 * y la línea que viaja lleva `quantity: 0`, que el borde REST rechaza con un 400
 * (`@Positive`) — un error de servidor por un campo que el usuario simplemente
 * dejó vacío.
 *
 * <p>El borde de ARRIBA ya no está sin cubrir. `quantity` es un `int` con
 * `@Positive`, y por encima de `Integer.MAX_VALUE` el fallo ocurre **antes** de
 * la validación: Jackson no llega a construir el objeto y la respuesta es un 400
 * pelado, sin campo y sin mensaje. Un `<input type="number">` acepta `1e10` sin
 * pestañear, así que llegar ahí no requiere mala fe — basta apoyarse en la tecla
 * del cero. El techo vive en `normalizar()`, junto al suelo, y **se anuncia**:
 * los casos de abajo comprueban las dos mitades, porque un recorte silencioso de
 * un `500` tecleado sería otro defecto y pasaría igual un test que solo mirara
 * el número emitido.
 */

const PROPS = {
  plans: PLANS_CONTENT.plans,
  planCode: 'PACK_CLINIC',
  ciclo: 'MENSUAL' as const,
  // Arrancan en 5 y no en 1 a propósito: `defineModel` no emite cuando el valor
  // normalizado coincide con el que ya hay, así que partir de 1 dejaría los
  // casos del suelo sin emisión que observar — verdes por no haber mirado nada.
  sedes: 5,
  usuarios: 5,
}

/** Escribe en un campo numérico y devuelve lo que emitió Y lo que quedó en pantalla. */
async function teclear(
  campo: 'sedes' | 'usuarios',
  valor: string,
): Promise<{ emitido: number | undefined; texto: string }> {
  const wrapper = mount(PlanesConfigurador, { props: PROPS })
  const etiqueta = campo === 'sedes' ? '¿Cuántas sedes tienes?' : '¿Cuántas personas van a usarlo?'
  const label = exigir(
    wrapper.findAll('label').find((l) => l.text().includes(etiqueta)),
    "wrapper.findAll('label').find((l) => l.text().includes(…",
  )
  const input = wrapper.find(`#${label.attributes('for')}`)

  await input.setValue(valor)

  const emitido = wrapper.emitted(`update:${campo}`) as [number][] | undefined
  return { emitido: emitido?.at(-1)?.[0], texto: wrapper.text() }
}

/** Solo el número emitido, para los casos del suelo, que no pintan nada. */
async function escribir(campo: 'sedes' | 'usuarios', valor: string): Promise<number | undefined> {
  return (await teclear(campo, valor)).emitido
}

describe('el suelo de los campos que el cliente teclea', () => {
  it('vaciar el campo no significa cero: significa uno', async () => {
    // El caso que de verdad ocurre: el usuario selecciona el «1» y lo borra para
    // escribir otro número. Entre las dos pulsaciones el campo está vacío.
    expect(await escribir('usuarios', '')).toBe(1)
    expect(await escribir('sedes', '')).toBe(1)
  })

  it('un cero explícito tampoco pasa', async () => {
    // «Cero personas van a usarlo» no es una respuesta que el embudo pueda
    // mandar: `@Positive` la rechaza y el usuario ve un fallo de servidor.
    expect(await escribir('usuarios', '0')).toBe(1)
  })

  it('un negativo tampoco', async () => {
    expect(await escribir('sedes', '-4')).toBe(1)
  })

  it('los decimales se truncan: no hay media sede', async () => {
    // `quantity` es un `int` en el contrato. Mandar 2,9 lo redondearía en algún
    // sitio que este lado no controla.
    expect(await escribir('sedes', '2.9')).toBe(2)
  })

  it('un número normal llega tal cual', async () => {
    // El control de los cuatro casos de arriba: sin esto, un `normalizar()` que
    // devolviera siempre 1 los pasaría todos en verde.
    expect(await escribir('usuarios', '7')).toBe(7)
  })
})

describe('el techo de los campos que el cliente teclea', () => {
  it('una cantidad imposible se recorta al techo Y SE DICE', async () => {
    // Once ceros. No hace falta mala fe: es lo que sale de apoyarse en la tecla.
    // Sin techo esto viaja como `quantity` y revienta la DESERIALIZACIÓN, no la
    // validación: el cliente recibe un 400 sin campo y sin mensaje.
    const { emitido, texto } = await teclear('sedes', '10000000000')

    expect(emitido).toBe(MAX_CANTIDAD_LINEA)
    // Y la segunda mitad, que es la que separa esto de un defecto nuevo: se
    // anuncia. Recortar en silencio deja a alguien creyendo que contrató lo que
    // escribió. El mensaje NOMBRA el límite; un «demasiado grande» no sirve.
    expect(texto).toContain(MAX_CANTIDAD_LINEA_TXT)
  })

  it('la notación científica tampoco pasa: `1e10` es un número válido para el campo', async () => {
    // `<input type="number">` acepta `1e10` como valor válido, así que el saneado
    // por dígitos que usan otros formularios no lo atraparía aquí.
    const { emitido, texto } = await teclear('usuarios', '1e10')

    expect(emitido).toBe(MAX_CANTIDAD_LINEA)
    expect(texto).toContain(MAX_CANTIDAD_LINEA_TXT)
  })

  it('el techo exacto SÍ pasa, y sin aviso: es un valor permitido, no un error', async () => {
    // El borde por dentro. Un `>` escrito como `>=` haría pasar este caso a rojo.
    const { emitido, texto } = await teclear('sedes', String(MAX_CANTIDAD_LINEA))

    expect(emitido).toBe(MAX_CANTIDAD_LINEA)
    expect(texto).not.toContain(MAX_CANTIDAD_LINEA_TXT)
  })

  it('una cantidad REAL no se toca ni se comenta', async () => {
    // El control que hace falsable todo lo de arriba. Una cadena de 500 sedes no
    // existe, pero 500 personas sí, y un techo que reescribiera ese número —o que
    // sacara un aviso sobre él— sería peor que no tener techo: el cliente habría
    // pedido una cosa y contratado otra sin enterarse.
    const { emitido, texto } = await teclear('usuarios', '500')

    expect(emitido).toBe(500)
    expect(texto).not.toContain(MAX_CANTIDAD_LINEA_TXT)
  })
})
