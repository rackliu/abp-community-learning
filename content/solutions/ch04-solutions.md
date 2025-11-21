# 第四章習題解答

## 習題 1：概念題 ⭐

**題目：ABP 官方提供哪三種主要範本？各適用什麼場景？**

### 解答

ABP Framework 提供三種主要範本：

#### 1. Simple（簡單範本）

- **適用場景**：教學、快速原型、單層應用
- **特點**：Domain、Application、Web 三層最小化組合
- **何時選用**：學習 ABP 基礎、小型專案（<100K LOC）

#### 2. Layered（分層範本）

- **適用場景**：中型企業應用、清晰層級分離需求
- **特點**：包含 Domain、Application、Infrastructure、HttpApi、Web 五層
- **何時選用**：生產環境、需要團隊協作、邊界清晰

#### 3. Modular（模組範本）

- **適用場景**：大型系統、多個獨立模組、長期維運
- **特點**：每個功能域為獨立 Module，支援 NuGet 發佈
- **何時選用**：複雜業務、多個功能獨立發展、內部生態建構

#### 4. Microservice（微服務範本）

- **適用場景**：分散式系統、團隊規模大、獨立部署需求
- **特點**：包含 Gateway、多個服務實例、分散式事件總線
- **何時選用**：複雜度高、技術多樣性、DevOps 成熟

### 選型決策樹

```
開始
  ├─ 學習或原型?
  │  └─ YES → Simple
  │
  ├─ 邊界清晰、團隊 2–10 人?
  │  └─ YES → Layered
  │
  ├─ 多個獨立功能模組?
  │  └─ YES → Modular
  │
  └─ 需要獨立部署、微服務?
     └─ YES → Microservice
```

---

## 習題 2：概念題 ⭐

**題目：說明 ABP CLI 與 ABP Studio 在專案生成上的差異。**

### 解答

| 特性           | ABP CLI                                      | ABP Studio                    |
| -------------- | -------------------------------------------- | ----------------------------- |
| **安裝方式**   | `dotnet tool install -g Volo.Abp.Studio.Cli` | Visual Studio 擴充 / 獨立 IDE |
| **介面**       | 命令行                                       | GUI 圖形介面                  |
| **模板豐富度** | 基礎範本                                     | 更多預設模板                  |
| **依賴管理**   | 手動管理                                     | 自動化管理                    |
| **社群版可用** | ✅                                           | ✅（部分功能限制）            |
| **學習曲線**   | 需熟悉命令                                   | 直觀友好                      |

### CLI 常用指令

```bash
# 建立分層應用
abp new MyApp -t app -u mvc -d ef

# 建立微服務
abp new MyApp -t microservice

# 建立模組
abp new MyModule -t module

# 檢查版本
abp --version
```

### 推薦使用策略

- **CLI**：適合自動化、CI/CD、命令行工作流
- **Studio**：適合 Visual Studio 用戶、團隊協作、可視化管理

---

## 習題 3：計算/練習題 ⭐⭐

**題目：對比 Simple、Layered、Modular 三個範本的專案結構，列舉各層的職責。**

### 解答

#### Simple 範本結構

```
SimpleApp/
├── src/
│   ├── SimpleApp.Domain/          # 領域層（Entity、ValueObject、Service）
│   ├── SimpleApp.Application/     # 應用層（AppService、DTO）
│   └── SimpleApp.Web/             # Web 層（Controller、Page、wwwroot）
├── test/
│   └── SimpleApp.Tests/           # 單位/整合測試
└── SimpleApp.sln
```

**特點**：直線依賴 Domain ← Application ← Web，簡潔

#### Layered 範本結構

```
LayeredApp/
├── src/
│   ├── LayeredApp.Domain/         # 領域層
│   ├── LayeredApp.Application/    # 應用層
│   ├── LayeredApp.EntityFrameworkCore/ # EF Core 實作
│   ├── LayeredApp.HttpApi/        # API 控制器
│   └── LayeredApp.Web/            # Web UI（Razor、Blazor）
├── test/
│   ├── LayeredApp.Tests/
│   └── LayeredApp.Application.Tests/
└── LayeredApp.sln
```

