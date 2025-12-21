<script setup lang="ts">
import NavigationBar from './components/NavigationBar.vue'
import MapView from './components/MapView.vue'
import ContentSection from './components/ContentSection.vue'
import SectionItem from './components/SectionItem.vue'
import { sectionData } from './data/sections'
</script>

<template>
  <NavigationBar />
  
  <div class="main-content">
    <section id="map" class="map-section">
      <MapView />
      <div class="scroll-hint">
        <span class="hint-text">↓ 下滑显示更多指南</span>
      </div>
    </section>

    <section id="sections" class="sections-wrapper">
      <h2 class="main-title">本科生校园指南</h2>

      <ContentSection 
        v-for="(section, index) in sectionData" 
        :key="index" 
        :title="section.title"
      >
        <SectionItem
          v-for="(item, itemIndex) in section.items"
          :key="itemIndex"
          :title="item.title"
          :links="item.links"
        >
          <div v-html="item.description"></div>
        </SectionItem>
      </ContentSection>
    </section>
  </div>
</template>

<style scoped>
.main-content {
  margin-top: 70px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.map-section {
  width: 100%;
  height: calc(100vh - 70px);
  display: flex;
  flex-direction: column;
  position: relative;
}

.scroll-hint {
  width: 100%;
  height: 40px;
  flex: 0 0 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  font-family: 'Source Han Serif CN', serif;
  color: #8F0100;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  z-index: 500;
}

.scroll-hint:hover {
  background: rgba(255, 255, 255, 1);
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-5px);
  }
  60% {
    transform: translateY(-3px);
  }
}

.hint-text {
  font-weight: 500;
}

.sections-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.main-title {
  font-family: 'Source Han Serif CN', serif;
  font-weight: 600;
  color: #8F0100;
  font-size: 28px;
  padding: 20px 0;
  margin: 40px 0 10px 0;
  border-bottom: 3px solid #8F0100;
  width: 800px;
  max-width: 90%;
  text-align: left;
}

@media (max-width: 768px) {
  .main-content {
    margin-top: 70px;
  }

  .main-title {
    font-size: 24px;
  }
}
</style>
