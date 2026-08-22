<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'

/**
 * El anfitrión del único diálogo de confirmación. Se monta UNA vez en `App.vue`
 * y lo abre cualquier vista con `useConfirmDialog().confirm(...)`.
 */
const {
  isOpen,
  segments,
  title,
  subtitle,
  consequence,
  confirmLabel,
  busyLabel,
  cancelLabel,
  accent,
  icon,
  width,
  busy,
  accept,
  cancel,
} = useConfirmDialog()
</script>

<template>
  <!--
    `elevated` SIEMPRE, no solo cuando hay un modal debajo. Los tres diálogos a
    medida que este sustituye estaban teletransportados a `<body>` con
    `z-index: 100`, o sea POR DEBAJO del velo de modal (1500): hoy no se veía el
    defecto porque solo se abrían desde una vista, pero una confirmación que
    aparece sobre un modal tiene que poder verse. `--z-modal-nested` (1600) le
    gana al velo y sigue por debajo del velo de carga y de los avisos.

    Descartable a propósito (a diferencia del gemelo de la consola): Escape y la
    X emiten `close`, que va a `cancel()` y resuelve la promesa con `false`. Un
    diálogo que no se puede abandonar con el teclado incumple el patrón *Dialog*
    del APG, y aquí no hay nada que abandonar: la respuesta segura es «no».
    Mientras la acción confirmada está en vuelo sí deja de ser descartable
    (`:closable="!busy"`), porque entonces cancelar ya no significa nada.

    `role="alertdialog"` y no el `dialog` por defecto: es el caso de libro del
    APG —interrumpe para confirmar algo con consecuencia— y es la diferencia
    entre que el lector anuncie solo el nombre del diálogo más el control
    enfocado, o su CUERPO entero al abrir. Ese cuerpo (el mensaje con el nombre
    del paciente y la consecuencia) es justo el texto por el que se hizo el
    porte de los tres diálogos a medida, así que perderlo vaciaba el porte.
  -->
  <ModalShell
    :open="isOpen"
    :title="title"
    :subtitle="subtitle"
    :icon="icon ?? TriangleAlert"
    :accent="accent"
    compact
    :width="width"
    elevated
    role="alertdialog"
    :closable="!busy"
    @close="cancel"
  >
    <template #body>
      <!--
        El énfasis viaja como SEGMENTOS, nunca con `v-html`: los tres diálogos
        que este sustituye ponían en negrita el nombre del paciente, que es un
        dato escrito por el usuario. Vue interpola cada trozo y el `<strong>` lo
        pone esta plantilla, así que un nombre de mascota con marcado dentro se
        muestra como texto y no se ejecuta.
      -->
      <p class="mensaje ds-dialog-body">
        <template v-for="(s, i) in segments" :key="i">
          <strong v-if="typeof s === 'object'" class="ds-text-strong">{{ s.strong }}</strong>
          <template v-else>{{ s }}</template>
        </template>
      </p>
      <!--
        `role="status"` y no `alert`: el diálogo ya interrumpió al usuario al
        abrirse, y la consecuencia es contexto de esa misma interrupción, no un
        segundo corte.
      -->
      <p
        v-if="consequence"
        class="ds-banner ds-banner--warning ds-banner--sm ds-banner--flush consecuencia"
        role="status"
      >
        <TriangleAlert :size="14" class="ds-banner-icon" />
        <span>{{ consequence }}</span>
      </p>
    </template>

    <template #footer-actions>
      <button
        type="button"
        class="ds-btn ds-btn--ghost ds-btn--snug"
        :disabled="busy"
        @click="cancel"
      >
        {{ cancelLabel }}
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--snug"
        :class="[
          accent === 'danger' ? 'ds-btn--danger-solid' : 'ds-btn--solid',
          { 'ds-is-disabled ds-is-disabled--60': busy },
        ]"
        :disabled="busy"
        @click="accept"
      >
        {{ busy ? busyLabel : confirmLabel }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
/* Color, tamaño e interlineado vienen de `.ds-dialog-body`. */
.mensaje {
  margin: 0;
}

.consecuencia {
  margin-top: var(--space-12);
}
</style>
