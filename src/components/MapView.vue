<template>
  <div class="map-wrapper">
    <div class="map" id="map-canvas"></div>

    <div class="campus-controls" v-if="campuses.length">
      <button
        v-for="campus in campuses"
        :key="campus.name"
        class="campus-btn"
        type="button"
        @click="zoomToCampus(campus.name)"
        :title="campus.name"
      >
        <svg class="campus-icon" viewBox="0 0 100 100" aria-hidden="true">
          <path :d="campus.svgPath" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round" />
        </svg>
        <span class="campus-name">{{ campus.name }}</span>
      </button>
    </div>

    <div class="map-actions">
      <button
        class="map-action-btn"
        type="button"
        @click="locateMe"
        title="定位"
      >
        <img class="map-action-icon" src="/Icons/Map-Location-64.png" alt="locate" />
        <span class="map-action-name">定位</span>
      </button>

      <button
        class="map-action-btn"
        type="button"
        @click="startCheckin"
        title="打卡"
      >
        <img class="map-action-icon" src="/Icons/Camera-WF-64.png" alt="checkin" />
        <span class="map-action-name">打卡</span>
      </button>
    </div>

    <input
      ref="checkinFileInput"
      class="hidden-file-input"
      type="file"
      accept="image/*"
      @change="onCheckinFileSelected"
    />
    <input
      ref="checkinCameraInput"
      class="hidden-file-input"
      type="file"
      accept="image/*"
      capture="environment"
      @change="onCheckinFileSelected"
    />

    <teleport to="body">
      <div v-if="showCheckinModal" class="poi-popup-overlay" @click="closeCheckinModal">
        <div class="checkin-modal" @click.stop>
          <button class="close-btn" type="button" @click="closeCheckinModal">×</button>
          <h3 class="checkin-title">打卡</h3>

          <div v-if="checkinPreviewUrl" class="checkin-preview">
            <img :src="checkinPreviewUrl" alt="preview" />
          </div>

          <textarea
            v-model="checkinText"
            class="checkin-text"
            rows="4"
            placeholder="写下你的打卡内容..."
          ></textarea>

          <button class="submit-btn" type="button" :disabled="isSubmittingCheckin" @click="submitCheckin">
            {{ isSubmittingCheckin ? '提交中...' : '提交打卡' }}
          </button>
        </div>
      </div>
    </teleport>

    <!-- POI弹窗 -->
    <teleport to="body">
      <div v-if="selectedPOI" class="poi-popup-overlay" @click="selectedPOI = null">
        <div class="poi-popup-content" @click.stop>
          <POIPopup
            :poi="selectedPOI"
            @close="selectedPOI = null"
            @rate="handleRate"
            @comment="handleComment"
          />
        </div>
      </div>
    </teleport>

    <!-- 打卡弹窗（模态样式与 POI 一致） -->
    <teleport to="body">
      <CheckinPopup
        v-if="selectedCheckin"
        :checkin="selectedCheckin"
        :currentUserId="getCurrentUserId()"
        @close="selectedCheckin = null"
        @delete="deleteCheckinById"
      />
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { POI_CATEGORIES, type POIFeature, type POICollection } from '../config/poiConfig'
import POIPopup from './POIPopup.vue'
import CheckinPopup from './CheckinPopup.vue'
import { apiClient, API_BASE_URL } from '../api/client'

let map: mapboxgl.Map | null = null
const selectedPOI = ref<POIFeature | null>(null)
const selectedCheckin = ref<Checkin | null>(null)

let userLocationMarker: mapboxgl.Marker | null = null

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

const checkins = ref<Checkin[]>([])

const checkinFileInput = ref<HTMLInputElement | null>(null)
const checkinCameraInput = ref<HTMLInputElement | null>(null)
const showCheckinModal = ref(false)
const checkinText = ref('')
const checkinPreviewUrl = ref<string | null>(null)
const pendingCheckinFile = ref<File | null>(null)
const pendingCheckinLngLat = ref<{ lng: number; lat: number } | null>(null)
const isSubmittingCheckin = ref(false)

const getCurrentUserId = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    return u?.id ? String(u.id) : ''
  } catch {
    return ''
  }
}

