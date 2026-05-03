<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Plus,
  User,
  ArrowRight,
  TriangleAlert,
  Loader,
} from 'lucide-vue-next'
import ContentWrap from '../components/ContentWrap.vue'
import PageHeading from '../components/PageHeading.vue'
import SectionCard from '@/features/dashboard/components/ui/SectionCard.vue'
import OwnerSearchInput from '../components/OwnerSearchInput.vue'
import OwnerResultRow from '../components/OwnerResultRow.vue'
import OwnerSummaryCard from '../components/OwnerSummaryCard.vue'
import OwnerForm from '../components/OwnerForm.vue'
import { useOwnerSearch } from '../composables/useOwnerSearch'
import { ownerApi } from '../api/owner.api'
import { mapOwnerResponse } from '../api/owner.mapper'
import { useNuevaConsultaDraft } from '../composables/useNuevaConsultaDraft'
import { useAuth } from '@/features/auth/composables/useAuth'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { Owner } from '@/types/domain'

const draft = useNuevaConsultaDraft()
const { companyId } = useAuth()
const query = ref('')

const { results, loading, error: searchError } = useOwnerSearch(query)

type Mode = 'search' | 'selected' | 'creating'
const mode = computed<Mode>(() => {
  if (draft.state.ownerCreating) return 'creating'
  if (draft.state.owner) return 'selected'
  return 'search'
})

const submitError = ref<string | null>(null)
const submitting = ref(false)
const ownerFormRef = ref<{ validate: () => boolean } | null>(null)

function handleEnter() {
  if (results.value.length === 1) {
    select(results.value[0])
  }
}

function select(owner: Owner) {
  draft.setOwner(owner)
}

function startCreate() {
  draft.startCreatingOwner({ name: query.value.trim() })
  submitError.value = null
}

function changeOwner() {
  draft.setOwner(null)
  query.value = ''
}

async function submit(): Promise<boolean> {
  const o = draft.state.ownerCreating
  if (!o) return true
  if (ownerFormRef.value && !ownerFormRef.value.validate()) {
    submitError.value = 'Revisa los campos marcados antes de continuar.'
    return false
  }
  if (companyId.value == null) {
    submitError.value =
      'No se pudo identificar la empresa actual. Vuelve a iniciar sesión.'
    return false
  }
  const cityIdNum = Number(o.cityId)
  if (!Number.isFinite(cityIdNum)) {
    submitError.value = 'Selecciona una ciudad válida.'
    return false
  }

  submitting.value = true
  submitError.value = null
  try {
    const created = await ownerApi.create({
      name: o.name.trim(),
      document: o.document.trim(),
      phone: o.phone.trim(),
      email: o.email.trim(),
      address: o.address.trim(),
      cityId: cityIdNum,
      companyId: companyId.value,
    })
    draft.setOwner(mapOwnerResponse(created))
    return true
  } catch (e: unknown) {
    submitError.value = getProblemDetailMessage(
      e,
      'No se pudo crear el propietario. Intenta nuevamente.',
    )
    return false
  } finally {
    submitting.value = false
  }
}

defineExpose({ submit })

watch(
  () => draft.state.owner,
  () => {
    if (draft.state.owner) query.value = ''
  },
)

const selectedOwner = computed<Owner | null>(() => draft.state.owner)
</script>

