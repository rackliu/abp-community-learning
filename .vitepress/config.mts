import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(defineConfig({
  title: "ABP Community Learning",
  description: "ABP Framework V9.3 開源社群版教學",
  lang: 'zh-TW',
  
  // 排除規劃文件和內部文件
  srcExclude: ['**/課程設計概要.md', '**/章節學習目標與先修需求.md', '**/圖表渲染說明.md', '**/part*.md'],
  
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
        text: '第一部分：基礎篇',
        items: [
          { text: '第一章：ABP Framework 簡介', link: '/content/ch01' },
          { text: '第二章：環境建置', link: '/content/ch02' },
          { text: '第三章：模組化系統', link: '/content/ch03' },
          { text: '第四章：DDD 基礎', link: '/content/ch04' },
          { text: '第五章：資料庫整合', link: '/content/ch05' }
        ]
      },
      {
        text: '第二部分：核心功能',
        items: [
          { text: '第六章：應用服務', link: '/content/ch06' },
          { text: '第七章：資料轉移物件 (DTO)', link: '/content/ch07' },
          { text: '第八章：依賴注入', link: '/content/ch08' },
          { text: '第九章：設定管理', link: '/content/ch09' },
          { text: '第十章：例外處理', link: '/content/ch10' }
        ]
      },
      {
        text: '第三部分：進階功能',
        items: [
          { text: '第十一章：多租戶架構', link: '/content/ch11' },
          { text: '第十二章：權限與授權', link: '/content/ch12' },
          { text: '第十三章：審計日誌', link: '/content/ch13' },
          { text: '第十四章：背景工作', link: '/content/ch14' },
          { text: '第十五章：事件匯流排', link: '/content/ch15' }
        ]
      },
      {
        text: '第四部分：UI 與前端',
        items: [
          { text: '第十六章：MVC UI 開發', link: '/content/ch16' },
          { text: '第十七章：Blazor UI 開發', link: '/content/ch17' },
          { text: '第十八章：Angular UI 開發', link: '/content/ch18' },
          { text: '第十九章：JavaScript API Client', link: '/content/ch19' }
        ]
      },
      {
        text: '第五部分：測試與部署',
        items: [
          { text: '第二十章：單元測試', link: '/content/ch20' },
          { text: '第二十一章：整合測試', link: '/content/ch21' },
          { text: '第二十二章：CI/CD 部署', link: '/content/ch22' },
          { text: '第二十三章：容器化部署', link: '/content/ch23' }
        ]
      },
      {
        text: '第六部分：實戰與總結',
        items: [
          { text: '第二十四章：效能優化', link: '/content/ch24' },
          { text: '第二十五章：完整案例實戰', link: '/content/ch25' }
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
