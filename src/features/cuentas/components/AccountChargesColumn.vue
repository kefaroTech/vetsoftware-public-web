<script setup lang="ts">
import { Ban, FileText, Package, Receipt, Stethoscope } from 'lucide-vue-next'
import { useCuentas } from '../composables/useCuentas'
import { formatMoney } from '@/features/tienda/composables/pricing'
import type { ChargeKind, UnifiedCharge } from '../types/cuentas'

/**
 * Columna de cargos del detalle de cuenta, agrupados por mascota.
 *
 * Sale de `AccountDetail` junto con la de abonos: eran dos listas
 * independientes que sólo compartían el contenedor de dos columnas.
 */
defineProps<{ readOnly: boolean; canVoid: boolean }>()

const emit = defineEmits<{ void: [charge: UnifiedCharge] }>()

const store = useCuentas()

const CHARGE_ICON: Record<ChargeKind, typeof Package> = {
  product: Package,
  service: Stethoscope,
  general: Receipt,
}
</script>

<template>
  <section class="col">
    <div class="section-head">
      <span class="sh-title ds-text-strong"
        ><FileText :size="16" :stroke-width="1.7" /> Cargos por mascota</span
      >
    </div>

    <div v-if="store.charges.value.length === 0" class="mini-empty">Sin cargos todavía.</div>
    <div v-for="group in store.chargesByPet.value" v-else :key="group.key" class="group">
      <div class="group-head">
        <span class="group-id">
          <span
            class="pet-avatar"
            :class="group.key === 'general' ? 'ds-tone--neutral' : 'ds-tone--accent'"
          >
            <Package v-if="group.key === 'general'" :size="13" :stroke-width="1.8" />
            <template v-else>{{ group.name.slice(0, 2).toUpperCase() }}</template>
          </span>
          <span class="group-name ds-strong">{{ group.name }}</span>
        </span>
        <span class="group-sub">{{ formatMoney(group.subtotal) }}</span>
      </div>
      <ul class="ds-list-reset">
        <li
          v-for="c in group.charges"
          :key="`${c.kind}-${c.id}`"
          class="charge"
          :class="{ voided: c.voided }"
        >
          <component
            :is="CHARGE_ICON[c.kind]"
            :size="14"
            :stroke-width="1.7"
            class="c-icon"
            :class="c.kind"
          />
          <span class="c-concept ds-flex-fill ds-truncate">
            {{ c.concept }}<span v-if="c.quantity > 1" class="c-qty">x{{ c.quantity }}</span>
            <span
              v-if="c.voided"
              class="c-void"
              :title="c.voidReason ? `Motivo: ${c.voidReason}` : ''"
            >
              Anulado{{ c.voidedByName ? ` por ${c.voidedByName}` : '' }}
            </span>
          </span>
          <span
            v-if="c.createdByName"
            class="c-by ds-truncate"
            :title="`Registrado por ${c.createdByName}`"
            >{{ c.createdByName }}</span
          >
          <span class="c-date ds-num">{{ c.date.slice(5, 10) }}</span>
          <span class="c-amount ds-item-label ds-num">{{ formatMoney(c.amount) }}</span>
          <button
            v-if="!readOnly && !c.voided && canVoid"
            type="button"
            class="c-void-btn"
            title="Anular cargo"
            @click="emit('void', c)"
          >
            <Ban :size="13" :stroke-width="1.9" />
          </button>
          <Ban v-else-if="c.voided" :size="14" :stroke-width="1.9" class="c-banned" />
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
/* Base de columna compartida con la otra mitad del detalle: el CSS scoped no
   cruza fronteras de componente, así que va en ambas.
   Layout via primitivas: .ds-list-reset, .ds-flex-fill, .ds-truncate,
   .ds-item-label, .ds-num, .ds-strong, .ds-text-strong, .ds-tone--accent. */
.col {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 14px;
  overflow: hidden;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--warm-200);
}

.sh-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.sh-title svg {
  color: var(--amatista-600);
}

.mini-empty {
  padding: 28px 18px;
  text-align: center;
  font-size: 13px;
  color: var(--warm-400);
}

.group {
  padding: 8px 18px;
}

.group:not(:last-child) {
  border-bottom: 1px solid var(--warm-100);
}

.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 0 8px;
  border-bottom: 1.5px solid var(--warm-200);
  margin-bottom: 4px;
}

.group-id {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.pet-avatar {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-size: 10.5px;
  font-weight: 700;
}

/* El grupo "general" ya no lleva una variante local: los dos tonos del avatar
   se enganchan con `:class` (`.ds-tone--neutral` / `.ds-tone--accent`,
   primitives.css). La base `.pet-avatar` no declara `background` ni `color`,
   así que las primitivas de (0,1,0) pintan sin competencia. */

.group-name {
  font-size: 13.5px;
}

.group-sub {
  font-size: 13px;
  font-weight: 700;
  color: var(--amatista-700);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.charge {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid var(--warm-100);
}

.charge:last-child {
  border-bottom: none;
}

.c-icon.product {
  color: var(--warm-500);
}

.c-icon.service {
  color: oklch(45% 0.15 240deg);
}

.c-icon.general {
  color: var(--amatista-600);
}

.c-concept {
  font-size: 13px;
  color: var(--warm-800);
}

.c-by {
  font-size: 11px;
  color: var(--warm-400);
  max-width: 90px;
  flex-shrink: 0;
}

.c-date {
  font-size: 11px;
  color: var(--warm-400);
  white-space: nowrap;
}

.c-amount {
  white-space: nowrap;
}

.charge.voided .c-amount {
  text-decoration: line-through;
  color: var(--warm-500);
}

.c-qty {
  display: inline-block;
  margin-left: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--amatista-700);
  font-variant-numeric: tabular-nums;
}

.c-void {
  display: inline-block;
  margin-left: 6px;
  font-size: 11px;
  font-weight: 500;
  color: var(--danger-700);
}

.c-banned {
  color: var(--danger-500);
  flex-shrink: 0;
}

.c-void-btn {
  width: 24px;
  height: 24px;
  border: 1px solid var(--warm-450);
  background: transparent;
  color: var(--warm-500);
  cursor: pointer;
  border-radius: 6px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

/* stylelint-disable-next-line vetsoftware/no-duplicate-primitive -- el cuerpo coincide con `.ds-btn--danger`, pero esa primitiva es el tono en REPOSO de un `.ds-btn`: aplicarla desde el template pintaría de rojo un botón que aquí sólo se tiñe al pasar el ratón, y arrastraría la base de `.ds-btn` (padding, tipografía, radio) sobre un cuadrado de 24px centrado con `place-items`. */
.c-void-btn:hover {
  background: var(--danger-50);
  border-color: var(--danger-border);
  color: var(--danger-700);
}
</style>
