<script setup lang="ts">
import { computed } from 'vue'
import { Shield, X } from 'lucide-vue-next'
import SwitchToggle from './SwitchToggle.vue'
import RolePill from './RolePill.vue'
import { ROLE_COLORS } from '../constants/roleColors'
import type { RoleColor } from '../types'

const props = defineProps<{
  name: string
  active: boolean
  color: RoleColor
  isCreate: boolean
  nameInvalid: boolean
  readOnly?: boolean
  saving?: boolean
}>()

const emit = defineEmits<{
  'update:name': [value: string]
  'update:active': [value: boolean]
  close: []
}>()

const tokens = computed(() => ROLE_COLORS[props.color])

const activeModel = computed({
  get: () => props.active,
  set: (value: boolean) => emit('update:active', value),
})
</script>

<template>
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
      <div class="ds-flex-fill">
        <div class="kicker ds-kicker">
          {{ readOnly ? 'Ver rol' : isCreate ? 'Crear rol' : 'Editar rol' }}
          <span v-if="!readOnly" class="req" title="Campo obligatorio">*</span>
        </div>
        <input
          :value="name"
          type="text"
          class="name-input"
          :class="{ invalid: nameInvalid }"
          placeholder="Nombre del rol"
          spellcheck="false"
          autocomplete="off"
          :readonly="readOnly"
          @input="emit('update:name', ($event.target as HTMLInputElement).value)"
        />
        <div class="head-meta">
          <RolePill :label="name || 'Sin nombre'" :color="color" size="lg" />
          <span class="sep" />
          <SwitchToggle
            v-model="activeModel"
            :disabled="readOnly"
            :aria-label="active ? 'Desactivar rol' : 'Activar rol'"
          />
          <span class="active-text">{{ active ? 'Activo' : 'Inactivo' }}</span>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.head {
  position: relative;
  padding: 22px 26px 18px;
  border-bottom: 1px solid var(--warm-200);
}

/* `.close:disabled` NO migra a `.ds-is-disabled`: `.close` declara
   `cursor: pointer` a (0,2,0) y la primitiva pesa (0,1,0). */
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

/* stylelint-disable-next-line vetsoftware/no-duplicate-primitive -- el cuerpo coincide con `.ds-btn:disabled`, pero `.close` NO es un `.ds-btn`: es un cuadrado de 32px sin borde, centrado con `place-items`, posicionado sobre el gradiente del header. Adoptar la clase sólo para heredar su `:disabled` arrastraría toda la base (padding 9/16, borde, radio, tipografía) y le cambiaría la forma. */
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

.kicker {
  margin-bottom: 4px;
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

@media (width <= 768px) {
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
}
</style>
