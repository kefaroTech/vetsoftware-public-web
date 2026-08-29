import type {
  CompanyCapacityResponse,
  CompanyLimitEventType,
  LimitEnforcement,
} from '../types/cupos.types'

/**
 * El vocabulario de los cupos. **Puro**: funciones y datos, sin estado ni peticiones.
 *
 * <p>Es el bloque con más valor operativo de la feature. Sin él, el tope llega a mitad de una
 * consulta veterinaria: la auxiliar recibe un rechazo con el animal encima de la mesa y no hay
 * ninguna pantalla que le diga por qué.
 */

/** Umbrales de aviso. `warnThreshold` del contrato se añade cuando viene y es mayor que 60. */
const UMBRALES = [90, 80, 60] as const

const UMBRAL_MINIMO_CONTRATO = 60

/**
 * Rótulos de las dimensiones sembradas hoy (`313_seed_limit_dimensions`): ocho ejes.
 *
 * <p><b>`dimensionCode` es un dato, no un enum.</b> El backend puede sembrar
 * `APPOINTMENTS_PER_MONTH` insertando una fila y sin desplegar nada. Por eso el mapa **cae al
 * código en mayúsculas** cuando no lo conoce: es feo a propósito —se lee como «falta
 * traducir»— y no como una etiqueta legítima. Lo que nunca produce es `undefined`; la consola
 * ya sufrió el «7 de 10 undefined» y lo dejó escrito.
 */
const SUSTANTIVOS: Record<string, string> = {
  ANIMAL: 'mascotas',
  OWNER: 'propietarios',
  APPOINTMENT: 'citas',
  INVOICE: 'facturas',
  USER: 'usuarios',
  BRANCH: 'sedes',
  TERMINAL: 'terminales de caja',
  STORAGE_GB: 'GB de almacenamiento',
}

/** El sustantivo con el que se nombra un cupo. Nunca `undefined`. */
export function sustantivo(dimensionCode: string | undefined): string {
  if (!dimensionCode) return 'ELEMENTOS'
  return SUSTANTIVOS[dimensionCode] ?? dimensionCode.toUpperCase()
}

/**
 * El texto que acompaña **siempre** a la barra: `340 de 500 mascotas`.
 *
 * <p>La barra nunca va sola. Un 68 % no se puede leer por teléfono ni contar en un correo, y por
 * teléfono es exactamente como esto se cuenta cuando la clínica llama a soporte.
 *
 * <p>Un límite ausente **no es un límite de cero**: se dice «sin límite» y la barra no se pinta.
 */
export function medidorTexto(
  usado: number | undefined,
  limite: number | undefined,
  code: string | undefined,
): string {
  const n = usado ?? 0
  const nombre = sustantivo(code)
  if (limite == null) return `${n} ${nombre} · sin límite`
  return `${n} de ${limite} ${nombre}`
}

/**
 * El umbral más alto alcanzado, o `null`. **Solo uno**: nunca se apilan los tres.
 *
 * <p>`warnThreshold` es el que pactó el contrato; contradecirlo en pantalla sería mentir sobre
 * el contrato, así que se respeta cuando viene y es mayor que el suelo de 60.
 */
export function umbralAlcanzado(
  usado: number | undefined,
  limite: number | undefined,
  warnThreshold?: number,
): number | null {
  if (limite == null || limite <= 0) return null
  const n = usado ?? 0
  if (n >= limite) return null
  const pct = (n / limite) * 100
  const candidatos = [...UMBRALES] as number[]
  if (warnThreshold != null && warnThreshold > UMBRAL_MINIMO_CONTRATO)
    candidatos.push(warnThreshold)
  const alcanzados = candidatos.filter((u) => pct >= u)
  return alcanzados.length > 0 ? Math.max(...alcanzados) : null
}

/**
 * Qué pasa al agotarse, según el modo. `null` cuando el modo no se conoce.
 *
 * <p>**No se adivina.** `enforcement` vive en `SubscriptionItemLimitResponse` y el consumo en
 * `CompanyCapacityResponse`; se cruzan por `limitDimensionId` en el cliente, y una dimensión
 * puede tener capacidad sin límite o al revés. Decirle a alguien «puedes seguir registrando»
 * cuando en realidad va a chocar es peor que no decir nada.
 */
