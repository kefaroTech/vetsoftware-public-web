<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import PublicLayout from '@/components/public/PublicLayout.vue'
import SeleccionAside from '@/features/landing/components/SeleccionAside.vue'
import { usePlanes } from '@/features/landing/composables/usePlanes'
import type { Ciclo } from '@/features/landing/types/plans.types'
import { useContratacion } from '@/features/contratacion/composables/useContratacion'
import RegisterForm from '../components/RegisterForm.vue'
import CheckEmailPanel from '../components/CheckEmailPanel.vue'

// Flujo Opción B: form → check (sin auto-login). El email pasa a la pantalla 2.
const screen = ref<'form' | 'check'>('form')
const email = ref('')

function onSuccess(em: string) {
  email.value = em
  screen.value = 'check'
}

/**
 * Paso 3 del embudo comercial.
 *
 * El carril «Tu selección» aparece SOLO si hay selección: quien llega a
 * `/registro` por su cuenta ve exactamente el formulario de siempre. La
 * selección se lee de la query primero (es lo que el usuario acaba de pulsar en
 * `/planes`) y de la intención guardada después, que es la que sobrevive al
 * salto de verificación por correo.
 */
const route = useRoute()
const { findByCode } = usePlanes()
const { vigente } = useContratacion()

function entero(v: unknown, porDefecto: number): number {
  const n = Math.trunc(Number(typeof v === 'string' ? v : NaN))
  return Number.isFinite(n) && n >= 1 ? n : porDefecto
}

const seleccion = computed(() => {
  const code = typeof route.query.plan === 'string' ? route.query.plan : vigente.value?.planCode
  const plan = findByCode(code)
  if (!plan) return null
  const ciclo: Ciclo =
    route.query.ciclo === 'ANUAL' || route.query.ciclo === 'MENSUAL'
      ? route.query.ciclo
      : (vigente.value?.ciclo ?? 'MENSUAL')
  return {
    plan,
    ciclo,
    sedes: entero(route.query.sedes, vigente.value?.sedes ?? 1),
    usuarios: entero(route.query.usuarios, vigente.value?.usuarios ?? 1),
  }
})
</script>

<template>
  <PublicLayout :footer-center="screen === 'check'">
    <template #topRight>
      ¿Ya tienes cuenta? <RouterLink :to="{ name: 'login' }">Inicia sesión</RouterLink>
    </template>

    <div v-if="screen === 'form'" class="reg-lane">
      <!-- El carril va PRIMERO en el DOM. En escritorio la rejilla lo coloca a
           la derecha; en móvil se apila arriba, que es donde tiene que estar. -->
      <SeleccionAside
        v-if="seleccion"
        :plan="seleccion.plan"
        :ciclo="seleccion.ciclo"
        :sedes="seleccion.sedes"
        :usuarios="seleccion.usuarios"
      />
      <RegisterForm class="pub-reveal" @success="onSuccess" />
    </div>
    <CheckEmailPanel v-else :email="email" />
  </PublicLayout>
</template>

<style scoped>
.reg-lane {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 22px;
  align-items: start;
  width: 100%;
  max-width: 1060px;
  margin: 0 auto;
  max-height: 100%;
}

@media (width <= 960px) {
  .reg-lane {
    grid-template-columns: 1fr;
  }
}
</style>
