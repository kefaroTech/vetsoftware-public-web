<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PublicLayout from '@/components/public/PublicLayout.vue'
import { storageService } from '@/services/storage/storage.service'
import LoginForm from '../components/LoginForm.vue'

const sessionNotice = ref('')

// Se consume de una vez: leerlo lo borra, para que no reaparezca en el siguiente login.
onMounted(() => {
  sessionNotice.value = storageService.takeSessionReplacedNotice() ?? ''
})
</script>

<template>
  <PublicLayout>
    <template #topRight>
      ¿Eres nuevo? <RouterLink :to="{ name: 'signup' }">Crea una cuenta</RouterLink>
    </template>

    <div class="pub-card pub-reveal">
      <picture class="pub-brand-lockup">
        <source
          type="image/webp"
          srcset="
            /brand/lumbre-lockup-transparent-480.webp   480w,
            /brand/lumbre-lockup-transparent-768.webp   768w,
            /brand/lumbre-lockup-transparent-1024.webp 1024w
          "
          sizes="160px"
        />
        <img
          class="ds-brand-mark"
          src="/brand/lumbre-lockup-transparent-480.png"
          alt="Lumbre — Gestiona lo que cuidas"
          width="160"
          height="160"
          decoding="async"
          loading="eager"
        />
      </picture>
      <div class="pub-eyebrow">Tu clínica</div>
      <h1 class="pub-title">Inicia sesión</h1>
      <p class="pub-sub">Entra con tu código de empleado y tu contraseña.</p>
      <v-alert v-if="sessionNotice" class="mb-5" type="warning" variant="tonal" density="compact">
        {{ sessionNotice }}
      </v-alert>
      <LoginForm />
    </div>
  </PublicLayout>
</template>

<style scoped>
/* Estas dos pantallas llevan el titular un punto más grande. */
.pub-title {
  font-size: 34px;
  line-height: 1.05;
}

.pub-sub {
  margin: 10px 0 28px;
  line-height: 1.5;
}
</style>
