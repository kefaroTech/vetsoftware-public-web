import { storageService } from '@/services/storage/storage.service'
import { decodeJwt } from './jwt'

/**
 * Quién es el dueño de la sesión que hay ahora mismo en el navegador.
 *
 * Se lee del token persistido y no del store de auth a propósito, y esa
 * diferencia es la que resuelve el orden de arranque: `useAuthStore().companyId`
 * prefiere `/auth/me`, que es asíncrono, así que durante los primeros
 * milisegundos de vida de la aplicación —justo cuando un store con estado
 * persistido se está construyendo— todavía no hay respuesta. El JWT, en cambio,
 * ya está en `localStorage` y se decodifica sin red.
 *
 * Sirve para SELLAR datos locales con su dueño, no para autorizar: la firma no
 * se verifica aquí (la comprueba el backend en cada petición). Un token
 * manipulado como mucho conseguiría que el navegador descarte un borrador
 * propio.
 */
export interface SessionOwner {
  /** `null` para un `SYSTEM_USER`, que no pertenece a ninguna empresa. */
  companyId: number | null
  subjectId: number
}

/** El dueño de la sesión actual, o `null` si no hay sesión legible. */
export function readSessionOwner(): SessionOwner | null {
  const session = storageService.getSession()
  if (!session) return null
  const claims = decodeJwt(session.token)
  if (!claims) return null
  const subjectId = Number(claims.sub)
  // Sin un sujeto numérico no hay sello posible. Devolver un sello "a medias"
  // sería peor que ninguno: dos usuarios distintos con `subjectId` nulo
  // empatarían y volveríamos a compartir el borrador entre ellos.
  if (!Number.isFinite(subjectId)) return null
  return { companyId: claims.companyId ?? null, subjectId }
}

/**
 * ¿El sello leído de disco pertenece a la sesión actual?
 *
 * `seal` viene de `JSON.parse`, así que se valida su forma en vez de confiar en
 * el tipo: un sello ausente, con otra forma o de otra empresa devuelve `false`,
 * que es siempre el lado seguro (descartar).
 */
export function isSameSessionOwner(
  seal: Partial<SessionOwner> | null | undefined,
  current: SessionOwner | null,
): boolean {
  if (!seal || !current) return false
  if (typeof seal.subjectId !== 'number') return false
  return seal.subjectId === current.subjectId && (seal.companyId ?? null) === current.companyId
}
