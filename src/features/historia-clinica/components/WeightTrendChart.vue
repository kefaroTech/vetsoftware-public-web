<script setup lang="ts">
import { computed } from 'vue'
import type { WeightRecordResponse } from '@/features/dashboard/views/consulta/nueva/types/weightRecord.types'
import type { WeightUnit } from '@/types/domain'

/**
 * Gráfico de tendencia del peso + su resumen de variación.
 *
 * Se extrajo de `WeightHistoryPanel.vue` sin tocar el cálculo ni el marcado: el
 * panel pasaba de 500 líneas y esto es una sección cerrada — entra una serie
 * cronológica y sale un SVG; no comparte estado con el formulario de alta ni con
 * la lista de registros, que se quedan en el panel.
 *
 * `records` llega en orden ASCENDENTE (cronológico), que es el que dibuja la
 * línea de izquierda a derecha.
 */
const props = defineProps<{ records: WeightRecordResponse[] }>()

const CHART_W = 560
const CHART_H = 150
const PAD_X = 14
const PAD_Y = 18

function toKg(value: number, unit: WeightUnit): number {
  if (unit === 'GRAMS') return value / 1000
  if (unit === 'POUNDS') return value * 0.453592
  return value
}

// Todos los puntos se normalizan a kg para que la tendencia sea comparable aunque haya
// registros en unidades distintas. En la lista se conserva la unidad original.
const chart = computed(() => {
  const pts = props.records.map((r) => ({
    kg: toKg(r.value, r.unit),
    record: r,
  }))
  if (pts.length === 0) return null
  const values = pts.map((p) => p.kg)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const n = pts.length
  const xFor = (i: number) =>
    n === 1 ? CHART_W / 2 : PAD_X + (i * (CHART_W - 2 * PAD_X)) / (n - 1)
  const yFor = (kg: number) => CHART_H - PAD_Y - ((kg - min) / span) * (CHART_H - 2 * PAD_Y)
  const coords = pts.map((p, i) => ({
    x: xFor(i),
    y: yFor(p.kg),
    record: p.record,
    kg: p.kg,
  }))
  const line = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ')
  // `pts` ya se comprobó no vacío arriba y `coords` sale de mapearlo, así que
  // los extremos existen; se nombran para que el compilador lo vea igual que
  // lo ve quien lee, en vez de repetir el indexado dentro de la plantilla.
  const first = coords[0]
  const last = coords[coords.length - 1]
  if (!first || !last) return null
  const area =
    `M${first.x.toFixed(1)},${(CHART_H - PAD_Y).toFixed(1)} ` +
    coords.map((c) => `L${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ') +
    ` L${last.x.toFixed(1)},${(CHART_H - PAD_Y).toFixed(1)} Z`
  return { coords, line, area, min, max }
})

// Variación respecto al registro anterior (en kg normalizado), para el resumen superior.
const trend = computed(() => {
  const asc = props.records
  const lastRec = asc[asc.length - 1]
  const prevRec = asc[asc.length - 2]
  if (!lastRec || !prevRec) return null
  const last = toKg(lastRec.value, lastRec.unit)
  const prev = toKg(prevRec.value, prevRec.unit)
  const diff = last - prev
  const pct = prev !== 0 ? (diff / prev) * 100 : 0
  return { diff, pct }
})
</script>

<template>
  <div v-if="chart" class="wp-chart-wrap">
    <div v-if="trend" class="wp-trend" :class="trend.diff >= 0 ? 'up' : 'down'">
      {{ trend.diff >= 0 ? '▲' : '▼' }}
      {{ Math.abs(trend.diff).toFixed(2) }} kg
      <span class="wp-trend-pct">({{ trend.pct >= 0 ? '+' : '' }}{{ trend.pct.toFixed(1) }}%)</span>
      <span class="wp-trend-cap">vs. registro anterior</span>
    </div>
    <svg
      class="wp-chart"
      :viewBox="`0 0 ${CHART_W} ${CHART_H}`"
      preserveAspectRatio="none"
      role="img"
      aria-label="Tendencia de peso"
    >
      <defs>
        <linearGradient id="wpGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--amatista-400)" stop-opacity="0.28" />
          <stop offset="100%" stop-color="var(--amatista-400)" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path :d="chart.area" fill="url(#wpGrad)" />
      <path
        :d="chart.line"
        fill="none"
        stroke="var(--amatista-600)"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
      <circle
        v-for="(c, i) in chart.coords"
        :key="i"
        :cx="c.x"
        :cy="c.y"
        r="3"
        fill="var(--amatista-700)"
      />
    </svg>
    <div class="wp-chart-axis ds-meta ds-meta--caption">
      <span>máx {{ chart.max.toFixed(2) }} kg</span>
      <span>mín {{ chart.min.toFixed(2) }} kg</span>
    </div>
  </div>
</template>

<style scoped>
.wp-chart-wrap {
  margin-bottom: 14px;
}

.wp-trend {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}

.wp-trend.up {
  color: oklch(52% 0.16 150deg);
}

.wp-trend.down {
  color: var(--danger-500);
}

.wp-trend-pct {
  font-weight: 500;
}

.wp-trend-cap {
  font-size: 11.5px;
  font-weight: 400;
  color: var(--warm-500);
}

.wp-chart {
  width: 100%;
  height: 150px;
  display: block;
}

/* Resto sobre `.ds-meta --caption`: reparto de los dos extremos del eje. */
.wp-chart-axis {
  display: flex;
  justify-content: space-between;
  margin-top: 2px;
}
</style>
