/**
 * Cloudflare Worker API for HNNU WebGIS
 * 处理用户认证、评论评分等功能
 */

interface Env {
  DB: D1Database
  ALLOWED_ORIGINS?: string
  // 可选：绑定 Cloudflare R2 存储桶用于图片上传
  R2?: R2Bucket
}

type JsonValue = Record<string, unknown> | unknown[]

function jsonResponse(
  body: JsonValue,
  origin: string | null,
  allowedOrigins: string,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(origin, allowedOrigins)
  })
}

function requireR2(env: Env): R2Bucket {
  if (!env.R2) {
    throw new Error('未配置 R2 存储桶绑定（Env.R2）。请在 wrangler 配置中添加 r2_buckets。')
  }
  return env.R2
}

function guessImageExtension(contentType: string): string {
  const normalized = (contentType || '').toLowerCase()
  if (normalized.includes('png')) return 'png'
  if (normalized.includes('webp')) return 'webp'
  if (normalized.includes('gif')) return 'gif'
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpg'
  return 'bin'
}

function buildFileUrl(requestUrl: URL, key: string): string {
  return new URL(`/api/files/${encodeURIComponent(key)}`, requestUrl.origin).toString()
}

async function ensureMediaTables(env: Env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS user_avatars (
      user_id TEXT PRIMARY KEY,
      object_key TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run()

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS poi_comment_images (
      id TEXT PRIMARY KEY,
      comment_id TEXT NOT NULL,
      object_key TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run()

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_poi_comment_images_comment_id ON poi_comment_images(comment_id)
  `).run()

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS checkins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      text TEXT,
      image_object_key TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run()

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON checkins(user_id)
  `).run()

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_checkins_created_at ON checkins(created_at)
  `).run()
}

// CORS处理
function corsHeaders(origin: string | null, allowedOrigins: string): Headers {
  const origins = allowedOrigins.split(',')
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })

  if (origin && origins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
  }

  return headers
}

// 简单的密码哈希(生产环境建议使用bcrypt)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// 生成UUID
function generateUUID(): string {
  return crypto.randomUUID()
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin')
    const allowedOrigins =
      env.ALLOWED_ORIGINS ||
      'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:8787'
    
    // 处理OPTIONS预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(origin, allowedOrigins)
      })
    }

    try {
      // 路由处理
      if (url.pathname.startsWith('/api/files/') && request.method === 'GET') {
        const key = decodeURIComponent(url.pathname.slice('/api/files/'.length))
        return await handleGetFile(key, request, env, origin, allowedOrigins)
      }

      if (url.pathname === '/api/user/avatar' && request.method === 'POST') {
        return await handleUploadAvatar(request, env, origin, allowedOrigins)
      }

      if (
        url.pathname.startsWith('/api/poi/comment/') &&
        url.pathname.endsWith('/images') &&
        request.method === 'POST'
      ) {
        const parts = url.pathname.split('/')
        const commentId = parts[4]
        return await handleUploadCommentImages(commentId, request, env, origin, allowedOrigins)
      }

      if (url.pathname === '/api/checkins' && request.method === 'GET') {
        return await handleGetCheckins(request, env, origin, allowedOrigins)
      }

      if (url.pathname === '/api/checkins' && request.method === 'POST') {
        return await handleCreateCheckin(request, env, origin, allowedOrigins)
      }

      if (url.pathname.startsWith('/api/checkins/') && request.method === 'DELETE') {
        const id = url.pathname.split('/')[3]
        return await handleDeleteCheckin(id, request, env, origin, allowedOrigins)
      }

      if (url.pathname.startsWith('/api/poi/comment/') && request.method === 'DELETE') {
        const commentId = url.pathname.split('/')[4]
        return await handleDeleteComment(commentId, request, env, origin, allowedOrigins)
      }

      if (url.pathname === '/api/auth/register' && request.method === 'POST') {
        return await handleRegister(request, env, origin, allowedOrigins)
      }
      
      if (url.pathname === '/api/auth/login' && request.method === 'POST') {
        return await handleLogin(request, env, origin, allowedOrigins)
      }
      
      if (url.pathname === '/api/poi/comment' && request.method === 'POST') {
        return await handleComment(request, env, origin, allowedOrigins)
      }
      
      if (url.pathname.startsWith('/api/poi/') && url.pathname.endsWith('/comments') && request.method === 'GET') {
        const poiId = url.pathname.split('/')[3]
        return await handleGetComments(poiId, env, origin, allowedOrigins)
      }
      
      if (url.pathname.startsWith('/api/poi/') && url.pathname.endsWith('/rating') && request.method === 'GET') {
        const poiId = url.pathname.split('/')[3]
        return await handleGetRating(poiId, env, origin, allowedOrigins)
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: corsHeaders(origin, allowedOrigins)
      })
    } catch (error: any) {
      return jsonResponse({ error: error.message }, origin, allowedOrigins, 500)
    }
  }
}

// 用户注册
async function handleRegister(
  request: Request,
  env: Env,
  origin: string | null,
  allowedOrigins: string
): Promise<Response> {
  await ensureMediaTables(env)
  const { email, password, username } = await request.json() as any

  if (!email || !password || !username) {
    return new Response(JSON.stringify({ error: '缺少必填字段' }), {
      status: 400,
      headers: corsHeaders(origin, allowedOrigins)
    })
  }

  // 检查邮箱是否已存在
  const existing = await env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(email).first()

  if (existing) {
    return new Response(JSON.stringify({ error: '邮箱已被注册' }), {
      status: 400,
      headers: corsHeaders(origin, allowedOrigins)
    })
  }

  // 创建用户
  const userId = generateUUID()
  const passwordHash = await hashPassword(password)

  await env.DB.prepare(
    'INSERT INTO users (id, email, username, password_hash) VALUES (?, ?, ?, ?)'
  ).bind(userId, email, username, passwordHash).run()

  return new Response(JSON.stringify({
    success: true,
    user: { id: userId, email, username, avatarUrl: null }
  }), {
    headers: corsHeaders(origin, allowedOrigins)
  })
}

// 用户登录
async function handleLogin(
  request: Request,
  env: Env,
  origin: string | null,
  allowedOrigins: string
): Promise<Response> {
  await ensureMediaTables(env)
  const { email, password } = await request.json() as any

  if (!email || !password) {
    return new Response(JSON.stringify({ error: '缺少必填字段' }), {
      status: 400,
      headers: corsHeaders(origin, allowedOrigins)
    })
  }

  const passwordHash = await hashPassword(password)

  const user = await env.DB.prepare(
    `
    SELECT 
      u.id,
      u.email,
      u.username,
      a.object_key as avatarKey
    FROM users u
    LEFT JOIN user_avatars a ON a.user_id = u.id
    WHERE u.email = ? AND u.password_hash = ?
    `
  ).bind(email, passwordHash).first<any>()

  if (!user) {
    return new Response(JSON.stringify({ error: '邮箱或密码错误' }), {
      status: 401,
      headers: corsHeaders(origin, allowedOrigins)
    })
  }

  const avatarUrl = user?.avatarKey ? buildFileUrl(new URL(request.url), String(user.avatarKey)) : null

  return jsonResponse(
    {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl
      }
    },
    origin,
    allowedOrigins
  )
}

// 提交评论
async function handleComment(
  request: Request,
  env: Env,
  origin: string | null,
  allowedOrigins: string
): Promise<Response> {
  const { poiId, userId, rating, comment } = await request.json() as any

  if (!poiId || !userId || !rating) {
    return new Response(JSON.stringify({ error: '缺少必填字段' }), {
      status: 400,
      headers: corsHeaders(origin, allowedOrigins)
    })
  }

  const commentId = generateUUID()

  // 插入评论
  await env.DB.prepare(
    'INSERT INTO poi_comments (id, poi_id, user_id, rating, comment) VALUES (?, ?, ?, ?, ?)'
  ).bind(commentId, poiId, userId, rating, comment || '').run()

  // 更新评分统计
  await updateRating(poiId, env)

  return new Response(JSON.stringify({
    success: true,
    commentId
  }), {
    headers: corsHeaders(origin, allowedOrigins)
  })
}

// 获取评论列表
async function handleGetComments(
  poiId: string,
  env: Env,
  origin: string | null,
  allowedOrigins: string
): Promise<Response> {
  await ensureMediaTables(env)
  const { results } = await env.DB.prepare(`
    SELECT 
      c.id,
      c.user_id as userId,
      c.rating,
      c.comment,
      (REPLACE(c.created_at, ' ', 'T') || 'Z') as createdAt,
      u.username
    FROM poi_comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.poi_id = ?
    ORDER BY c.created_at DESC
    LIMIT 20
  `).bind(poiId).all()

  const requestUrl = new URL('http://localhost')
  // 这里拿不到原始 request.url，使用一个占位；实际生成 URL 在前端拼 baseURL 即可
  // 如果需要绝对 URL，请把 handleGetComments 的签名改为接收 request。

  const comments = (results || []) as Array<any>
  const commentIds = comments.map(c => c?.id).filter(Boolean) as string[]
  const imagesByCommentId = new Map<string, string[]>()

  if (commentIds.length > 0) {
    const placeholders = commentIds.map(() => '?').join(',')
    const imgRows = await env.DB.prepare(
      `SELECT comment_id as commentId, object_key as objectKey FROM poi_comment_images WHERE comment_id IN (${placeholders}) ORDER BY created_at ASC`
    ).bind(...commentIds).all<any>()

    for (const row of imgRows.results || []) {
      const cid = String(row.commentId)
      const key = String(row.objectKey)
      const url = `/api/files/${encodeURIComponent(key)}`
      const arr = imagesByCommentId.get(cid) || []
      arr.push(url)
      imagesByCommentId.set(cid, arr)
    }
  }

  const merged = comments.map(c => ({
    ...c,
    images: imagesByCommentId.get(String(c.id)) || []
  }))

  return jsonResponse({ comments: merged }, origin, allowedOrigins)
}

async function handleDeleteComment(
  commentId: string,
  request: Request,
  env: Env,
  origin: string | null,
  allowedOrigins: string
): Promise<Response> {
  await ensureMediaTables(env)
  if (!commentId) return jsonResponse({ error: '缺少 commentId' }, origin, allowedOrigins, 400)

  const body = (await request.json().catch(() => ({}))) as any
  const userId = String(body?.userId || '')
  if (!userId) return jsonResponse({ error: '缺少 userId' }, origin, allowedOrigins, 400)

  const row = await env.DB.prepare(
    'SELECT id, user_id as userId, poi_id as poiId FROM poi_comments WHERE id = ?'
  ).bind(commentId).first<any>()

  if (!row) return jsonResponse({ error: '评论不存在' }, origin, allowedOrigins, 404)
  if (String(row.userId) !== userId) return jsonResponse({ error: '无权限删除' }, origin, allowedOrigins, 403)

  // 收集关联图片 key
  const imgRows = await env.DB.prepare(
    'SELECT object_key as objectKey FROM poi_comment_images WHERE comment_id = ?'
  ).bind(commentId).all<any>()
  const keys = (imgRows.results || []).map(r => String(r.objectKey)).filter(Boolean)

  await env.DB.prepare('DELETE FROM poi_comment_images WHERE comment_id = ?').bind(commentId).run()
  await env.DB.prepare('DELETE FROM poi_comments WHERE id = ?').bind(commentId).run()

  // 尝试删除 R2 对象（若已绑定）
  if (env.R2 && keys.length) {
    await Promise.all(keys.map(k => env.R2!.delete(k).catch(() => undefined)))
  }

  await updateRating(String(row.poiId), env)
  return jsonResponse({ success: true }, origin, allowedOrigins)
}

async function handleGetCheckins(
  request: Request,
  env: Env,
  origin: string | null,
  allowedOrigins: string
): Promise<Response> {
  await ensureMediaTables(env)

  const url = new URL(request.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || '100'), 1), 200)

  const { results } = await env.DB.prepare(`
    SELECT
      c.id,
      c.user_id as userId,
      u.username as username,
      c.latitude as latitude,
      c.longitude as longitude,
      c.text as text,
      c.image_object_key as imageObjectKey,
      (REPLACE(c.created_at, ' ', 'T') || 'Z') as createdAt
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    ORDER BY c.created_at DESC
    LIMIT ?
  `).bind(limit).all<any>()

  const checkins = (results || []).map((r: any) => {
    const imageUrl = r.imageObjectKey ? `/api/files/${encodeURIComponent(String(r.imageObjectKey))}` : null
    return {
      id: String(r.id),
      userId: String(r.userId),
      username: String(r.username),
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      text: r.text ?? '',
      imageUrl,
      createdAt: String(r.createdAt || '')
    }
  })

  return jsonResponse({ checkins }, origin, allowedOrigins)
}

async function handleCreateCheckin(
  request: Request,
  env: Env,
  origin: string | null,
  allowedOrigins: string
): Promise<Response> {
  await ensureMediaTables(env)
  const bucket = requireR2(env)

  const form = await request.formData()
  const userId = String(form.get('userId') || '')
  const text = String(form.get('text') || '')
  const latitude = Number(form.get('latitude'))
  const longitude = Number(form.get('longitude'))
  const file = form.get('image')

  if (!userId) return jsonResponse({ error: '缺少 userId' }, origin, allowedOrigins, 400)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return jsonResponse({ error: '缺少或非法的定位信息' }, origin, allowedOrigins, 400)
  }
  if (!(file instanceof File)) return jsonResponse({ error: '缺少图片' }, origin, allowedOrigins, 400)
  if (!file.type.startsWith('image/')) return jsonResponse({ error: '仅支持图片文件' }, origin, allowedOrigins, 400)
  if (file.size > 5 * 1024 * 1024) return jsonResponse({ error: '图片过大（最大 5MB）' }, origin, allowedOrigins, 400)

  const id = generateUUID()
  const ext = guessImageExtension(file.type)
  const imageObjectKey = `checkins/${userId}/${id}.${ext}`

  await bucket.put(imageObjectKey, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type }
  })

  await env.DB.prepare(`
    INSERT INTO checkins (id, user_id, latitude, longitude, text, image_object_key)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, userId, latitude, longitude, text, imageObjectKey).run()

  const user = await env.DB.prepare('SELECT username FROM users WHERE id = ?').bind(userId).first<any>()
  const imageUrl = buildFileUrl(new URL(request.url), imageObjectKey)
  return jsonResponse(
    {
      success: true,
      checkin: {
        id,
        userId,
        username: String(user?.username || ''),
        latitude,
        longitude,
        text,
        imageUrl,
        createdAt: new Date().toISOString()
      }
    },
    origin,
    allowedOrigins
  )
}

