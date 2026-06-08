<script setup>
import { ref } from 'vue'
import api from '../api'

const email = ref('')
const isLoading = ref(false)
const statusMsg = ref('')
const statusType = ref('success') // 'success' | 'error'
const showStatus = ref(false)

const handleForgot = async () => {
  if (!email.value) { 
      showMessage('Lütfen e-posta adresinizi girin.', 'error')
      return 
  }
  
  isLoading.value = true
  try {
      const res = await api.post('/auth/api/forgot-password', { email: email.value })
      if (res.data.success) {
          showMessage(res.data.message, 'success')
      } else {
          showMessage(res.data.message || 'Bir hata oluştu.', 'error')
      }
  } catch (err) {
      showMessage(err.response?.data?.message || 'Bir hata oluştu.', 'error')
  } finally {
      isLoading.value = false
  }
}

const showMessage = (msg, type) => {
  statusMsg.value = msg
  statusType.value = type
  showStatus.value = true
}
</script>

<template>
  <div class="login-root">
    <div class="login-bg" />
    <div class="login-card">

      <div class="login-logo">
        <div class="logo-icon">
          <i class="fas fa-cube"></i>
        </div>
        <span class="logo-text">ITManager<span class="logo-dot">.</span></span>
      </div>

      <h1 class="login-title">Şifremi Unuttum</h1>
      <p class="login-sub">E-posta adresinizi girin, sıfırlama bağlantısı gönderelim.</p>

      <transition name="err">
        <div v-if="showStatus" :class="['status-msg', statusType]">
          <i :class="statusType === 'error' ? 'fas fa-circle-exclamation' : 'fas fa-check-circle'"></i>
          {{ statusMsg }}
        </div>
      </transition>

      <form @submit.prevent="handleForgot" class="login-form">

        <div class="field-group">
          <label class="field-label">E-posta Adresi</label>
          <div class="field-wrap">
            <i class="fas fa-envelope field-icon"></i>
            <input
              v-model="email"
              type="email"
              placeholder="ad@sirket.com"
              required
              autofocus
              class="field-input"
            />
          </div>
        </div>

        <button type="submit" :disabled="isLoading" class="login-btn">
          <span v-if="isLoading" class="btn-spinner"></span>
          {{ isLoading ? 'Gönderiliyor…' : 'Bağlantı Gönder' }}
        </button>
        
        <div class="text-center mt-3">
             <router-link to="/login" class="back-link"><i class="fas fa-arrow-left mr-1"></i> Giriş Sayfasına Dön</router-link>
        </div>
      </form>

      <p class="login-footer">IT Yönetim Platformu &mdash; &copy; {{ new Date().getFullYear() }}</p>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.login-root {
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f3f4;
  position: relative;
}

.login-bg {
  position: fixed;
  inset: 0;
  background-image: radial-gradient(circle, #d1d5db 1px, transparent 1px);
  background-size: 28px 28px;
  opacity: 0.45;
  pointer-events: none;
}

.login-card {
  position: relative;
  z-index: 1;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 40px 36px 32px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.08);
}

.login-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  margin-bottom: 24px;
}
.logo-icon {
  width: 28px;
  height: 28px;
  background: var(--color-brand, #1a73e8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}
.logo-icon i { color: #fff; font-size: 13px; }
.logo-text { font-size: 18px; font-weight: 700; color: #111827; letter-spacing: -0.5px; }
.logo-dot { color: var(--color-brand, #1a73e8); }

.login-title { font-size: 20px; font-weight: 700; color: #111827; text-align: center; margin: 0 0 4px; }
.login-sub { font-size: 13px; color: #6b7280; text-align: center; margin: 0 0 24px; }

.status-msg {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 12.5px;
  margin-bottom: 16px;
  line-height: 1.4;
}
.status-msg.error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
.status-msg.success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #059669; }

.err-enter-active { transition: all .2s ease; }
.err-enter-from   { opacity: 0; transform: translateY(-6px); }
.err-leave-active { transition: all .15s ease; }
.err-leave-to     { opacity: 0; transform: translateY(-6px); }

.login-form { display: flex; flex-direction: column; gap: 14px; }
.field-group { display: flex; flex-direction: column; gap: 5px; }
.field-label { font-size: 12px; font-weight: 600; color: #374151; letter-spacing: 0.2px; }
.field-wrap { position: relative; display: flex; align-items: center; }
.field-icon { position: absolute; left: 11px; font-size: 12px; color: #9ca3af; pointer-events: none; }
.field-input {
  width: 100%; height: 40px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0 36px 0 34px;
  font-size: 13.5px; color: #111827; background: #fff; outline: none; transition: border-color .15s, box-shadow .15s;
  font-family: inherit; box-sizing: border-box;
}
.field-input::placeholder { color: #d1d5db; }
.field-input:focus { border-color: var(--color-brand, #1a73e8); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-brand, #1a73e8) 15%, transparent); }

.login-btn {
  margin-top: 6px; height: 42px; background: var(--color-brand, #1a73e8); color: #fff; border: none; border-radius: 8px;
  font-size: 13.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: filter .15s, transform .1s, opacity .15s; font-family: inherit; box-shadow: 0 2px 8px color-mix(in srgb, var(--color-brand, #1a73e8) 30%, transparent);
}
.login-btn:hover:not(:disabled) { filter: brightness(0.93); }
.login-btn:active:not(:disabled) { transform: scale(0.98); }
.login-btn:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.back-link { font-size: 12px; color: #6b7280; text-decoration: none; font-weight: 500; transition: color 0.2s; }
.back-link:hover { color: #1a73e8; }

.login-footer { margin: 24px 0 0; font-size: 11px; color: #9ca3af; text-align: center; }
</style>
