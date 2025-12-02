# 第二章習題解答

## 概念題（易）

### Q1. ABP 預設專案包含哪些層級？各層的職責為何？

**解答：**

ABP 預設分層應用包含以下層級：

1. **Domain 層（領域層）**

   - 職責：定義核心業務邏輯、聚合根、值物件、領域服務
   - 示例：Book 聚合根、訂單狀態轉換邏輯
   - 特點：不依賴外部框架，可獨立單元測試

2. **Application 層（應用層）**

   - 職責：協調業務流程、DTO 轉換、應用服務實作
   - 示例：BookAppService、授權檢查
   - 特點：面向客戶端（UI/API），提供用例

3. **Infrastructure 層（基礎設施層）**

   - 職責：資料庫存取、EF Core DbContext、Repository 實作、外部服務集成
   - 示例：BookRepository、數據遷移、第三方 API 呼叫
   - 特點：技術細節隔離

4. **HttpApi 層（HTTP API 層）**

   - 職責：公開 API 端點、路由配置、自動代理生成
   - 示例：自動生成的 BookController
   - 特點：ABP 自動產生，無需手動編寫

5. **Web 層（表現層）**
   - 職責：Razor Pages、Blazor 組件、React 前端
   - 示例：Book 列表頁、編輯表單
   - 特點：展示與使用者互動

### Q2. Repository 模式的優勢是什麼？

**解答：**

Repository 模式提供以下優勢：

1. **數據存取抽象**

   - 上層代碼無需知道具體數據庫實現
   - 可輕易替換數據存儲（SQL → NoSQL）

2. **單元測試友善**

   - 可使用 Mock Repository 進行測試
   - 無需實際數據庫連線

3. **集中化查詢邏輯**

   - 所有數據存取邏輯集中在 Repository
   - 便於維護與優化

4. **多數據源支持**
   - Repository 可同時支援多個數據源
   - 實現數據一致性

---

## 計算 / 練習題（中）

### Q3. 設計一個簡單的圖書管理系統（Book、Author、Category），並規劃各層的實體與 DTO。

**解答：**

**Domain 層設計：**

```csharp
// csharp - Domain/Books/Book.cs
public class Book : FullAuditedAggregateRoot<Guid>
{
    public string Title { get; private set; }
    public Guid AuthorId { get; private set; }
    public Guid CategoryId { get; private set; }
    public decimal Price { get; private set; }
    public int StockQuantity { get; private set; }

    public Book(Guid id, string title, Guid authorId, Guid categoryId, decimal price) : base(id)
    {
        Title = title;
        AuthorId = authorId;
        CategoryId = categoryId;
        Price = price;
        StockQuantity = 0;
    }

    public void IncreaseStock(int quantity)
    {
        StockQuantity += quantity;
    }

    public void DecreaseStock(int quantity)
    {
        if (StockQuantity < quantity)
            throw new InvalidOperationException("庫存不足");
        StockQuantity -= quantity;
    }
}

// csharp - Domain/Authors/Author.cs
public class Author : FullAuditedAggregateRoot<Guid>
{
    public string Name { get; private set; }
    public string Email { get; private set; }

    public Author(Guid id, string name, string email) : base(id)
    {
        Name = name;
        Email = email;
    }
}

// csharp - Domain/Categories/Category.cs
public class Category : FullAuditedAggregateRoot<Guid>
{
    public string Name { get; private set; }
    public string Description { get; private set; }

    public Category(Guid id, string name) : base(id)
    {
        Name = name;
    }
}
```

**Application 層設計：**

```csharp
// csharp - Application/Books/Dto/BookDto.cs
public class BookDto
{
    public Guid Id { get; set; }
    public string Title { get; set; }
    public decimal Price { get; set; }
    public int StockQuantity { get; set; }
    public AuthorDto Author { get; set; }
    public CategoryDto Category { get; set; }
}

public class CreateBookDto
{
    [Required]
    [StringLength(256)]
    public string Title { get; set; }

    [Required]
    public Guid AuthorId { get; set; }

    [Required]
    public Guid CategoryId { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal Price { get; set; }
}

public class UpdateBookDto
{
    public string Title { get; set; }
    public decimal? Price { get; set; }
}

// csharp - Application/Books/BookAppService.cs
public class BookAppService : ApplicationService, IBookAppService
{
    private readonly IRepository<Book, Guid> _bookRepository;
    private readonly IRepository<Author, Guid> _authorRepository;
    private readonly IRepository<Category, Guid> _categoryRepository;

    public async Task<BookDto> CreateAsync(CreateBookDto input)
    {
        // 驗證 Author 與 Category 存在
        var author = await _authorRepository.GetAsync(input.AuthorId);
        var category = await _categoryRepository.GetAsync(input.CategoryId);

        var book = new Book(Guid.NewGuid(), input.Title, input.AuthorId, input.CategoryId, input.Price);
        await _bookRepository.InsertAsync(book);

        return ObjectMapper.Map<Book, BookDto>(book);
    }

    public async Task<BookDto> GetAsync(Guid id)
    {
        var book = await _bookRepository.GetAsync(id);
        return ObjectMapper.Map<Book, BookDto>(book);
    }
}
```

