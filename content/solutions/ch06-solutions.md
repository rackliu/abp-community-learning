# 第六章習題解答

## 習題 1：概念題 ⭐

**題目：解釋 Repository Pattern 的核心概念與 UoW（工作單元）的關係。**

### 解答

**Repository Pattern**：將資料存取邏輯抽象為介面，隱藏具體實現細節。

**UoW（Unit of Work）**：追蹤資料變化並統一提交至資料庫的模式。

#### 關係圖

```
應用層（AppService）
        ↓
Repository 介面 ← 隔離層
        ↓
EF Core DbContext ← 具體實現（支援 UoW）
        ↓
資料庫
```

#### ABP 實現

```csharp
// ABP 內建 Repository 與 UoW
public class BookAppService : ApplicationService
{
    private readonly IRepository<Book, Guid> _bookRepository;

    public BookAppService(IRepository<Book, Guid> bookRepository)
    {
        _bookRepository = bookRepository; // Repository 註入
    }

    public async Task<BookDto> CreateAsync(CreateBookDto input)
    {
        var book = new Book(Guid.NewGuid(), input.Title, input.Author);

        // 自動 UoW 管理：變化追蹤、事務
        await _bookRepository.InsertAsync(book, autoSave: true);

        return ObjectMapper.Map<Book, BookDto>(book);
    }

    // autoSave: true → 自動呼叫 SaveChanges()
    // autoSave: false → 手動管理（複雜業務流程）
}
```

#### 優勢

- 易於測試（可 Mock Repository）
- 切換資料存取實現不需改應用層
- UoW 自動管理交易邊界

---

## 習題 2：概念題 ⭐

**題目：EF Core 與 MongoDB 在 ABP 中各自的適用場景？**

### 解答

| 特性         | EF Core（SQL）                  | MongoDB                          |
| ------------ | ------------------------------- | -------------------------------- |
| **適用場景** | 結構化資料、複雜查詢、ACID 事務 | 文件型資料、高併發讀寫、無結構化 |
| **查詢能力** | LINQ、SQL、複雜 JOIN            | 文件查詢、嵌套文件               |
| **事務**     | 完全 ACID                       | 單文件原子性、多文件限制         |
| **社群版**   | ✅ 完全支援                     | ✅ 基本支援                      |
| **範例**     | BookStore、CRM 系統             | 日誌系統、內容管理               |

#### EF Core 建立專案

```bash
abp new MyApp -t app -d ef
```

#### MongoDB 建立專案

```bash
abp new MyApp -t app -d mongo
```

---

## 習題 3：計算/練習題 ⭐⭐

**題目：設計 Book 與 Author 的一對多關係，使用 EF Core Fluent API 配置。**

### 解答

#### 實體定義

```csharp
// Domain/Authors/Author.cs
public class Author : AggregateRoot<Guid>
{
    public string Name { get; set; }
    public DateTime BirthDate { get; set; }
    public List<Book> Books { get; set; } = new();
}

// Domain/Books/Book.cs
public class Book : AggregateRoot<Guid>
{
    public string Title { get; set; }
    public Guid AuthorId { get; set; }
    public Author Author { get; set; }
}
```

#### OnModelCreating 配置

```csharp
protected override void OnModelCreating(ModelBuilder builder)
{
    base.OnModelCreating(builder);

    // Author 配置
    builder.Entity<Author>(b =>
    {
        b.ToTable("Authors");
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).IsRequired().HasMaxLength(256);

        // 一對多關係
        b.HasMany(x => x.Books)
            .WithOne(x => x.Author)
            .HasForeignKey(x => x.AuthorId)
            .OnDelete(DeleteBehavior.Cascade);
    });

    // Book 配置
    builder.Entity<Book>(b =>
    {
        b.ToTable("Books");
        b.HasKey(x => x.Id);
        b.Property(x => x.Title).IsRequired().HasMaxLength(512);
    });
}
```

#### 遷移

```bash
dotnet ef migrations add AddAuthorToBook
dotnet ef database update
```

---

## 習題 4：計算/練習題 ⭐⭐

**題目：實作自訂 Repository 方法 GetByAuthorAsync，並進行效能優化（避免 N+1）。**

### 解答

#### 界面定義

```csharp
public interface IBookRepository : IRepository<Book, Guid>
{
    Task<List<Book>> GetByAuthorAsync(string authorName);
}
```

#### 實現

```csharp
public class BookRepository : EfCoreRepository<AppDbContext, Book, Guid>, IBookRepository
{
    public BookRepository(IDbContextProvider<AppDbContext> dbContextProvider)
        : base(dbContextProvider) { }

    // ❌ N+1 問題版本
    public async Task<List<Book>> GetByAuthorAsync_Bad(string authorName)
    {
        var books = await (await GetDbSetAsync())
            .Where(b => b.Author.Name == authorName) // ❌ 後續為每本書查詢 Author
            .ToListAsync();

        foreach (var book in books)
        {
            var author = book.Author; // ❌ 觸發額外查詢
        }
        return books;
    }

    // ✅ 優化版本（Include）
    public async Task<List<Book>> GetByAuthorAsync(string authorName)
    {
        var dbSet = await GetDbSetAsync();
        return await dbSet
            .Include(b => b.Author) // ✅ 預先載入 Author
            .Where(b => b.Author.Name == authorName)
            .OrderBy(b => b.Title)
            .ToListAsync();
    }

    // ✅ 投影優化（只取需要欄位）
    public async Task<List<BookBasicDto>> GetBasicByAuthorAsync(string authorName)
    {
        var dbSet = await GetDbSetAsync();
        return await dbSet
            .Where(b => b.Author.Name == authorName)
            .Select(b => new BookBasicDto
            {
                Id = b.Id,
                Title = b.Title,
                AuthorName = b.Author.Name
            })
            .OrderBy(b => b.Title)
            .ToListAsync();
    }
}
```

