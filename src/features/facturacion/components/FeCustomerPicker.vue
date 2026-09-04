<script setup lang="ts">
import { ref, watch } from 'vue'
import { Search, User, Plus, ChevronRight } from 'lucide-vue-next'
import PawLoader from '@/components/feedback/PawLoader.vue'
import { ownerApi } from '@/features/dashboard/views/consulta/nueva/api/owner.api'
import type { OwnerResponse } from '@/features/dashboard/views/consulta/nueva/types/owner.types'
import FeCustomerCreateForm from './FeCustomerCreateForm.vue'

/**
 * Selector de cliente en dos pantallas: buscar uno existente o crear uno nuevo.
 *
 * El alta vive en `FeCustomerCreateForm` (era la rama `create` de este mismo
 * fichero, ~400 líneas). La API pública NO cambia —prop `mode`, evento `pick`—
 * porque la consumen `POSView` y `OpenAccountModal`.
 */
// mode: 'basic'  → POS ≤ 5 UVT, datos fiscales opcionales.
//       'fiscal' → FE > 5 UVT, datos fiscales requeridos.
defineProps<{ mode: 'basic' | 'fiscal' }>()
const emit = defineEmits<{ pick: [owner: OwnerResponse] }>()

const view = ref<'search' | 'create'>('search')

// ── Búsqueda de cliente existente ─────────────────────────────────────────────
const query = ref('')
const results = ref<OwnerResponse[]>([])
const searching = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

watch(query, (q) => {
  if (timer) clearTimeout(timer)
  const term = q.trim()
  if (term.length < 2) {
    results.value = []
    searching.value = false
    return
  }
  searching.value = true
  timer = setTimeout(async () => {
    try {
      // BE-06: la busqueda llega paginada; este picker muestra solo la primera pagina.
      results.value = (await ownerApi.search(term)).content
    } catch {
      results.value = []
    } finally {
      searching.value = false
    }
  }, 300)
})

function goCreate() {
  view.value = 'create'
}
</script>

<template>
  <!-- ══ Vista de búsqueda ══ -->
  <div v-if="view === 'search'" class="cpk ds-stack">
    <div class="cpk-searchrow">
      <div class="search">
        <Search :size="14" :stroke-width="1.7" class="s-icon" />
        <input
          v-model="query"
          type="text"
          class="ds-focus-ring"
          placeholder="Buscar por nombre o documento…"
          autofocus
        />
        <PawLoader v-if="searching" :size="20" :glow="false" :speed="900" class="s-loader" />
      </div>
      <button type="button" class="newbtn ds-tone--accent-soft" @click="goCreate">
        <Plus :size="15" :stroke-width="2.2" /> Crear cliente
      </button>
    </div>

    <ul v-if="results.length" class="results ds-list-reset ds-stack">
      <li v-for="o in results" :key="o.id">
        <button type="button" class="result ds-hover-accent" @click="emit('pick', o)">
          <span class="avatar ds-tone--accent"><User :size="14" :stroke-width="1.7" /></span>
          <span class="ds-flex-fill">
            <span class="name ds-text-strong ds-text-strong--md">{{ o.name }}</span>
            <span class="ds-meta">{{ o.document }}{{ o.phone ? ' · ' + o.phone : '' }}</span>
          </span>
          <ChevronRight :size="15" :stroke-width="1.8" class="ds-icon-muted ds-icon-muted--dim" />
        </button>
      </li>
    </ul>

    <div v-else-if="query.trim().length >= 2 && !searching" class="empty">
      <div class="empty-ic"><Search :size="20" :stroke-width="1.7" /></div>
      <div class="empty-t ds-strong">Sin resultados para “{{ query.trim() }}”</div>
      <div class="empty-s ds-meta">No encontramos un cliente con ese nombre o documento.</div>
      <button type="button" class="ds-btn ds-btn--primary ds-btn--strong" @click="goCreate">
        <Plus :size="14" :stroke-width="2.2" /> Crear cliente nuevo
      </button>
    </div>

    <p v-else class="hint ds-meta ds-meta--sm">
      Escribe el nombre o documento del cliente. Si no existe, podrás crearlo.
    </p>
  </div>

  <!-- ══ Vista de creación ══ -->
  <FeCustomerCreateForm v-else :mode="mode" @pick="emit('pick', $event)" @back="view = 'search'" />
</template>

<style scoped>
/* Layout via primitivas: .ds-stack (columna), .ds-list-reset, .ds-flex-fill,
   .ds-meta(--sm), .ds-strong, .ds-text-strong(--md), .ds-icon-muted(--dim),
   .ds-focus-ring y .ds-tone--accent / --accent-soft. Aquí sólo queda lo propio
   del buscador. */
.cpk {
  gap: 12px;
  font-family: var(--font-sans);
}
.cpk-searchrow {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.search {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
}
.s-icon {
  position: absolute;
  left: 12px;
  color: var(--warm-500);
}
.s-loader {
  position: absolute;
  right: 10px;
}

.search input {
  width: 100%;
  background: var(--warm-50);
  border: 1px solid var(--warm-450);
  border-radius: 9px;
  padding: 10px 14px 10px 34px;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--warm-900);
  outline: none;
}

/* Botón de acento que se estira con el `align-items: stretch` de la fila: por
   eso `padding: 0 14px` y borde de 1.5px. NO es `.ds-btn` (fija padding
   vertical y peso/tamaño distintos) — ver informe FE-08. */
.newbtn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  border-radius: 9px;

  /* A11Y-09: `--amatista-300` daba 1,99:1 en reposo y 1,70:1 con el relleno del
     hover. `--amatista-500` da 4,44:1 y 3,80:1 — el mismo borde en los dos
     estados, para que el hover no reste contraste al indicador. */
  border: 1.5px solid var(--amatista-500);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.newbtn:hover {
  background: var(--amatista-100);
}

.results {
  gap: 6px;
  max-height: 300px;
  overflow: auto;
}

/* El hover de la fila es `.ds-hover-accent` (primitives.css). Pesa (0,3,0) y
   gana al `.result[data-v-…]` de (0,2,0) sin tocar la regla base, así que el
   `:hover` local se borra en vez de dejarlo compitiendo. Su tercera declaración
   (`color: amatista-700`) no se ve: `.ds-tone--accent`, `.ds-text-strong`,
   `.ds-meta` y `.ds-icon-muted--dim` fijan su propio color y la fila no tiene
   texto directo. */
.result {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  cursor: pointer;
  padding: 11px 14px;
  background: var(--warm-50);
  border: 1px solid var(--warm-450);
  border-radius: 10px;
  font-family: inherit;
}
.avatar {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.name {
  display: block;
}

.hint {
  text-align: center;
  padding: 18px;
  margin: 0;
}
.empty {
  text-align: center;
  padding: 22px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.empty-ic {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--warm-100);
  color: var(--warm-400);
  display: grid;
  place-items: center;
  margin-bottom: 6px;
}
.empty-t {
  font-size: 14px;
}
.empty-s {
  margin-bottom: 12px;
}

@media (width <= 640px) {
  .cpk-searchrow {
    flex-direction: column;
  }
  .newbtn {
    padding: 10px;
    justify-content: center;
  }
}
</style>
