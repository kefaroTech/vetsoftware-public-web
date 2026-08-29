import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { SELLO } from '@/features/landing/content/plans.content'
import { subtotalMensualEquivalente } from '@/features/landing/composables/planPricing'
import type { Ciclo, PublicPlan } from '@/features/landing/types/plans.types'
import { useContratacionStore } from '../stores/contratacion.store'
import type { SeleccionContratacion } from '../types/contratacion.types'

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

  const { intencion, vigente, hayIntencionVigente, contratada } = storeToRefs(store)

  /** La selección tal como la manipulan los controles, con valores por defecto. */
  const seleccion = computed<SeleccionContratacion | null>(() => {
    const i = vigente.value
    if (!i) return null
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

  return {
    intencion,
    vigente,
    seleccion,
    hayIntencionVigente,
    contratada,
    elegir,
    cambiarCiclo: store.cambiarCiclo,
    descartar: store.descartar,
    limpiar: store.limpiar,
    marcarContratada: store.marcarContratada,
  }
}
