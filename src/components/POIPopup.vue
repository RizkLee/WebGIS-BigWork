<template>
  <div class="popup-overlay" @click="$emit('close')">
    <div class="popup-content" @click.stop>
      <button class="close-btn" @click="$emit('close')">×</button>
      
      <!-- 建筑图片 -->
      <div class="building-image" v-if="buildingImage">
        <img :src="buildingImage" :alt="poi.properties.Name" @error="handleImageError" />
      </div>
      
      <div class="popup-header">
        <h3>{{ poi.properties.Name }}</h3>
        <div class="poi-type" v-if="poi.properties.kind">
          <span class="type-badge">{{ poi.properties.kind }}</span>
        </div>
        <div class="average-rating" v-if="averageRating">
          <span class="stars">{{ '★'.repeat(Math.round(averageRating)) }}{{ '☆'.repeat(5 - Math.round(averageRating)) }}</span>
          <span class="rating-value">{{ averageRating.toFixed(1) }}</span>
        </div>
      </div>

      <div class="popup-body">
        <!-- 建筑高度信息 -->
        <div class="info-section" v-if="poi.properties.height">
          <div class="info-item">
            <span class="label">建筑高度:</span>
            <span class="value">{{ poi.properties.height }}米</span>
          </div>
        </div>
        
        <div class="info-section">
          <div class="info-item" v-if="poi.properties.address">
            <span class="label">{{ poi.properties.height ? '简介' : '地址' }}:</span>
            <span class="value">{{ poi.properties.address }}</span>
          </div>
          <div class="info-item" v-if="poi.properties.telephone">
            <span class="label">电话:</span>
            <span class="value">{{ poi.properties.telephone }}</span>
          </div>
          <div class="info-item" v-if="poi.properties.zipcode">
            <span class="label">邮编:</span>
            <span class="value">{{ poi.properties.zipcode }}</span>
          </div>
        </div>

        <div class="rating-section">
          <h4>评分与评论</h4>
          
          <div class="rating-input">
            <span class="label">您的评分:</span>
            <div class="stars-input">
              <span 
                v-for="n in 5" 
                :key="n"
                class="star"
                :class="{ filled: n <= userRating }"
                @click="setRating(n)"
                @mouseenter="hoverRating = n"
                @mouseleave="hoverRating = 0"
              >
                {{ n <= (hoverRating || userRating) ? '★' : '☆' }}
              </span>
            </div>
          </div>

          <div class="comment-input">
            <textarea 
              v-model="userComment"
              placeholder="分享您的体验..."
              rows="4"
            ></textarea>

            <div class="comment-images">
              <label class="images-label">
                添加图片（最多3张）
                <input
                  class="images-input"
                  :key="commentImagesInputKey"
                  type="file"
                  accept="image/*"
                  multiple
                  @change="onCommentImagesChange"
                />
              </label>
              <div v-if="commentImages.length" class="images-selected">
                已选择 {{ commentImages.length }} 张
              </div>
            </div>

            <button class="submit-btn" @click="submitReview" :disabled="!userRating">
              提交评论
            </button>
          </div>

          <div class="comments-list" v-if="comments.length > 0">
            <h5>最近评论</h5>
            <div class="comment-item" v-for="comment in comments" :key="comment.id">
              <div class="comment-header">
                <div class="comment-user-row">
                  <span class="comment-user">{{ comment.username }}</span>
                  <button
                    v-if="currentUserId && comment.userId === currentUserId"
                    class="comment-delete"
                    type="button"
                    @click="deleteComment(comment.id)"
                  >
                    删除
                  </button>
                </div>
                <span class="comment-rating">{{ '★'.repeat(comment.rating) }}</span>
              </div>
              <p class="comment-text">{{ comment.comment }}</p>
              <div v-if="comment.images?.length" class="comment-images-grid">
                <img
                  v-for="(imgUrl, idx) in comment.images"
                  :key="idx"
                  class="comment-image"
                  :src="toAbsoluteMediaUrl(imgUrl)"
                  alt="comment image"
                />
              </div>
              <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { POIFeature } from '../config/poiConfig'
import { apiClient, API_BASE_URL } from '../api/client'

const props = defineProps<{
  poi: POIFeature
}>()

const emit = defineEmits<{
  close: []
  rate: [data: { rating: number }]
  comment: [data: { comment: string, rating: number }]
}>()

// 计算建筑图片路径
const buildingImage = computed(() => {
  const imageName = (props.poi.properties as any).image
  if (imageName) {
    return `/Pictures/Buildings/${imageName}`
  }
  return null
})

// 图片加载错误处理
const handleImageError = (e: Event) => {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}

const userRating = ref(0)
const hoverRating = ref(0)
const userComment = ref('')
const commentImages = ref<File[]>([])
const commentImagesInputKey = ref(0)
const comments = ref<Array<{
  id: string
  userId: string
  username: string
  rating: number
  comment: string
  createdAt: string
  images?: string[]
}>>([])
const averageRating = ref<number | null>(null)

const toAbsoluteMediaUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${API_BASE_URL}${url}`
}

const onCommentImagesChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])

  const imagesOnly = files.filter(f => f.type.startsWith('image/'))
  if (imagesOnly.length !== files.length) {
    alert('仅支持图片文件')
  }

  if (imagesOnly.length > 3) {
    alert('最多选择 3 张图片')
  }

  commentImages.value = imagesOnly.slice(0, 3)
}

const setRating = (rating: number) => {
  userRating.value = rating
}

const submitReview = async () => {
  if (!userRating.value) return

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  if (!user.id) {
    alert('请先登录')
    return
  }

  try {
    const poiId = props.poi.properties.gml_id

    const ratingToSend = userRating.value
    const commentToSend = userComment.value

    const res = await apiClient.submitComment({
      poiId,
      userId: user.id,
      rating: ratingToSend,
      comment: commentToSend
    }) as any

    const commentId = String(res?.commentId || '')
    if (commentId && commentImages.value.length) {
      await apiClient.uploadCommentImages(commentId, commentImages.value)
    }

    // 重新加载评论和评分
    await loadComments()
    await loadRating()

    // 重置表单
    userRating.value = 0
    userComment.value = ''
    commentImages.value = []
    commentImagesInputKey.value += 1

    emit('comment', {
      rating: ratingToSend,
      comment: commentToSend
    })
  } catch (error: any) {
    alert(error.message || '提交失败，请重试')
  }
}

const loadComments = async () => {
  try {
    const poiId = props.poi.properties.gml_id
    const response = await apiClient.getComments(poiId) as any
    comments.value = response.comments || []
  } catch (error) {
    console.error('加载评论失败:', error)
  }
}

const currentUserId = computed(() => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    return u?.id ? String(u.id) : ''
  } catch {
    return ''
  }
})

const deleteComment = async (commentId: string) => {
  const userId = currentUserId.value
  if (!userId) {
    alert('请先登录')
    return
  }
  if (!confirm('确认删除这条评论吗？')) return

  try {
    await apiClient.deleteComment(commentId, userId)
    await loadComments()
    await loadRating()
  } catch (error: any) {
    alert(error.message || '删除失败')
  }
}

const loadRating = async () => {
  try {
    const poiId = props.poi.properties.gml_id
    const response = await apiClient.getRating(poiId) as any
    averageRating.value = response.averageRating || null
  } catch (error) {
    console.error('加载评分失败:', error)
  }
}

const formatDate = (date: string) => {
  if (!date) return ''
  // 兼容 SQLite 的 "YYYY-MM-DD HH:mm:ss"（无时区）格式
  const normalized = date.includes('T') ? date : date.replace(' ', 'T')
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('zh-CN')
}

onMounted(async () => {
  await loadComments()
  await loadRating()
})
</script>

<style scoped>
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
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  padding: 0;
}

.building-image {
  width: 100%;
  max-height: 250px;
  overflow: hidden;
  border-radius: 16px 16px 0 0;
}

.building-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.popup-header,
.popup-body {
  padding: 24px;
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

.popup-header {
  margin-bottom: 0;
  padding-right: 40px;
}

.popup-header h3 {
  font-family: 'Source Han Serif CN', serif;
  color: #8F0100;
  font-size: 24px;
  margin: 0 0 8px 0;
}

.poi-type {
  margin-bottom: 10px;
}

.type-badge {
  display: inline-block;
  padding: 4px 12px;
  background-color: #8F0100;
  color: white;
  font-size: 12px;
  border-radius: 12px;
  font-weight: 500;
}

.average-rating {
  display: flex;
  align-items: center;
  gap: 8px;
}

.average-rating .stars {
  color: #FFB800;
  font-size: 16px;
}

.average-rating .rating-value {
  color: #666;
  font-size: 14px;
}

.info-section {
  margin-bottom: 24px;
}

.info-item {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
}

.info-item .label {
  font-weight: 500;
  color: #666;
  min-width: 60px;
}

.info-item .value {
  color: #333;
  flex: 1;
}

.rating-section h4 {
  font-family: 'Source Han Serif CN', serif;
  color: #8F0100;
  font-size: 18px;
  margin: 0 0 16px 0;
}

.rating-input {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.stars-input {
  display: flex;
  gap: 4px;
}

.star {
  font-size: 24px;
  cursor: pointer;
  color: #ddd;
  transition: all 0.2s;
  user-select: none;
}

.star.filled,
.star:hover {
  color: #FFB800;
}

.comment-input {
  margin-bottom: 20px;
}

.comment-input textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
  margin-bottom: 12px;
  transition: border-color 0.3s;
}

.comment-input textarea:focus {
  outline: none;
  border-color: #8F0100;
}

.comment-images {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.images-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #333;
}

.images-selected {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

.comment-images-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 10px;
}

.comment-image {
  width: 100%;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.submit-btn {
  background-color: #8F0100;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
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

.comments-list {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 2px solid #f0f0f0;
}

.comments-list h5 {
  font-size: 16px;
  margin: 0 0 16px 0;
  color: #333;
}

.comment-item {
  background: #f9f9f9;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.comment-user-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.comment-delete {
  border: none;
  background: transparent;
  color: rgba(143, 1, 0, 0.9);
  cursor: pointer;
  font-size: 13px;
  padding: 0;
}

.comment-delete:hover {
  text-decoration: underline;
}

.comment-user {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.comment-rating {
  color: #FFB800;
  font-size: 14px;
}

.comment-text {
  color: #666;
  font-size: 14px;
  margin: 0 0 8px 0;
  line-height: 1.6;
}

.comment-date {
  font-size: 12px;
  color: #999;
}

/* 滚动条样式 */
.popup-content::-webkit-scrollbar {
  width: 6px;
}

.popup-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.popup-content::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 10px;
}

.popup-content::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
