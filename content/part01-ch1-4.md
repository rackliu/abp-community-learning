# 第一部：現代軟體開發與 ABP Framework（V9.3 社群版）

## 檔案說明
本檔為教材第一部（章 1–4）完整教學草稿，包含章節目標、先修需求、重點說明、實務案例、CLI 與程式碼範例、最佳實務與常見問題。內容以 ABP Framework v9.3 社群版為準，並可結合官方文件與 content7 指令範例進行驗證。

---

## 共通先修與工具
- .NET SDK 9.0 或更新
- Visual Studio 2022 或 VS Code + C#
- Git
- ABP CLI（Volo.Abp.Studio.Cli）
- SQL Server / SQLite / Docker（視案例而定）

### 安裝 ABP CLI 範例
```bash
# 安裝新版 CLI（Volo.Abp.Studio.Cli）
dotnet tool install -g Volo.Abp.Studio.Cli

# 檢查版本
abp --version

# 更新
dotnet tool update -g Volo.Abp.Studio.Cli
```

---

# 章節 1：現代軟體開發與 ABP Framework

## 學習目標
- 理解現代軟體開發趨勢：快速迭代、可擴展性、自動化、雲原生
- 了解 ABP 的架構理念、模組化與 DDD 支援
- 評估單層、分層、微服務的適用場景
- 區分社群版與商業版的功能差異

## 內容重點
1. 現代開發挑戰：CI/CD、可觀察性、彈性伸縮
2. ABP 是什麼：模組化、DDD 支援、自動 API、多租戶等核心能力
3. 架構選型指引：何時採用單層、分層或微服務
4. 社群生態與常用開源模組（EasyAbp 等）

## 實務案例（精要）
- 場景：小型內部系統 → 建議採單層或分層
- 場景：快速成長的 SaaS → 從分層開始，規劃微服務遷移路徑

## 常見問題（FAQ）
Q：社群版能否支援多租戶？  
A：可以，但部分高階 SaaS 管理功能屬於商業版，需要自行實作或使用社群模組替代。

---

# 章節 2：ABP Framework 快速入門

## 學習目標
- 安裝 ABP CLI 並建立第一個專案
- 了解預設專案結構與各層的職責
- 能啟動預設範例並進行基本修改與測試

## 快速建立專案範例
```bash
# 建立分層應用（範例 BookStore）
abp new BookStore -t app

# 建立微服務範本
abp new BookStore -t microservice

# 指定 UI 與 DB
abp new BookStore -t app -u mvc -d ef
```

## 專案結構（簡述）
- Domain：實體、聚合、領域服務
- Application：應用服務、DTO
- Infrastructure：DbContext、Repository 實作
- HttpApi：API 控制器
- Web：Razor Pages / UI

## 範例程式（建立实体與應用服務片段）
```csharp
// csharp
public class Book : FullAuditedAggregateRoot<Guid>
{
    public string Title { get; set; }
    public string Author { get; set; }

    public Book() { }

    public Book(Guid id, string title, string author) : base(id)
    {
        Title = title;
        Author = author;
    }
}
```

```csharp
// csharp
public class BookAppService : ApplicationService
{
    private readonly IRepository<Book, Guid> _repo;

    public BookAppService(IRepository<Book, Guid> repo) => _repo = repo;

    public async Task<BookDto> CreateAsync(CreateBookDto input)
    {
        var book = new Book(Guid.NewGuid(), input.Title, input.Author);
        await _repo.InsertAsync(book);
        return ObjectMapper.Map<Book, BookDto>(book);
    }
}
```

## 最佳實務
- 使用 Module 分隔責任，避免將過多邏輯放入單一層
- 透過 ABP 的 DI 與 UoW 管理交易邊界
- 儘早定義聚合邊界以降低後期重構成本

---

# 章節 3：實戰應用程式開發流程

## 學習目標
- 掌握從需求到交付的完整流程
- 能設計領域模型、定義聚合根與 API 端點
- 熟悉資料遷移、測試與部署流程

## 開發流程概要
1. 需求分析 → 識別業務域與聚合
2. 領域設計 → 建模聚合、值物件
3. 應用層實作 → DTO、AppService、授權
4. 基礎設施 → Repository、DbContext、遷移
5. 表現層 → API、UI
6. 測試 → 單元、整合、端對端
7. 部署與監控

## 範例：BookStore 最小可行產品（MVP）
- 核心功能：Book CRUD、作者管理、借閱流程
- 檢核清單：資料模型 → API → UI → 測試 → 部署

## 測試範例（單元測試）
```csharp
// csharp
public class BookTests
{
    [Fact]
    public void Borrow_ShouldChangeStatusToBorrowed()
    {
        var book = new Book(Guid.NewGuid(), "t", "a");
        book.Borrow();
        Assert.Equal(BookStatus.Borrowed, book.Status);
    }
}
```

## 常見錯誤情境與處理
- 問題：DbContext 註冊錯誤導致 DI 無法解析  
  建議：在 Module 的 ConfigureServices 中使用 AddAbpDbContext 並確認 ConnectionString 名稱一致。
- 問題：資料庫遷移未 applied  
  建議：執行 dotnet ef migrations add / dotnet ef database update 或使用 CLI 指令檢查。

---

# 章節 4：認識官方參考解決方案

## 學習目標
- 熟悉 ABP 官方範例與模板（Samples、Templates）
- 能選擇合適的參考解決方案作為啟動範本
- 理解 ABP Studio / CLI 在專案生成上的差異

## 重要資源
- 官方文件： https://docs.abp.io/en/abp/latest/
- 範例倉庫： https://github.com/abpframework/abp-samples
- 模板：Simple/Layered/Modular/Microservice

## 建議使用策略
- 教學或小型專案：使用 Simple 或 Layered 範本快速上手
- 企業或長期維運：從 Layered 或 Modular 開始，並在設計期明確界定模組邊界
- 微服務：先以分層/模組化為基礎，逐步抽取微服務以降低早期複雜度

---

## 補充：常見問題總結（本部份）
- 如何選擇資料庫？  
  依據團隊經驗與運維成本選擇（SQLite：快速原型；SQL Server / MySQL：生產環境）
- 是否要從一開始採用微服務？  
  建議從分層或模組化開始，待邊界穩定再逐步拆分微服務
- ABP 社群有哪些常用模組？  
  EasyAbp 提供多項實用模組，如 Cms、FileManagement、NotificationCenter 等

---

## 參考資料
- ABP 官方文件：https://docs.abp.io/en/abp/latest/
- ABP GitHub：https://github.com/abpframework/abp
- EasyAbp：https://www.easyabp.io
