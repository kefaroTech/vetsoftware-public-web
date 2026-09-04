<script setup lang="ts">
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
import { ROLES, ROLE_COLORS } from '../constants/employee-roles'

const props = defineProps<{
  currentCode: string
}>()

defineEmits<{
  cancel: []
}>()

const currentId = computed(() => props.currentCode.trim().toLowerCase())
</script>

<template>
  <div>
    <div class="hint">Selección de rol — pendiente de integración con backend.</div>
    <div class="ds-stack ds-stack--8">
      <div
        v-for="r in ROLES"
        :key="r.id"
        class="item"
        :class="{ selected: r.id === currentId }"
        :style="
          r.id === currentId
            ? { background: ROLE_COLORS[r.color].bg, borderColor: ROLE_COLORS[r.color].dot }
            : undefined
        "
      >
        <span class="dot" :style="{ background: ROLE_COLORS[r.color].dot }" />
        <div class="ds-flex-fill">
          <div class="ds-flex-row">
            <span class="ds-item-label ds-item-label--lg">{{ r.name }}</span>
            <span
              v-if="r.id === currentId"
              class="actual"
              :style="{ color: ROLE_COLORS[r.color].fg }"
            >
              · actual
            </span>
          </div>
          <div class="desc">{{ r.description }}</div>
        </div>
        <Check
          v-if="r.id === currentId"
          :size="16"
          :stroke-width="2"
          :style="{ color: ROLE_COLORS[r.color].fg, marginTop: '2px' }"
        />
      </div>
    </div>
    <button type="button" class="cancel" @click="$emit('cancel')">Cerrar</button>
  </div>
</template>

<style scoped>
.hint {
  font-size: 12px;
  color: var(--warm-500);
  background: var(--warning-50);
  border: 1px solid var(--warning-200);
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 14px;
}

.item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  cursor: not-allowed;
  opacity: 0.85;
}

.item.selected {
  border-width: 1.5px;
  opacity: 1;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 7px;
  flex-shrink: 0;
}

.actual {
  font-size: 11px;
  font-weight: 500;
}

.desc {
  font-size: 12.5px;
  color: var(--warm-600);
  margin-top: 4px;
  line-height: 1.45;
}

.cancel {
  margin-top: 14px;
  padding: 8px 14px;
  font-size: 13px;
  background: transparent;
  color: var(--warm-600);
  border: 1px solid var(--warm-450);
  border-radius: 7px;
  cursor: pointer;
  font-family: inherit;
}

.cancel:hover {
  background: var(--warm-100);
}
</style>