const isMobileOrTablet = () => {
  const ua = navigator.userAgent || ''
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) return true
  const anyNav = navigator as any
  if (anyNav.userAgentData && typeof anyNav.userAgentData.mobile === 'boolean') {
    return anyNav.userAgentData.mobile
  }
  return false
}

type CampusButton = {
  name: string
  svgPath: string
  bounds: mapboxgl.LngLatBounds
}

const campuses = ref<CampusButton[]>([])

// 建筑类型到图标的映射
const BUILDING_TYPE_ICONS: Record<string, string> = {
  '食堂': '/Icons_POI/食堂.png',
  '学生公寓': '/Icons_POI/学生公寓.png',
  '图书馆': '/Icons_POI/图书馆.png',
  '体育馆': '/Icons_POI/体育馆.png',
  '教学楼': '/Icons_POI/公共教学楼.png',
  '实验楼': '/Icons_POI/实验楼.png',
  '行政楼': '/Icons_POI/行政楼.png',
  '学院楼': '/Icons_POI/学院楼.png'
}

onMounted(async () => {
  // 设置 Mapbox 访问令牌（通过 Cloudflare Pages 环境变量注入）
  // 本地可在 .env.local 中配置：VITE_MAPBOX_ACCESS_TOKEN=...
  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined
  if (!mapboxToken) {
    alert('未配置地图访问令牌：请设置环境变量 VITE_MAPBOX_ACCESS_TOKEN 后重新部署/刷新。')
    return
  }
  mapboxgl.accessToken = mapboxToken

  // 初始化地图
  map = new mapboxgl.Map({
    container: 'map-canvas',
    style: 'mapbox://styles/991184557/cmj8pd643002m01sres87h1yp',
    center: [112.943055, 28.190444], // 湖南师范大学坐标
    zoom: 16,
    pitch: 30, // 设置倾斜角度为30度
    bearing: 0,
    antialias: true, // 启用抗锯齿以获得更好的3D效果
    scrollZoom: {
      around: 'center' // 确保滚轮缩放以鼠标位置为中心
    },
    pitchWithRotate: false, // 禁用拖动时改变倾斜角度
    dragRotate: false // 禁用拖动旋转
  })

  // flex 布局下，首次渲染后触发一次 resize，避免高度计算为 0
  requestAnimationFrame(() => map?.resize())

  // 添加导航控件
  map.addControl(new mapboxgl.NavigationControl(), 'top-right')

  // 添加比例尺
  map.addControl(new mapboxgl.ScaleControl({
    maxWidth: 100,
    unit: 'metric'
  }), 'bottom-right')

  // 添加全屏控件
  map.addControl(new mapboxgl.FullscreenControl(), 'top-right')

  // 地图加载完成事件
  map.on('load', async () => {
    console.log('地图加载完成')
    await loadCampusData()
    await loadBuildingsData()
    await loadPOIData()
    await loadCheckinsData()
    setupGlobalInteractions()
  })
})

const getMyLocation = (): Promise<{ lng: number; lat: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('当前浏览器不支持定位'))
      return
    }
    if (!window.isSecureContext) {
      reject(new Error('当前页面不是 HTTPS 环境，浏览器可能会阻止定位。请使用 https 访问后再试。'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ lng: pos.coords.longitude, lat: pos.coords.latitude })
      },
      (err) => {
        // 1: PERMISSION_DENIED, 2: POSITION_UNAVAILABLE, 3: TIMEOUT
        if (err?.code === 1) {
          reject(new Error('定位权限已被拒绝。请在浏览器的站点设置中把“位置/定位”改为允许，然后刷新页面再试。'))
          return
        }
        if (err?.code === 3) {
          reject(new Error('定位超时，请到室外或网络更好处重试。'))
          return
        }
        reject(new Error(err?.message || '定位失败'))
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  })
}

