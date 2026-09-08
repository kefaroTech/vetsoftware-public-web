<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Lock } from 'lucide-vue-next'
import { formatDateShort } from '@/composables/format'
import ModalShell from '@/components/ui/ModalShell.vue'

/**
 * El reemplazo del botón de crear en un módulo `READ_ONLY`. **Nunca `disabled`**: en Chrome/Edge
 * un botón deshabilitado no recibe foco, así que su `title` —que ya de por sí no se anuncia a
 * lectores de pantalla— tampoco se puede activar por teclado (WCAG 2.2 §2.1.1 y §4.1.2). El botón
 * queda habilitado y enfocable, y activarlo abre la explicación en vez del formulario de creación.
 */
const props = withDefaults(
  defineProps<{
    /** El nombre del módulo tal como lo devuelve el escaparate («Laboratorio e imagen»). */
    nombreModulo: string
    /** `trialEndDate` del módulo: es también la fecha desde la que quedó en solo lectura. */
    desde?: string | null
    /** El disparador convive con botones de distinto peso visual (CTA de página vs. acción
     *  secundaria de un panel): la clase la decide quien lo monta, no este componente. */
    triggerClass?: string
  }>(),
  { triggerClass: 'ds-btn ds-btn--primary ds-btn--lg ds-btn--elevated' },
)

const abierto = ref(false)

const texto = computed(() => {
  const fecha = props.desde ? ` desde el ${formatDateShort(props.desde)}` : ''
  return `${props.nombreModulo} está en modo solo consulta${fecha}. Cómpralo para volver a crear.`
})
</script>

<template>
  <button type="button" :class="triggerClass" @click="abierto = true">
    <Lock :size="16" :stroke-width="1.8" aria-hidden="true" />
    Comprar {{ nombreModulo }}
  </button>

  <ModalShell
    :open="abierto"
    title="Módulo en modo solo consulta"
    compact
    :width="440"
    @close="abierto = false"
  >
    <template #body>
      <p>{{ texto }}</p>
    </template>
    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" @click="abierto = false">Cerrar</button>
      <RouterLink
        :to="{ name: 'suscripcion-modulos' }"
        class="ds-btn ds-btn--primary"
        @click="abierto = false"
      >
        Comprar {{ nombreModulo }}
      </RouterLink>
    </template>
  </ModalShell>
</template>
