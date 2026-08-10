<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import OwnerSearchList from '../components/OwnerSearchList.vue'
import { useHistoriaSelection } from '../composables/useHistoriaSelection'
import type { Owner } from '@/types/domain'

const router = useRouter()
const { setOwner, reset } = useHistoriaSelection()

onMounted(() => {
  // entrar al paso 1 limpia la selección previa para evitar que el breadcrumb
  // muestre datos huérfanos al volver desde el detalle
  reset()
})

function pick(owner: Owner) {
  setOwner(owner)
  router.push({
    name: 'consulta-historial-pet',
    params: { ownerId: owner.id },
  })
}
</script>

<template>
  <div class="step">
    <div class="step-label">Paso 1 de 3</div>
    <h1 class="ds-display ds-display--sm">¿De quién es la mascota?</h1>
    <p class="sub">Busca al propietario por nombre, documento o email.</p>
    <OwnerSearchList @select="pick" />
  </div>
</template>

<style scoped>
.step {
  flex: 1;
  overflow: auto;
  padding: 32px 40px;
  max-width: 920px;
  width: 100%;
  margin: 0 auto;
}

.step-label {
  font-size: 11.5px;
  color: var(--warm-500);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 500;
  margin-bottom: 6px;
}

.sub {
  font-size: 13.5px;
  color: var(--warm-600);
  margin: 6px 0 22px;
}
</style>
