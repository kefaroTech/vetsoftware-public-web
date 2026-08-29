import { PLANS_CONTENT } from '../content/plans.content'
import type { PublicCatalog } from '../types/plans.types'

/**
 * EL SEAM del catálogo público.
 *
 * Es la única función de todo el front que sabe de dónde salen los planes. Hoy
 * devuelve el contenido de `content/plans.content.ts`, y **eso es deliberado**:
 * qué es «un plan» y cuál se destaca es una decisión editorial y comercial que
 * hoy no toma ningún endpoint. Que `GET /plans` exista no la cambia.
 *
 * ── Lo que cambió: los tipos ya están atados ───────────────────────────────
 * `GET /plans` existe (`PublicPlanController.java`, público y sin token), así
 * que `plans.types.ts` ya no es un tipo suelto: `api.contract.ts` afirma
 * `PublicCatalog`, `PublicPlanContract`, `PlanInclude` y `PlanCapacity` contra
 * sus esquemas. Si el backend añade un campo a la respuesta, este front deja de
 * compilar — que es exactamente lo que queremos que pase.
 *
 * ── Lo que tendrá que hacer esta función cuando lea de la red ──────────────
 * NO es `return (await http.get('/plans')).data`. El contrato no trae
 * `recommended`, porque no es un dato del modelo, así que aquí habrá que
 * componerlo: la respuesta del servidor da el plan, y el contenido local (o la
 * configuración de la portada) dice cuál se destaca. Ese es el motivo de que
 * `PublicPlan` extienda `PublicPlanContract` en vez de ser el mismo tipo — la
 * traducción tiene un sitio, y es este, no un componente.
 *
 * Devuelve una PROMESA también en la variante de contenido, y eso es
 * deliberado: si devolviera un valor síncrono, las pantallas se escribirían sin
 * estados de carga ni de error, y la migración a red obligaría a reescribirlas
 * enteras. Así ya nacen con los tres estados que van a necesitar.
 *
 * `signal` viaja aunque hoy no haya nada que abortar, por la misma razón: es el
 * parámetro que axios va a querer, y añadirlo después cambiaría la firma que
 * consumen el store y sus pruebas.
 */
export async function fetchPlans(signal?: AbortSignal): Promise<PublicCatalog> {
  // El `await` de un microtask no es decorativo: garantiza que ningún consumidor
  // pueda depender de que el catálogo esté disponible de forma síncrona en el
  // mismo tick, que es exactamente lo que dejaría de ser cierto con red detrás.
  await Promise.resolve()
  if (signal?.aborted) throw signal.reason instanceof Error ? signal.reason : new Error('cancelado')
  return PLANS_CONTENT
}
