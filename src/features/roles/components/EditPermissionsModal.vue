<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Shield, X, Search, Lock } from 'lucide-vue-next'
import SwitchToggle from './SwitchToggle.vue'
import RolePill from './RolePill.vue'
import SubModuleAccordion from './SubModuleAccordion.vue'
import { ROLE_COLORS } from '../constants/roleColors'
import { usePermissionsCatalog } from '../composables/usePermissionsCatalog'
import { useSubModulesCatalog } from '../composables/useSubModulesCatalog'
import { useModulesCatalog } from '../composables/useModulesCatalog'
import { useRoles } from '../composables/useRoles'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { RoleColor, RoleResponse } from '../types'

const props = defineProps<{
  open: boolean
  role: RoleResponse | null
  color?: RoleColor
  readOnly?: boolean
}>()

const emit = defineEmits<{ close: []; saved: [] }>()

const permissionsCatalog = usePermissionsCatalog()
const subModulesCatalog = useSubModulesCatalog()
const modulesCatalog = useModulesCatalog()
const roles = useRoles()

const draftName = ref('')
const draftPermissionIds = ref<Set<number>>(new Set())
const draftActive = ref(true)
const search = ref('')
const expandedSubModules = ref<Set<number>>(new Set())
const saving = ref(false)
const submitError = ref<string | null>(null)
// Marca de intento de guardado: activa el estado inválido del nombre (borde rojo) sin esperar
// al banner de error del footer.
const attempted = ref(false)
const nameError = computed(() =>
  draftName.value.trim() ? null : 'El nombre del rol es obligatorio.',
)

const isCreate = computed(() => props.role === null)
const color = computed<RoleColor>(() => props.color ?? 'amatista')
const tokens = computed(() => ROLE_COLORS[color.value])

const totalCatalogPermissions = computed(() => permissionsCatalog.list.value.length)

const usedSubModulesByModule = computed<Map<number, number[]>>(() => {
  const map = new Map<number, number[]>()
  const subSeen = new Set<number>()
  for (const p of permissionsCatalog.list.value) {
    if (subSeen.has(p.subModule.id)) continue
    subSeen.add(p.subModule.id)
    const sub = subModulesCatalog.byId.value.get(p.subModule.id)
    if (!sub) continue
    const bucket = map.get(sub.module.id)
    if (bucket) bucket.push(sub.id)
    else map.set(sub.module.id, [sub.id])
  }
  return map
})

interface SubGroup {
  subModuleId: number
  subModuleName: string
  permissionIds: number[]
}

interface ModuleGroup {
  moduleId: number
  moduleName: string
  subModules: SubGroup[]
}

const groups = computed<ModuleGroup[]>(() => {
  const q = search.value.trim().toLocaleLowerCase()
  const result: ModuleGroup[] = []

  for (const mod of modulesCatalog.list.value) {
    const subIds = usedSubModulesByModule.value.get(mod.id)
    if (!subIds || subIds.length === 0) continue
    const moduleMatches = q && mod.name.toLocaleLowerCase().includes(q)

    const subGroups: SubGroup[] = []
    for (const subId of subIds) {
      const sub = subModulesCatalog.byId.value.get(subId)
      if (!sub) continue
      const perms = permissionsCatalog.bySubModule.value.get(subId) ?? []
      if (perms.length === 0) continue

      const subMatches = q && sub.name.toLocaleLowerCase().includes(q)

      let visiblePermIds: number[]
      if (!q || moduleMatches || subMatches) {
        visiblePermIds = perms.map((p) => p.id)
      } else {
        visiblePermIds = perms
          .filter((p) => p.name.toLocaleLowerCase().includes(q))
          .map((p) => p.id)
      }

      if (visiblePermIds.length === 0) continue
      subGroups.push({
        subModuleId: sub.id,
        subModuleName: sub.name,
        permissionIds: visiblePermIds,
      })
    }

    if (subGroups.length > 0) {
      result.push({
        moduleId: mod.id,
        moduleName: mod.name,
        subModules: subGroups,
      })
    }
  }
  return result
})

const visibleSubModuleIds = computed(() =>
  groups.value.flatMap((g) => g.subModules.map((s) => s.subModuleId)),
)

const totalVisiblePermissions = computed(() =>
  groups.value.reduce(
    (acc, g) => acc + g.subModules.reduce((a, s) => a + s.permissionIds.length, 0),
    0,
  ),
)

