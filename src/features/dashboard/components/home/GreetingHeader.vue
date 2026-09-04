<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  firstName: string
  scheduledToday: number | null
}>()

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
})

const today = computed(() => {
  const fmt = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const text = fmt.format(new Date())
  return text.charAt(0).toUpperCase() + text.slice(1)
})

const subtitle = computed(() => {
  const n = props.scheduledToday
  if (n === null) return today.value
  return `${today.value} · ${n} ${n === 1 ? 'cita prevista' : 'citas previstas'} hoy`
})
</script>

<template>
  <header class="greeting">
    <h1 class="title">
      {{ greeting
      }}<span v-if="firstName"
        >, <em>{{ firstName }}</em></span
      >.
    </h1>
    <p class="subtitle">{{ subtitle }}</p>
  </header>
</template>

<style scoped>
.greeting {
  margin-bottom: 32px;
}

.title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 44px;
  line-height: 1.05;
  letter-spacing: -0.015em;
  font-weight: 400;
  color: var(--warm-900);
}

/* El énfasis va en color y peso, no en cursiva: Poppins es geométrica y su
   cursiva es una oblicua tan leve que a 44 px no se lee como énfasis, y cargar
   sus dos caras cursivas solo para esto entra en la ruta crítica. */
.title em {
  font-weight: 600;
  color: var(--amatista-700);
}

.subtitle {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--warm-600);
}
</style>
