<script setup lang="ts">
import { computed } from 'vue'
import {
  ShieldCheck,
  FileText,
  User,
  Receipt,
  Check,
  Bell,
  ChevronRight,
  ArrowRight,
} from 'lucide-vue-next'
import { useFacturacionEnablement } from '../../composables/useFacturacionEnablement'
import { DOC_TYPE_LABEL } from '../../types/facturacion'

const emit = defineEmits<{ openWizard: [step: number]; openRetenciones: [] }>()

const {
  profile,
  withholding,
  enabledResolutions,
  profileOk,
  invoiceResolutionOk,
  ready,
  needsAttention,
  resolutionAlerts,
} = useFacturacionEnablement()

const reqs = computed(() => [
  {
    key: 'profile',
    step: 1,
    icon: User,
    ok: profileOk.value,
    title: 'Identidad fiscal de la empresa',
    desc: profileOk.value ? profile.value?.legalName ?? '' : 'Datos del emisor ante la DIAN',
  },
  {
    key: 'res',
    step: 2,
    icon: FileText,
    ok: invoiceResolutionOk.value,
    attention: needsAttention.value,
    title: 'Resoluciones de numeración',
    desc: invoiceResolutionOk.value
      ? `${enabledResolutions.value.length} activa(s)`
      : 'Al menos la factura electrónica (FEV)',
  },
])

const doneCount = computed(() => reqs.value.filter((r) => r.ok).length)
const firstIncomplete = computed(() => reqs.value.find((r) => !r.ok)?.step ?? 1)

function alertText(kind: string, prefix: string | null, type: string, validTo: string, left: number) {
  const p = prefix ?? type
  if (kind === 'agotar')
    return `La resolución ${p} (${type}) está por agotarse · quedan ${left.toLocaleString('es')} consecutivos.`
  if (kind === 'vencida') return `La resolución ${p} está vencida desde ${validTo}. Solicita una nueva ante la DIAN.`
  return `La resolución ${p} vence el ${validTo}. Gestiona la renovación con tiempo.`
}
</script>