**特點**：清晰分離，Infrastructure 層獨立，支援多 UI

#### Modular 範本結構

```
ModularApp/
├── modules/
│   ├── ModuleA/
│   │   ├── ModuleA.Domain/
│   │   ├── ModuleA.Application/
│   │   ├── ModuleA.HttpApi/
│   │   └── ModuleA.EntityFrameworkCore/
│   └── ModuleB/
│       └── [同上]
├── shared/
│   └── ModularApp.Shared/
├── gateways/
│   └── ModularApp.Gateway/
└── ModularApp.sln
```

**特點**：高度模組化，每個模組獨立，利於微服務遷移

#### 各層職責對照表

| 層級               | 職責                                                         | Simple | Layered | Modular |
| ------------------ | ------------------------------------------------------------ | ------ | ------- | ------- |
| **Domain**         | Entity、Aggregate、ValueObject、Domain Event、Domain Service | ✓      | ✓       | ✓       |
| **Application**    | AppService、DTO、DTO Mapping                                 | ✓      | ✓       | ✓       |
| **Infrastructure** | DbContext、Repository、外部服務整合                          | Web 層 | ✓       | ✓       |
| **HttpApi**        | 自動生成 API Controller                                      | 無     | ✓       | ✓       |
| **Web**            | UI（Razor、Blazor）                                          | ✓      | ✓       | ✓       |

---

## 習題 4：計算/練習題 ⭐⭐

**題目：為 "圖書管理系統" 選擇合適的範本，並解釋理由。給定：**

- 預期 10 人開發團隊
- 需支援 Web、Mobile API、後台管理
- 計畫長期維運，可能後期拆分微服務

### 解答

#### 最佳選擇：**Layered 範本**（短期）+ **Modular 規劃**（中期）

#### 理由分析

1. **Layered 作為基礎**

   - 10 人團隊適合分層結構（UI 組、服務組、DB 組）
   - 清晰的邊界減少衝突
   - 支援多個 UI（Web、Mobile API）

2. **為未來微服務預留通道**
   - Layered → Modular → Microservice 的漸進路線
   - 先用 Modular 組織功能塊，降低後期遷移成本

#### 初期架構設計

```
BookStoreApp/
├── src/
│   ├── BookStore.Domain/              # 領域層
│   │   ├── Books/
│   │   ├── Users/
│   │   ├── Borrowings/
│   │   └── Shared/
│   │
│   ├── BookStore.Application/         # 應用層
│   │   ├── Books/
│   │   │   ├── Dtos/
│   │   │   └── BookAppService.cs
│   │   ├── Users/
│   │   └── Borrowings/
│   │
│   ├── BookStore.EntityFrameworkCore/ # EF Core
│   │   ├── DbContext/
│   │   └── Repositories/
│   │
│   ├── BookStore.HttpApi/             # REST API
│   │   ├── Controllers/
│   │   └── [Auto-generated APIs]
│   │
│   └── BookStore.Web/                 # Web UI + Mobile API
│       ├── Pages/
│       └── Api/MobileControllers/
│
└── test/
    ├── BookStore.Domain.Tests/
    ├── BookStore.Application.Tests/
    └── BookStore.HttpApi.Tests/
```

#### 中期模組化遷移計畫

```yaml
Phase 1 (現在): Layered 單體
Phase 2 (6月): 按功能拆分模組（Book Module、User Module、Borrowing Module）
Phase 3 (12月): Microservice（若業務增長需要）
  - BookService
  - UserService
  - BorrowingService
  - Gateway
```

#### 立即行動清單

```bash
# 1. 建立初始專案
abp new BookStoreApp -t app -u mvc -d ef

# 2. 按功能組織程式碼
# 在 Application 層建立 Books/、Users/、Borrowings/ 資料夾

# 3. 定義模組依賴（便於後期拆分）
# BookModule → SharedModule ← UserModule ← BorrowingModule

# 4. 預留 Integration Service 接口（微服務遷移時用）
```

---

## 習題 5：實作/編碼題 ⭐⭐⭐

**題目：從 ABP 官方 samples 倉庫克隆 BookStore 示例，進行以下操作：**

