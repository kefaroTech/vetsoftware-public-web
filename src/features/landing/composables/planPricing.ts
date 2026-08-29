import type { Ciclo, PublicPlan } from '../types/plans.types'

/**
 * Cálculo ORIENTATIVO del precio de un plan. Funciones puras, sin estado y sin
 * red: son las mismas que alimentan el resumen de `/planes`, el carril del paso
 * de registro y la comparación contra el importe del servidor en el paso 6.
 *
 * No vive en `features/tienda/composables/pricing.ts` (el núcleo monetario del
 * punto de venta) ni en `composables/format.ts`: esto es vocabulario de una
 * feature —tramos de capacidad de una lista de precio comercial— y ese es el
 * criterio del repo para no volver a acumular tres módulos con la misma cuenta
 * escrita de tres maneras. Lo que sí se reutiliza es la aritmética de dinero,
 * que es común.
 *
 * **Nada de lo que sale de aquí es vinculante.** Es el precio de lista
 * transcrito en el front (ver el sello de `content/plans.content.ts`) y se
 * rotula siempre «desde» / «estimado». El importe que obliga lo calcula el
 * servidor en el paso de contratación.
 */

/** Cuántas mensualidades se cobran en el ciclo anual. Diez: «2 meses gratis». */
export const MESES_COBRADOS_AL_ANO = 10

/**
 * Redondeo a peso entero.
 *
 * **No** se usa el núcleo monetario en centavos de
 * `features/tienda/composables/money.ts`, y es deliberado: importarlo desde aquí
 * sería acoplar el escaparate al punto de venta, que es exactamente el
 * acoplamiento que el repo ya deshizo una vez subiendo `formatMoney` a
 * `composables/money.ts`. Y no hace falta: estos importes son precios de lista
 * en pesos enteros multiplicados por enteros pequeños, y la única operación con
 * decimales es el IVA, que se redondea aquí.
 *
 * La precisión al centavo importa donde el cálculo tiene que cuadrar con un
 * documento electrónico. Aquí no: esta cifra es ORIENTATIVA y se rotula como
 * tal, y la vinculante la calcula el servidor.
 */
function aPesos(valor: number): number {
  return Number.isFinite(valor) ? Math.round(valor) : 0
}

export interface SeleccionPlan {
  ciclo: Ciclo
  sedes: number
  usuarios: number
}

export interface DesgloseEstimado {
  /** Precio de entrada del plan en el ciclo elegido. */
  base: number
  /** Lo que cuestan las sedes por encima de las incluidas. */
  sedesExtra: number
  /** Lo que cuestan las personas por encima de las incluidas. */
  usuariosExtra: number
  /** `base + sedesExtra + usuariosExtra`, sin impuesto. */
  subtotal: number
  /** Impuesto sobre el subtotal, con la tarifa del plan. */
  impuesto: number
  /** `subtotal + impuesto`. */
  total: number
  /** Cuántas sedes se cobran aparte. Cero cuando todas están incluidas. */
  sedesCobradas: number
  /** Cuántas personas se cobran aparte. */
  usuariosCobrados: number
}

function incluidas(plan: PublicPlan, unit: 'USER' | 'BRANCH'): number {
  return plan.capacities.find((c) => c.unit === unit)?.included ?? 0
}

function precioExtra(plan: PublicPlan, unit: 'USER' | 'BRANCH'): number {
  return plan.capacities.find((c) => c.unit === unit)?.extraUnitAmount ?? 0
}

/** El precio de entrada del plan en el ciclo pedido. */
export function precioBase(plan: PublicPlan, ciclo: Ciclo): number {
  return ciclo === 'ANUAL' ? plan.annualFromAmount : plan.monthlyFromAmount
}

/**
 * Lo que se ahorra pagando un año por adelantado, en pesos: doce mensualidades
 * menos el precio anual. Se calcula, NO se declara en el contenido: si alguien
 * cambia un precio y se olvida del otro, la cifra del ahorro se mueve sola en
 * vez de mentir.
 */
export function ahorroAnual(plan: PublicPlan): number {
  return aPesos(plan.monthlyFromAmount * 12 - plan.annualFromAmount)
}

/**
 * Desglose orientativo de una selección.
 *
 * Los precios de unidad adicional del catálogo son MENSUALES; en ciclo anual se
 * multiplican por `MESES_COBRADOS_AL_ANO`, la misma proporción que el precio
 * base. Sin esta simetría, subir una sede saldría diez veces más barato en el
 * plan anual que en el mensual, que es la clase de incoherencia que el usuario
 * detecta antes que nosotros.
 */
export function calcularEstimado(plan: PublicPlan, seleccion: SeleccionPlan): DesgloseEstimado {
  const factor = seleccion.ciclo === 'ANUAL' ? MESES_COBRADOS_AL_ANO : 1

  const sedesCobradas = Math.max(0, Math.trunc(seleccion.sedes) - incluidas(plan, 'BRANCH'))
  const usuariosCobrados = Math.max(0, Math.trunc(seleccion.usuarios) - incluidas(plan, 'USER'))

  const base = precioBase(plan, seleccion.ciclo)
  const sedesExtra = aPesos(precioExtra(plan, 'BRANCH') * sedesCobradas * factor)
  const usuariosExtra = aPesos(precioExtra(plan, 'USER') * usuariosCobrados * factor)

  const subtotal = aPesos(base + sedesExtra + usuariosExtra)
  const impuesto = aPesos((subtotal * plan.taxRate) / 100)

  return {
    base,
    sedesExtra,
    usuariosExtra,
    subtotal,
    impuesto,
    total: aPesos(subtotal + impuesto),
    sedesCobradas,
    usuariosCobrados,
  }
}

/**
 * El importe MENSUAL equivalente de una selección, sin impuesto.
 *
 * Es lo que se guarda en la intención (`importeVistoMensual`) y lo que se
 * compara luego contra el servidor. Se normaliza a mensual a propósito: si se
 * guardara el importe del ciclo elegido, cambiar de mensual a anual entre una
 * sesión y otra se leería como una subida de precio del 900 %.
 */
export function subtotalMensualEquivalente(plan: PublicPlan, seleccion: SeleccionPlan): number {
  const mensual = calcularEstimado(plan, { ...seleccion, ciclo: 'MENSUAL' })
  return mensual.subtotal
}

/** Sufijo del rótulo del precio según el ciclo. Nunca se muestra el enum crudo. */
export function sufijoCiclo(ciclo: Ciclo): string {
  return ciclo === 'ANUAL' ? 'al año' : 'al mes'
}