<template>
  <div class="board">
    <div class="readycard" :class="{ ready }">
      <div class="readycard-ic">
        <ShieldCheck v-if="ready" :size="26" :stroke-width="1.8" />
        <FileText v-else :size="26" :stroke-width="1.8" />
      </div>
      <div class="readycard-text">
        <div class="readycard-title">{{ ready ? 'Lista para facturar' : 'Habilitación en curso' }}</div>
        <div class="readycard-sub">
          {{
            ready
              ? 'La empresa cumple los requisitos para emitir documentos electrónicos.'
              : `${doneCount} de ${reqs.length} requisitos completos.`
          }}
        </div>
      </div>
      <button type="button" class="cta" @click="emit('openWizard', ready ? 1 : firstIncomplete)">
        {{ ready ? 'Revisar configuración' : 'Continuar habilitación' }}
        <ArrowRight :size="15" :stroke-width="1.9" />
      </button>
    </div>

    <div v-for="(a, i) in resolutionAlerts" :key="i" class="alertrow">
      <Bell :size="14" :stroke-width="1.9" />
      <span>{{
        alertText(
          a.kind,
          a.resolution.prefix,
          DOC_TYPE_LABEL[a.resolution.documentType],
          a.resolution.validTo,
          a.resolution.rangeTo - a.resolution.currentNumber,
        )
      }}</span>
      <button type="button" class="alertcta" @click="emit('openWizard', 2)">Revisar</button>
    </div>

    <div class="checklist">
      <button
        v-for="r in reqs"
        :key="r.key"
        type="button"
        class="checkrow"
        @click="emit('openWizard', r.step)"
      >
        <div class="check-ic" :class="r.ok ? 'ok' : r.attention ? 'att' : 'pend'">
          <Check v-if="r.ok" :size="16" :stroke-width="2.4" />
          <Bell v-else-if="r.attention" :size="15" :stroke-width="1.9" />
          <component :is="r.icon" v-else :size="15" :stroke-width="1.8" />
        </div>
        <div class="check-text">
          <div class="check-title">
            {{ r.title }}
            <span class="reqbadge" :class="r.ok ? 'ok' : r.attention ? 'att' : 'pend'">
              {{ r.ok ? 'Listo' : r.attention ? 'Atención' : 'Pendiente' }}
            </span>
          </div>
          <div class="check-sub">{{ r.desc }}</div>
        </div>
        <span class="check-cta">{{ r.ok ? 'Editar' : 'Completar' }} <ChevronRight :size="14" :stroke-width="1.8" /></span>
      </button>

      <button type="button" class="checkrow" @click="emit('openRetenciones')">
        <div class="check-ic" :class="withholding ? 'ok' : 'opt'">
          <Check v-if="withholding" :size="16" :stroke-width="2.4" />
          <Receipt v-else :size="15" :stroke-width="1.8" />
        </div>
        <div class="check-text">
          <div class="check-title">
            Retenciones
            <span class="opt-tag">Opcional</span>
          </div>
          <div class="check-sub">
            {{ withholding ? 'Configuradas' : 'Para clientes agentes retenedores' }}
          </div>
        </div>
        <span class="check-cta">{{ withholding ? 'Editar' : 'Configurar' }} <ChevronRight :size="14" :stroke-width="1.8" /></span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.board {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.readycard {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 22px;
  border-radius: 16px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
}
.readycard.ready {
  background: linear-gradient(135deg, oklch(95% 0.05 150), var(--warm-50));
  border-color: oklch(80% 0.09 150);
}
.readycard-ic {
  width: 50px;
  height: 50px;
  border-radius: 13px;
  display: grid;
  place-items: center;
  background: var(--warm-150, var(--warm-100));
  color: var(--warm-600);
  flex-shrink: 0;
}
.readycard.ready .readycard-ic {
  background: oklch(92% 0.08 150);
  color: oklch(40% 0.13 150);
}
.readycard-text {
  flex: 1;
  min-width: 0;
}
.readycard-title {
  font-family: var(--font-serif);
  font-size: 21px;
  color: var(--warm-900);
}
.readycard-sub {
  font-size: 12.5px;
  color: var(--warm-600);
  margin-top: 2px;
}
.cta {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 18px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)));
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(50, 20, 80, 0.08), 0 6px 16px -6px oklch(40% 0.18 var(--hue) / 0.45);
}
.alertrow {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 16px;
  border-radius: 12px;
  background: oklch(97% 0.03 80);
  border: 1px solid oklch(88% 0.06 80);
  font-size: 12.5px;
  color: oklch(40% 0.1 70);
}
.alertrow > span {
  flex: 1;
}
.alertcta {
  background: transparent;
  border: none;
  color: oklch(45% 0.13 70);
  font-weight: 600;
  font-size: 12.5px;
  cursor: pointer;
}
.checklist {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.checkrow {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.14s, background 0.14s;
}
.checkrow:hover {
  border-color: var(--amatista-300);
  background: var(--amatista-50);
}
.check-ic {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.check-ic.ok {
  background: oklch(92% 0.08 150);
  color: oklch(40% 0.13 150);
}
.check-ic.pend {
  background: var(--warm-150, var(--warm-100));
  color: var(--warm-600);
}
.check-ic.att {
  background: oklch(94% 0.07 80);
  color: oklch(45% 0.13 70);
}
.check-ic.opt {
  background: var(--amatista-50);
  color: var(--amatista-600);
}
.check-text {
  flex: 1;
  min-width: 0;
}
.check-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 13.5px;
  color: var(--warm-900);
}
.reqbadge {
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
}
.reqbadge.ok {
  background: oklch(94% 0.06 150);
  color: oklch(40% 0.13 150);
}
.reqbadge.pend {
  background: var(--warm-200);
  color: var(--warm-600);
}
.reqbadge.att {
  background: oklch(94% 0.07 80);
  color: oklch(45% 0.13 70);
}
.opt-tag {
  font-size: 10.5px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--warm-150, var(--warm-100));
  color: var(--warm-500);
}
.check-sub {
  font-size: 12px;
  color: var(--warm-600);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.check-cta {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--amatista-700);
  flex-shrink: 0;
}
</style>