const selectedCount = computed(() => draftPermissionIds.value.size)
const usedSubModulesCount = computed(() => {
  const subIds = new Set<number>()
  for (const pid of draftPermissionIds.value) {
    const p = permissionsCatalog.byId.value.get(pid)
    if (p) subIds.add(p.subModule.id)
  }
  return subIds.size
})

function init() {
  submitError.value = null
  attempted.value = false
  saving.value = false
  search.value = ''
  if (props.role) {
    draftName.value = props.role.name
    draftPermissionIds.value = new Set(props.role.permissions.map((p) => p.id))
    draftActive.value = roles.isActive(props.role.id)
  } else {
    draftName.value = ''
    draftPermissionIds.value = new Set()
    draftActive.value = true
  }
  expandedSubModules.value = new Set()
}

watch(
  () => props.open,
  (open) => {
    if (open) init()
  },
)

watch(
  () => props.role?.id,
  () => {
    if (props.open && props.role) {
      draftPermissionIds.value = new Set(props.role.permissions.map((p) => p.id))
    }
  },
)

function getPermissionIdsInSub(subModuleId: number): number[] {
  return (permissionsCatalog.bySubModule.value.get(subModuleId) ?? []).map((p) => p.id)
}

function toggleSub(subModuleId: number) {
  const permIds = getPermissionIdsInSub(subModuleId)
  if (permIds.length === 0) return
  const allSelected = permIds.every((id) => draftPermissionIds.value.has(id))
  const next = new Set(draftPermissionIds.value)
  if (allSelected) {
    for (const id of permIds) next.delete(id)
  } else {
    for (const id of permIds) next.add(id)
  }
  draftPermissionIds.value = next
}

function togglePermission(permissionId: number) {
  const next = new Set(draftPermissionIds.value)
  if (next.has(permissionId)) next.delete(permissionId)
  else next.add(permissionId)
  draftPermissionIds.value = next
}

function toggleExpand(subModuleId: number) {
  const next = new Set(expandedSubModules.value)
  if (next.has(subModuleId)) next.delete(subModuleId)
  else next.add(subModuleId)
  expandedSubModules.value = next
}

function expandAll() {
  expandedSubModules.value = new Set(visibleSubModuleIds.value)
}

function collapseAll() {
  expandedSubModules.value = new Set()
}

watch(search, (q) => {
  if (q.trim().length > 0) {
    expandedSubModules.value = new Set(visibleSubModuleIds.value)
  }
})

