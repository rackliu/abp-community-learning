---
title: "ABP Framework 開源社群版 - 全書術語表"
date: "2025-11-19"
---

# 全書術語表

本術語表列舉教材中 50+ 個關鍵技術與概念術語，按首字母分類。

---

## A

**Aggregate / Aggregation Root（聚合 / 聚合根）**

- 領域驅動設計中的概念，表示一組相關物件的集合，以單一實體（聚合根）為入口
- 示例：Order（聚合根）包含 OrderLines（子集合）
- 用途：確保業務規則一致性與交易邊界

**AOP（面向切面編程）**

- 通過分離橫切關注點（日誌、授權、緩存）簡化代碼
- 在 ABP 中通過 Interceptors 實現

**API Gateway（API 網關）**

- 微服務架構中的單一入口，負責路由、認證、限流
- ABP 推薦使用 YARP（Yet Another Reverse Proxy）

**ASP.NET Core**

- Microsoft 的跨平台、高性能 Web 框架
- ABP Framework 的基礎

**Authentication（認證）**

- 確認使用者身份的過程
- 示例：使用者名稱/密碼、OAuth、JWT

**Authorization（授權）**

- 決定已認證使用者是否可執行特定操作
- 在 ABP 中通過 Permission 實現

---

## B

**Bounded Context（邊界上下文）**

- DDD 中定義清晰業務邊界的概念
- 每個 Bounded Context 有獨立的 Ubiquitous Language（通用語言）

**Blazor（WebAssembly UI 框架）**

- .NET 的前端框架，支援 Server 和 WebAssembly 模式
- ABP 社群版支援

---

## C

**Cache / Caching（快取 / 快取策略）**

- 將常用數據存儲在快速存儲中減少資料庫查詢
- 三層快取：Memory Cache → Distributed Cache（Redis） → Database

**Circuit Breaker（斷路器）**

- 防止級聯故障的模式，在服務故障時快速失敗
- 由 Polly 庫實現

**CQRS（命令查詢職責分離）**

- 分離讀（Query）與寫（Command）操作，優化效能
- 常與 Event Sourcing 結合

**Continuous Integration / Continuous Deployment（CI/CD）**

- 自動化建置、測試、部署流程
- ABP 推薦使用 GitHub Actions、Azure DevOps

---

## D

**Data Protection（資料保護）**

- 使用 ASP.NET Core DataProtection API 加密敏感資料
- 支援跨平台密鑰管理

**DDD（Domain Driven Design / 領域驅動設計）**

- 以業務領域為中心的軟體設計方法
- 核心概念：Aggregate、Entity、Value Object、Domain Event

**DbContext（數據庫上下文）**

- Entity Framework Core 的核心類別，代表資料庫連線與工作單元
- ABP 基於 DbContext 提供 Repository

**Dependency Injection（依賴注入）**

- 將物件依賴通過建構函數或屬性注入而非創建
- 提高可測試性與代碼解耦

**DTO（Data Transfer Object / 數據傳輸物件）**

- 用於應用層與 API 間傳輸數據的物件
- 區分 CreateDto、UpdateDto、DisplayDto

---

## E

**Entity（實體）**

- DDD 中具有唯一標識且可變的物件
- 示例：User、Order、Book

**Event Bus（事件總線）**

- 用於發佈與訂閱事件的中介
- ABP 支援 Local Event Bus（進程內）與 Distributed Event Bus（跨服務）

**Event Sourcing（事件溯源）**

- 將所有狀態變化記錄為事件序列
- 支援完整審計追蹤與時間旅行

---

## F

**Feature Management（功能管理）**

- 通過特性開關控制租戶級別的功能啟用/禁用
- ABP 內建支援

**Feature Toggle（功能開關）**

- 在不重新部署代碼的情況下動態啟用/禁用功能
- 用於 A/B 測試、漸進推出

---

## G

**GDPR（General Data Protection Regulation / 一般資料保護規則）**

- 歐盟資料保護法規
- 要求資料最小化、使用者同意、資料刪除權

**gRPC（Google Remote Procedure Call）**

- 高效能的內部服務通訊協議（基於 HTTP/2、Protocol Buffers）
- ABP 微服務中的推薦選項

---

## H

**Health Check（健康檢查）**

- 定期檢查服務是否正常運行
- Kubernetes 使用 liveness 和 readiness probe

**Helm（Kubernetes 包管理器）**

- 用於定義、安裝、升級 Kubernetes 應用
- 提供範本化、版本管理、參數化部署

---

## I

**Interceptor（攔截器）**

- 在方法執行前後插入邏輯
- 用於日誌、異常處理、授權檢查

**Integration Service（整合服務）**

- 協調多個 Aggregate 或 Microservice 的服務
- 通常使用 Saga Pattern 或 Event-driven 模式

**IoC Container（控制反轉容器）**

- 管理物件生命週期與依賴注入的容器
- ABP 使用 Autofac

---

## J

**JWT（JSON Web Token）**

- 無狀態認證令牌格式
- 包含 Header、Payload、Signature

---

## K

**Kubernetes（K8s）**

- 容器編排平台，自動化部署、伸縮、管理
- 關鍵概念：Pod、Service、Deployment、StatefulSet

---

## L

**Lazy Loading（延遲載入）**

- 訪問時才載入資料，減少初始化時間與記憶體
- EF Core 需顯式啟用

**LeptonX Lite**

- ABP 社群版提供的輕量主題
- 支援深色/淺色模式切換

---

## M

**Message Queue（訊息隊列）**

- 異步通訊基礎設施（如 RabbitMQ、Kafka）
- 實現事件驅動架構

