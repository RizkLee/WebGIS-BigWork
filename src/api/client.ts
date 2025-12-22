// API配置
// 生产环境（Cloudflare Pages）请通过环境变量注入：VITE_API_BASE_URL
// - 例如：https://your-worker.your-subdomain.workers.dev
// 本地开发默认走 wrangler dev：http://localhost:8787
export const API_BASE_URL = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  (import.meta.env.PROD ? '' : 'http://localhost:8787')
).replace(/\/$/, '')

// API客户端
class APIClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    const headers = new Headers(options.headers)
    // FormData 时浏览器会自动设置 multipart 边界；不要覆盖
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
    if (!isFormData) {
      headers.set('Content-Type', 'application/json')
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '请求失败')
    }

    return response.json()
  }

  // 用户注册
  async register(email: string, password: string, username: string) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, username }),
    })
  }

  // 用户登录
  async login(email: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  // 提交评论
  async submitComment(data: {
    poiId: string
    userId: string
    rating: number
    comment: string
  }) {
    return this.request('/api/poi/comment', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // 获取POI评论
  async getComments(poiId: string) {
    return this.request(`/api/poi/${poiId}/comments`)
  }

  // 获取POI评分
  async getRating(poiId: string) {
    return this.request(`/api/poi/${poiId}/rating`)
  }

  // 上传用户头像（R2）
  async uploadAvatar(userId: string, file: File) {
    const form = new FormData()
    form.append('userId', userId)
    form.append('file', file)
    return this.request('/api/user/avatar', {
      method: 'POST',
      body: form,
    })
  }

  // 上传评论图片（最多3张）
  async uploadCommentImages(commentId: string, files: File[]) {
    const form = new FormData()
    for (const file of files) {
      form.append('images', file)
    }
    return this.request(`/api/poi/comment/${encodeURIComponent(commentId)}/images`, {
      method: 'POST',
      body: form,
    })
  }

  // 删除评论（仅允许删除自己的评论）
  async deleteComment(commentId: string, userId: string) {
    return this.request(`/api/poi/comment/${encodeURIComponent(commentId)}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    })
  }

  // 获取打卡列表
  async getCheckins(limit = 100) {
    return this.request(`/api/checkins?limit=${encodeURIComponent(String(limit))}`)
  }

  // 创建打卡（图片+定位+文字）
  async createCheckin(data: {
    userId: string
    latitude: number
    longitude: number
    text: string
    image: File
  }) {
    const form = new FormData()
    form.append('userId', data.userId)
    form.append('latitude', String(data.latitude))
    form.append('longitude', String(data.longitude))
    form.append('text', data.text || '')
    form.append('image', data.image)
    return this.request('/api/checkins', {
      method: 'POST',
      body: form,
    })
  }

  // 删除打卡（仅允许删除自己的打卡）
  async deleteCheckin(id: string, userId: string) {
    return this.request(`/api/checkins/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    })
  }
}

export const apiClient = new APIClient(API_BASE_URL)
