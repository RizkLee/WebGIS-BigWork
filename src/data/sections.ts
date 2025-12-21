import type { SectionData } from '../types'

export const sectionData: SectionData[] = [
  {
    title: '实用官网官微',
    items: [
        {
        title: '官方手机APP',
        links: [
            { type: 'link', text: '应用宝', url: 'https://sj.qq.com/appdetail/com.cc.mobile.teach' },
            { type: 'link', text: 'App Store', url: 'https://apps.apple.com/cn/app/湖南师范大学app/id6448230110' }
        ],
        description: '湖南师范大学 APP 是学校官方推出的移动应用,提供多种校园服务。'
        },
        {
        title: '校园网登录页',
        links: [
            { type: 'link', text: '登陆网址', url: 'http://192.168.250.250/' }
        ],
        description: '若您在校园内,可通过校园网登录页访问校园网,点此查看<a href="https://io.hunnu.edu.cn/info/1036/2308.htm" target="_blank">校园网使用常见问题</a>。'
        },
        {
        title: '图书馆',
        links: [
            { type: 'link', text: '官网', url: 'https://lib.hunnu.edu.cn/' },
            { type: 'link', text: '位置', url: 'https://surl.amap.com/m9PeRjPhd69' }
        ],
        description: '图书馆是学校的文献信息中心,提供丰富的图书、期刊、数字资源等,支持师生的教学和科研活动。'
        },
        {
        title: '科技处',
        links: [
            { type: 'link', text: '体测官网', url: 'http://hunnu.ticeyun.com/' },
            { type: 'qr', text: '官微', qrImage: '/Pictures/sports_commitee.jpg' }
        ],
        description: '科技处是学校的科研、竞赛管理部门,负责科研项目管理、科研成果评审等工作,可于科技处官网查询科研动态、竞赛信息等。'
        },
        {
        title: '体育运动委员会',
        links: [
            { type: 'qr', text: '官微', qrImage: '/Pictures/sports_commitee.jpg' }
        ],
        description: '体育运动委员会是学校的体育管理部门,负责学校体育活动和体测的组织和管理,可于体育运动委员会官微查询体测通知。'
        },
        {
        title: '校园云盘',
        links: [
            { type: 'link', text: '官网', url: 'https://pan.hunnu.edu.cn/' },
            { type: 'link', text: '客户端下载', url: 'https://www.seafile.com/download/' }
        ],
        description: '湖师大校园云盘是学校免费提供的云存储服务,提供高速的上传下载速度,师生可以在这里存储文件。点此查看<a href="https://sxy.hunnu.edu.cn/info/1102/6615.htm" target="_blank">云盘使用指南</a>。'
        },
        {
        title: 'EDU邮箱',
        links: [
            { type: 'link', text: '官网', url: 'http://mail.hunnu.edu.cn/' }
        ],
        description: '湖师大邮箱是学校为师生提供edu邮箱服务,每位学生可注册一个邮箱账户及一个别名。'
        },
        {
        title: '信息门户',
        links: [
            { type: 'link', text: '官网', url: 'https://front.hunnu.edu.cn/applications' },
            { type: 'link', text: '服务大厅', url: 'https://e.hunnu.edu.cn/affairs' }
        ],
        description: '湖南师范大学信息门户隶属于湖南师范大学信息化中心,提供多种服务,如场馆预约、学生评教、正版软件下载等,相当于“湖南师范大学”APP的桌面版。'
        },
        {
        title: '本科教学管理平台',
        links: [
            { type: 'link', text: '官网', url: 'https://jwglnew.hunnu.edu.cn/' }
        ],
        description: '本科教学管理平台是学校的教务管理系统,师生可以在这里查询课表、成绩、培养计划、报到、选课、打印CA成绩单等。点击此处进入<a href="https://jwglnew.hunnu.edu.cn/eams/stdElectCourse!innerIndex.action" target="_blank">选课快速通道</a>,可避免网络拥堵(需先至本科教学管理平台登录)。'
        },
        {
        title: '在线教学平台',
        links: [
            { type: 'link', text: '官网', url: 'https://hunnu.fanya.chaoxing.com/portal' }
        ],
        description: '在线教学平台是学校的教学资源管理系统,师生可以在这里查看课程资料、提交作业、参与讨论等。'
        },
        {
        title: '学信网',
        links: [
            { type: 'link', text: '官网', url: 'https://www.chsi.com.cn/' }
        ],
        description: '学信网是教育部学籍在线验证系统,学生可在学信网查询并下载学籍信息、学历信息、学籍证明等。'
        }
    ]
  },
  {
    title: '学生社区平台',
    items: [
        {
            title: '赞噢校园集市',
            links: [
            { type: 'qr', text: '小程序', qrImage: '/Pictures/zanao_campus.jpg', qrHint: '微信扫码使用小程序' },
            ],
            description: '赞噢校园集市是学生的热门交流平台, 涵盖二手交易、打听求助等多种服务。'
        }
    ]
  }
]