export function consecuencia(enforcement: LimitEnforcement | undefined): string | null {
  switch (enforcement) {
    case 'BLOCK':
      return 'no podrás registrar más'
    case 'OVERAGE':
      return 'se cobrará aparte'
    case 'WARN':
      return 'seguirás pudiendo registrar'
    case 'READ_ONLY':
      return 'solo podrás consultar lo que ya tienes'
    default:
      return null
  }
}

export interface AvisoCupo {
  tono: 'warning' | 'error'
  /** La parte en negrita: **qué pasa**. */
  fuerte: string
  /** El resto: qué significa y qué hacer. Puede ir vacío. */
  resto: string
}

/*
 * Aquí vivía `avisoTexto(aviso)`, que unía `fuerte` y `resto` en una línea «para pruebas y para
 * el nombre accesible». Se borra: el nombre accesible nunca lo necesitó —`CupoCard` pinta las
 * dos partes dentro del mismo `<span>`, así que el lector ya las lee seguidas— y su único
 * llamante eran sus propias pruebas. Una función de producción cuyo único consumidor es el test
 * que la cubre no está cubierta: está sola. El helper equivalente vive ahora en
 * `tests/unit/suscripcion-cupos.spec.ts`, que es donde hacía falta.
 */

function restantesTexto(limite: number, usado: number, nombre: string): string {
  return `${Math.max(0, limite - usado)} ${nombre}`
}

/**
 * El aviso de un cupo agotado o pasado.
 *
 * <p><b>`WARN` lleva texto propio y es el caso que justifica media pantalla.</b>
 * `LimitEnforcement` tiene cuatro valores y el que **avisa sin impedir nada** es hoy
 * indistinguible de un fallo, porque nada se lo explica a la clínica. La frase «puedes seguir
 * registrando» es la parte que no se puede recortar.
 */
function avisoAgotado(
  usado: number,
  limite: number,
  nombre: string,
  enforcement: LimitEnforcement | undefined,
): AvisoCupo {
  switch (enforcement) {
    case 'BLOCK':
      return {
        tono: 'error',
        fuerte: `Se agotó tu cupo de ${nombre}`,
        resto: `(${limite}). No podrás registrar más hasta que se amplíe. Lo que ya tienes sigue funcionando con normalidad.`,
      }
    case 'WARN':
      return {
        tono: 'warning',
        fuerte: `Pasaste tu cupo de ${nombre}`,
        resto: `(${usado} de ${limite}). Puedes seguir registrando: esto es solo un aviso, no un tope.`,
      }
    case 'OVERAGE':
      return {
        tono: 'warning',
        fuerte: `Pasaste tu cupo de ${nombre}`,
        resto: `(${usado} de ${limite}). Puedes seguir registrando, y lo que exceda se cobra aparte en la próxima cuenta.`,
      }
    case 'READ_ONLY':
      return {
        tono: 'error',
        fuerte: `Se agotó tu cupo de ${nombre}`,
        resto: `(${limite}). Puedes consultar e imprimir lo que ya tienes; para registrar más hay que ampliar.`,
      }
    default:
      // Modo desconocido: se dice lo que se sabe —el número— y nada más. Ver §11.3.
      return {
        tono: 'warning',
        fuerte: `Llegaste al tope de tu cupo de ${nombre}`,
        resto: `(${usado} de ${limite}). Escríbenos y te decimos cómo ampliarlo.`,
      }
  }
}

/**
 * El aviso que corresponde a una capacidad, o `null` si no hay nada que decir.
 *
 * <p>Sin techo declarado no hay aviso posible: no se puede estar al 80 % de nada.
 */