**Microservice（微服務）**

- 小型、獨立部署的服務，通常對應單一業務能力
- 通訊通過 REST、gRPC 或 Message Bus

**Migration（資料庫遷移）**

- Entity Framework Core 的版本控制機制
- 記錄數據庫結構變化

**Module（模組）**

- ABP 的功能單位，包含 Domain、Application、Infrastructure 等層
- 透過 DependsOn 宣告相依性

**Multi-Tenancy（多租戶）**

- 單一應用服務多個租戶，各租戶資料隔離
- ABP 內建支援，社群版可用

---

## N

**N+1 Query Problem（N+1 查詢問題）**

- 初始查詢返回 N 筆資料，後續為每筆再查詢一次
- 解決：使用 Include / Select 投影

**NuGet**

- .NET 包管理工具與軟體源
- 用於發佈與安裝 .NET 庫

---

## O

**ORM（Object-Relational Mapping / 對象關係映射）**

- 將資料庫表映射為程式物件
- ABP 使用 Entity Framework Core

---

## P

**Permission（權限）**

- 定義使用者可執行的操作
- 例：Book.Create、Book.Edit、Book.Delete

**Polly（熔斷與重試庫）**

- 實現 Retry、Circuit Breaker、Timeout 等熔斷策略
- ABP 微服務推薦使用

**Pro（ABP 商業版）**

- ABP 的付費版本，包含額外功能
- 本教材專注社群版

---

## R

**React**

- Facebook 的前端框架，構建使用者介面
- ABP 前端支援選項之一

**Repository Pattern（資料庫儲存庫模式）**

- 抽象資料存取層，屏蔽具體實現
- ABP 內建 IRepository 介面

**REST（Representational State Transfer）**

- Web API 架構風格，使用 HTTP 方法（GET、POST、PUT、DELETE）
- ABP 自動生成 RESTful API

---

## S

**SaaS（Software as a Service / 軟體即服務）**

- 通過網路提供軟體服務的模式
- 通常基於多租戶架構

**Saga Pattern（Saga 模式）**

- 跨多個服務的分散式交易管理模式
- 實現最終一致性

**Serilog**

- .NET 結構化日誌庫
- 支援 Console、Seq、File 等 Sink

**Service Locator（服務定位器）**

- 反模式：通過中央服務定位器查詢依賴
- 不建議使用，改用 Dependency Injection

---

## T

**Tenant / Tenancy（租戶 / 多租戶）**

- 多租戶系統中的客戶單位
- 每租戶可擁有獨立或共用資源

**Testcontainers（測試容器）**

- 為測試自動建立臨時容器（DB、MQ 等）
- 確保測試環境隔離與重現性

**TLD（Top-Level Domain）**

- 頂級域名

**Transaction（交易）**

- 資料庫一致性單位，ACID 特性
- ABP UoW 自動管理

---

## U

**Ubiquitous Language（通用語言）**

- DDD 中業務與技術團隊共同使用的術語集
- 消除溝通歧義

**UoW（Unit of Work / 工作單元）**

- 追蹤變化並統一提交的模式
- ABP DbContext 實現 UoW

---

## V

**Value Object（值物件）**

- DDD 中無獨立身份、不可變的物件
- 例：Address、Money、PhoneNumber

---

## W

**WebAssembly**

- 在瀏覽器執行的二進制格式
- Blazor WebAssembly 將 .NET 編譯為 WASM

---

## X

**XSS（Cross-Site Scripting / 跨站指令碼）**

- 安全漏洞，允許攻擊者執行惡意指令碼
- 防禦：輸入驗證、輸出編碼

---

## Y

**YARP（Yet Another Reverse Proxy）**

- Microsoft 的輕量級 API Gateway
- ABP 微服務推薦使用

---

## Z

**Zipkin（分散式追蹤）**

- 用於追蹤微服務間請求流的工具
- 與 Application Insights、Jaeger 競爭

---

## 按類別索引

### 架構與設計模式

- Aggregate / Aggregation Root
- Bounded Context
- DDD
- CQRS
- Saga Pattern
- Repository Pattern
- UoW

### 資料與持久化

- DbContext
- DTO
- Entity
- Migration
- ORM
- Transaction

### 開發與測試

- AOP
- Dependency Injection
- Interceptor
- Testcontainers
- Unit Test

### 微服務與分散式

- API Gateway
- gRPC
- Message Queue
- Microservice
- REST

### 前端與 UI

- Blazor
- React
- WebAssembly
- LeptonX Lite

### 效能與快取

- Cache
- Lazy Loading
- N+1 Query Problem

### 安全

- Authentication
- Authorization
- Data Protection
- GDPR
- XSS

### 部署與運維

- CI/CD
- Docker
- Health Check
- Helm
- Kubernetes

### 工具與框架

- ASP.NET Core
- Entity Framework Core
- NuGet
- Polly
- Serilog

---

## 相關章節查詢

| 術語               | 相關章節   |
| ------------------ | ---------- |
| Aggregate          | 9, 10, 25  |
| API Gateway        | 14, 15, 22 |
| Authorization      | 7, 19      |
| Cache              | 18         |
| Circuit Breaker    | 15, 18     |
| DTO                | 10, 11     |
| Feature Management | 16         |
| Kubernetes         | 22, 25     |
| Microservice       | 14, 15     |
| Multi-Tenancy      | 16         |
| React              | 20         |
| Repository         | 6, 11      |
| SaaS               | 16, 25     |
| Testing            | 17         |
| UoW                | 6          |

---

最後更新：2025-11-19
