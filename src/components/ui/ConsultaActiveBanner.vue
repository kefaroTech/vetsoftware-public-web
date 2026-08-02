<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowRight, X } from 'lucide-vue-next'
import PawLoader from './PawLoader.vue'
import { useConsultaActiveBanner } from '@/composables/useConsultaActiveBanner'

const router = useRouter()
const { visible, dismiss, draft } = useConsultaActiveBanner()

function goBack() {
  router.push({
    name: 'consulta-nueva',
    query: { paso: String(draft.state.step) },
  })
}
</script>

<template>
  <Transition name="active-banner-fade">
    <div v-if="visible" class="banner" role="status" aria-live="polite">
      <PawLoader :size="22" :glow="false" :speed="900" />
      <div class="text">
        <span class="head">Consulta en curso</span>
        <span class="who">
          {{ draft.state.pet?.name ?? 'Mascota pendiente' }}
          <span v-if="draft.state.owner"> · {{ draft.state.owner.name }}</span>
        </span>
      </div>
      <button type="button" class="cta" @click="goBack">
        <span>Volver a la consulta</span>
        <ArrowRight :size="13" :stroke-width="1.8" />
      </button>
      <button type="button" class="close" aria-label="Ocultar banner" @click="dismiss">
        <X :size="14" :stroke-width="1.7" />
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.banner {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px 10px 16px;
  background: oklch(28% 0.1 var(--hue));
  color: oklch(94% 0.02 var(--hue));
  border-radius: 999px;
  box-shadow: 0 12px 36px rgb(20 15 30 / 28%);
  font-family: var(--font-sans);
  max-width: calc(100vw - 32px);
}

.text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.head {
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: oklch(75% 0.04 var(--hue) / 72%);
  font-weight: 500;
}

.who {
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 320px;
}

.cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 999px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  background: var(--amatista-500);
  color: white;
  border: none;
  cursor: pointer;
  transition: filter 0.12s ease;
}

.cta:hover {
  filter: brightness(1.08);
}

.close {
  background: transparent;
  border: none;
  color: oklch(75% 0.04 var(--hue) / 70%);
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.close:hover {
  background: oklch(40% 0.1 var(--hue) / 40%);
  color: white;
}

.active-banner-fade-enter-active,
.active-banner-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.active-banner-fade-enter-from,
.active-banner-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}

@media (width <= 720px) {
  .banner {
    flex-wrap: wrap;
    border-radius: 14px;
    padding: 10px 12px;
  }

  .who {
    max-width: 200px;
  }
}
</style>