const locateMe = async () => {
  if (!map) return
  try {
    const { lng, lat } = await getMyLocation()
    const el = document.createElement('img')
    el.src = '/Icons/GPS-MyLocation-64.png'
    el.alt = 'me'
    el.style.width = '32px'
    el.style.height = '32px'
    el.style.transform = 'translate(-50%, -50%)'

    if (!userLocationMarker) {
      userLocationMarker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map)
    } else {
      userLocationMarker.setLngLat([lng, lat])
    }

    map.flyTo({
      center: [lng, lat],
      zoom: Math.max(map.getZoom(), 17),
      duration: 800,
      essential: true,
      pitch: 30,
      bearing: 0,
    } as any)
  } catch (e: any) {
    alert(e?.message || '定位失败')
  }
}

const startCheckin = async () => {
  const userId = getCurrentUserId()
  if (!userId) {
    alert('请先登录')
    return
  }

  try {
    const { lng, lat } = await getMyLocation()
    pendingCheckinLngLat.value = { lng, lat }

    if (isMobileOrTablet()) {
      const useCamera = confirm('是否使用摄像头拍照？\n点“确定”拍照，点“取消”从相册选择。')
      ;(useCamera ? checkinCameraInput.value : checkinFileInput.value)?.click()
    } else {
      checkinFileInput.value?.click()
    }
  } catch (e: any) {
    alert(e?.message || '定位失败')
  }
}

const onCheckinFileSelected = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  // 清空，保证下次选择同一文件也能触发 change
  input.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    alert('仅支持图片文件')
    return
  }
  pendingCheckinFile.value = file
  if (checkinPreviewUrl.value) URL.revokeObjectURL(checkinPreviewUrl.value)
  checkinPreviewUrl.value = URL.createObjectURL(file)
  checkinText.value = ''
  showCheckinModal.value = true
}

const closeCheckinModal = () => {
  showCheckinModal.value = false
  pendingCheckinFile.value = null
  pendingCheckinLngLat.value = null
  checkinText.value = ''
  if (checkinPreviewUrl.value) URL.revokeObjectURL(checkinPreviewUrl.value)
  checkinPreviewUrl.value = null
}

const submitCheckin = async () => {
  const userId = getCurrentUserId()
  if (!userId) {
    alert('请先登录')
    return
  }
  if (!pendingCheckinFile.value || !pendingCheckinLngLat.value) {
    alert('缺少图片或定位信息')
    return
  }
  isSubmittingCheckin.value = true
  try {
    const res = await apiClient.createCheckin({
      userId,
      latitude: pendingCheckinLngLat.value.lat,
      longitude: pendingCheckinLngLat.value.lng,
      text: checkinText.value,
      image: pendingCheckinFile.value,
    }) as any

    const checkin = res?.checkin as Checkin
    if (checkin?.id) {
      // Worker 返回的是绝对 imageUrl；地图图层里用相对即可
      const rel = checkin.imageUrl ? checkin.imageUrl.replace(API_BASE_URL, '') : null
      checkins.value = [
        {
          ...checkin,
          imageUrl: rel || checkin.imageUrl || null,
        },
        ...checkins.value,
      ]
      updateCheckinsSource()
    }
    closeCheckinModal()
  } catch (e: any) {
    alert(e?.message || '提交失败')
  } finally {
    isSubmittingCheckin.value = false
  }
}