**Infrastructure 層（數據映射）：**

```csharp
// csharp - EntityFrameworkCore/Configurations/BookConfiguration.cs
protected override void OnModelCreating(ModelBuilder builder)
{
    builder.Entity<Book>(b =>
    {
        b.ToTable("Books");
        b.HasKey(x => x.Id);
        b.Property(x => x.Title).IsRequired().HasMaxLength(256);
        b.Property(x => x.Price).HasPrecision(18, 2);
        b.HasIndex(x => x.Title).HasName("IX_Book_Title");
    });

    builder.Entity<Author>(a =>
    {
        a.ToTable("Authors");
        a.HasKey(x => x.Id);
        a.Property(x => x.Name).IsRequired().HasMaxLength(128);
    });

    builder.Entity<Category>(c =>
    {
        c.ToTable("Categories");
        c.HasKey(x => x.Id);
        c.Property(x => x.Name).IsRequired().HasMaxLength(128);
    });
}
```

### Q4. 比較三種專案範本（Simple、Layered、Modular）的適用場景。

**解答：**

| 範本        | 結構                                              | 適用場景                         | 優勢                               | 劣勢                     |
| ----------- | ------------------------------------------------- | -------------------------------- | ---------------------------------- | ------------------------ |
| **Simple**  | 單層                                              | 小型原型、學習                   | 快速啟動、部署簡單                 | 可維護性差、難以擴展     |
| **Layered** | 5 層（Domain、App、Infrastructure、HttpApi、Web） | 中型應用、標準企業項目           | 架構清晰、便於維護、適合團隊開發   | 相對複雜、初期開發慢     |
| **Modular** | 多模組、每模組獨立結構                            | 大型系統、微服務預備、高度可重用 | 模組獨立部署、代碼複用高、易於擴展 | 管理複雜、相依性管理困難 |

**選擇建議：**

- 初學者或原型：Simple
- 生產應用：Layered
- 企業級或微服務：Modular

---

## 實作 / 編碼題（較難）

### Q5. 建立一個完整的圖書管理應用（CRUD + 分頁 + 搜尋），包含所有層級的實現。

**完整實現見下文。**

### Q6. 撰寫單元測試與整合測試驗證應用服務的正確性。

**單元測試：**

```csharp
// csharp - Tests/BookAppServiceTests.cs
public class BookAppServiceTests : IAsyncLifetime
{
    private BookAppService _bookAppService;
    private Mock<IRepository<Book, Guid>> _mockBookRepository;
    private Mock<IRepository<Author, Guid>> _mockAuthorRepository;
    private Mock<IRepository<Category, Guid>> _mockCategoryRepository;

    public async Task InitializeAsync()
    {
        _mockBookRepository = new Mock<IRepository<Book, Guid>>();
        _mockAuthorRepository = new Mock<IRepository<Author, Guid>>();
        _mockCategoryRepository = new Mock<IRepository<Category, Guid>>();

        _bookAppService = new BookAppService(
            _mockBookRepository.Object,
            _mockAuthorRepository.Object,
            _mockCategoryRepository.Object
        );
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task CreateAsync_WhenInputValid_ShouldCreateBook()
    {
        // Arrange
        var authorId = Guid.NewGuid();
        var categoryId = Guid.NewGuid();
        var input = new CreateBookDto
        {
            Title = "The Hobbit",
            AuthorId = authorId,
            CategoryId = categoryId,
            Price = 29.99m
        };

        _mockAuthorRepository.Setup(r => r.GetAsync(authorId))
            .ReturnsAsync(new Author(authorId, "Tolkien", "tolkien@example.com"));
        _mockCategoryRepository.Setup(r => r.GetAsync(categoryId))
            .ReturnsAsync(new Category(categoryId, "Fiction"));

        // Act
        var result = await _bookAppService.CreateAsync(input);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(input.Title, result.Title);
        Assert.Equal(input.Price, result.Price);
        _mockBookRepository.Verify(r => r.InsertAsync(It.IsAny<Book>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_WhenAuthorNotFound_ShouldThrow()
    {
        // Arrange
        var input = new CreateBookDto { AuthorId = Guid.NewGuid() };
        _mockAuthorRepository.Setup(r => r.GetAsync(It.IsAny<Guid>()))
            .ThrowsAsync(new EntityNotFoundException());

        // Act & Assert
        await Assert.ThrowsAsync<EntityNotFoundException>(() => _bookAppService.CreateAsync(input));
    }
}
```

