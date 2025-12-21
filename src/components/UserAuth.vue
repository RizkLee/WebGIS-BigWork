<template>
  <div class="auth-container">
    <button 
      v-if="!isLoggedIn" 
      class="login-btn" 
      @click="showAuthModal = true"
    >
      登录/注册
    </button>
    
    <div v-else class="user-menu">
      <button class="user-btn" @click="showUserMenu = !showUserMenu">
        <img
          v-if="user?.avatarUrl"
          class="user-avatar"
          :src="user.avatarUrl"
          alt="avatar"
        />
        <span v-else class="user-icon">👤</span>
        <span class="user-name">{{ user?.username }}</span>
      </button>

      <transition name="fade">
        <div v-if="showUserMenu" class="dropdown-menu">
          <div class="menu-item" @click="handleProfile">个人信息</div>
          <div class="menu-item" @click="handleLogout">退出登录</div>
        </div>
      </transition>
    </div>

    <!-- 登录/注册模态框 -->
    <teleport to="body">
      <transition name="modal">
        <div v-if="showAuthModal" class="modal-overlay" @click="showAuthModal = false">
          <div class="modal-content" @click.stop>
            <button class="close-btn" @click="showAuthModal = false">×</button>
            
            <div class="modal-header">
              <h2>{{ isLogin ? '登录' : '注册' }}</h2>
              <p>{{ isLogin ? '欢迎回到湖南师范大学校园指南' : '创建账号以享受完整功能' }}</p>
            </div>

            <form @submit.prevent="handleSubmit" class="auth-form">
              <div class="form-group">
                <label>邮箱</label>
                <input 
                  v-model="formData.email"
                  type="email"
                  placeholder="请输入邮箱地址"
                  required
                />
              </div>

              <div class="form-group">
                <label>密码</label>
                <input 
                  v-model="formData.password"
                  type="password"
                  placeholder="请输入密码"
                  required
                  minlength="6"
                />
              </div>

              <div v-if="!isLogin" class="form-group">
                <label>确认密码</label>
                <input 
                  v-model="formData.confirmPassword"
                  type="password"
                  placeholder="请再次输入密码"
                  required
                />
              </div>

              <div v-if="!isLogin" class="form-group">
                <label>用户名</label>
                <input 
                  v-model="formData.username"
                  type="text"
                  placeholder="请输入用户名"
                  required
                />
              </div>

              <div v-if="errorMessage" class="error-message">
                {{ errorMessage }}
              </div>

              <button type="submit" class="submit-btn" :disabled="isLoading">
                {{ isLoading ? '处理中...' : (isLogin ? '登录' : '注册') }}
              </button>
            </form>

            <div class="switch-mode">
              <span v-if="isLogin">
                还没有账号？
                <a @click="isLogin = false">立即注册</a>
              </span>
              <span v-else>
                已有账号？
                <a @click="isLogin = true">立即登录</a>
              </span>
            </div>
          </div>
        </div>
      </transition>
    </teleport>

    <!-- 个人信息模态框 -->
    <teleport to="body">
      <transition name="modal">
        <div v-if="showProfileModal" class="modal-overlay" @click="showProfileModal = false">
          <div class="modal-content" @click.stop>
            <button class="close-btn" @click="showProfileModal = false">×</button>
            
            <div class="modal-header">
              <h2>个人信息</h2>
            </div>

            <div class="profile-info">
              <div class="info-item">
                <label>头像</label>
                <div class="info-value avatar-row">
                  <img
                    v-if="user?.avatarUrl"
                    class="profile-avatar"
                    :src="user.avatarUrl"
                    alt="avatar"
                  />
                  <span v-else class="avatar-placeholder">未设置</span>

                  <label class="avatar-upload-btn">
                    选择图片
                    <input
                      class="avatar-file-input"
                      type="file"
                      accept="image/*"
                      @change="onAvatarFileChange"
                    />
                  </label>

                  <button
                    class="avatar-save-btn"
                    type="button"
                    :disabled="!avatarFile || isUploadingAvatar"
                    @click="uploadAvatar"
                  >
                    {{ isUploadingAvatar ? '上传中...' : '上传' }}
                  </button>
                </div>
              </div>

              <div class="info-item">
                <label>用户名</label>
                <div class="info-value">{{ user?.username }}</div>
              </div>

              <div class="info-item">
                <label>邮箱</label>
                <div class="info-value">{{ user?.email }}</div>
              </div>

              <div class="info-item">
                <label>用户ID</label>
                <div class="info-value">{{ user?.id }}</div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { apiClient } from '../api/client'

interface User {
  id: string
  email: string
  username: string
  avatarUrl?: string | null
}

const isLoggedIn = ref(false)
const user = ref<User | null>(null)
const showAuthModal = ref(false)
const showUserMenu = ref(false)
const isLogin = ref(true)
const isLoading = ref(false)
const errorMessage = ref('')

const formData = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  username: ''
})

const handleSubmit = async () => {
  errorMessage.value = ''
  
  if (!isLogin.value && formData.password !== formData.confirmPassword) {
    errorMessage.value = '两次输入的密码不一致'
    return
  }

  isLoading.value = true

  try {
    if (isLogin.value) {
      await login(formData.email, formData.password)
    } else {
      await register(formData.email, formData.password, formData.username)
    }
    
    showAuthModal.value = false
    resetForm()
  } catch (error: any) {
    errorMessage.value = error.message || '操作失败，请重试'
  } finally {
    isLoading.value = false
  }
}

