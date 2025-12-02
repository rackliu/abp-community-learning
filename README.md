# ABP Framework 開源社群版學習教材

由於在學習 ABP Framework（開源社群版）時缺乏一份完整且系統化的教學文件，因此本專案嘗試以 AI 協作方式打造一套自學教材。本教材涵蓋 入門、進階、實戰 三大層級，並以官方書籍 Mastering ABP Framework 的章節架構為參考，旨在提供初學者與開發者一份結構清晰、內容完整的 ABP Framework 學習資源。

### 入門套件（Foundation）- 20-30 小時

- [Ch1 現代軟體開發與 ABP Framework](./content/ch01.md)
- [Ch2 ABP Framework 快速入門](./content/ch02.md)
- [Ch3 實戰應用程式開發流程](./content/ch03.md)
- [Ch4 認識官方參考解決方案](./content/ch04.md)

### 進階套件（Advanced）- 40-60 小時

- [Ch5 ASP.NET Core 與 ABP 架構深入解析](./content/ch05.md)
- [Ch6 資料存取基礎設施](./content/ch06.md)
- [Ch7 橫切關注 (Cross-Cutting Concerns)](./content/ch07.md)
- [Ch8 開源特色與服務功能](./content/ch08.md)
- [Ch9 領域驅動設計理論（DDD）](./content/ch09.md)
- [Ch10 領域層實作](./content/ch10.md)
- [Ch11 應用層設計](./content/ch11.md)

### 實戰套件（Practical）- 40-80 小時

- [Ch12 MVC/Razor Pages 前端開發](./content/ch12.md)
- [Ch13 Blazor WebAssembly UI](./content/ch13.md)
- [Ch14 微服務架構設計](./content/ch14.md)
- [Ch15 模組化開發進階](./content/ch15.md)
- [Ch16 多租戶系統](./content/ch16.md)
- [Ch17 ABP 測試架構介紹](./content/ch17.md)
- [Ch18 快取策略與效能優化](./content/ch18.md)
- [Ch19 安全授權與資料保護](./content/ch19.md)
- [Ch20 Docker 容器化與部署](./content/ch20.md)
- [Ch21 LeptonX Lite 主題客製](./content/ch21.md)
- [Ch22 容器化與 Kubernetes 部署](./content/ch22.md)
- [Ch23 ABP 版本升級策略](./content/ch23.md)
- [Ch24 社群熱門開源模組整合](./content/ch24.md)
- [Ch25 完整案例實戰 - 電商 SaaS 系統](./content/ch25.md)

## 🚀 快速開始

### 前置需求

- .NET SDK 10.0 LTS 或更新版本（推薦）
- Visual Studio 2022 或 VS Code
- Git
- Node.js 18.0+（前端開發）

### 安裝 ABP CLI

```bash
dotnet tool install -g Volo.Abp.Studio.Cli
```

### 建立第一個專案

```bash
md BookStore
cd BookStore
abp new BookStore -t app
cd src\BookStore.Web
dotnet run
```

### 瀏覽教材

1. 選擇適合的學習路徑（入門/進階/實戰）
2. 按章節順序學習
3. 完成每章的練習題
4. 參考 `/examples` 目錄中的範例程式碼

## 📁 專案結構

```
.
├── content/                       # 教案文件
│   ├── ch01.md - ch25.md          # 25 個章節教案（已完成）
│   └── solutions/                 # 習題參考解答
│       ├── ch01-solutions.md      # 第一章解答
│       ├── ch02-solutions.md      # 第二章解答
│       ├── ...                    # 第三章至第二十三章解答
│       └── ch24-solutions.md      # 第二十四章解答（共 24 個解答文件）
├── .github/                       # GitHub 配置
├── abp-community-learning-TOC.md # 章節大綱
├── CONTRIBUTING.md                # 貢獻指南
├── LICENSE                        # MIT 授權
└── README.md                      # 本檔案
```

## 📖 使用指南

### 學習路徑

#### 入門路徑（適合初學者）

1. 完成 Ch1–Ch4（20-30 小時）
2. 執行 `/examples/starter` 中的範例
3. 完成入門套件的練習題

#### 進階路徑（適合有基礎的開發者）

1. 完成入門路徑
2. 完成 Ch5–Ch11（40-60 小時）
3. 執行 `/examples/modules` 中的範例
4. 完成進階套件的練習題

#### 實戰路徑（適合企業開發者）

1. 完成進階路徑
2. 完成 Ch12–Ch25（40-80 小時）
3. 執行 `/examples/microservices` 中的範例
4. 完成實戰套件的練習題

### 練習與評量

每章包含完整的習題（ch01-ch24，共 24 章）：