// 设置全局交互事件（点击和鼠标悬停）
const setupGlobalInteractions = () => {
  if (!map) return

  // 构建所有交互图层的ID列表
  const interactiveLayers: string[] = ['checkins-layer', 'buildings-3d']
  Object.keys(POI_CATEGORIES).forEach(key => {
    interactiveLayers.push(`poi-symbols-${key}`)
    interactiveLayers.push(`poi-dots-${key}`)
  })

  const getExistingInteractiveLayers = () => {
    const m = map
    if (!m) return [] as string[]
    return interactiveLayers.filter(id => !!m.getLayer(id))
  }

  // 全局点击事件监听
  map.on('click', (e) => {
    if (!map) return
    
    // 查询点击位置的所有交互图层要素
    const layers = getExistingInteractiveLayers()
    if (!layers.length) return
    const features = map.queryRenderedFeatures(e.point, { layers })
    
    if (features.length > 0) {
      const feature = features[0]
      if (!feature || !feature.layer) return
      
      // 处理建筑点击
      if (feature.layer.id === 'buildings-3d') {
        const buildingAsPOI: POIFeature = {
          type: 'Feature',
          properties: {
            gml_id: feature.properties?.gml_id || '',
            Name: feature.properties?.名称 || '未命名建筑',
            pyname: '',
            kind: feature.properties?.类型 || '',
            zipcode: null,
            telephone: null,
            display_x: '',
            display_y: '',
            side: '',
            address: feature.properties?.简介 || null,
            height: feature.properties?.height,
            image: feature.properties?.图片
          },
          geometry: feature.geometry as any
        }
        selectedPOI.value = buildingAsPOI
      } 
      // 处理打卡点击
      else if (feature.layer.id === 'checkins-layer') {
        openCheckinModal(feature)
      }
      // 处理POI点击
      else {
        selectedPOI.value = feature as any
      }
    }
  })

  // 全局鼠标移动事件监听（改变光标）
  map.on('mousemove', (e) => {
    if (!map) return
    const layers = getExistingInteractiveLayers()
    if (!layers.length) {
      map.getCanvas().style.cursor = ''
      return
    }
    const features = map.queryRenderedFeatures(e.point, { layers })
    map.getCanvas().style.cursor = features.length ? 'pointer' : ''
  })
}

const openCheckinModal = (feature: any) => {
  const props = feature?.properties || {}
  const id = String(props.id || '')
  if (!id) return

  const found = checkins.value.find(c => c.id === id)
  if (found) {
    selectedCheckin.value = found
    return
  }

  // 兜底：从 feature properties 组装（防止尚未同步到 checkins）
  selectedCheckin.value = {
    id,
    userId: String(props.userId || ''),
    username: String(props.username || ''),
    latitude: Number(props.latitude || 0),
    longitude: Number(props.longitude || 0),
    text: String(props.text || ''),
    imageUrl: props.imageUrl ? String(props.imageUrl) : null,
    createdAt: String(props.createdAt || ''),
  }
}

const deleteCheckinById = async (id: string) => {
  const userId = getCurrentUserId()
  if (!userId) {
    alert('请先登录')
    return
  }
  if (!confirm('确认删除这条打卡吗？')) return

  try {
    await apiClient.deleteCheckin(id, userId)
    checkins.value = checkins.value.filter(c => c.id !== id)
    updateCheckinsSource()
    selectedCheckin.value = null
  } catch (e: any) {
    alert(e?.message || '删除失败')
  }
}

const loadCheckinsData = async () => {
  if (!map) return

  try {
    const res = await apiClient.getCheckins(200) as any
    checkins.value = (res?.checkins || []) as Checkin[]

    // 确保 icon 已加载
    await ensureMapImage('checkin-icon', '/Icons/icons8-Comments-94.png')

    const data = buildCheckinsGeoJSON()

    if (!map.getSource('checkins')) {
      map.addSource('checkins', {
        type: 'geojson',
        data: data as any,
      })

      map.addLayer({
        id: 'checkins-layer',
        type: 'symbol',
        source: 'checkins',
        layout: {
          'icon-image': 'checkin-icon',
          'icon-size': 0.25,
          'icon-allow-overlap': true,
          'icon-anchor': 'bottom',
        },
        paint: {
          'icon-opacity': 0.95,
        },
      })
    } else {
      updateCheckinsSource()
    }
  } catch (e) {
    console.error('加载打卡失败:', e)
  }
}

const buildCheckinsGeoJSON = () => {
  return {
    type: 'FeatureCollection',
    features: checkins.value
      .filter(c => Number.isFinite(c.longitude) && Number.isFinite(c.latitude))
      .map(c => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [c.longitude, c.latitude],
        },
        properties: {
          id: c.id,
          userId: c.userId,
          username: c.username,
          text: c.text,
          imageUrl: c.imageUrl,
          createdAt: c.createdAt,
        },
      })),
  }
}

const updateCheckinsSource = () => {
  if (!map) return
  const src = map.getSource('checkins') as mapboxgl.GeoJSONSource | undefined
  if (!src) return
  src.setData(buildCheckinsGeoJSON() as any)
}

