<template>
  <div class="qr-button" @click.stop="togglePopup">
    {{ text }}
    <div class="qr-popup" :class="{ active: isActive }">
      <img :src="qrImage" :alt="text + '二维码'">
      <div class="qr-popup-text">{{ qrHint }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  text: string
  qrImage: string
  qrHint?: string
}

withDefaults(defineProps<Props>(), {
  qrHint: '微信扫码关注公众号'
})

const isActive = ref(false)

const togglePopup = (event: Event) => {
  event.preventDefault()
  isActive.value = !isActive.value
}

const closePopup = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.qr-button')) {
    isActive.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closePopup)
})

onUnmounted(() => {
  document.removeEventListener('click', closePopup)
})
</script>

<style scoped>
.qr-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 4px;
  background-color: white;
  color: #666;
  text-decoration: none;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
}

.qr-button:hover {
  background-color: #f5f5f5;
}

.qr-popup {
  position: absolute;
  bottom: calc(100% + 15px);
  left: 50%;
  transform: translateX(-50%) translateY(10px);
  background-color: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  z-index: 1000;
  text-align: center;
}

.qr-popup::before {
  content: '';
  position: absolute;
  bottom: -9px;
  left: 50%;
  width: 20px;
  height: 20px;
  background-color: white;
  transform: translateX(-50%) rotate(45deg);
  border-radius: 2px;
  box-shadow: 4px 4px 12px -6px rgba(0, 0, 0, 0.1);
}

.qr-popup::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 30px;
  height: 15px;
  background-color: white;
  transform: translateX(-50%);
}

.qr-popup.active {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}

.qr-popup img {
  width: 120px;
  height: 120px;
  display: block;
  margin: 0 auto;
}

.qr-popup-text {
  margin-top: 8px;
  font-family: 'Source Han Serif CN', serif;
  font-size: 12px;
  color: #b24646;
  text-align: center;
}
</style>