async function handleDeleteCheckin(
  id: string,
  request: Request,
  env: Env,
  origin: string | null,
  allowedOrigins: string
): Promise<Response> {
  await ensureMediaTables(env)
  if (!id) return jsonResponse({ error: '缺少 id' }, origin, allowedOrigins, 400)

  const body = (await request.json().catch(() => ({}))) as any
  const userId = String(body?.userId || '')
  if (!userId) return jsonResponse({ error: '缺少 userId' }, origin, allowedOrigins, 400)

  const row = await env.DB.prepare(
    'SELECT id, user_id as userId, image_object_key as imageObjectKey FROM checkins WHERE id = ?'
  ).bind(id).first<any>()

  if (!row) return jsonResponse({ error: '打卡不存在' }, origin, allowedOrigins, 404)
  if (String(row.userId) !== userId) return jsonResponse({ error: '无权限删除' }, origin, allowedOrigins, 403)

  await env.DB.prepare('DELETE FROM checkins WHERE id = ?').bind(id).run()

  if (env.R2 && row.imageObjectKey) {
    await env.R2.delete(String(row.imageObjectKey)).catch(() => undefined)
  }

  return jsonResponse({ success: true }, origin, allowedOrigins)
}

async function handleUploadAvatar(
  request: Request,
  env: Env,
  origin: string | null,
  allowedOrigins: string
): Promise<Response> {
  await ensureMediaTables(env)
  const bucket = requireR2(env)

  const form = await request.formData()
  const userId = String(form.get('userId') || '')
  const file = form.get('file')

  if (!userId || !(file instanceof File)) {
    return jsonResponse({ error: '缺少 userId 或 file' }, origin, allowedOrigins, 400)
  }
  if (!file.type.startsWith('image/')) {
    return jsonResponse({ error: '仅支持图片文件' }, origin, allowedOrigins, 400)
  }
  if (file.size > 2 * 1024 * 1024) {
    return jsonResponse({ error: '图片过大（最大 2MB）' }, origin, allowedOrigins, 400)
  }

  const ext = guessImageExtension(file.type)
  const objectKey = `avatars/${userId}/${generateUUID()}.${ext}`

  await bucket.put(objectKey, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type
    }
  })

  await env.DB.prepare(`
    INSERT INTO user_avatars (user_id, object_key, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      object_key = excluded.object_key,
      updated_at = CURRENT_TIMESTAMP
  `).bind(userId, objectKey).run()

  const avatarUrl = buildFileUrl(new URL(request.url), objectKey)
  return jsonResponse({ success: true, avatarUrl }, origin, allowedOrigins)
}

