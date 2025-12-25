<template>
  <!-- 校区间交通出行（按钮在“校区跳转”下方） -->
  <div class="transport-control" v-if="campuses.length">
    <button class="transport-btn" type="button" title="校区交通" @click="togglePanel">
      <img class="transport-icon" src="/Icons/Transport-School-Bus-64.png" alt="transport" />
    </button>

    <div class="transport-panel" :class="{ active: showPanel }" @click.stop>
      <div class="transport-panel-header">
        <div class="transport-panel-title">校区间交通指南</div>
        <button class="transport-close" type="button" @click="showPanel = false">×</button>
      </div>

      <div class="transport-form">
        <label class="transport-field">
          <span class="transport-label">出发</span>
          <select v-model="transportFrom" class="transport-select">
            <option value="">请选择</option>
            <option v-for="c in campuses" :key="`from-${c.name}`" :value="c.name">{{ c.name }}</option>
          </select>
        </label>

        <label class="transport-field">
          <span class="transport-label">到达</span>
          <select v-model="transportTo" class="transport-select">
            <option value="">请选择</option>
            <option v-for="c in campuses" :key="`to-${c.name}`" :value="c.name">{{ c.name }}</option>
          </select>
        </label>
      </div>

      <div class="transport-results">
        <div v-if="!transportFrom || !transportTo" class="transport-empty">请选择出发/到达校区</div>
        <div v-else-if="transportFrom === transportTo" class="transport-empty">出发与到达相同</div>
        <template v-else>
          <div v-if="transportMatches.bus.length" class="transport-section">
            <div class="transport-section-title">
              <span class="transport-section-title-text">公交</span>
              <img class="transport-mode-icon" src="/Icons/Changsha_Bus_Crop.jpg" alt="bus" />
            </div>
            <div v-for="r in transportMatches.bus" :key="r.key" class="transport-route">
              <div class="transport-route-name">{{ r.name }}</div>
              <div v-if="r.stops?.length" class="transport-route-stops">经过站：{{ r.stops.join('；') }}</div>
            </div>
          </div>

          <div v-if="transportMatches.metro.length" class="transport-section">
            <div class="transport-section-title">
              <span class="transport-section-title-text">地铁</span>
              <img class="transport-mode-icon" src="/Icons/Changsha_Metro_Crop.jpg" alt="metro" />
            </div>
            <div v-for="r in transportMatches.metro" :key="r.key" class="transport-route">
              <div class="transport-route-name">{{ r.name }}</div>
              <div v-if="r.hint" class="transport-route-stops">{{ r.hint }}</div>
            </div>
          </div>

          <div v-if="!transportMatches.bus.length && !transportMatches.metro.length" class="transport-empty">
            暂无匹配线路
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { BusFeatureProps, MetroFeatureProps, MetroStationFeature } from '../types/transport'

type CampusButton = {
  name: string
  svgPath: string
  bounds: { getCenter: () => { lng: number; lat: number } }
}

const props = defineProps<{
  campuses: CampusButton[]
  busFeatures: BusFeatureProps[]
  metroFeatures: MetroFeatureProps[]
  metroStations: MetroStationFeature[]
}>()

const showPanel = ref(false)
const transportFrom = ref('')
const transportTo = ref('')

const splitStops = (value: string | null | undefined) => {
  if (!value) return [] as string[]
  return String(value)
    .split(/[；;]+/)
    .map(s => s.trim())
    .filter(Boolean)
}

const normalizeName = (value: unknown) => String(value || '').trim()

const isValidStationName = (value: string) => {
  const v = normalizeName(value)
  if (!v) return false
  if (v === 'other') return false
  if (v.includes('始终点')) return false
  return true
}

// 人工校区 ↔ 地铁站映射（优先于“最近站”）
const CAMPUS_TO_METRO_STATION: Record<string, string> = {
  '咸嘉湖校区': '白鸽咀',
  '二里半校区': '湖南师大',
  '天马学生公寓': '阜埠河',
}

const getCampusCenter = (campusName: string) => {
  const c = props.campuses.find(x => x.name === campusName)
  if (!c) return null
  try {
    const center = c.bounds.getCenter()
    return { lng: center.lng, lat: center.lat }
  } catch {
    return null
  }
}