export function avisoCupo(
  capacidad: Pick<CompanyCapacityResponse, 'usedQuantity' | 'limitQuantity' | 'dimensionCode'>,
  enforcement?: LimitEnforcement,
  warnThreshold?: number,
): AvisoCupo | null {
  const limite = capacidad.limitQuantity
  if (limite == null || limite <= 0) return null
  const usado = capacidad.usedQuantity ?? 0
  const nombre = sustantivo(capacidad.dimensionCode)

  if (usado >= limite) return avisoAgotado(usado, limite, nombre, enforcement)

  const umbral = umbralAlcanzado(usado, limite, warnThreshold)
  if (umbral == null) return null
  const restantes = restantesTexto(limite, usado, nombre)

  if (umbral >= 90) {
    const que = consecuencia(enforcement)
    return {
      tono: 'warning',
      fuerte: `Casi sin cupo de ${nombre}:`,
      resto: que ? `te quedan ${restantes}. Al agotarse ${que}.` : `te quedan ${restantes}.`,
    }
  }
  if (umbral >= 80) {
    return {
      tono: 'warning',
      fuerte: `Te queda el ${100 - umbral} % del cupo de ${nombre}:`,
      resto: `${restantes} más. Si vas a necesitar más, pídelo antes de quedarte sin margen.`,
    }
  }
  return {
    tono: 'warning',
    fuerte: `Vas por el ${umbral} % de tu cupo de ${nombre}.`,
    resto: `Te quedan ${restantes}.`,
  }
}

const EVENTO_LABELS: Record<CompanyLimitEventType, string> = {
  THRESHOLD_WARNED: 'Te avisamos de que ibas justo',
  LIMIT_BLOCKED: 'Llegaste al tope',
  LIMIT_RAISED: 'Se amplió tu cupo',
  USAGE_RECONCILED: 'Se pusieron al día los números',
  USAGE_ADJUSTED: 'Se corrigió el consumo',
  OVER_LIMIT_ON_DOWNGRADE: 'Quedaste por encima del cupo al bajar de plan',
}

/** El nombre del enum no se enseña nunca. */
export function eventoLabel(tipo: CompanyLimitEventType | undefined): string {
  if (!tipo) return '—'
  return EVENTO_LABELS[tipo] ?? tipo.toUpperCase()
}

/** Un plan sin contadores no es un error, y no se pinta como tal. */
export function sinContadores(code?: string): string {
  return code
    ? `Tu plan no lleva contadores de ${sustantivo(code)}: no hay ningún tope que te limite.`
    : 'Tu plan no lleva contadores: no hay ningún tope que te limite.'
}

/**
 * El hueco de §2.2, y **el que más importa de toda la feature**.
 *
 * <p>`MatchesContract` no mira dentro de `capacities[]`, así que un renombrado en el backend lo
 * dejaría `undefined` sin romper la compilación. Degradar eso a «sin cupos» le diría a una
 * clínica que no tiene topes cuando sí los tiene: es exactamente el fallo que R14 prohíbe, y el
 * peor posible en esta pantalla. Rama explícita, nunca `?? []`.
 */
export const CUPOS_ILEGIBLES = 'No pudimos leer tus cupos.'

/** Umbral a partir del cual los números que se muestran se marcan como viejos. */
const HORAS_FRESCURA = 24

const MS_POR_HORA = 3_600_000

/**
 * `true` si el recálculo lleva más de un día parado. Si se queda viejo hay un proceso caído, y
 * la clínica está tomando decisiones sobre una foto antigua sin saberlo.
 */
export function datosConRetraso(
  limitRecalculatedAt: string | undefined,
  ahora: Date = new Date(),
): boolean {
  if (!limitRecalculatedAt) return false
  const t = Date.parse(limitRecalculatedAt)
  if (Number.isNaN(t)) return false
  return ahora.getTime() - t > HORAS_FRESCURA * MS_POR_HORA
}

/** Cuánto hace del último recálculo, en palabras. */
export function antiguedadTexto(
  limitRecalculatedAt: string | undefined,
  ahora: Date = new Date(),
): string {
  const t = limitRecalculatedAt ? Date.parse(limitRecalculatedAt) : Number.NaN
  if (Number.isNaN(t)) return 'hace un tiempo'
  const horas = Math.floor((ahora.getTime() - t) / MS_POR_HORA)
  if (horas < 48) return `${horas} horas`
  return `${Math.floor(horas / 24)} días`
}