async function handleUploadCommentImages(
  commentId: string,
  request: Request,
  env: Env,
  origin: string | null,
  allowedOrigins: string
): Promise<Response> {
  await ensureMediaTables(env)
  const bucket = requireR2(env)

  if (!commentId) {
    return jsonResponse({ error: '缺少 commentId' }, origin, allowedOrigins, 400)
  }

  const form = await request.formData()
  const files = form.getAll('images').filter((v): v is File => v instanceof File)
  if (files.length === 0) {
    return jsonResponse({ error: '未选择图片' }, origin, allowedOrigins, 400)
  }
  if (files.length > 3) {
    return jsonResponse({ error: '最多上传 3 张图片' }, origin, allowedOrigins, 400)
  }

  const urls: string[] = []
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      return jsonResponse({ error: '仅支持图片文件' }, origin, allowedOrigins, 400)
    }
    if (file.size > 3 * 1024 * 1024) {
      return jsonResponse({ error: '单张图片过大（最大 3MB）' }, origin, allowedOrigins, 400)
    }

    const ext = guessImageExtension(file.type)
    const objectKey = `comments/${commentId}/${generateUUID()}.${ext}`
    await bucket.put(objectKey, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type }
    })

    const id = generateUUID()
    await env.DB.prepare(
      'INSERT INTO poi_comment_images (id, comment_id, object_key) VALUES (?, ?, ?)'
    ).bind(id, commentId, objectKey).run()

    urls.push(buildFileUrl(new URL(request.url), objectKey))
  }

  return jsonResponse({ success: true, urls }, origin, allowedOrigins)
}