- **概念題（易）⭐**：基礎概念理解與說明
- **計算/練習題（中）💻**：實務設計與分析
- **實作/編碼題（較難）🚀**：完整的程式實作與測試

所有習題的詳細解答位於 `content/solutions/` 目錄：

- 每個解答文件包含完整的步驟說明、程式碼範例和理論依據
- 所有程式碼範例符合 ABP Framework V10.0 最佳實踐
- 使用繁體中文撰寫，包含詳細的註解和說明

### 學習資源

本教材提供：

- **完整的章節內容**：25 個章節涵蓋從入門到進階的所有主題
- **詳細的習題解答**：24 個章節的完整解答，包含程式碼範例和理論說明
- **實戰導向**：每章都包含實際可執行的程式碼範例
- **最佳實踐**：所有範例都遵循 ABP Framework V10.0 的最佳實踐

學習建議：

1. 按照章節順序學習
2. 完成每章的習題
3. 參考解答文件驗證理解
4. 實際動手建立專案練習

## 🔧 工具與技術棧

### 後端

- ASP.NET Core 8.0 LTS（推薦）
- ABP Framework 9.3.x（最新開源社群版）
- Entity Framework Core 8.0
- SQL Server / SQLite / MySQL / PostgreSQL

### 前端

- Razor Pages / MVC
- Blazor WebAssembly
- React（可選）
- Bootstrap / Tailwind CSS

### 開發工具

- Visual Studio 2022
- VS Code
- Git
- Docker

### 測試

- xUnit / MSTest
- Moq
- Testcontainers

## 📝 版本與相容性

| 元件          | 版本          | 備註           |
| ------------- | ------------- | -------------- |
| ABP Framework | 9.3.x         | 最新開源社群版 |
| .NET          | 8.0 LTS / 9.0 | 推薦 8.0 LTS   |
| Node.js       | 18.0+         | 前端開發       |
| SQL Server    | 2019+         | 可選           |
| Docker        | 20.10+        | 容器化         |

## 🤝 貢獻指南

歡迎提交 Issue 與 Pull Request！

### 貢獻方式

1. Fork 本倉庫
2. 建立功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'Add amazing feature'`)
4. 推送至分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

### 貢獻類型

- 📝 文件改進與翻譯
- 💻 程式碼範例與改進
- 🐛 錯誤報告與修復
- 💡 功能建議與討論
- ✅ 測試與驗證

詳見 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 📚 延伸資源

### 官方資源

- [ABP 官方文件](https://docs.abp.io)
- [ABP GitHub 倉庫](https://github.com/abpframework/abp)
- [ABP 官方範例](https://github.com/abpframework/abp-samples)
- [ABP 社群論壇](https://github.com/abpframework/abp/discussions)

### 社群資源

- [EasyAbp 官方網站](https://www.easyabp.io)
- [EasyAbp GitHub 組織](https://github.com/EasyAbp)
- [Stack Overflow - ABP](https://stackoverflow.com/questions/tagged/abp)

### 相關技術

- [ASP.NET Core 文件](https://docs.microsoft.com/en-us/aspnet/core/)
- [Entity Framework Core 文件](https://docs.microsoft.com/en-us/ef/core/)
- [DDD 社群](https://www.domainlanguage.com/ddd/)

## 📄 授權

本教材採用 MIT 授權。詳見 [LICENSE](./LICENSE)。

## 🙏 致謝

🤖 AI 輔助生成聲明

本教材由 AI 模型協助設計與製作。

生成時間：2025 年 11 月 20 日
AI 模型：Google Gemini 3.0 Pro、Claude Sonnet 4.5、Claude Haiku 4.5、GPT5Mini
開發環境：Google Antigravity、Github Copilot、Kilo Code
內容涵蓋：25 個章節教案 + 24 個章節習題解答

感謝 ABP Framework 社群與所有貢獻者的支持與協助。

## 📞 聯絡方式

- 提交 Issue：https://github.com/abpframework/abp/issues
- 社群論壇：https://github.com/abpframework/abp/discussions
- 官方文件：https://docs.abp.io

---

**最後更新**：2025 年 11 月 20 日

**版本**：1.0.0

**狀態**：✅ 已完成

- ✅ 25 個章節教案（ch01-ch25）
- ✅ 24 個章節習題解答（ch01-ch24）
- ✅ 所有習題與解答完美匹配
- ✅ 基於 ABP Framework V10.0
- ✅ 繁體中文撰寫

**教材特色**：

- 📚 從入門到進階的完整學習路徑（100+ 小時）
- 💻 涵蓋 DDD、微服務、測試、部署等核心主題
- 🎯 豐富的實作練習和詳細解答
- 🚀 符合 ABP Framework 最新版本的最佳實踐
- 🌏 完整的繁體中文教學資源
