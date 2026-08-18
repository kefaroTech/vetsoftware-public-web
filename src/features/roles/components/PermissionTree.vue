<script setup lang="ts">
import SubModuleAccordion from './SubModuleAccordion.vue'
import type { PermissionResponse, SubModuleResponse } from '../types'
import type { PermissionModuleGroup } from '../types/permission-tree.types'

const props = defineProps<{
  groups: PermissionModuleGroup[]
  subModulesById: Map<number, SubModuleResponse>
  permissionsById: Map<number, PermissionResponse>
  selected: Set<number>
  expanded: Set<number>
  highlight?: string
  readOnly?: boolean
  loading?: boolean
}>()

defineEmits<{
  'toggle-expand': [subModuleId: number]
  'toggle-sub': [subModuleId: number]
  'toggle-permission': [permissionId: number]
}>()

function permissionsOf(permissionIds: number[]): PermissionResponse[] {
  return permissionIds
    .map((id) => props.permissionsById.get(id))
    .filter((p): p is PermissionResponse => Boolean(p))
}
</script>

<template>
  <div class="body ds-stack ds-stack--18">
    <div v-if="groups.length === 0" class="empty ds-empty">
      {{
        loading ? 'Cargando permisos…' : 'No se encontraron permisos para los filtros aplicados.'
      }}
    </div>
    <div v-for="g in groups" :key="g.moduleId" class="ds-stack ds-stack--8">
      <div class="module-label">{{ g.moduleName }}</div>
      <div class="subs ds-stack">
        <SubModuleAccordion
          v-for="s in g.subModules"
          :key="s.subModuleId"
          :sub-module="subModulesById.get(s.subModuleId)!"
          :permissions="permissionsOf(s.permissionIds)"
          :selected="selected"
          :expanded="expanded.has(s.subModuleId)"
          :highlight="highlight"
          :read-only="readOnly"
          @toggle-expand="$emit('toggle-expand', s.subModuleId)"
          @toggle-sub="$emit('toggle-sub', s.subModuleId)"
          @toggle-permission="$emit('toggle-permission', $event)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.body {
  flex: 1;
  overflow: auto;
  padding: 18px 26px;
}

.empty {
  padding: 32px 0;
  font-size: 13px;
}

.module-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--warm-500);
  font-weight: 600;
}

.subs {
  gap: 6px;
}

@media (width <= 768px) {
  .body {
    padding: 14px 18px;
  }
}
</style>
