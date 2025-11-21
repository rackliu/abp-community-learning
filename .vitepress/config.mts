import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(defineConfig({
  title: "ABP Community Learning",
  description: "ABP Framework V9.3 開源社群版教學",
  lang: 'zh-TW',
  base: '/abp-community-learning/',
  
  // 排除規劃文件、內部文件和包含佔位符連結的檔案
  srcExclude: [
    '**/課程設計概要.md', 
    '**/章節學習目標與先修需求.md', 
    '**/圖表渲染說明.md', 
    '**/part*.md',
    '**/SUMMARY.md'  // GitBook 格式目錄，包含死連結
  ],
  
  // 忽略特定模式的死連結（佔位符和 localhost）
  ignoreDeadLinks: [
    // 忽略所有 :999 佔位符錨點
    /\.md:999$/,
    // 忽略 localhost 連結
    /^http:\/\/localhost/,
    // 忽略 LICENSE 檔案（如果不存在）
    /\.\/LICENSE$/
  ],
  
  themeConfig: {
    nav: [
      { text: '首頁', link: '/' },
      { text: '開始閱讀', link: '/content/ch01' },
      { text: '習題解答', link: '/content/solutions/ch01-solutions' }
    ],

    sidebar: [
      {
        text: '前言',
        items: [
          { text: '專案介紹', link: '/README' }
        ]
      },
      {
        text: '第一部：現代軟體開發與 ABP Framework 介紹',
        items: [
          { text: '第一章：現代軟體開發與 ABP Framework', link: '/content/ch01' },
          { text: '第二章：ABP Framework 快速入門', link: '/content/ch02' },
          { text: '第三章：實戰應用程式開發流程', link: '/content/ch03' },
          { text: '第四章：認識官方參考解決方案與社群資源', link: '/content/ch04' }
        ]
      },
      {
        text: '第二部：ABP Framework 基礎建設',
        items: [
          { text: '第五章：ASP.NET Core 與 ABP 架構深入解析', link: '/content/ch05' },
          { text: '第六章：資料存取基礎設施', link: '/content/ch06' },
          { text: '第七章：橫切關注點', link: '/content/ch07' },
          { text: '第八章：開源特色與社群服務功能', link: '/content/ch08' }
        ]
      },
      {
        text: '第三部：領域驅動設計（DDD）實踐',
        items: [
          { text: '第九章：領域驅動設計 (DDD) 理論與實踐', link: '/content/ch09' },
          { text: '第十章：領域服務與規約模式', link: '/content/ch10' },
          { text: '第十一章：應用層設計', link: '/content/ch11' }
        ]
      },
      {
        text: '第四部：使用者介面與 API 開發',
        items: [
          { text: '第十二章：MVC/Razor Pages 前端開發', link: '/content/ch12' },
          { text: '第十三章：Blazor WebAssembly UI 開發', link: '/content/ch13' }
        ]
      },
      {
        text: '第五部：微服務與模組化開發',
        items: [
          { text: '第十四章：微服務架構設計', link: '/content/ch14' },
          { text: '第十五章：模組化開發', link: '/content/ch15' }
        ]
      },
      {
        text: '第六部：多租戶與功能管理',
        items: [
          { text: '第十六章：多租戶架構', link: '/content/ch16' }
        ]
      },
      {
        text: '第七部：測試與自動化實踐',
        items: [
          { text: '第十七章：測試策略與自動化', link: '/content/ch17' }
        ]
      },
      {
        text: '第八部：效能優化與安全強化',
        items: [
          { text: '第十八章：效能優化', link: '/content/ch18' },
          { text: '第十九章：安全性與資料保護', link: '/content/ch19' }
        ]
      },
      {
        text: '第九部：UI 現代化與主題客製',
        items: [
          { text: '第二十章：Docker 容器化與部署', link: '/content/ch20' },
          { text: '第二十一章：LeptonX Lite 主題客製', link: '/content/ch21' }
        ]
      },
      {
        text: '第十部：部署、升級與遷移',
        items: [
          { text: '第二十二章：容器化與 Kubernetes 部署', link: '/content/ch22' },
          { text: '第二十三章：升級策略與遷移指引', link: '/content/ch23' }
        ]
      },
      {
        text: '第十一部：案例實踐與社群資源',
        items: [
          { text: '第二十四章：社群熱門開源模組整合', link: '/content/ch24' },
          { text: '第二十五章：完整案例實戰 - 電商 SaaS 系統', link: '/content/ch25' }
        ]
      },
      {
        text: '📝 習題解答',
        collapsed: true,
        items: [
          { text: '第一章解答', link: '/content/solutions/ch01-solutions' },
          { text: '第二章解答', link: '/content/solutions/ch02-solutions' },
          { text: '第三章解答', link: '/content/solutions/ch03-solutions' },
          { text: '第四章解答', link: '/content/solutions/ch04-solutions' },
          { text: '第五章解答', link: '/content/solutions/ch05-solutions' },
          { text: '第六章解答', link: '/content/solutions/ch06-solutions' },
          { text: '第七章解答', link: '/content/solutions/ch07-solutions' },
          { text: '第八章解答', link: '/content/solutions/ch08-solutions' },
          { text: '第九章解答', link: '/content/solutions/ch09-solutions' },
          { text: '第十章解答', link: '/content/solutions/ch10-solutions' },
          { text: '第十一章解答', link: '/content/solutions/ch11-solutions' },
          { text: '第十二章解答', link: '/content/solutions/ch12-solutions' },
          { text: '第十三章解答', link: '/content/solutions/ch13-solutions' },
          { text: '第十四章解答', link: '/content/solutions/ch14-solutions' },
          { text: '第十五章解答', link: '/content/solutions/ch15-solutions' },
          { text: '第十六章解答', link: '/content/solutions/ch16-solutions' },
          { text: '第十七章解答', link: '/content/solutions/ch17-solutions' },
          { text: '第十八章解答', link: '/content/solutions/ch18-solutions' },
          { text: '第十九章解答', link: '/content/solutions/ch19-solutions' },
          { text: '第二十章解答', link: '/content/solutions/ch20-solutions' },
          { text: '第二十一章解答', link: '/content/solutions/ch21-solutions' },
          { text: '第二十二章解答', link: '/content/solutions/ch22-solutions' },
          { text: '第二十三章解答', link: '/content/solutions/ch23-solutions' },
          { text: '第二十四章解答', link: '/content/solutions/ch24-solutions' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-repo' }
    ],
    
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 ABP Community Learning Kit'
    },

    search: {
      provider: 'local'
    }
  },
  mermaid: {
    // mermaidConfig: {
    //   securityLevel: 'loose',
    // }
  }
}))
