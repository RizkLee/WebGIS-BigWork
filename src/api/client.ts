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
    if (import.meta.env.PROD && !this.baseURL) {
      throw new Error('未配置 VITE_API_BASE_URL：当前在生产环境中无法访问后端 API。请在 Cloudflare Pages 的环境变量中设置后重新部署。')
    }

    const url = `${this.baseURL}${endpoint}`

    const headers = new Headers(options.headers)
    // FormData 时浏览器会自动设置 multipart 边界；不要覆盖
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
    if (!isFormData) {
      headers.set('Content-Type', 'application/json')
    }

    let response: Response
    try {
      response = await fetch(url, {
        ...options,
        headers,
      })
    } catch (e: any) {
      throw new Error(`网络连接失败：${e?.message || '无法连接到服务器'}（${url}）`)
    }

    const contentType = response.headers.get('content-type') || ''
    const rawText = await response.text().catch(() => '')
    const text = (rawText || '').trim()

    const looksLikeHtml = text.startsWith('<!doctype html') || text.startsWith('<html') || text.startsWith('<')
    const looksLikeJson = text.startsWith('{') || text.startsWith('[')

    const parseJson = () => {
      if (!text) return undefined
      return JSON.parse(text)
    }

    if (!response.ok) {
      // 常见：API_BASE_URL 配错导致打到 Pages（返回 index.html），或被 WAF/代理返回 HTML
      if (looksLikeHtml) {
        throw new Error(
          `API 返回了 HTML（不是 JSON）。通常是 VITE_API_BASE_URL 配置错误，或请求被拦截/重定向。` +
          `\nURL: ${url}` +
          `\nHTTP: ${response.status}`
        )
      }

      if (looksLikeJson || contentType.includes('application/json')) {
        const data: any = parseJson() || {}
        throw new Error(data?.error || `请求失败（HTTP ${response.status}）`)
      }

      throw new Error(`请求失败（HTTP ${response.status}）：${text || '无响应内容'}\nURL: ${url}`)
    }

    // 兼容：极少数情况下响应可能为空（例如 204 或边缘异常）
    if (!text) return undefined as T

    if (looksLikeHtml) {
      throw new Error(
        `API 返回了 HTML（不是 JSON）。请检查 VITE_API_BASE_URL 是否指向 Worker，而不是 Pages 站点本身。` +
        `\nURL: ${url}`
      )
    }

    if (looksLikeJson || contentType.includes('application/json')) {
      return parseJson() as T
    }

    // 兜底：返回纯文本
    return text as unknown as T
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
