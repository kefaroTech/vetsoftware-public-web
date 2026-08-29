import type { Ciclo } from '@/features/landing/types/plans.types'

/**
 * Lo que el prospecto eligió ANTES de tener sesión.
 *
 * Es una **intención**, no un compromiso, y así se rotula en pantalla: es
 * reversible y no tiene consecuencia. El acto vinculante ocurre después de
 * autenticarse, y no puede ocurrir antes: el registro es Opción B (sin
 * auto-login, con verificación por correo), así que firmar en la zona pública
 * dejaría una aceptación sin `acceptedByEmail` ni `acceptedIp` — los dos campos
 * que el modelo exige como prueba y que pone el SERVIDOR desde la petición, no
 * el formulario.
 */
export interface IntencionContratacion {
  planCode: string
  ciclo: Ciclo
  sedes: number
  usuarios: number
  /**
   * El importe MENSUAL sin impuesto que el usuario VIO cuando eligió. Se compara
   * contra el que devuelve el servidor en el paso 6; si difieren, la pantalla lo
   * dice y desmarca la casilla de términos.
   */
  importeVistoMensual: number
  /** Sello del contenido con el que se calculó, para saber si el precio pudo moverse. */
  selloRevisadoEl: string
  /** ISO datetime. La intención caduca a los 30 días. */
  creadaEn: string
  /**
   * El usuario dijo «Ahora no» en el paso 6, o su empresa ya tenía plan. Una
   * intención descartada no se borra: se marca, para que el enganche del login
   * deje de dispararse **para siempre** y el paso 6 no se convierta en una jaula.
   */
  descartada: boolean
}

/** La selección tal como la manipulan la landing y `/planes`, sin metadatos. */
export interface SeleccionContratacion {
  planCode: string
  ciclo: Ciclo
  sedes: number
  usuarios: number
}

/** Una línea del plan con su fecha de fin de prueba resuelta. */
export interface LineaPrueba {
  code: string
  /** Nombre del módulo. Siempre delante de la fecha: nunca «tu prueba vence el 11». */
  name: string
  /**
   * ISO date del ÚLTIMO día de prueba, **inclusive**. Se redacta «gratis hasta
   * el 11», no «hasta el 12»: equivocarse aquí es equivocarse en un día de cobro.
   */
  trialEndDate: string
  /** Lo que se cobra por esa línea cuando termine la prueba, o `null` si va incluida. */
  precioDespues: number | null
}

/** El resumen VINCULANTE del paso 6. Lo calcula el servidor, no el front. */
export interface ResumenContratacion {
  empresaNombre: string
  empresaIdentificador: string
  planCode: string
  planNombre: string
  ciclo: Ciclo
  sedes: number
  usuarios: number
  subtotal: number
  impuesto: number
  tasaImpuesto: number
  total: number
  /** El mismo importe normalizado a mes, para comparar contra la intención. */
  subtotalMensualEquivalente: number
  lineasPrueba: LineaPrueba[]
  /** La empresa ya tiene un plan activo: no hay nada que contratar. */
  yaTienePlanActivo: boolean
}

/** Lo que devuelve la activación. */
export interface ResultadoContratacion {
  planNombre: string
  empresaNombre: string
  modulosActivados: string[]
  lineasPrueba: LineaPrueba[]
  subtotal: number
  impuesto: number
  total: number
  ciclo: Ciclo
}