#### 性能測試

```csharp
[Fact]
public async Task GetByAuthorAsync_ShouldUseIncludeNotNPlusOne()
{
    // Arrange
    var author = new Author { Id = Guid.NewGuid(), Name = "Author1" };
    var books = new List<Book>
    {
        new Book { Id = Guid.NewGuid(), Title = "Book1", AuthorId = author.Id, Author = author },
        new Book { Id = Guid.NewGuid(), Title = "Book2", AuthorId = author.Id, Author = author }
    };

    // Act
    var result = await _bookRepository.GetByAuthorAsync("Author1");

    // Assert
    Assert.Equal(2, result.Count);
    // 驗證只執行 1 次查詢（不是 3 次）
}
```

---

## 習題 5：實作題 ⭐⭐⭐

**題目：實作一個 BookRepository 包含以下方法：**

1. GetAllAsync（分頁）
2. GetByAuthorAsync（作者查詢）
3. GetByPriceRangeAsync（價格區間）
4. SearchAsync（全文搜尋）

### 解答（簡化版）

```csharp
public interface IBookRepository : IRepository<Book, Guid>
{
    Task<PagedResultDto<BookDto>> GetAllAsync(PagedAndSortedResultRequestDto input);
    Task<List<BookDto>> GetByAuthorAsync(string author);
    Task<List<BookDto>> GetByPriceRangeAsync(decimal minPrice, decimal maxPrice);
    Task<List<BookDto>> SearchAsync(string keyword);
}

public class BookRepository : EfCoreRepository<AppDbContext, Book, Guid>, IBookRepository
{
    public BookRepository(IDbContextProvider<AppDbContext> dbContextProvider)
        : base(dbContextProvider) { }

    public async Task<PagedResultDto<BookDto>> GetAllAsync(PagedAndSortedResultRequestDto input)
    {
        var query = (await GetQueryableAsync())
            .OrderBy(input.Sorting ?? "Id");

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip(input.SkipCount)
            .Take(input.MaxResultCount)
            .ToListAsync();

        return new PagedResultDto<BookDto>(
            totalCount,
            ObjectMapper.Map<List<Book>, List<BookDto>>(items)
        );
    }

    public async Task<List<BookDto>> GetByAuthorAsync(string author)
    {
        var books = await (await GetQueryableAsync())
            .Include(b => b.Author)
            .Where(b => b.Author.Name.Contains(author))
            .ToListAsync();

        return ObjectMapper.Map<List<Book>, List<BookDto>>(books);
    }

    public async Task<List<BookDto>> GetByPriceRangeAsync(decimal minPrice, decimal maxPrice)
    {
        var books = await (await GetQueryableAsync())
            .Where(b => b.Price >= minPrice && b.Price <= maxPrice)
            .ToListAsync();

        return ObjectMapper.Map<List<Book>, List<BookDto>>(books);
    }

    public async Task<List<BookDto>> SearchAsync(string keyword)
    {
        var books = await (await GetQueryableAsync())
            .Where(b => b.Title.Contains(keyword) || b.Author.Name.Contains(keyword))
            .ToListAsync();

        return ObjectMapper.Map<List<Book>, List<BookDto>>(books);
    }
}
```

---

## 習題 6：實作題 ⭐⭐⭐

**題目：為 BookRepository 編寫整合測試，使用 Testcontainers 啟動真實 SQL Server。**

### 解答（簡化版）

```csharp
public class BookRepositoryTests : IAsyncLifetime
{
    private MsSqlTestcontainer _container;
    private IServiceProvider _serviceProvider;
    private IBookRepository _repository;

    public async Task InitializeAsync()
    {
        // 啟動 SQL Server 容器
        _container = new TestcontainersBuilder<MsSqlTestcontainer>()
            .WithDatabase(new MsSqlTestcontainerConfiguration
            {
                Password = "P@ssw0rd123"
            })
            .Build();

        await _container.StartAsync();

        // 建立 ServiceProvider
        var services = new ServiceCollection();
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(_container.ConnectionString)
        );
        services.AddScoped<IBookRepository, BookRepository>();

        _serviceProvider = services.BuildServiceProvider();
        _repository = _serviceProvider.GetRequiredService<IBookRepository>();

        // 執行遷移
        var dbContext = _serviceProvider.GetRequiredService<AppDbContext>();
        await dbContext.Database.MigrateAsync();
    }

    [Fact]
    public async Task GetByPriceRangeAsync_ShouldReturnBooksInRange()
    {
        // Arrange
        var books = new List<Book>
        {
            new Book { Id = Guid.NewGuid(), Title = "Cheap Book", Price = 10 },
            new Book { Id = Guid.NewGuid(), Title = "Mid Book", Price = 50 },
            new Book { Id = Guid.NewGuid(), Title = "Expensive Book", Price = 100 }
        };

        foreach (var book in books)
            await _repository.InsertAsync(book);

        // Act
        var result = await _repository.GetByPriceRangeAsync(40, 60);

        // Assert
        Assert.Single(result);
        Assert.Equal("Mid Book", result[0].Title);
    }

    public async Task DisposeAsync()
    {
        if (_container != null)
            await _container.DisposeAsync();
    }
}
```

---

## 參考資源

- [ABP 官方文檔 - Repositories](https://docs.abp.io/en/abp/latest/Repositories)（content7）
- [EF Core 文檔](https://docs.microsoft.com/en-us/ef/core/)
- [Testcontainers](https://testcontainers.org/)