const login = async (email: string, password: string) => {
  const response = await apiClient.login(email, password) as any
  
  if (response.success && response.user) {
    isLoggedIn.value = true
    user.value = response.user
    localStorage.setItem('user', JSON.stringify(response.user))
  }
}

const register = async (email: string, password: string, username: string) => {
  const response = await apiClient.register(email, password, username) as any
  
  if (response.success && response.user) {
    isLoggedIn.value = true
    user.value = response.user
    localStorage.setItem('user', JSON.stringify(response.user))
  }
}

const handleLogout = () => {
  isLoggedIn.value = false
  user.value = null
  showUserMenu.value = false
  localStorage.removeItem('user')
}

const showProfileModal = ref(false)

const avatarFile = ref<File | null>(null)
const isUploadingAvatar = ref(false)

const onAvatarFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  avatarFile.value = file || null
}

const uploadAvatar = async () => {
  if (!user.value?.id || !avatarFile.value) return

  isUploadingAvatar.value = true
  try {
    const res = await apiClient.uploadAvatar(user.value.id, avatarFile.value) as any
    if (res?.success && res?.avatarUrl) {
      user.value = { ...user.value, avatarUrl: res.avatarUrl }
      localStorage.setItem('user', JSON.stringify(user.value))
      avatarFile.value = null
      alert('头像上传成功')
    } else {
      throw new Error('上传失败')
    }
  } catch (error: any) {
    alert(error.message || '头像上传失败')
  } finally {
    isUploadingAvatar.value = false
  }
}

const handleProfile = () => {
  showUserMenu.value = false
  showProfileModal.value = true
}

const resetForm = () => {
  formData.email = ''
  formData.password = ''
  formData.confirmPassword = ''
  formData.username = ''
  errorMessage.value = ''
}

// 导出用户信息供其他组件使用
defineExpose({
  user,
  isLoggedIn
})

onMounted(() => {
  // 检查是否已登录
  const savedUser = localStorage.getItem('user')
  if (savedUser) {
    user.value = JSON.parse(savedUser)
    isLoggedIn.value = true
  }
})
</script>

<style scoped>
.auth-container {
  position: relative;
}

.login-btn {
  background-color: #8F0100;
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.login-btn:hover {
  background-color: #b24646;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(143, 1, 0, 0.3);
}

.user-menu {
  position: relative;
}

.user-btn {
  background: none;
  border: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.user-btn:hover {
  background-color: rgba(143, 1, 0, 0.1);
}

.user-icon {
  font-size: 20px;
}

.user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 9999px;
  object-fit: cover;
  border: 1px solid rgba(143, 1, 0, 0.25);
}

.user-name {
  color: #8F0100;
  font-weight: 500;
  font-size: 14px;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  min-width: 140px;
  overflow: hidden;
  z-index: 1000;
}

.menu-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 14px;
  color: #333;
}

.menu-item:hover {
  background-color: rgba(143, 1, 0, 0.05);
}

.avatar-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.profile-avatar {
  width: 40px;
  height: 40px;
  border-radius: 9999px;
  object-fit: cover;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.avatar-placeholder {
  color: #333;
  opacity: 0.7;
  font-size: 14px;
}

.avatar-upload-btn {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: white;
  cursor: pointer;
  font-size: 14px;
  user-select: none;
}

.avatar-file-input {
  display: none;
}

.avatar-save-btn {
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  border: none;
  background-color: #8F0100;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.avatar-save-btn:hover {
  background-color: #b24646;
}

.avatar-save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-overlay {
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

.modal-content {
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  max-width: 450px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  padding: 32px;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 28px;
  color: #666;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.close-btn:hover {
  background-color: #f5f5f5;
  color: #333;
}

.modal-header {
  margin-bottom: 24px;
}

.modal-header h2 {
  font-family: 'Source Han Serif CN', serif;
  color: #8F0100;
  font-size: 28px;
  margin: 0 0 8px 0;
}

.modal-header p {
  color: #666;
  font-size: 14px;
  margin: 0;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.form-group input {
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #8F0100;
}

.error-message {
  color: #E71D36;
  font-size: 14px;
  padding: 8px 12px;
  background-color: rgba(231, 29, 54, 0.1);
  border-radius: 6px;
}

.submit-btn {
  background-color: #8F0100;
  color: white;
  border: none;
  padding: 14px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 8px;
}

.submit-btn:hover:not(:disabled) {
  background-color: #b24646;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(143, 1, 0, 0.3);
}

.submit-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.switch-mode {
  text-align: center;
  margin-top: 16px;
  font-size: 14px;
  color: #666;
}

.switch-mode a {
  color: #8F0100;
  cursor: pointer;
  text-decoration: none;
  font-weight: 500;
}

.switch-mode a:hover {
  text-decoration: underline;
}

/* 个人信息面板样式 */
.profile-info {
  padding: 20px 0;
}

.info-item {
  margin-bottom: 20px;
}

.info-item label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
}

.info-value {
  font-size: 16px;
  color: #333;
  padding: 12px 16px;
  background-color: #f5f5f5;
  border-radius: 8px;
  word-break: break-all;
}

/* 过渡动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.modal-enter-active, .modal-leave-active {
  transition: opacity 0.3s;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.3s;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.9);
}
</style>
