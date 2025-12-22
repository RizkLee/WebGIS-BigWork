<template>
  <nav class="navbar">
    <button class="menu-button" @click="toggleMenu" aria-label="菜单">
      <div class="hamburger">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </button>

    <div class="nav-center">
      <img 
        src="https://pan.hunnu.edu.cn/media/custom/mylogo.png" 
        alt="HNNU Logo" 
        class="nav-logo"
      >
      <h1 class="nav-title">校园指南</h1>
    </div>

    <div class="nav-right">
      <UserAuth />
    </div>
  </nav>

  <!-- 侧边菜单 -->
  <transition name="slide">
    <div v-if="menuOpen" class="sidebar-overlay" @click="toggleMenu">
      <div class="sidebar" @click.stop>
        <div class="sidebar-header">
          <h2>菜单</h2>
          <button class="close-button" @click="toggleMenu" aria-label="关闭">×</button>
        </div>
        <ul class="menu-list">
          <li><a href="#map">地图导览</a></li>
          <li><a href="#sections">校园服务</a></li>
          <li><a href="https://www.hunnu.edu.cn/" target="_blank">学校官网</a></li>
        </ul>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import UserAuth from './UserAuth.vue'

const menuOpen = ref(false)

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}
</script>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 70px;
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
  z-index: 1000;
}

.menu-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 50px;
}

.hamburger {
  width: 24px;
  height: 18px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.hamburger span {
  display: block;
  height: 3px;
  background-color: #8F0100;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.menu-button:hover .hamburger span {
  background-color: #b24646;
}

.nav-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 15px;
}

.nav-logo {
  height: 45px;
  width: auto;
}

.nav-title {
  font-family: 'Source Han Serif CN', serif;
  font-size: 24px;
  font-weight: 600;
  color: #8F0100;
  margin: 0;
}

.nav-right {
  min-width: 120px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

/* 侧边菜单 */
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1100;
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 280px;
  background-color: #fff;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.2);
  padding: 0;
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 2px solid #8F0100;
}

.sidebar-header h2 {
  font-family: 'Source Han Serif CN', serif;
  color: #8F0100;
  font-size: 22px;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  font-size: 32px;
  color: #8F0100;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.close-button:hover {
  color: #b24646;
}

.menu-list {
  list-style: none;
  padding: 20px 0;
  margin: 0;
}

.menu-list li {
  margin: 0;
}

.menu-list a {
  display: block;
  padding: 15px 25px;
  color: #333;
  text-decoration: none;
  font-size: 16px;
  font-family: 'Source Han Serif CN', serif;
  transition: all 0.3s ease;
  border-left: 4px solid transparent;
}

.menu-list a:hover {
  background-color: rgba(143, 1, 0, 0.05);
  border-left-color: #8F0100;
  color: #8F0100;
}

/* 过渡动画 */
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.3s ease;
}

.slide-enter-active .sidebar,
.slide-leave-active .sidebar {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
}

.slide-enter-from .sidebar,
.slide-leave-to .sidebar {
  transform: translateX(-100%);
}

@media (max-width: 768px) {
  .navbar {
    height: 60px;
    padding: 0 15px;
  }

  .nav-center {
    gap: 8px;
  }

  .nav-logo {
    height: 28px;
  }

  .nav-title {
    font-size: 16px;
  }

  .sidebar {
    width: 250px;
  }
}

@media (max-width: 480px) {
  .navbar {
    padding: 0 10px;
  }

  .nav-center {
    gap: 6px;
  }

  .nav-logo {
    height: 24px;
  }

  .nav-title {
    font-size: 14px;
  }

  .menu-button {
    min-width: 40px;
    padding: 8px;
  }

  .nav-right {
    min-width: 100px;
  }
}
</style>
