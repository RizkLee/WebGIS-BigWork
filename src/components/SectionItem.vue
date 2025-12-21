<template>
  <div class="item-row">
    <div class="item-header">
      <div class="item-title" :class="{ active: isExpanded }" @click="toggleExpand">
        {{ title }}
      </div>
      <div class="item-links">
        <template v-for="(link, index) in links" :key="index">
          <a 
            v-if="link.type === 'link'" 
            :href="link.url" 
            class="link-button"
            target="_blank"
          >
            {{ link.text }}
          </a>
          <QRButton 
            v-else-if="link.type === 'qr'" 
            :text="link.text" 
            :qr-image="link.qrImage || ''"
            :qr-hint="link.qrHint"
          />
        </template>
      </div>
    </div>
    <div class="item-description" :class="{ active: isExpanded }">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import QRButton from './QRButton.vue'
import type { LinkButton } from '../types'

interface Props {
  title: string
  links: LinkButton[]
}

defineProps<Props>()
const isExpanded = ref(false)

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}
</script>

<style scoped>
.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
  flex-direction: column;
  align-items: flex-start;
}

.item-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-links {
  display: flex;
  gap: 15px;
}

.item-title {
  font-family: 'Microsoft YaHei', sans-serif;
  font-size: 16px;
  color: #333;
  cursor: pointer;
  user-select: none;
  position: relative;
  padding-left: 20px;
}

.item-title::before {
  content: '▸';
  position: absolute;
  left: 0;
  transition: transform 0.3s ease;
}

.item-title.active::before {
  transform: rotate(90deg);
}

.link-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 4px;
  background-color: white;
  color: #666;
  text-decoration: none;
  transition: all 0.3s ease;
}

.link-button:hover {
  background-color: #f5f5f5;
}

.item-description {
  max-height: 0;
  overflow: hidden;
  transition: 
    max-height 0.5s ease-in-out,
    opacity 0.3s ease-in-out,
    transform 0.3s ease-in-out,
    padding 0.3s ease-in-out;
  margin: 0;
  padding: 0 20px;
  width: 60%;
  font-family: 'Source Han Serif CN', serif;
  font-weight: 400;
  font-size: 14px;
  color: #666;
  background-color: #f9f9f9;
  border-radius: 4px;
  box-sizing: border-box;
  opacity: 0;
  transform: translateY(-10px);
}

.item-description.active {
  max-height: 500px;
  margin: 10px 0;
  padding: 20px;
  opacity: 1;
  transform: translateY(0);
}
</style>
