<template>
  <div class="section">
    <h2 class="section-title">{{ title }}</h2>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string
}

defineProps<Props>()
</script>

<style scoped>
.section {
  width: 800px;
  max-width: 90%;
  margin: 20px auto;
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.section-title {
  font-family: 'Source Han Serif CN', serif;
  font-weight: 600;
  color: #8F0100;
  font-size: 20px;
  border-bottom: 2px solid #8F0100;
  padding-bottom: 10px;
  margin-bottom: 20px;
}
</style>
