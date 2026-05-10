<script setup lang="ts">
import { ref } from 'vue'
import { Shield, Pencil, ShieldOff } from 'lucide-vue-next'
import type { Employee } from '@/types/domain'
import { colorsForCode, findKnownRole } from '../constants/employee-roles'
import RoleSelector from './RoleSelector.vue'

defineProps<{ employee: Employee }>()

const editOpen = ref(false)
</script>

<template>
  <div>
    <RoleSelector
      v-if="editOpen"
      :current-code="employee.roles[0]?.code ?? ''"
      @cancel="editOpen = false"
    />

    <template v-else>
      <div v-if="employee.roles.length === 0" class="empty">
        <ShieldOff :size="22" :stroke-width="1.6" />
        <div>
          <div class="empty-title">Sin roles asignados</div>
          <div class="empty-desc">Este empleado todavía no tiene roles. Asignar roles desde la UI estará disponible próximamente.</div>
        </div>
      </div>

      <template v-else>
        <div
          v-for="role in employee.roles"
          :key="role.id"
          class="card"
          :style="{ background: colorsForCode(role.code).bg }"
        >
          <div class="row">
            <div class="left">
              <div class="ic" :style="{ color: colorsForCode(role.code).fg }">
                <Shield :size="17" :stroke-width="1.7" />
              </div>
              <div>
                <div class="kicker" :style="{ color: colorsForCode(role.code).fg }">Rol asignado</div>
                <div class="role-name" :style="{ color: colorsForCode(role.code).fg }">
                  {{ role.name }}
                </div>
              </div>
            </div>
            <button
              type="button"
              class="change"
              :style="{ color: colorsForCode(role.code).fg, borderColor: colorsForCode(role.code).fg }"
              disabled
              title="Próximamente — sincronización con backend pendiente"
            >
              <Pencil :size="13" :stroke-width="1.7" />
              Cambiar rol
            </button>
          </div>
          <div class="desc" :style="{ color: colorsForCode(role.code).fg }">
            {{ findKnownRole(role.code)?.description ?? 'Permisos definidos por la empresa.' }}
          </div>

          <div v-if="findKnownRole(role.code)" class="permissions">
            <div class="perm-title">Permisos del rol</div>
            <ul class="perm-list">
              <li v-for="p in findKnownRole(role.code)!.permissions" :key="p">{{ p }}</li>
            </ul>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px;
  border: 1px dashed var(--warm-200);
  border-radius: 12px;
  color: var(--warm-600);
  background: var(--warm-50);
}
.empty-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--warm-900);
  margin-bottom: 4px;
}
.empty-desc {
  font-size: 12.5px;
  color: var(--warm-600);
  line-height: 1.5;
}
.card {
  padding: 16px 18px;
  border-radius: 12px;
  margin-bottom: 14px;
}
.card:last-child {
  margin-bottom: 0;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ic {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--warm-50);
  display: grid;
  place-items: center;
}
.kicker {
  font-size: 11.5px;
  opacity: 0.8;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.role-name {
  font-size: 16px;
  font-weight: 600;
  margin-top: 2px;
}
.change {
  padding: 7px 12px;
  font-size: 12.5px;
  font-weight: 500;
  background: var(--warm-50);
  border: 1px solid;
  border-radius: 7px;
  cursor: not-allowed;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0.65;
}
.desc {
  font-size: 13px;
  opacity: 0.85;
  margin-top: 12px;
  line-height: 1.5;
}
.permissions {
  border-top: 1px solid var(--warm-150);
  margin-top: 14px;
  padding-top: 14px;
}
.perm-title {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--warm-500);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 10px;
}
.perm-list {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  color: var(--warm-700);
  line-height: 1.7;
}
</style>