function onKey(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape' && !saving.value) {
    e.preventDefault()
    emit('close')
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

async function save() {
  if (props.readOnly) return
  attempted.value = true
  if (!draftName.value.trim()) {
    submitError.value = 'El nombre del rol es obligatorio.'
    return
  }
  saving.value = true
  submitError.value = null
  try {
    if (props.role) {
      const currentIds = new Set(props.role.permissions.map((p) => p.id))
      await roles.updateNameAndPermissions({
        role: props.role,
        name: draftName.value,
        nextPermissionIds: draftPermissionIds.value,
        currentPermissionIds: currentIds,
      })
      roles.setActive(props.role.id, draftActive.value)
    } else {
      const created = await roles.createWithPermissions({
        name: draftName.value,
        permissionIds: Array.from(draftPermissionIds.value),
      })
      roles.setActive(created.id, draftActive.value)
    }
    emit('saved')
    emit('close')
  } catch (err) {
    submitError.value = getProblemDetailMessage(err, 'No se pudo guardar el rol. Reintentalo.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="open" class="overlay" role="dialog" aria-modal="true">
        <div class="card">
          <header class="head" :style="{ background: tokens.headerGradient }">
            <button
              type="button"
              class="close"
              aria-label="Cerrar"
              :disabled="saving"
              @click="emit('close')"
            >
              <X :size="18" :stroke-width="1.7" />
            </button>
            <div class="head-body">
              <div class="avatar" :style="{ background: tokens.avatarBg, color: tokens.avatarFg }">
                <Shield :size="22" :stroke-width="1.7" />
              </div>
              <div class="head-content">
                <div class="kicker">
                  {{ readOnly ? 'Ver rol' : isCreate ? 'Crear rol' : 'Editar rol' }}
                  <span v-if="!readOnly" class="req" title="Campo obligatorio">*</span>
                </div>
                <input
                  v-model="draftName"
                  type="text"
                  class="name-input"
                  :class="{ invalid: attempted && !!nameError }"
                  placeholder="Nombre del rol"
                  spellcheck="false"
                  autocomplete="off"
                  :readonly="readOnly"
                />
                <div class="head-meta">
                  <RolePill :label="draftName || 'Sin nombre'" :color="color" size="lg" />
                  <span class="sep" />
                  <SwitchToggle
                    v-model="draftActive"
                    :disabled="readOnly"
                    :aria-label="draftActive ? 'Desactivar rol' : 'Activar rol'"
                  />
                  <span class="active-text">{{ draftActive ? 'Activo' : 'Inactivo' }}</span>
                </div>
              </div>
            </div>
          </header>

          <div v-if="readOnly" class="readonly-banner">
            <Lock :size="14" :stroke-width="1.8" />
            <span>
              Este es un rol del sistema. Sus permisos y datos pueden consultarse pero no
              modificarse.
            </span>
          </div>

          <div class="toolbar">
            <div class="search">
              <Search :size="14" :stroke-width="1.7" class="search-icon" />
              <input
                v-model="search"
                type="text"
                class="search-input"
                placeholder="Buscar permiso o sub-módulo…"
                spellcheck="false"
              />
            </div>
            <button type="button" class="ghost" @click="expandAll">Expandir todo</button>
            <button type="button" class="ghost" @click="collapseAll">Colapsar todo</button>
            <span class="bar" />
            <span class="counter">
              {{ selectedCount }} de {{ totalCatalogPermissions }} permisos
            </span>
          </div>

          <div class="body">
            <div v-if="groups.length === 0" class="empty">
              {{
                permissionsCatalog.loading.value
                  ? 'Cargando permisos…'
                  : 'No se encontraron permisos para los filtros aplicados.'
              }}
            </div>
            <div v-for="g in groups" :key="g.moduleId" class="module-group">
              <div class="module-label">{{ g.moduleName }}</div>
              <div class="subs">
                <SubModuleAccordion
                  v-for="s in g.subModules"
                  :key="s.subModuleId"
                  :sub-module="subModulesCatalog.byId.value.get(s.subModuleId)!"
                  :permissions="
                    s.permissionIds
                      .map((id) => permissionsCatalog.byId.value.get(id))
                      .filter((p): p is NonNullable<typeof p> => Boolean(p))
                  "
                  :selected="draftPermissionIds"
                  :expanded="expandedSubModules.has(s.subModuleId)"
                  :highlight="search.trim() || undefined"
                  :read-only="readOnly"
                  @toggle-expand="toggleExpand(s.subModuleId)"
                  @toggle-sub="toggleSub(s.subModuleId)"
                  @toggle-permission="togglePermission"
                />
              </div>
            </div>
          </div>

          <footer class="foot">
            <div class="foot-left">
              <strong>{{ selectedCount }}</strong> permisos seleccionados ·
              <strong>{{ usedSubModulesCount }}</strong> sub-módulos
              <span v-if="search.trim()" class="filter-hint">
                · mostrando {{ totalVisiblePermissions }} permisos
              </span>
            </div>
            <div class="foot-actions">
              <div v-if="submitError" class="error">{{ submitError }}</div>
              <button
                type="button"
                class="ds-btn ds-btn--ghost ds-btn--snug"
                :disabled="saving"
                @click="emit('close')"
              >
                {{ readOnly ? 'Cerrar' : 'Cancelar' }}
              </button>
              <button
                v-if="!readOnly"
                type="button"
                class="ds-btn ds-btn--primary ds-btn--snug ds-btn--elevated"
                :disabled="saving"
                @click="save"
              >
                {{ saving ? 'Guardando…' : 'Guardar cambios' }}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: oklch(15% 0.05 var(--hue) / 45%);
  backdrop-filter: blur(3px);
  display: grid;
  place-items: center;
  z-index: 1500;
  font-family: var(--font-sans);
  padding: 24px;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.18s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.card {
  width: 100%;
  max-width: 1100px;
  max-height: calc(100vh - 48px);
  background: var(--warm-50);
  border-radius: 16px;
  box-shadow: 0 30px 80px oklch(15% 0.05 var(--hue) / 35%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* HEADER */
.head {
  position: relative;
  padding: 22px 26px 18px;
  border-bottom: 1px solid var(--warm-200);
}

.close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  color: var(--warm-700);
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background 0.12s ease;
}

.close:hover:not(:disabled) {
  background: rgb(255 255 255 / 60%);
}

.close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.head-body {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.head-content {
  flex: 1;
  min-width: 0;
}

.kicker {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--warm-500);
  margin-bottom: 4px;
  font-weight: 500;
}

.name-input {
  width: 100%;
  font-family: var(--font-serif);
  font-size: 28px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--warm-900);
  background: transparent;
  border: none;
  border-bottom: 1.5px dashed transparent;
  padding: 2px 0;
  outline: none;
  line-height: 1.1;
}

.kicker .req {
  color: var(--danger-500);
  margin-left: 3px;
  font-weight: 600;
}

.name-input:focus {
  border-bottom-color: var(--amatista-300);
}

.name-input.invalid {
  border-bottom-style: solid;
  border-bottom-color: var(--danger-500);
}

.name-input::placeholder {
  color: var(--warm-400);
}

.name-input:read-only {
  cursor: default;
}

.readonly-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 26px;
  background: var(--warm-100);
  border-bottom: 1px solid var(--warm-200);
  color: var(--warm-700);
  font-size: 12.5px;
}

.readonly-banner :deep(svg) {
  flex-shrink: 0;
  color: var(--warm-600);
}

.head-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.sep {
  width: 1px;
  height: 18px;
  background: var(--warm-300);
}

.active-text {
  font-size: 12.5px;
  color: var(--warm-700);
  font-weight: 500;
}

/* TOOLBAR */
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 26px;
  border-bottom: 1px solid var(--warm-200);
  background: var(--warm-50);
  position: sticky;
  top: 0;
  z-index: 1;
}

.search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--warm-100);
  border: 1px solid var(--warm-200);
  border-radius: 7px;
  min-width: 180px;
}

