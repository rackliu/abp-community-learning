# abp-community-learning-TOC

## 第一部：現代軟體開發與 ABP Framework 介紹

1.  現代軟體開發與 ABP Framework
    - 架構理念
    - 開源工具組生態
2.  ABP Framework 快速入門
    - 建立新專案（CLI 工具/Visual Studio 方案）
    - 社群版架構選型（單層 vs 分層 vs 微服務）
3.  實戰應用程式開發流程
    - 示例專案流程圖
    - 適用於開源版的步驟細節
4.  認識官方參考解決方案

---

## 第二部：ABP Framework 基礎建設

5.  ASP.NET Core 與 ABP 架構深入解析
    - Startup/Module/依賴注入
    - 開源模組管理與擴充
6.  資料存取基礎設施
    - Entity/Repository/UoW 模式
    - EF Core & MongoDB 開源整合
    - 多資料庫支持
7.  橫切關注 (Cross-Cutting Concerns)
    - 權限管理（Permission）
    - 驗證與例外處理
    - 日誌記錄與審核追蹤
8.  開源特色與服務功能
    - 使用者管理
    - 自動 API、資料篩選、快取
    - 本地化與多語言
    - 開源 Community Packages (EasyAbp...)

---

## 第三部：領域驅動設計（DDD）實踐

9.  領域驅動設計理論（DDD）
    - 策略分層、聚合、實體建模
10. 領域層實作
    - 聚合根、領域事件
    - 商業邏輯實踐
11. 應用層設計
    - DTO 設計、服務與授權
    - 資料對映方案與開源框架（如 Mapster）

---

## 第四部：使用者介面與 API 開發

12. MVC/Razor Pages 前端開發
    - 主題/資源/TagHelper/分頁設計
    - Bundling/Minification/NPM 開源包管理
    - 表單/清單/功能操作區
    - 動態代理、靜態代理與 JavaScript API
13. Blazor WebAssembly UI（僅開源功能）
    - 基本架構、組件設計
    - Blazor Server/WebAssembly 分析（不含 Pro/商業專屬組件）

---

## 第五部：微服務與模組化開發

14. 微服務架構設計
    - 微服務方案建立、範本選用
    - 整合通訊（Integration Service 詳細教學）
    - API Gateway（YARP 開源設定）
15. 模組化開發進階
    - 應用模組結構（Application Module）
    - 套件化與自訂模組發佈（NuGet/開源）

---

## 第六部：多租戶與功能管理

16. 多租戶系統（社群版級）
    - 基礎多租戶配置
    - 租戶資料隔離與切換
    - 基礎功能系統（Feature Management）

---

## 第七部：測試與自動化實踐

17. ABP 測試架構介紹
    - 單元/集成測試
    - 開源測試基礎設施

---

## 第八部：效能優化與安全強化

18. 快取策略與效能優化
    - Redis 快取
    - 查詢最佳化與 N+1 問題
19. 安全授權與資料保護
    - 權限管理
    - 資料加密/隱私設定
    - 依據 GDPR 實踐（如有開源範例）

---

## 第九部：UI 現代化與主題客製

20. React 基礎 UI 開發
    - React 開源主題使用
    - 組件設計、模組聯邦介紹（不含 Pro 商業主題 LeptonX PRO）
21. LeptonX Lite 主題（僅限社群版）
    - 基礎自訂/調校教學
    - 深色/淺色模式配置

---

## 第十部：部署、升級與遷移

22. 容器化與 Kubernetes 部署
    - Docker/Helm 應用
    - CI/CD 基礎自動化腳本
23. 升級策略與遷移指引
    - 開源版本升級步驟
    - ASP.NET Boilerplate 舊專案遷移至 ABP Framework

---

## 第十一部：案例實踐與社群資源

24. 社群熱門開源模組整合
    - EasyAbp 常用模組教學
    - 社群資源（GitHub/Marketplace）
25. 完整專案架構範例與教學
    - 企業、ERP、SaaS 解決方案設計（僅限開源支援）
    - 各章實作教學連結

---

# 補充說明

- 全章授課皆以「ABP Framework Open Source 社群版」為基準，排除 Pro/商業模組（如 ABP Suite, 高階 SaaS, 高級 CMS, LeptonX PRO, 代理委派等）。
- 所有進階功能或範例，皆以社群開源可取得內容與技術為主。
- 每章可對應社群版官方教材、EasyAbp 模組或 GitHub 專案，輔助擴充教學。
