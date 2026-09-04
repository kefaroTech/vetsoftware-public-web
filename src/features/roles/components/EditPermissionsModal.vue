<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Lock } from 'lucide-vue-next'
import EditRoleHeader from './EditRoleHeader.vue'
import PermissionToolbar from './PermissionToolbar.vue'
import PermissionTree from './PermissionTree.vue'
import { usePermissionsCatalog } from '../composables/usePermissionsCatalog'
import { useSubModulesCatalog } from '../composables/useSubModulesCatalog'
import { useModulesCatalog } from '../composables/useModulesCatalog'
import { useRoles } from '../composables/useRoles'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { RoleColor, RoleResponse } from '../types'
import type { PermissionModuleGroup, PermissionSubGroup } from '../types/permission-tree.types'

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

const groups = computed<PermissionModuleGroup[]>(() => {
  const q = search.value.trim().toLocaleLowerCase()
  const result: PermissionModuleGroup[] = []

  for (const mod of modulesCatalog.list.value) {
    const subIds = usedSubModulesByModule.value.get(mod.id)
    if (!subIds || subIds.length === 0) continue
    const moduleMatches = q && mod.name.toLocaleLowerCase().includes(q)

    const subGroups: PermissionSubGroup[] = []
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
        <div class="card ds-stack">
          <EditRoleHeader
            v-model:name="draftName"
            v-model:active="draftActive"
            :color="color"
            :is-create="isCreate"
            :name-invalid="attempted && !!nameError"
            :read-only="readOnly"
            :saving="saving"
            @close="emit('close')"
          />

          <div v-if="readOnly" class="readonly-banner">
            <Lock :size="14" :stroke-width="1.8" />
            <span>
              Este es un rol del sistema. Sus permisos y datos pueden consultarse pero no
              modificarse.
            </span>
          </div>

          <PermissionToolbar
            v-model:search="search"
            :selected-count="selectedCount"
            :total-count="totalCatalogPermissions"
            @expand-all="expandAll"
            @collapse-all="collapseAll"
          />

          <PermissionTree
            :groups="groups"
            :sub-modules-by-id="subModulesCatalog.byId.value"
            :permissions-by-id="permissionsCatalog.byId.value"
            :selected="draftPermissionIds"
            :expanded="expandedSubModules"
            :highlight="search.trim() || undefined"
            :read-only="readOnly"
            :loading="permissionsCatalog.loading.value"
            @toggle-expand="toggleExpand"
            @toggle-sub="toggleSub"
            @toggle-permission="togglePermission"
          />

          <footer class="foot ds-flex-row ds-flex-row--12">
            <div class="foot-left">
              <strong class="ds-strong">{{ selectedCount }}</strong> permisos seleccionados ·
              <strong class="ds-strong">{{ usedSubModulesCount }}</strong> sub-módulos
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
  background: color-mix(in oklch, var(--amatista-900) 45%, transparent);
  backdrop-filter: blur(3px);
  display: grid;
  place-items: center;
  z-index: var(--z-modal);
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
  box-shadow: 0 30px 80px color-mix(in oklch, var(--amatista-900) 35%, transparent);
  overflow: hidden;
}

/* La cabecera (avatar, nombre editable, píldora e interruptor) vive en
   `EditRoleHeader.vue`; la barra de búsqueda en `PermissionToolbar.vue` y el
   árbol de permisos en `PermissionTree.vue`, cada uno con su propio CSS. */
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

/* FOOTER */
.foot {
  padding: 14px 26px;
  border-top: 1px solid var(--warm-200);
  background: var(--warm-100);
}

.foot-left {
  flex: 1;
  font-size: 12.5px;
  color: var(--warm-600);
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
  color: var(--danger-800);
  background: var(--danger-50);
  border: 1px solid var(--danger-300);
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