.search-icon {
  color: var(--warm-500);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: 13px;
  color: var(--warm-900);
}

.search-input::placeholder {
  color: var(--warm-500);
}

.ghost {
  background: transparent;
  border: 1px solid transparent;
  color: var(--warm-700);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  padding: 6px 10px;
  border-radius: 7px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.12s ease,
    color 0.12s ease;
}

.ghost:hover {
  background: var(--warm-100);
  color: var(--warm-900);
}

.bar {
  width: 1px;
  height: 22px;
  background: var(--warm-200);
}

.counter {
  font-size: 12px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  background: var(--amatista-100);
  color: var(--amatista-700);
  white-space: nowrap;
}

/* BODY */
.body {
  flex: 1;
  overflow: auto;
  padding: 18px 26px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.empty {
  font-size: 13px;
  color: var(--warm-500);
  padding: 32px 0;
  text-align: center;
}

.module-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.module-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--warm-500);
  font-weight: 600;
}

.subs {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* FOOTER */
.foot {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 26px;
  border-top: 1px solid var(--warm-200);
  background: var(--warm-100);
}

.foot-left {
  flex: 1;
  font-size: 12.5px;
  color: var(--warm-600);
}

.foot-left strong {
  color: var(--warm-900);
  font-weight: 600;
}

.filter-hint {
  color: var(--warm-500);
  font-style: italic;
}

.foot-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.error {
  font-size: 12.5px;
  color: oklch(45% 0.18 25deg);
  background: oklch(96% 0.04 25deg);
  border: 1px solid oklch(85% 0.06 25deg);
  padding: 4px 10px;
  border-radius: 7px;
}

/* RESPONSIVE */
@media (width <= 768px) {
  .overlay {
    padding: 0;
  }

  .card {
    max-width: 100vw;
    max-height: 100vh;
    width: 100vw;
    height: 100vh;
    border-radius: 0;
  }

  .head {
    padding: 18px 18px 16px;
  }

  .name-input {
    font-size: 24px;
  }

  .avatar {
    width: 48px;
    height: 48px;
  }

  .toolbar {
    flex-wrap: wrap;
    padding: 10px 18px;
  }

  .search {
    flex-basis: 100%;
    order: -1;
  }

  .bar {
    display: none;
  }

  .body {
    padding: 14px 18px;
  }

  .foot {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 12px 18px;
  }

  .foot-actions {
    justify-content: flex-end;
  }
}
</style>