const ensureMapImage = (name: string, url: string) => {
  return new Promise<void>((resolve, reject) => {
    if (!map) return resolve()
    if (map.hasImage(name)) return resolve()
    map.loadImage(url, (err, img) => {
      if (err || !img) {
        reject(err || new Error('loadImage failed'))
        return
      }
      if (!map || map.hasImage(name)) {
        resolve()
        return
      }
      map.addImage(name, img)
      resolve()
    })
  })
}


const zoomToCampus = (campusName: string) => {
  if (!map) return
  const target = campuses.value.find(c => c.name === campusName)
  if (!target) return
  map.fitBounds(target.bounds, {
    padding: 60,
    duration: 800,
    essential: true,
    // 保持 3D 视角稳定
    pitch: 30,
    bearing: 0
  } as any)
}

// 加载校区数据
const loadCampusData = async () => {
  if (!map) return

  try {
    const response = await fetch('/Geo/Campus.geojson')
    if (!response.ok) return
    
    const data = await response.json()
    
    map.addSource('campus', {
      type: 'geojson',
      data: data as any
    })

    // 生成五个校区按钮数据（边界 + SVG 轮廓）
    const features = (data?.features || []) as Array<any>
    const nextCampuses: CampusButton[] = []
    for (const f of features) {
      const name = f?.properties?.['校区名']
      const geom = f?.geometry
      if (!name || !geom) continue

      const bounds = computeBoundsFromGeometry(geom)
      const svgPath = geometryToSvgPath(geom)
      if (!bounds || !svgPath) continue
      nextCampuses.push({ name, bounds, svgPath })
    }
    // 保持一个稳定顺序（按 GeoJSON 的顺序）
    campuses.value = nextCampuses

    map.addLayer({
      id: 'campus-labels',
      type: 'symbol',
      source: 'campus',
      layout: {
        'text-field': ['get', '校区名'],
        'text-font': ['Source Han Serif CN Regular', 'Arial Unicode MS Regular'],
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          12, 16,
          18, 32
        ],
        'text-anchor': 'center',
        'text-allow-overlap': false,
        'text-pitch-alignment': 'viewport'
      },
      paint: {
        'text-color': '#8F0100',
        'text-opacity': 0.5,
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
        'text-halo-blur': 1
      }
    }, 'waterway-label')
  } catch (error) {
    console.error('加载校区数据失败:', error)
  }
}

function computeBoundsFromGeometry(geometry: any): mapboxgl.LngLatBounds | null {
  // 支持 Polygon / MultiPolygon
  const coords = geometry?.coordinates
  const type = geometry?.type
  if (!coords || !type) return null

  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity

  const visitPoint = (pt: any) => {
    const lng = pt?.[0]
    const lat = pt?.[1]
    if (typeof lng !== 'number' || typeof lat !== 'number') return
    minLng = Math.min(minLng, lng)
    minLat = Math.min(minLat, lat)
    maxLng = Math.max(maxLng, lng)
    maxLat = Math.max(maxLat, lat)
  }

  if (type === 'Polygon') {
    for (const ring of coords) for (const pt of ring) visitPoint(pt)
  } else if (type === 'MultiPolygon') {
    for (const poly of coords) for (const ring of poly) for (const pt of ring) visitPoint(pt)
  } else {
    return null
  }

  if (!Number.isFinite(minLng) || !Number.isFinite(minLat) || !Number.isFinite(maxLng) || !Number.isFinite(maxLat)) {
    return null
  }
  return new mapboxgl.LngLatBounds([minLng, minLat], [maxLng, maxLat])
}

