import axios from 'axios'

/**
 * Un 403 no es un fallo: es un rol al que le falta un permiso, y se dice distinto.
 *
 * <p>Escenario **real**, no teórico. La migración 377 documenta que `entitlement.read`,
 * `subscriptionPayment.read`, `billingDocumentApplication.read`, `dunningEvent.read` y
 * `subscription.read` se sembraron y nunca se asignaron a los roles existentes hasta ella: hay
 * empresas cuyo ADMIN no tiene alguno. Por eso cada bloque de esta feature distingue «no se
 * pudo» de «tu rol no lo incluye», y ninguna ausencia de permiso deja la pantalla en blanco.
 *
 * <p>Aplastar los dos a «no se pudo cargar» es justo lo que hace imposible el soporte: un 403
 * dice una cosa y un 500 dice otra.
 */
export function isForbidden(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 403
}

/** Un `GET` que devuelve 404 porque el recurso no existe todavía, no porque algo falle. */
export function isNotFound(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404
}

/**
 * El hueco honesto de un bloque cerrado por permisos.
 *
 * <p>**Nunca «No tienes permiso» a secas**: eso no le dice a nadie qué hacer. La segunda frase
 * es la que convierte el portazo en una gestión de cinco minutos con quien administra la
 * clínica.
 */
export const SIN_PERMISO =
  'Tu rol no incluye ver esta información. Pídeselo a quien administre los permisos de tu clínica.'