const findNearestMetroStation = (campusName: string) => {
  const center = getCampusCenter(campusName)
  if (!center) return null
  let best: MetroStationFeature | null = null
  let bestD2 = Infinity
  for (const s of props.metroStations) {
    const dx = s.lng - center.lng
    const dy = s.lat - center.lat
    const d2 = dx * dx + dy * dy
    if (d2 < bestD2) {
      bestD2 = d2
      best = s
    }
  }
  return best
}

const resolveCampusMetroStation = (campusName: string) => {
  const mapped = CAMPUS_TO_METRO_STATION[campusName]
  if (mapped) return mapped
  return findNearestMetroStation(campusName)?.name || ''
}

const togglePanel = () => {
  showPanel.value = !showPanel.value
}

const closeOnDocClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null
  if (!target) return
  if (!target.closest('.transport-control')) {
    showPanel.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeOnDocClick)
})

onUnmounted(() => {
  document.removeEventListener('click', closeOnDocClick)
})

type BusEdge = {
  start: string
  end: string
  stops: string[]
}

const buildBusRouteEdges = () => {
  const routes = new Map<string, BusEdge[]>()
  for (const f of props.busFeatures) {
    const name = normalizeName(f?.名称 || f?.layer || '')
    const start = normalizeName(f?.起点)
    const end = normalizeName(f?.终点)
    if (!name || !start || !end) continue
    const edge: BusEdge = { start, end, stops: splitStops(f?.经过站) }
    if (!routes.has(name)) routes.set(name, [])
    routes.get(name)!.push(edge)
  }
  return routes
}

const findBusPathInRoute = (edges: BusEdge[], from: string, to: string) => {
  // 无需换乘：只允许在同一“名称”下串联多段
  const adj = new Map<string, Array<{ next: string; edge: BusEdge }>>()
  for (const e of edges) {
    if (!adj.has(e.start)) adj.set(e.start, [])
    if (!adj.has(e.end)) adj.set(e.end, [])
    // 视为双向可达（同一线路双向行驶）
    adj.get(e.start)!.push({ next: e.end, edge: e })
    adj.get(e.end)!.push({ next: e.start, edge: e })
  }

  if (!adj.has(from) || !adj.has(to)) return null

  const queue: string[] = [from]
  const prev = new Map<string, { p: string; edge: BusEdge }>()
  const visited = new Set<string>([from])
  while (queue.length) {
    const cur = queue.shift()!
    if (cur === to) break
    for (const { next, edge } of adj.get(cur) || []) {
      if (visited.has(next)) continue
      visited.add(next)
      prev.set(next, { p: cur, edge })
      queue.push(next)
    }
  }
  if (!visited.has(to)) return null

  const nodes: string[] = [to]
  const usedEdges: BusEdge[] = []
  let cur = to
  while (cur !== from) {
    const step = prev.get(cur)
    if (!step) break
    usedEdges.push(step.edge)
    cur = step.p
    nodes.push(cur)
  }
  nodes.reverse()
  usedEdges.reverse()

  // 聚合“经过站”（按行进方向）
  const mergedStops: string[] = []
  const seen = new Set<string>()
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i]
    const b = nodes[i + 1]
    const edge = usedEdges[i]
    if (!a || !b || !edge) break
    const forward = edge.start === a && edge.end === b
    const segmentStops = forward ? edge.stops : edge.stops.slice().reverse()
    for (const s of segmentStops) {
      if (seen.has(s)) continue
      seen.add(s)
      mergedStops.push(s)
    }
  }

  return { nodes, stops: mergedStops }
}

type MetroAdjEdge = { to: string; line: string }

const buildMetroGraph = () => {
  const adj = new Map<string, MetroAdjEdge[]>()
  const stationLines = new Map<string, Set<string>>()

  for (const s of props.metroStations) {
    const name = normalizeName(s.name)
    const line = normalizeName(s.line)
    if (!name || !line) continue
    if (!stationLines.has(name)) stationLines.set(name, new Set<string>())
    stationLines.get(name)!.add(line)
  }

  const addEdge = (a: string, b: string, line: string) => {
    if (!adj.has(a)) adj.set(a, [])
    if (!adj.has(b)) adj.set(b, [])
    adj.get(a)!.push({ to: b, line })
    adj.get(b)!.push({ to: a, line })

    if (!stationLines.has(a)) stationLines.set(a, new Set<string>())
    if (!stationLines.has(b)) stationLines.set(b, new Set<string>())
    stationLines.get(a)!.add(line)
    stationLines.get(b)!.add(line)
  }

  for (const f of props.metroFeatures) {
    const lineName = normalizeName(f?.名称)
    if (!lineName) continue

    let seq = splitStops(f?.经过站)
    if (!seq.length) {
      const a = normalizeName(f?.起点)
      const b = normalizeName(f?.终点)
      seq = [a, b].filter(isValidStationName)
    }
    seq = seq.filter(isValidStationName)
    if (seq.length < 2) continue
    for (let i = 0; i < seq.length - 1; i++) {
      const a = seq[i]
      const b = seq[i + 1]
      if (!a || !b) continue
      addEdge(a, b, lineName)
    }
  }

  return { adj, stationLines }
}