function geometryToSvgPath(geometry: any): string {
  const coords = geometry?.coordinates
  const type = geometry?.type
  if (!coords || !type) return ''

  // 取第一块多边形的外环作为轮廓
  let ring: any[] | null = null
  if (type === 'Polygon') {
    ring = coords?.[0] || null
  } else if (type === 'MultiPolygon') {
    ring = coords?.[0]?.[0] || null
  }
  if (!ring || ring.length < 3) return ''

  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity
  for (const pt of ring) {
    const lng = pt?.[0]
    const lat = pt?.[1]
    if (typeof lng !== 'number' || typeof lat !== 'number') continue
    minLng = Math.min(minLng, lng)
    minLat = Math.min(minLat, lat)
    maxLng = Math.max(maxLng, lng)
    maxLat = Math.max(maxLat, lat)
  }
  const spanLng = maxLng - minLng
  const spanLat = maxLat - minLat
  if (!(spanLng > 0) || !(spanLat > 0)) return ''

  const toXY = (pt: any) => {
    const lng = pt[0]
    const lat = pt[1]
    const x = ((lng - minLng) / spanLng) * 100
    const y = ((maxLat - lat) / spanLat) * 100
    return [x, y] as const
  }

  const [x0, y0] = toXY(ring[0])
  let d = `M ${x0.toFixed(2)} ${y0.toFixed(2)}`
  for (let i = 1; i < ring.length; i++) {
    const [x, y] = toXY(ring[i])
    d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`
  }
  d += ' Z'
  return d
}

// 加载建筑数据
const loadBuildingsData = async () => {
  if (!map) return

  try {
    const response = await fetch('/Geo/Buildings.geojson')
    if (!response.ok) return
    
    const data = await response.json()
    
    map.addSource('buildings', {
      type: 'geojson',
      data: data as any
    })

    map.addLayer({
      id: 'buildings-3d',
      type: 'fill-extrusion',
      source: 'buildings',
      paint: {
        'fill-extrusion-color': [
          'case',
          ['has', '类型'],
          [
            'match',
            ['get', '类型'],
            '食堂', '#FFE4B5',
            '学生公寓', '#B0E0E6',
            '图书馆', '#DDA0DD',
            '体育馆', '#98FB98',
            '教学楼', '#F0E68C',
            '实验楼', '#FFA07A',
            '行政楼', '#87CEEB',
            '学院楼', '#F5DEB3',
            '#D3D3D3'
          ],
          '#D3D3D3'
        ],
        'fill-extrusion-height': [
          'case',
          ['has', 'height'],
          ['get', 'height'],
          12
        ],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.7
      }
    })

    map.addLayer({
      id: 'buildings-labels',
      type: 'symbol',
      source: 'buildings',
      filter: ['has', '名称'],
      minzoom: 16,
      layout: {
        'text-field': ['get', '名称'],
        'text-font': ['DengXian Regular', 'Arial Unicode MS Regular'],
        'text-size': 11,
        'text-anchor': 'center',
        'text-allow-overlap': false,
        'text-offset': [0, 0]
      },
      paint: {
        'text-color': '#333333',
        'text-opacity': 0.8,
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5
      }
    })

    const typesWithIcons = Object.keys(BUILDING_TYPE_ICONS)
    for (const type of typesWithIcons) {
      const iconPath = BUILDING_TYPE_ICONS[type]
      if (!iconPath) continue
      const img = new Image()
      img.onload = () => {
        if (!map || map.hasImage(`building-icon-${type}`)) return
        map.addImage(`building-icon-${type}`, img, { sdf: false })
      }
      img.src = iconPath
    }

    map.addLayer({
      id: 'buildings-icons',
      type: 'symbol',
      source: 'buildings',
      filter: ['has', '类型'],
      minzoom: 17,
      layout: {
        'icon-image': [
          'case',
          ['has', '类型'],
          [
            'match',
            ['get', '类型'],
            ...typesWithIcons.flatMap(type => [type, `building-icon-${type}`]),
            ''
          ],
          ''
        ],
        'icon-size': 0.08,
        'icon-anchor': 'center',
        'icon-allow-overlap': false,
        'icon-offset': [0, -40]
      },
      paint: {
        'icon-opacity': 0.8
      }
    })

  } catch (error) {
    console.error('加载建筑数据失败:', error)
  }
}

// 加载POI数据
const loadPOIData = async () => {
  if (!map) return

  try {
    for (const [key, category] of Object.entries(POI_CATEGORIES)) {
      const response = await fetch(`/Geo/POI/${key}.geojson`)
      if (!response.ok) continue
      
      const data: POICollection = await response.json()
      
      map.addSource(`poi-${key}`, {
        type: 'geojson',
        data: data as any
      })

      const img = new Image()
      img.onload = () => {
        if (!map || map.hasImage(`icon-${key}`)) return
        map.addImage(`icon-${key}`, img)
      }
      img.src = category.icon

      map.addLayer({
        id: `poi-symbols-${key}`,
        type: 'symbol',
        source: `poi-${key}`,
        minzoom: category.minZoom,
        layout: {
          'icon-image': `icon-${key}`,
          'icon-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14, 0.15,
            18, 0.3
          ],
          'icon-allow-overlap': true,
          'text-field': ['get', 'Name'],
          'text-font': ['DengXian Regular', 'Arial Unicode MS Regular'],
          'text-size': 12,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          'text-optional': true,
          'text-allow-overlap': false
        },
        paint: {
          'text-color': category.color,
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
          'icon-opacity': 0.85
        }
      })

      map.addLayer({
        id: `poi-dots-${key}`,
        type: 'circle',
        source: `poi-${key}`,
        maxzoom: category.minZoom,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 2,
            14, 4
          ],
          'circle-color': category.color,
          'circle-opacity': 0.8,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff'
        }
      })
    }
  } catch (error) {
    console.error('加载POI数据失败:', error)
  }
}

// 处理评分
const handleRate = (data: { rating: number }) => {
  console.log('评分:', data.rating)
  // TODO: 保存到数据库
}

// 处理评论
const handleComment = (data: { comment: string }) => {
  console.log('评论:', data.comment)
  // TODO: 保存到数据库
}

onUnmounted(() => {
  // 清理地图实例
  if (map) {
    map.remove()
    map = null
  }

  if (checkinPreviewUrl.value) {
    URL.revokeObjectURL(checkinPreviewUrl.value)
  }
})
</script>

<style scoped>
.map-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  flex: 1 1 auto;
  min-height: 0;
}

.map {
  width: 100%;
  height: 100%;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.campus-controls {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
  display: flex;
  pointer-events: none;
}

.campus-btn {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 40px;
  width: 44px;
  padding: 6px 10px;
  overflow: hidden;
  border: 2px solid currentColor;
  background: rgba(255, 255, 255, 0.92);
  color: #8F0100;
  cursor: pointer;
  transition: width 200ms ease, background-color 200ms ease;
}

.campus-btn + .campus-btn {
  border-left: none;
}

.campus-btn:first-child {
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
}

.campus-btn:last-child {
  border-top-right-radius: 12px;
  border-bottom-right-radius: 12px;
}

.campus-btn:hover {
  width: 160px;
  background: rgba(255, 255, 255, 1);
}

.campus-icon {
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
}

.campus-name {
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
  opacity: 0;
  transition: opacity 150ms ease;
}

.campus-btn:hover .campus-name {
  opacity: 1;
}

.map-actions {
  position: absolute;
  left: 12px;
  bottom: calc(20px + env(safe-area-inset-bottom));
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.map-action-btn {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 40px;
  width: 44px;
  padding: 6px 10px;
  overflow: hidden;
  border: 2px solid currentColor;
  background: rgba(255, 255, 255, 0.92);
  color: #8F0100;
  cursor: pointer;
  border-radius: 12px;
  transition: width 200ms ease, background-color 200ms ease;
}

.map-action-btn:hover {
  width: 140px;
  background: rgba(255, 255, 255, 1);
}

.map-action-icon {
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
}

.map-action-name {
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
  opacity: 0;
  transition: opacity 150ms ease;
}

.map-action-btn:hover .map-action-name {
  opacity: 1;
}

.hidden-file-input {
  display: none;
}

/* 打卡提交模态框样式 */
.checkin-modal {
  position: relative;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  max-width: 520px;
  width: 90%;
  padding: 20px;
}

.checkin-modal .close-btn {
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

.checkin-modal .close-btn:hover {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.05);
}

.checkin-title {
  margin: 0 0 12px 0;
  color: #333;
}

.checkin-preview {
  width: 100%;
  height: 220px;
  overflow: hidden;
  border-radius: 12px;
  margin-bottom: 12px;
}

.checkin-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.checkin-text {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
  margin-bottom: 12px;
}

.checkin-text:focus {
  outline: none;
  border-color: #8F0100;
}


.poi-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

.poi-popup-content {
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .map {
    height: 100%;
  }
}
</style>