1. 理解專案結構
2. 運行資料庫遷移
3. 啟動應用並驗證默認功能
4. 在 Swagger UI 測試 API

### 解答

#### 步驟 1：克隆與設定

```bash
# 克隆官方示例
git clone https://github.com/abpframework/abp-samples.git
cd abp-samples/BookStore
```

#### 步驟 2：分析專案結構

```powershell
# 開啟解決方案
cd src
dir  # 查看各層專案

# 預期輸出：
# BookStore.Application/
# BookStore.Domain/
# BookStore.EntityFrameworkCore/
# BookStore.HttpApi/
# BookStore.HttpApi.Client/
# BookStore.Web/
# etc/
```

#### 步驟 3：資料庫遷移

```bash
# 還原依賴
dotnet restore

# 應用遷移（確保 appsettings.json 中 ConnectionString 正確）
cd BookStore.DbMigrator
dotnet run

# 或手動遷移
cd BookStore.EntityFrameworkCore
dotnet ef database update
```

#### 步驟 4：啟動應用

```bash
# 設定 HttpApi 專案為啟動專案
cd ..\BookStore.HttpApi.Host

# 執行
dotnet run

# 輸出：
# info: Microsoft.Hosting.Lifetime[14]
#       Now listening on: http://localhost:5000
```

#### 步驟 5：Swagger 測試

1. 開啟瀏覽器 → `http://localhost:5000/swagger`
2. 展開 "Books" API 組
3. 點擊 "GET /api/app/books" → "Try it out"
4. 點擊 "Execute"

#### 預期結果

```json
{
  "items": [
    {
      "id": "...",
      "name": "Sample Book",
      "author": "...",
      "type": 0,
      "publishDate": "...",
      "price": 0.0,
      "creationTime": "...",
      "creatorId": "..."
    }
  ],
  "totalCount": 1
}
```

#### 深入探索

```bash
# 查看 Entity 定義
code src/BookStore.Domain/Books/Book.cs

# 查看 AppService
code src/BookStore.Application/Books/BookAppService.cs

# 查看 DbContext 配置
code src/BookStore.EntityFrameworkCore/EntityFrameworkCore/BookStoreDbContext.cs

# 查看 API Controller（自動生成）
code src/BookStore.HttpApi/Controllers/BooksController.cs
```

---

## 習題 6：實作/編碼題 ⭐⭐⭐

**題目：基於官方 BookStore 示例，添加新功能：**

1. **新增 Genre 實體**（書籍分類）
2. **Book 與 Genre 建立多對一關係**
3. **在 BookAppService 增加 GetByGenreAsync 方法**
4. **撰寫整合測試驗證**

### 解答

#### 步驟 1：定義 Genre 實體

```csharp
// src/BookStore.Domain/Books/Genre.cs
using Volo.Abp.Domain.Entities;

public class Genre : AggregateRoot<Guid>
{
    public string Name { get; set; }
    public string Description { get; set; }

    public Genre() { }

    public Genre(Guid id, string name, string description = "") : base(id)
    {
        Name = name;
        Description = description;
    }
}
```

#### 步驟 2：修改 Book 實體

```csharp
// src/BookStore.Domain/Books/Book.cs
public class Book : AuditedAggregateRoot<Guid>
{
    public string Name { get; set; }
    public string Author { get; set; }
    public BookType Type { get; set; }
    public DateTime PublishDate { get; set; }
    public float Price { get; set; }

    // 新增字段
    public Guid GenreId { get; set; }

    public Book() { }

    public Book(
        Guid id,
        string name,
        string author,
        BookType type,
        DateTime publishDate,
        float price,
        Guid genreId) : base(id)
    {
        Name = name;
        Author = author;
        Type = type;
        PublishDate = publishDate;
        Price = price;
        GenreId = genreId;
    }
}
```

#### 步驟 3：更新 DbContext

```csharp
// src/BookStore.EntityFrameworkCore/EntityFrameworkCore/BookStoreDbContext.cs
public class BookStoreDbContext : AbpDbContext<BookStoreDbContext>
{
    public DbSet<Book> Books { get; set; }
    public DbSet<Genre> Genres { get; set; } // 新增

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Genre>(b =>
        {
            b.ToTable("Genres");
            b.HasKey(x => x.Id);
            b.Property(x => x.Name).IsRequired().HasMaxLength(256);
        });

        builder.Entity<Book>(b =>
        {
            // 現有配置...

            // 新增外鍵
            b.HasOne<Genre>()
                .WithMany()
                .HasForeignKey(x => x.GenreId)
                .IsRequired();
        });
    }
}
```

