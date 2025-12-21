// POI类型配置
export interface POICategory {
  name: string
  displayName: string
  icon: string
  color: string
  minZoom: number
}

// POI类别映射
export const POI_CATEGORIES: Record<string, POICategory> = {
  Dining: {
    name: 'Dining',
    displayName: '餐饮',
    icon: '/Icons_POI/餐饮.png',
    color: '#FF6B6B',
    minZoom: 16
  },
  Accommodation: {
    name: 'Accommodation',
    displayName: '住宿',
    icon: '/Icons_POI/住宿.png',
    color: '#4ECDC4',
    minZoom: 16
  },
  Shopping: {
    name: 'Shopping',
    displayName: '购物',
    icon: '/Icons_POI/购物.png',
    color: '#FFE66D',
    minZoom: 16
  },
  ShoppingMall: {
    name: 'ShoppingMall',
    displayName: '大型购物广场',
    icon: '/Icons_POI/大型购物广场.png',
    color: '#FF9F1C',
    minZoom: 15
  },
  FinancialServices: {
    name: 'FinancialServices',
    displayName: '金融服务',
    icon: '/Icons_POI/金融服务.png',
    color: '#2EC4B6',
    minZoom: 16
  },
  GovernmentAgency: {
    name: 'GovernmentAgency',
    displayName: '政府机关',
    icon: '/Icons_POI/政府机关.png',
    color: '#E71D36',
    minZoom: 16
  },
  Recreation: {
    name: 'Recreation',
    displayName: '休闲娱乐',
    icon: '/Icons_POI/休闲娱乐.png',
    color: '#A06CD5',
    minZoom: 16
  },
  ResearchEducation: {
    name: 'ResearchEducation',
    displayName: '科研教育',
    icon: '/Icons_POI/科研教育.png',
    color: '#6A4C93',
    minZoom: 15
  },
  ResidentialArea: {
    name: 'ResidentialArea',
    displayName: '居民小区',
    icon: '/Icons_POI/居民校区点.png',
    color: '#8AC926',
    minZoom: 16
  },
  Skyscraper: {
    name: 'Skyscraper',
    displayName: '大厦',
    icon: '/Icons_POI/大厦.png',
    color: '#1982C4',
    minZoom: 15
  },
  Tourism: {
    name: 'Tourism',
    displayName: '旅游',
    icon: '/Icons_POI/旅游.png',
    color: '#FB5607',
    minZoom: 15
  }
}

// POI属性接口
export interface POIProperties {
  gml_id: string
  Name: string
  pyname?: string
  kind?: string
  zipcode?: string | null
  telephone?: string | null
  display_x: string
  display_y: string
  side?: string
  address?: string | null
  // 建筑特有属性
  height?: number
  image?: string
}

// POI特征接口
export interface POIFeature {
  type: 'Feature'
  properties: POIProperties
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
}

// POI集合接口
export interface POICollection {
  type: 'FeatureCollection'
  name: string
  features: POIFeature[]
}
