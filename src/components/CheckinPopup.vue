<template>
  <div class="popup-overlay" @click="$emit('close')">
    <div class="popup-content" @click.stop>
      <button class="close-btn" type="button" @click="$emit('close')">×</button>

      <div class="popup-header">
        <h3>{{ checkin.username || '打卡' }}</h3>
        <div class="header-actions">
          <span class="checkin-date">{{ formatDate(checkin.createdAt) }}</span>
          <button
            v-if="currentUserId && checkin.userId === currentUserId"
            class="delete-btn"
            type="button"
            @click="$emit('delete', checkin.id)"
          >
            删除
          </button>
        </div>
      </div>

      <div class="popup-body">
        <div v-if="checkin.imageUrl" class="checkin-image">
          <img :src="toAbsoluteMediaUrl(checkin.imageUrl)" alt="checkin" />
        </div>

        <div v-if="checkin.text" class="checkin-text">
          {{ checkin.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { API_BASE_URL } from '../api/client'

type Checkin = {
  id: string
  userId: string
  username: string
  latitude: number
  longitude: number
  text: string
  imageUrl: string | null
  createdAt: string
}

const props = defineProps<{
  checkin: Checkin
  currentUserId: string
}>()

defineEmits<{
  close: []
  delete: [id: string]
}>()

const toAbsoluteMediaUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${API_BASE_URL}${url}`
}

const formatDate = (date: string) => {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('zh-CN')
}

const checkin = computed(() => props.checkin)
const currentUserId = computed(() => props.currentUserId)
</script>

<style scoped>
/* 样式与 POIPopup 保持同款结构 */
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.popup-content {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  max-width: 520px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  padding: 0;
}

.popup-header,
.popup-body {
  padding: 24px;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  cursor: pointer;
  font-size: 20px;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.05);
}

.popup-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.header-actions {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.checkin-date {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.6);
}

.delete-btn {
  border: none;
  background: transparent;
  color: rgba(143, 1, 0, 0.9);
  cursor: pointer;
  font-size: 13px;
  padding: 0;
}

.delete-btn:hover {
  text-decoration: underline;
}

.checkin-image {
  width: 100%;
  height: 260px;
  overflow: hidden;
  border-radius: 12px;
  margin-bottom: 12px;
}

.checkin-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.checkin-text {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
}
</style>
