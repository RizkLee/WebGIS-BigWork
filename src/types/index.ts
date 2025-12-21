export interface LinkButton {
  type: 'link' | 'qr'
  text: string
  url?: string
  qrImage?: string
  qrHint?: string  // 二维码提示文字,默认为"微信扫码关注公众号"
}

export interface SectionItemData {
  title: string
  links: LinkButton[]
  description: string
}

export interface SectionData {
  title: string
  items: SectionItemData[]
}
