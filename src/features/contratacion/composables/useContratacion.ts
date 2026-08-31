import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { SELLO } from '@/features/landing/content/plans.content'
import { subtotalMensualEquivalente } from '@/features/landing/composables/planPricing'
import type { Ciclo, PublicPlan } from '@/features/landing/types/plans.types'
import { useContratacionStore } from '../stores/contratacion.store'
import type { CapacidadesElegidas, SeleccionContratacion } from '../types/contratacion.types'

/**
 * API estable de la intención de contratación para los componentes.
 *
 * Wrapper del store con `storeToRefs`, en la línea de `useSpecies`. Concentra
 * además el único cálculo que todos los llamantes repetirían: qué importe
 * mensual equivalente se guarda junto a la elección, y con qué sello.
 */
export function useContratacion() {
  const store = useContratacionStore()
  store.hidratar()

  const { intencion, vigente, hayIntencionVigente } = storeToRefs(store)
  const { isAuthenticated } = useAuth()

  /**
   * A dónde lleva «continuar» una vez guardada la intención.
   *
   * <p>El embudo tiene DOS salidas hacia el paso siguiente —el configurador de
   * paquetes y el asistente de propuesta a medida— y las dos empujaban fijo a
   * `signup`. Eso era correcto mientras `/planes` fuera solo para visitantes;
   * en cuanto un cliente autenticado sin plan puede entrar ahí (ver el guard en
   * `router/index.ts`), `signup` es `guestOnly` y lo habría devuelto al tablero
   * en silencio: el mismo callejón, movido un paso más adelante.
   *
   * <p>Vive AQUÍ y no en cada vista a propósito: son dos llamantes hoy, y la
   * forma de que la decisión se desincronice es tenerla escrita dos veces.
   */
  const destinoTrasElegir = computed<'contratar' | 'signup'>(() =>
    isAuthenticated.value ? 'contratar' : 'signup',
  )

  /**
   * La selección tal como la manipulan los controles, con valores por defecto.
   *
   * <p>`null` también cuando la intención vigente es una PROPUESTA: los
   * controles que leen esto son los del configurador de paquetes, y una
   * propuesta a medida no tiene `planCode` que ponerles. Devolver uno inventado
   * pintaría un paquete seleccionado que el prospecto no eligió.
   */
  const seleccion = computed<SeleccionContratacion | null>(() => {
    const i = vigente.value
    if (!i || i.origen !== 'PLAN') return null
    return { planCode: i.planCode, ciclo: i.ciclo, sedes: i.sedes, usuarios: i.usuarios }
  })

  /**
   * Guarda la elección junto al importe que el usuario ACABA de ver y al sello
   * del contenido con el que se calculó. Los dos datos existen para el mismo
   * fin: detectar en el paso 6 que el precio se movió mientras decidía.
   */
  function elegir(plan: PublicPlan, ciclo: Ciclo, sedes: number, usuarios: number) {
    store.guardar(
      { planCode: plan.code, ciclo, sedes, usuarios },
      subtotalMensualEquivalente(plan, { ciclo, sedes, usuarios }),
      SELLO.revisadoEl,
    )
  }

  /**
   * Lleva una propuesta a medida al embudo.
   *
   * <p>Guarda **la referencia y el importe que el prospecto tenía delante**, no
   * el carrito: las líneas y los totales se le vuelven a pedir al servidor en el
   * paso 6 (`releerPropuesta`). El sello es el mismo del contenido de la
   * landing, para que las dos formas de entrada comparen contra la misma
   * revisión.
   *
   * @param propuestaId
   *            `Propuesta.id`, el identificador opaco. **Nunca el token.**
   * @param importeVistoMensual
   *            `propuesta.totales.subtotal`, que el asistente cotiza en mensual
   *            por contrato. `null` si el servidor no lo publicó — y entonces no
   *            hay comparación de deriva, que es lo correcto: sin las dos cifras
   *            el aviso no puede ser verdad.
   */
  function elegirPropuesta(
    propuestaId: string,
    capacidades: CapacidadesElegidas,
    importeVistoMensual: number | null,
  ) {
    store.guardarPropuesta(propuestaId, capacidades, importeVistoMensual, SELLO.revisadoEl)
  }

  return {
    intencion,
    vigente,
    seleccion,
    hayIntencionVigente,
    destinoTrasElegir,
    elegir,
    elegirPropuesta,
    cambiarCiclo: store.cambiarCiclo,
    descartar: store.descartar,
    limpiar: store.limpiar,
    marcarContratada: store.marcarContratada,
  }
}