<template>
  <ContentWrap>
    <div v-if="submitError" class="banner danger" role="alert">
      <TriangleAlert :size="16" :stroke-width="1.7" />
      <span>{{ submitError }}</span>
      <button type="button" class="banner-x" @click="submitError = null">
        ×
      </button>
    </div>

    <template v-if="mode === 'search'">
      <PageHeading
        title="¿Quién es el propietario?"
        subtitle="Busca por nombre, documento, teléfono o email. Si es nuevo, regístralo."
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

        <div v-if="!query" class="empty">
          <div class="empty-ic">
            <User :size="26" :stroke-width="1.6" />
          </div>
          <div class="empty-title">Empieza buscando un propietario</div>
          <p class="empty-desc">
            Escribe el nombre, documento o teléfono. Si no existe, podrás
            crearlo desde aquí mismo.
          </p>
          <button type="button" class="btn-create" @click="startCreate">
            <Plus :size="14" :stroke-width="1.6" />
            <span>Registrar nuevo propietario</span>
          </button>
        </div>

        <div v-else-if="loading" class="loading">
          <Loader :size="18" :stroke-width="1.6" class="spin" />
          <span>Buscando…</span>
        </div>

        <div v-else-if="searchError" class="search-error">
          <TriangleAlert :size="14" :stroke-width="1.7" />
          <span>{{ searchError }}</span>
        </div>

        <div v-else-if="results.length > 0" class="results">
          <OwnerResultRow
            v-for="o in results"
            :key="o.id"
            :owner="o"
            :pet-count="o.pets.length"
            @select="select(o)"
          />
          <button type="button" class="not-found" @click="startCreate">
            <div class="nf-ic">
              <Plus :size="15" :stroke-width="1.6" />
            </div>
            <div class="nf-meta">
              <div class="nf-title">¿No encuentras a "{{ query }}"?</div>
              <div class="nf-sub">Registra un propietario nuevo</div>
            </div>
            <ArrowRight :size="14" :stroke-width="1.6" class="nf-arrow" />
          </button>
        </div>

        <div v-else class="no-results">
          <div class="nr-msg">
            Sin resultados para "<strong>{{ query }}</strong>"
          </div>
          <button type="button" class="btn-create" @click="startCreate">
            <Plus :size="14" :stroke-width="1.6" />
            <span>Registrar a "{{ query }}"</span>
          </button>
        </div>
      </SectionCard>
    </template>

    <template v-else-if="mode === 'selected' && selectedOwner">
      <PageHeading
        title="¿Quién es el propietario?"
        subtitle="Confirma los datos del propietario seleccionado."
      />
      <OwnerSummaryCard
        :owner="selectedOwner"
        :pet-count="selectedOwner.pets.length"
        @change="changeOwner"
      />
    </template>

    <template v-else-if="mode === 'creating' && draft.state.ownerCreating">
      <PageHeading
        title="Registrar nuevo propietario"
        subtitle="Completa los datos. Podrás editarlos después desde su ficha."
      />
      <OwnerForm ref="ownerFormRef" v-model="draft.state.ownerCreating" />
      <div v-if="submitting" class="submitting">
        <Loader :size="14" :stroke-width="1.6" class="spin" />
        <span>Guardando propietario…</span>
      </div>
    </template>
  </ContentWrap>
</template>

<style scoped>
.banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 13px;
  margin-bottom: 16px;
  position: relative;
}
.banner.danger {
  background: oklch(94% 0.06 25);
  border: 1px solid oklch(85% 0.10 25);
  color: oklch(35% 0.15 25);
}
.banner-x {
  margin-left: auto;
  background: transparent;
  border: none;
  color: inherit;
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
  font-family: inherit;
}
.search-wrap {
  padding: 16px;
  border-bottom: 1px solid var(--warm-200);
}
.empty,
.no-results {
  padding: 40px 20px;
  text-align: center;
}
.empty-ic {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: var(--amatista-50);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
  margin: 0 auto 14px;
}
.empty-title {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--warm-900);
}
.empty-desc {
  margin: 0 auto 18px;
  max-width: 360px;
  font-size: 13px;
  color: var(--warm-600);
  line-height: 1.55;
}
.btn-create {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
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
.results {
  display: flex;
  flex-direction: column;
}
.not-found {
  border: none;
  border-top: 1px solid var(--warm-200);
  padding: 14px 18px;
  background: var(--warm-150);
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
}
.not-found:hover {
  background: var(--warm-200);
}
.nf-ic {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--amatista-100);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
}
.nf-meta {
  flex: 1;
}
.nf-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-900);
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
.loading,
.search-error,
.submitting {
  padding: 28px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  color: var(--warm-600);
}
.search-error {
  color: oklch(45% 0.15 25);
}
.submitting {
  margin-top: 16px;
}
.spin {
  animation: spin 0.85s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
