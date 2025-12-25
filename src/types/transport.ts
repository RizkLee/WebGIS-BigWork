export type BusFeatureProps = {
  名称?: string
  起点?: string
  终点?: string
  经过站?: string | null
  layer?: string
}

export type MetroFeatureProps = {
  名称?: string
  起点?: string
  终点?: string
  经过站?: string | null
  layer?: string
}

export type MetroStationFeature = {
  name: string
  line: string
  lng: number
  lat: number
}
