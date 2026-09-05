<script setup lang="ts">
import { ref, watch } from 'vue'
import AsistentePanel from '@/features/asistente/components/AsistentePanel.vue'
import { useAsistente } from '@/features/asistente/composables/useAsistente'

/**
 * El asistente de `/planes`, plegado detrás de su disparador.
 *
 * <p>Va detrás de la selección y no delante: quien llega desde la portada ya
 * eligió, y un campo vacío por delante le pide rehacer lo que acaba de hacer.
 *
 * ── El disparador vive DENTRO del `<h2>` ────────────────────────────────────
 * Es lo que conserva el relato en el esquema de encabezados estando plegado, que
 * es por donde navega quien usa lector de pantalla. Mismo patrón que las áreas
 * del selector de módulos (`AreaPlegable`).
 */
defineProps<{ sinPaquetes: boolean }>()

const { estado } = useAsistente()

/**
 * Arranca plegado, pero se abre solo en cuanto el asistente sale del reposo: una
 * propuesta recuperada del enlace del correo llega sin que nadie pulse nada, y
 * plegada sería una propuesta invisible.
 */
const abierto = ref(estado.value !== 'INICIAL')

watch(estado, (e) => {
  if (e !== 'INICIAL') abierto.value = true
})
</script>

<template>
  <section class="pl-card prp" aria-labelledby="relato-h2">
    <h2 id="relato-h2" class="pub-card-t">
      <button
        type="button"
        class="prp-btn pub-focus-ring"
        :aria-expanded="abierto"
        aria-controls="relato-panel"
        @click="abierto = !abierto"
      >
        <span class="prp-chev" aria-hidden="true">›</span>
        ¿No sabes qué módulos necesitas?
      </button>
    </h2>
    <p class="pub-card-sub">Cuéntanos qué hace tu negocio y te proponemos los que encajan.</p>

    <!-- `v-show` y no `v-if`: el panel resuelve por su cuenta el enlace de
         propuesta del correo en su `onMounted`, y desmontarlo dejaría un
         `/planes?token=` sin recuperar nada. -->
    <div v-show="abierto" id="relato-panel" class="prp-panel">
      <AsistentePanel :sin-paquetes="sinPaquetes" />
    </div>
  </section>
</template>

<style scoped>
.prp-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  inline-size: 100%;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  text-align: start;
  cursor: pointer;
}

.prp-chev {
  font-size: 20px;
  line-height: 1;
  color: var(--pub-ame-700);
}

.prp-btn[aria-expanded='true'] .prp-chev {
  transform: rotate(90deg);
}

.prp-panel {
  margin-block-start: 16px;
}
</style>