#### 步驟 4：建立遷移

```bash
cd src/BookStore.EntityFrameworkCore
dotnet ef migrations add AddGenreToBook
dotnet ef database update
```

#### 步驟 5：建立 GenreDto 和 AppService

```csharp
// src/BookStore.Application/Books/Dtos/GenreDto.cs
public class GenreDto : EntityDto<Guid>
{
    public string Name { get; set; }
    public string Description { get; set; }
}

// src/BookStore.Application/Books/Dtos/CreateGenreDto.cs
public class CreateGenreDto
{
    [Required]
    public string Name { get; set; }
    public string Description { get; set; }
}

// src/BookStore.Application/Books/GenreAppService.cs
public class GenreAppService : ApplicationService
{
    private readonly IRepository<Genre, Guid> _repository;

    public GenreAppService(IRepository<Genre, Guid> repository)
    {
        _repository = repository;
    }

    public async Task<GenreDto> CreateAsync(CreateGenreDto input)
    {
        var genre = new Genre(Guid.NewGuid(), input.Name, input.Description);
        await _repository.InsertAsync(genre);
        return ObjectMapper.Map<Genre, GenreDto>(genre);
    }

    public async Task<List<GenreDto>> GetAllAsync()
    {
        var genres = await _repository.GetListAsync();
        return ObjectMapper.Map<List<Genre>, List<GenreDto>>(genres);
    }
}
```

#### 步驟 6：擴充 BookAppService

```csharp
// 在 BookAppService 增加
public async Task<List<BookDto>> GetByGenreAsync(Guid genreId)
{
    var books = await (await _bookRepository.GetQueryableAsync())
        .Where(b => b.GenreId == genreId)
        .ToListAsync();

    return ObjectMapper.Map<List<Book>, List<BookDto>>(books);
}
```

#### 步驟 7：整合測試

```csharp
// test/BookStore.Application.Tests/Books/GenreAppServiceTests.cs
public class GenreAppServiceTests : BookStoreApplicationTestBase
{
    private readonly GenreAppService _genreAppService;
    private readonly BookAppService _bookAppService;
    private readonly IRepository<Genre, Guid> _genreRepository;

    public GenreAppServiceTests()
    {
        _genreAppService = GetRequiredService<GenreAppService>();
        _bookAppService = GetRequiredService<BookAppService>();
        _genreRepository = GetRequiredService<IRepository<Genre, Guid>>();
    }

    [Fact]
    public async Task CreateGenre_ShouldWork()
    {
        var input = new CreateGenreDto { Name = "Fiction", Description = "小說" };
        var result = await _genreAppService.CreateAsync(input);

        Assert.NotNull(result);
        Assert.Equal("Fiction", result.Name);
    }

    [Fact]
    public async Task GetByGenre_ShouldReturnBooks()
    {
        // 建立 Genre
        var genre = await _genreRepository.InsertAsync(
            new Genre(Guid.NewGuid(), "Mystery", ""));

        // 建立 Book
        var bookInput = new CreateBookDto
        {
            Name = "Sherlock Holmes",
            Author = "Arthur Conan Doyle",
            GenreId = genre.Id,
            PublishDate = DateTime.Now,
            Price = 30.0f
        };
        await _bookAppService.CreateAsync(bookInput);

        // 查詢
        var books = await _bookAppService.GetByGenreAsync(genre.Id);

        Assert.Single(books);
        Assert.Equal("Sherlock Holmes", books[0].Name);
    }
}
```

---

## 參考資源

- [ABP 官方文檔 - Getting Started](https://docs.abp.io/en/abp/latest/Getting-Started)（content7）
- [ABP Samples 倉庫](https://github.com/abpframework/abp-samples)
- [ABP Studio 文檔](https://docs.abp.io/en/abp/latest/ABP-Studio/Index)
