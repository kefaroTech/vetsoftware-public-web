<script setup lang="ts">
import { Bell } from 'lucide-vue-next'
import { useFeUvt } from '../composables/useFeUvt'
import { feMoney } from '../composables/feFormat'

const props = defineProps<{ total: number }>()

const { uvtThresholdQty, threshold, thresholdBreakdown } = useFeUvt()
</script>

<template>
  <div class="uvtbanner">
    <Bell :size="16" :stroke-width="1.9" />
    <div>
      <strong>Esta venta supera {{ uvtThresholdQty }} UVT ({{ feMoney(threshold) }}).</strong>
      La DIAN exige <strong>Factura electrónica</strong> con los datos fiscales del cliente.
      <div class="sub">{{ thresholdBreakdown() }} · total {{ feMoney(props.total) }}</div>
    </div>
  </div>
</template>

<style scoped>
.uvtbanner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 11px;
  font-size: 12.5px;
  line-height: 1.5;
  background: oklch(95% 0.06 80);
  border: 1px solid oklch(88% 0.09 80);
  color: oklch(40% 0.11 70);
}
.uvtbanner :deep(svg) {
  flex-shrink: 0;
  margin-top: 1px;
}
.sub {
  font-size: 11px;
  color: oklch(50% 0.08 70);
  margin-top: 3px;
}
</style>
