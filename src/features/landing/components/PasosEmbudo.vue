<script setup lang="ts">
import { computed } from 'vue'

/**
 * El progreso del embudo público.
 *
 * Son CUATRO pasos y no tres: la verificación de correo es un paso propio
 * porque el alta y la confirmación no se fusionan.
 *
 * <p>`aria-current="step"` es lo único que convierte una fila de puntos en un
 * indicador de progreso para un lector de pantalla; el número dibujado va
 * `aria-hidden` porque es decoración, y el estado de cada paso viaja en texto
 * para quien no ve el color ni el relleno del círculo.
 */
const props = defineProps<{ actual: number }>()

const ROTULOS = ['Tu negocio', 'Tu cuenta', 'Verifica tu correo', 'Confirmar']

const SUFIJO = {
  HECHO: ', completado',
  ACTUAL: ', paso actual',
  PENDIENTE: '',
} as const

type EstadoPaso = keyof typeof SUFIJO

const pasos = computed(() =>
  ROTULOS.map((rotulo, i) => {
    const numero = i + 1
    const estado: EstadoPaso =
      numero < props.actual ? 'HECHO' : numero === props.actual ? 'ACTUAL' : 'PENDIENTE'
    return { numero, rotulo, estado }
  }),
)
</script>

<template>
  <nav aria-label="Progreso de la contratación">
    <ol class="pas-lista ds-list-reset">
      <li
        v-for="p in pasos"
        :key="p.numero"
        class="pas-paso"
        :class="`is-${p.estado.toLowerCase()}`"
        :aria-current="p.estado === 'ACTUAL' ? 'step' : undefined"
      >
        <span class="pas-punto" aria-hidden="true">{{
          p.estado === 'HECHO' ? '✓' : p.numero
        }}</span>
        <span>
          {{ p.rotulo }}
          <span class="ds-sr-only">{{ SUFIJO[p.estado] }}</span>
        </span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.pas-lista {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
}

.pas-paso {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 13.5px;
  color: var(--pub-ink-500);
}

.pas-paso.is-actual {
  font-weight: 600;
  color: var(--pub-ink-900);
}

.pas-punto {
  display: grid;
  place-items: center;
  inline-size: 24px;
  block-size: 24px;
  flex: none;
  border-radius: 50%;
  background: var(--pub-tint-mute);
  color: var(--pub-ink-500);
  font-size: 12px;
  font-weight: 600;
}

.pas-paso.is-actual .pas-punto {
  background: var(--pub-ame-700);
  color: var(--pub-surface);
}

.pas-paso.is-hecho .pas-punto {
  background: var(--pub-tint-100);
  color: var(--pub-ame-800);
}
</style>
