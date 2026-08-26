<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import AccountDetail from '../components/AccountDetail.vue'
import { useCuentas } from '../composables/useCuentas'
import { animalApi } from '@/features/dashboard/views/consulta/nueva/api/animal.api'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import { useBranchStore } from '@/features/branches/stores/branch.store'
import type { OpenAccountResponse } from '../types/cuentas'

const props = defineProps<{ accountId: string }>()

const store = useCuentas()
const router = useRouter()
const branchStore = useBranchStore()
const { can } = useAuthorization()
const canVoidPayment = can(PERMISSIONS.DEBT_OPEN_ACCOUNT_VOID)
const canVoidCharge = can(PERMISSIONS.CHARGE_OPEN_ACCOUNT_VOID)

const account = ref<OpenAccountResponse | null>(null)
const ownerPets = ref<{ id: number; name: string }[]>([])
/**
 * Estado de «esta cuenta no existe».
 *
 * Con el detalle en la URL, un `accountId` puede llegar de un enlace pegado, de
 * un marcador viejo o de una cuenta borrada. Antes era imposible —solo se
 * llegaba pinchando una tarjeta ya cargada—; ahora es un camino normal, y sin
 * este estado el arreglo de EST-08 cambiaría una pérdida de contexto por una
 * pantalla en blanco.
 */
const notFound = ref(false)
const loading = ref(false)

async function load(rawId: string): Promise<void> {
  const id = Number(rawId)
  if (!Number.isInteger(id) || id <= 0) {
    notFound.value = true
    account.value = null
    return
  }
  loading.value = true
  notFound.value = false
  ownerPets.value = []
  try {
    // Regla del repo: al abrir la pantalla se relee del backend, no se sirve
    // caché. Aquí además es obligatorio: por URL puede no haber caché ninguna.
    const fresh = await store.fetchAccount(id)
    if (!fresh) {
      notFound.value = true
      account.value = null
      return
    }
    account.value = fresh
    // Detalle y mascotas del propietario dependen de la cuenta que ya llegó, no
    // una de la otra: a la vez (#254). La tolerancia por rama se conserva tal
    // cual —sin el listado de mascotas el detalle sigue siendo utilizable— con
    // el `catch` pegado a SU promesa, para que no tumbe el detalle.
    const [, animals] = await Promise.all([
      store.loadDetail(id),
      animalApi.listByOwner(fresh.owner.id).catch(() => []),
    ])
    ownerPets.value = animals.map((a) => ({ id: a.id, name: a.name }))
  } finally {
    loading.value = false
  }
}

// `immediate` cubre las dos entradas que antes no existían: el enlace directo y
// el F5 sobre el detalle.
watch(() => props.accountId, load, { immediate: true })

/**
 * Cambiar de sede estando en el detalle tiene que devolver al listado: la cuenta
 * que se está viendo es de la sede anterior, y quedarse en su URL enseñaría el
 * detalle de otra sucursal bajo el contexto recién elegido.
 */
watch(
  () => branchStore.selectedBranchId,
  () => void router.push({ name: 'cuentas' }),
)

function backToList() {
  void router.push({ name: 'cuentas' })
}
</script>

<template>
  <div v-if="store.error.value" class="ds-banner ds-banner--error">{{ store.error.value }}</div>

  <template v-if="notFound">
    <PageHeader
      kicker="Facturación"
      title="Cuentas"
      lead="Cuentas a crédito administradas por sede. Los cargos se agrupan por mascota."
    />
    <div class="ds-empty ds-empty--lg" role="status">
      <p class="nf-title">Esta cuenta ya no existe o no pertenece a tu sede.</p>
      <p class="ds-meta-dark nf-desc">
        Puede haberse cerrado, cancelado o pertenecer a otra sucursal. Vuelve al listado para
        buscarla.
      </p>
      <button type="button" class="ds-btn ds-btn--primary" @click="backToList">
        <ArrowLeft :size="15" :stroke-width="1.8" /> Volver a cuentas
      </button>
    </div>
  </template>

  <!-- EST-05: mientras resuelve la cuenta se reserva el hueco del detalle en vez
       de dejar la pantalla vacía. El velo global sigue saliendo para esta carga
       (es una navegación, no un refresco de listado). -->
  <div v-else-if="loading && !account" class="ds-stack sk-detail" aria-hidden="true">
    <div class="ds-skeleton sk-head"></div>
    <div class="ds-skeleton sk-body"></div>
  </div>

  <AccountDetail
    v-else-if="account"
    :account="account"
    :can-void-charge="canVoidCharge"
    :can-void-payment="canVoidPayment"
    :owner-pets="ownerPets"
    @back="backToList"
    @updated="account = $event"
  />
</template>

<style scoped>
.nf-title {
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 6px;
}
.nf-desc {
  margin: 0 0 18px;
}
.sk-detail {
  gap: 14px;
}
.sk-head {
  height: 68px;
  border-radius: 14px;
}
.sk-body {
  height: 320px;
  border-radius: 14px;
}
</style>