**整合測試：**

```csharp
// csharp - Tests/BookAppServiceIntegrationTests.cs
public class BookAppServiceIntegrationTests : AbpIntegratedTestBase<BookStoreApplicationModule>
{
    private BookAppService _bookAppService;
    private IRepository<Book, Guid> _bookRepository;
    private IRepository<Author, Guid> _authorRepository;

    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();
        _bookAppService = GetRequiredService<BookAppService>();
        _bookRepository = GetRequiredService<IRepository<Book, Guid>>();
        _authorRepository = GetRequiredService<IRepository<Author, Guid>>();
    }

    [Fact]
    public async Task CreateAndGetBook_ShouldWork()
    {
        // Arrange
        var author = new Author(Guid.NewGuid(), "Author Name", "author@example.com");
        await _authorRepository.InsertAsync(author);

        var input = new CreateBookDto
        {
            Title = "Test Book",
            AuthorId = author.Id,
            CategoryId = Guid.NewGuid(),
            Price = 19.99m
        };

        // Act
        var created = await _bookAppService.CreateAsync(input);
        var retrieved = await _bookAppService.GetAsync(created.Id);

        // Assert
        Assert.Equal(created.Id, retrieved.Id);
        Assert.Equal(input.Title, retrieved.Title);
    }
}
```

---

## 最佳實務總結

1. **層級責任明確**：Domain 不依賴外部框架，便於測試與重用
2. **DTO 設計**：區分 Create/Update/Display DTO，符合實際業務需求
3. **例外處理**：使用業務異常而非通用異常
4. **測試覆蓋**：優先單元測試（mock），再進行整合測試
5. **命名規範**：AppService 方法命名清晰（Create、Get、Update、Delete）

---

## 補充深入主題

### 物件映射配置 (V10 更新)

> **ABP V10 變更**: ABP Framework V10 已將預設物件映射工具從 AutoMapper 改為 **Mapperly**,以獲得更好的效能與編譯時型別安全。以下範例保留 AutoMapper 作為參考,但建議新專案使用 Mapperly。

#### Mapperly 配置 (推薦 - V10)

```csharp
// csharp - BookStoreMapper.cs
using Riok.Mapperly.Abstractions;

namespace BookStore;

[Mapper]
public partial class BookStoreMapper
{
    // Entity -> DTO
    public partial BookDto BookToDto(Book book);

    // CreateDTO -> Entity (需手動處理建構函式)
    public Book CreateDtoToBook(CreateBookDto dto)
    {
        return new Book(
            Guid.NewGuid(),
            dto.Title,
            dto.AuthorId,
            dto.CategoryId,
            dto.Price
        );
    }
}
```

#### AutoMapper 配置 (舊版參考)

```csharp
// csharp - BookProfile.cs
public class BookProfile : Profile
{
    public BookProfile()
    {
        CreateMap<Book, BookDto>()
            .ForMember(d => d.Author, opt => opt.MapFrom(s => s.Author))
            .ForMember(d => d.Category, opt => opt.MapFrom(s => s.Category));

        CreateMap<CreateBookDto, Book>()
            .ConvertUsing((src, ctx) =>
                new Book(Guid.NewGuid(), src.Title, src.AuthorId, src.CategoryId, src.Price)
            );
    }
}
```

### 分頁與搜尋實現

```csharp
// csharp - 完整的 GetListAsync 實現
public async Task<PagedResultDto<BookDto>> GetListAsync(GetBookListDto input)
{
    var query = _bookRepository.GetQueryable();

    // 搜尋條件
    if (!input.SearchTerm.IsNullOrWhiteSpace())
    {
        query = query.Where(b => b.Title.Contains(input.SearchTerm));
    }

    // 分類過濾
    if (input.CategoryId.HasValue)
    {
        query = query.Where(b => b.CategoryId == input.CategoryId);
    }

    // 排序與分頁
    var totalCount = await query.CountAsync();
    var books = await query
        .OrderBy(b => b.Title)
        .Skip(input.SkipCount)
        .Take(input.MaxResultCount)
        .Include(b => b.Author)
        .Include(b => b.Category)
        .ToListAsync();

    return new PagedResultDto<BookDto>(
        totalCount,
        ObjectMapper.Map<List<Book>, List<BookDto>>(books)
    );
}
```

---

參考資源：

- ABP 官方文件：https://docs.abp.io/en/abp/latest/
- 本章核心檔案：content/ch02.md
