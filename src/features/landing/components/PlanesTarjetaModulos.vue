<script setup lang="ts">
import { computed } from 'vue'
import type { CatalogoComercial } from '@/features/asistente/types/catalogo.types'
import CicloFieldset from './CicloFieldset.vue'
import ContadorCantidad from './ContadorCantidad.vue'
import LandingSelectorModulos from './LandingSelectorModulos.vue'
import { incluidasDelEje } from '../composables/cotizadorLineas'
import type { Ciclo } from '../types/plans.types'

/**
 * El cuerpo de «Tus módulos»: el MISMO selector del hero, los contadores y el
 * conmutador de ciclo.
 *
 * <p>Los contadores de esta pantalla llevan el sufijo de unidades incluidas y
 * los del hero no: aquí se está decidiendo qué se contrata, y «Sedes» a secas
 * deja sin decir que la primera ya va dentro. El número sale del catálogo, no
 * de un literal: cambia con la tarifa vigente.
 */
const props = defineProps<{
  catalogo: CatalogoComercial | null
  modulos: string[]
}>()

defineEmits<{ alternar: [code: string, marcado: boolean] }>()

const ciclo = defineModel<Ciclo>('ciclo', { required: true })
const sedes = defineModel<number>('sedes', { required: true })
const usuarios = defineModel<number>('usuarios', { required: true })

const totalModulos = computed(
  () => (props.catalogo?.articulos ?? []).filter((a) => !a.obligatorio && a.vendible).length,
)

const sedesIncluidas = computed(() =>
  props.catalogo ? incluidasDelEje(props.catalogo, 'BRANCH') : null,
)

const personasIncluidas = computed(() =>
  props.catalogo ? incluidasDelEje(props.catalogo, 'USER') : null,
)
</script>

<template>
  <p class="pub-card-sub">
    Contratas {{ modulos.length }} de {{ totalModulos }}. Quita lo que no uses y el total baja al
    instante.
  </p>

  <LandingSelectorModulos
    class="ptm-selector"
    :catalogo="catalogo"
    :modulos="modulos"
    @alternar="(code, marcado) => $emit('alternar', code, marcado)"
  />

  <div class="ptm-cantidades">
    <ContadorCantidad
      v-model="sedes"
      etiqueta="Sedes"
      unidad-singular="sede"
      unidad-plural="sedes"
      :incluidas="sedesIncluidas"
    />
    <ContadorCantidad
      v-model="usuarios"
      etiqueta="Personas"
      unidad-singular="persona"
      unidad-plural="personas"
      :incluidas="personasIncluidas"
    />
  </div>

  <CicloFieldset v-model="ciclo" class="ptm-ciclo" />
</template>

<style scoped>
.ptm-selector {
  margin-block-start: 16px;
}

.ptm-cantidades {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 15px;
  margin-block-start: 18px;
}

.ptm-ciclo {
  margin-block-start: 18px;
}

@media (width <= 720px) {
  .ptm-cantidades {
    grid-template-columns: 1fr;
  }
}
</style>