type MetroPlan = {
  key: string
  name: string
  hint: string
}

const findMetroPlan = (fromStation: string, toStation: string): MetroPlan | null => {
  const from = normalizeName(fromStation)
  const to = normalizeName(toStation)
  if (!from || !to || from === to) return null

  const { adj, stationLines } = buildMetroGraph()
  if (!adj.has(from) || !adj.has(to)) return null

  type State = { station: string; line: string }
  const encode = (s: State) => `${s.station}__${s.line}`

  // Dijkstra：换乘成本更高，优先少换乘
  const dist = new Map<string, number>()
  const prev = new Map<string, { p: string; via?: { line: string; toStation?: string } }>()
  const pq: Array<{ key: string; cost: number; state: State }> = []

  const push = (state: State, cost: number, pKey?: string, via?: { line: string; toStation?: string }) => {
    const k = encode(state)
    const old = dist.get(k)
    if (old !== undefined && old <= cost) return
    dist.set(k, cost)
    if (pKey) prev.set(k, { p: pKey, via })
    pq.push({ key: k, cost, state })
  }

  const linesAtStart = Array.from(stationLines.get(from) || [])
  if (!linesAtStart.length) return null
  for (const line of linesAtStart) {
    push({ station: from, line }, 0)
  }

  const popMin = () => {
    let bestIdx = 0
    let best = pq[0]!
    for (let i = 1; i < pq.length; i++) {
      const item = pq[i]!
      if (item.cost < best.cost) {
        best = item
        bestIdx = i
      }
    }
    return pq.splice(bestIdx, 1)[0]!
  }

  let bestEndKey: string | null = null
  while (pq.length) {
    const cur = popMin()
    const curKey = cur.key
    const curDist = dist.get(curKey) ?? Infinity
    if (cur.cost !== curDist) continue
    if (cur.state.station === to) {
      bestEndKey = curKey
      break
    }

    // 沿当前线路前进
    for (const e of adj.get(cur.state.station) || []) {
      if (e.line !== cur.state.line) continue
      push({ station: e.to, line: cur.state.line }, curDist + 1, curKey, { line: cur.state.line, toStation: e.to })
    }

    // 换乘
    const linesHere = Array.from(stationLines.get(cur.state.station) || [])
    for (const nextLine of linesHere) {
      if (nextLine === cur.state.line) continue
      push({ station: cur.state.station, line: nextLine }, curDist + 10, curKey, { line: nextLine })
    }
  }

  if (!bestEndKey) return null

  // 回溯得到 (station,line) 序列
  const states: State[] = []
  let k: string | null = bestEndKey
  while (k) {
    const parts = k.split('__')
    const station = parts[0] || ''
    const line = parts[1] || ''
    states.push({ station, line })
    const p = prev.get(k)
    k = p ? p.p : null
  }
  states.reverse()

  // 合并为线路段
  const segments: Array<{ line: string; stations: string[] }> = []
  for (const s of states) {
    if (!s.station || !s.line) continue
    const lastSeg = segments.length ? segments[segments.length - 1] : undefined
    if (!lastSeg || lastSeg.line !== s.line) {
      segments.push({ line: s.line, stations: [s.station] })
    } else {
      const lastStation = lastSeg.stations.length ? lastSeg.stations[lastSeg.stations.length - 1] : undefined
      if (lastStation !== s.station) lastSeg.stations.push(s.station)
    }
  }
  if (!segments.length) return null

  const transferStations: string[] = []
  for (let i = 0; i < segments.length - 1; i++) {
    const a = segments[i]!
    const b = segments[i + 1]!
    const transfer = a.stations[a.stations.length - 1]
    if (transfer) transferStations.push(transfer)
    // 确保换乘站在后一段开头
    if (transfer && b.stations[0] !== transfer) b.stations.unshift(transfer)
  }

  const name = transferStations.length
    ? `${segments.map(s => s.line).join(' → ')}（${transferStations.join('、')}换乘）`
    : `${segments[0]?.line || ''}`

  const flatStations = segments.flatMap(s => s.stations)
  const hint = `站点：${flatStations.join(' → ')}`

  return {
    key: `${name}__${from}__${to}`,
    name,
    hint,
  }
}