async function handleGetFile(
  key: string,
  request: Request,
  env: Env,
  origin: string | null,
  allowedOrigins: string
): Promise<Response> {
  const bucket = requireR2(env)
  const object = await bucket.get(key)
  if (!object) {
    return jsonResponse({ error: '文件不存在' }, origin, allowedOrigins, 404)
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  // 读取文件不需要 CORS JSON 头，手动补 allow-origin
  const allow = corsHeaders(origin, allowedOrigins).get('Access-Control-Allow-Origin')
  if (allow) headers.set('Access-Control-Allow-Origin', allow)

  return new Response(object.body, {
    status: 200,
    headers
  })
}

// 获取平均评分
async function handleGetRating(
  poiId: string,
  env: Env,
  origin: string | null,
  allowedOrigins: string
): Promise<Response> {
  const rating = await env.DB.prepare(
    'SELECT average_rating, total_ratings FROM poi_ratings WHERE poi_id = ?'
  ).bind(poiId).first()

  return new Response(JSON.stringify({
    averageRating: rating?.average_rating || 0,
    totalRatings: rating?.total_ratings || 0
  }), {
    headers: corsHeaders(origin, allowedOrigins)
  })
}

// 更新评分统计
async function updateRating(poiId: string, env: Env) {
  const stats = await env.DB.prepare(`
    SELECT 
      COUNT(*) as total,
      AVG(rating) as average
    FROM poi_comments
    WHERE poi_id = ?
  `).bind(poiId).first()

  await env.DB.prepare(`
    INSERT INTO poi_ratings (poi_id, total_ratings, average_rating, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(poi_id) DO UPDATE SET
      total_ratings = excluded.total_ratings,
      average_rating = excluded.average_rating,
      updated_at = CURRENT_TIMESTAMP
  `).bind(poiId, stats?.total || 0, stats?.average || 0).run()
}
