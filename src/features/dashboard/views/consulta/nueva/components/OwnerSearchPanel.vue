<script setup lang="ts">
/**
 * Buscador de propietario del paso 1: entrada, resultados y las dos salidas
 * hacia el alta («no encuentro a X» / «registrar a X»).
 *
 * Es autónomo respecto al resto del paso: la consulta tecleada y la búsqueda con
 * debounce sólo viven aquí, y el paso no las necesita para nada más que precargar
 * el nombre al crear — por eso viajan en el evento `create` en vez de quedarse
 * arriba. Al elegir propietario el paso deja de renderizar este panel, así que
 * el borrado de la consulta anterior lo hace el desmontaje.
 */
import { Plus, User, ArrowRight, TriangleAlert } from 'lucide-vue-next'
import { ref } from 'vue'
import PageHeading from './PageHeading.vue'
import EmptyStateBlock from './EmptyStateBlock.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import PawLoader from '@/components/feedback/PawLoader.vue'
import OwnerSearchInput from './OwnerSearchInput.vue'
import OwnerResultRow from './OwnerResultRow.vue'
import { useOwnerSearch } from '../composables/useOwnerSearch'
import type { Owner } from '@/types/domain'

const emit = defineEmits<{
  select: [owner: Owner]
  /** Texto tecleado con el que arrancar el alta. */
  create: [name: string]
}>()

const query = ref('')
const { results, loading, error: searchError } = useOwnerSearch(query)

function handleEnter() {
  const onlyMatch = results.value.length === 1 ? results.value[0] : null
  if (onlyMatch) emit('select', onlyMatch)
}
</script>

<template>
  <PageHeading
    title="¿Quién es el propietario?"
    subtitle="Busca por nombre, documento o email. Si es nuevo, regístralo."
  />
  <SectionCard :padded="false">
    <div class="search-wrap">
      <OwnerSearchInput
        v-model="query"
        :results-count="results.length"
        autofocus
        @enter="handleEnter"
      />
    </div>

    <EmptyStateBlock v-if="!query" :icon="User" title="Empieza buscando un propietario">
      <template #description>
        Escribe el nombre, documento o email. Si no existe, podrás crearlo desde aquí mismo.
      </template>
      <template #action>
        <button type="button" class="btn-create" @click="emit('create', query)">
          <Plus :size="14" :stroke-width="1.6" />
          <span>Registrar nuevo propietario</span>
        </button>
      </template>
    </EmptyStateBlock>

    <div v-else-if="loading" class="loading ds-flex-row ds-meta-dark">
      <PawLoader :size="22" :glow="false" :speed="900" />
      <span>Buscando…</span>
    </div>

    <div v-else-if="searchError" class="search-error ds-flex-row ds-meta-dark">
      <TriangleAlert :size="14" :stroke-width="1.7" />
      <span>{{ searchError }}</span>
    </div>

    <div v-else-if="results.length > 0" class="ds-stack">
      <OwnerResultRow
        v-for="o in results"
        :key="o.id"
        :owner="o"
        :pet-count="o.pets.length"
        @select="emit('select', o)"
      />
      <button
        type="button"
        class="not-found ds-flex-row ds-flex-row--12"
        @click="emit('create', query)"
      >
        <div class="nf-ic ds-tone--accent"><Plus :size="15" :stroke-width="1.6" /></div>
        <div class="nf-meta">
          <div class="ds-item-label">¿No encuentras a "{{ query }}"?</div>
          <div class="nf-sub">Registra un propietario nuevo</div>
        </div>
        <ArrowRight :size="14" :stroke-width="1.6" class="nf-arrow" />
      </button>
    </div>

    <div v-else class="no-results">
      <div class="nr-msg">
        Sin resultados para "<strong>{{ query }}</strong
        >"
      </div>
      <button type="button" class="btn-create" @click="emit('create', query)">
        <Plus :size="14" :stroke-width="1.6" />
        <span>Registrar a "{{ query }}"</span>
      </button>
    </div>
  </SectionCard>
</template>

<style scoped>
.search-wrap {
  padding: 16px;
  border-bottom: 1px solid var(--warm-200);
}

.no-results {
  padding: 40px 20px;
  text-align: center;
}

.btn-create {
  background: var(--warm-50);
  border: 1px solid var(--warm-450);
  padding: 9px 16px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-900);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.btn-create:hover {
  background: var(--warm-100);
}

.not-found {
  border: none;
  border-top: 1px solid var(--warm-450);
  padding: 14px 18px;
  background: var(--warm-150);
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
}

.not-found:hover {
  background: var(--warm-200);
}

/* El par fondo+texto lo pone `.ds-tone--accent`. */
.nf-ic {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
}

.nf-meta {
  flex: 1;
}

.nf-sub {
  font-size: 12px;
  color: var(--warm-600);
  margin-top: 1px;
}

.nf-arrow {
  color: var(--warm-500);
}

.nr-msg {
  font-size: 13.5px;
  color: var(--warm-600);
  margin-bottom: 14px;
}

/* Añadidos sobre `.ds-flex-row` + `.ds-meta-dark`: centrado horizontal y aire. */
.loading,
.search-error {
  padding: 28px 20px;
  justify-content: center;
}

.search-error {
  color: oklch(45% 0.15 25deg);
}
</style>