const transportMatches = computed(() => {
  const from = transportFrom.value
  const to = transportTo.value

  const bus = [] as Array<{ key: string; name: string; stops: string[] }>
  const metro = [] as Array<{ key: string; name: string; hint?: string }>

  if (!from || !to || from === to) return { bus, metro }

  // 公交：允许同一线路名称下串联多段（无需换乘）
  const busRoutes = buildBusRouteEdges()
  for (const [routeName, edges] of busRoutes.entries()) {
    const path = findBusPathInRoute(edges, from, to)
    if (!path) continue
    const itinerary = path.nodes.join(' → ')
    bus.push({
      key: `${routeName}__${from}__${to}`,
      name: `${routeName}（${itinerary}）`,
      stops: path.stops,
    })
  }

  // 地铁：允许换乘
  const fromStation = resolveCampusMetroStation(from)
  const toStation = resolveCampusMetroStation(to)
  const plan = findMetroPlan(fromStation, toStation)
  if (plan) {
    metro.push({ key: plan.key, name: plan.name, hint: plan.hint })
  }

  return { bus, metro }
})
</script>

<style scoped>
.transport-control {
  position: absolute;
  top: 62px;
  left: 12px;
  z-index: 10;
  pointer-events: none;
}

.transport-btn {
  pointer-events: auto;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #8F0100;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 10px;
  cursor: pointer;
}

.transport-btn:hover {
  background: rgba(255, 255, 255, 1);
}

.transport-icon {
  width: 26px;
  height: 26px;
}

.transport-panel {
  position: absolute;
  top: 44px;
  left: 44px;
  width: 360px;
  max-width: calc(100vw - 24px);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 2px solid #8F0100;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  font-family: 'Source Han Serif CN', serif;
  color: #333;

  /* QRButton 弹出框风格：默认隐藏，active 时出现并向右轻微浮出 */
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateX(0) translateY(10px);
  transition: all 0.25s ease;
}

.transport-panel::before {
  content: '';
  position: absolute;
  top: 16px;
  left: -9px;
  width: 18px;
  height: 18px;
  background: rgba(255, 255, 255, 0.95);
  transform: rotate(45deg);
  border-radius: 2px;
  box-shadow: -4px 4px 12px -6px rgba(0, 0, 0, 0.15);
}

.transport-panel::after {
  content: '';
  position: absolute;
  top: 8px;
  left: 0;
  width: 12px;
  height: 28px;
  background: rgba(255, 255, 255, 0.95);
}

.transport-panel.active {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateX(10px) translateY(0);
}

.transport-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(143, 1, 0, 0.15);
}

.transport-panel-title {
  font-weight: 700;
  color: #8F0100;
}

.transport-close {
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  color: #8F0100;
}

.transport-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 12px;
}

.transport-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.transport-label {
  font-size: 12px;
  color: rgba(143, 1, 0, 0.8);
  font-weight: 700;
}

.transport-select {
  height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(143, 1, 0, 0.35);
  padding: 0 10px;
  outline: none;
  background: rgba(255, 255, 255, 0.98);
  color: #333;
}

.transport-select:focus {
  border-color: #8F0100;
}

.transport-results {
  padding: 0 12px 12px 12px;
}

.transport-section {
  margin-top: 10px;
  border: 1px solid rgba(143, 1, 0, 0.18);
  border-radius: 12px;
  overflow: hidden;
}

.transport-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px;
  background: rgba(143, 1, 0, 0.05);
  color: #8F0100;
  font-weight: 800;
}

.transport-section-title-text {
  flex: 0 0 auto;
}

.transport-mode-icon {
  width: 62px;
  height: 34px;
  object-fit: contain;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.9);
}

.transport-route {
  padding: 10px;
  border-top: 1px solid rgba(143, 1, 0, 0.10);
}

.transport-route-name {
  font-weight: 800;
  color: #333;
}

.transport-route-stops {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.7);
  line-height: 1.4;
}

.transport-empty {
  padding: 10px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

@media (max-width: 768px) {
  .transport-panel {
    width: calc(100vw - 24px);
  }
}
</style>
