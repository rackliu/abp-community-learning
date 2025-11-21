# 第三章習題解答

## 習題 1：概念題 ⭐

**題目：說明應用程式開發流程中「需求分析」階段識別的核心工作內容。**

### 解答

需求分析階段的核心工作包括：

1. **識別業務域**

   - 對話與訪談利益相關者（Product Owner、用戶、管理層）
   - 理解業務流程、痛點與目標
   - 繪製業務流程圖（BPMN）

2. **識別聚合根**

   - 根據業務邏輯找出核心實體（如 Order、Invoice、Product）
   - 確定每個實體的職責與邊界
   - 列舉實體間的關係

3. **定義 Ubiquitous Language（通用語言）**

   - 確保技術與業務團隊使用相同術語
   - 消除溝通歧義

4. **初步需求文檔**
   - 功能性需求（Feature List）
   - 非功能性需求（Performance、Security、Scalability）
   - 驗收標準（Acceptance Criteria）

### 範例應用

在 BookStore 專案中：

- 業務域：圖書管理、借閱管理
- 聚合根：Book（書籍）、User（用戶）、Borrowing（借閱記錄）
- 通用語言：「借閱」= Borrowing Event，「歸還」= Return Event

---

## 習題 2：概念題 ⭐

**題目：何謂「聚合邊界」？為何在設計初期明確定義聚合邊界很重要？**

### 解答

**聚合邊界定義**

- 聚合邊界是包含一個聚合根及其相關實體的邏輯邊界
- 邊界內的物件必須通過聚合根來存取
- 邊界外的物件無法直接存取邊界內的私有物件

**為什麼重要**

1. **保證一致性**

   - 所有對聚合的修改必須通過聚合根的方法
   - 避免跨越邊界的直接修改導致業務規則違反

2. **降低重構成本**

   - 早期明確邊界能減少後期拆分微服務時的代碼改動
   - 避免聚合過度耦合

3. **簡化交易管理**

   - 聚合邊界內的所有修改在單一交易中完成
   - 避免分散交易導致的一致性問題

4. **便於並發控制**
   - 明確的邊界便於實現樂觀/悲觀鎖定

### 反面例子

❌ **不良做法**：Order 直接包含 Customer 的所有資訊及帳戶餘額

- 修改 Customer 時需涉及多個 Order，易導致不一致
- 難以拆分微服務

✅ **正確做法**：Order 僅存 CustomerId，在需要時查詢

- Customer 是獨立聚合根
- 修改 Customer 不影響現有 Order
- 易於拆分為不同微服務

---

## 習題 3：計算/練習題 ⭐⭐

**題目：設計一個「電商訂單系統」的聚合根結構，包含 Order、OrderLine、Payment 三個實體。繪製聚合邊界圖，並說明：**

- **哪些實體屬於同一聚合？**
- **各聚合根的職責邊界是什麼？**
- **聚合間如何通訊？**

### 解答

#### 聚合設計與邊界

```
┌─────────────────────────────────┐
│  Order Aggregate                │
│ ┌─────────────────────────────┐ │
│ │ Order (Aggregate Root)      │ │
│ │ - OrderId (PK)              │ │
│ │ - CustomerId                │ │
│ │ - OrderDate                 │ │
│ │ - Status                    │ │
│ │ - TotalAmount               │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ OrderLine (Entity)          │ │
│ │ - OrderLineId (PK)          │ │
│ │ - ProductId                 │ │
│ │ - Quantity                  │ │
│ │ - UnitPrice                 │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Payment Aggregate              │
│ ┌─────────────────────────────┐ │
│ │ Payment (Aggregate Root)    │ │
│ │ - PaymentId (PK)            │ │
│ │ - OrderId (Reference)       │ │
│ │ - Amount                    │ │
│ │ - Status                    │ │
│ │ - PaymentDate               │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

#### 聚合判定

1. **Order Aggregate（訂單聚合）**

   - **包含**：Order + OrderLines
   - **理由**：OrderLine 無獨立生命週期，必須通過 Order 創建/修改/刪除
   - **一致性邊界**：訂單確認時所有 OrderLines 必須有效且庫存充足

2. **Payment Aggregate（支付聚合）**
   - **包含**：Payment
   - **理由**：支付有獨立生命週期、獨立業務規則
   - **不包含**：Order，避免強耦合

#### 聚合間通訊

```csharp
// ❌ 不良做法：直接依賴另一聚合
public void ConfirmOrder(Order order, Payment payment)
{
    if (payment.Status != PaymentStatus.Completed) throw new Exception();
    order.Confirm();
}

// ✅ 正確做法：通過事件解耦
public class PaymentCompletedEventHandler : ILocalEventHandler<PaymentCompletedEvent>
{
    private readonly IRepository<Order, Guid> _orderRepository;

    public async Task HandleEventAsync(PaymentCompletedEvent eventData)
    {
        var order = await _orderRepository.GetAsync(eventData.OrderId);
        order.ConfirmPayment(eventData.Amount);
        await _orderRepository.UpdateAsync(order);
    }
}
```

#### 職責邊界

| 聚合           | 職責                                                  |
| -------------- | ----------------------------------------------------- |
| **Order**      | 訂單創建、加行項、確認、取消、狀態轉換                |
| **Payment**    | 支付創建、金額驗證、支付狀態管理                      |
| **跨聚合通訊** | 透過 Domain Event（PaymentCompleted、OrderConfirmed） |

---

## 習題 4：計算/練習題 ⭐⭐

**題目：將下列需求轉換為 DDL（Database Definition Language）與 EF Core 映射：**

- Book 實體：BookId (GUID)、Title、Author、ISBN、PublishDate、Price
- 需支援按 Author 與 PublishDate 查詢

### 解答

#### SQL DDL

```sql
CREATE TABLE Books (
    BookId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Title NVARCHAR(256) NOT NULL,
    Author NVARCHAR(128) NOT NULL,
    ISBN NVARCHAR(20) NOT NULL UNIQUE,
    PublishDate DATE NOT NULL,
    Price DECIMAL(10, 2) NOT NULL,
    CreationTime DATETIME2 DEFAULT GETUTCDATE(),
    LastModificationTime DATETIME2
);

-- 建立複合索引支援查詢
CREATE INDEX IX_Book_Author_PublishDate
ON Books(Author, PublishDate DESC);

CREATE INDEX IX_Book_ISBN
ON Books(ISBN);
```

#### EF Core 映射

```csharp
public class Book : FullAuditedAggregateRoot<Guid>
{
    public string Title { get; set; }
    public string Author { get; set; }
    public string ISBN { get; set; }
    public DateTime PublishDate { get; set; }
    public decimal Price { get; set; }
}

// OnModelCreating 配置
protected override void OnModelCreating(ModelBuilder builder)
{
    base.OnModelCreating(builder);

    builder.Entity<Book>(b =>
    {
        b.ToTable("Books");
        b.HasKey(x => x.Id);

        b.Property(x => x.Title).IsRequired().HasMaxLength(256);
        b.Property(x => x.Author).IsRequired().HasMaxLength(128);
        b.Property(x => x.ISBN).IsRequired().HasMaxLength(20).IsUnicode(false);
        b.Property(x => x.PublishDate).IsRequired();
        b.Property(x => x.Price).HasPrecision(10, 2);

        // 複合索引
        b.HasIndex(x => new { x.Author, x.PublishDate })
            .HasDatabaseName("IX_Book_Author_PublishDate");

        // ISBN 唯一索引
        b.HasIndex(x => x.ISBN).IsUnique();
    });
}
```

#### 查詢實現

```csharp
public class BookRepository : EfCoreRepository<AppDbContext, Book, Guid>
{
    public BookRepository(IDbContextProvider<AppDbContext> dbContextProvider)
        : base(dbContextProvider) { }

    public async Task<List<Book>> GetByAuthorAsync(string author)
    {
        var dbSet = await GetDbSetAsync();
        return await dbSet
            .Where(b => b.Author == author)
            .OrderByDescending(b => b.PublishDate)
            .ToListAsync();
    }

    public async Task<List<Book>> GetByDateRangeAsync(DateTime from, DateTime to)
    {
        var dbSet = await GetDbSetAsync();
        return await dbSet
            .Where(b => b.PublishDate >= from && b.PublishDate <= to)
            .OrderByDescending(b => b.PublishDate)
            .ToListAsync();
    }
}
```

---

## 習題 5：實作/編碼題 ⭐⭐⭐

**題目：實作一個 BookAppService，包含以下功能：**

1. **CreateAsync**：創建新書籍
2. **GetListAsync**：分頁查詢所有書籍
3. **GetByAuthorAsync**：按作者查詢
4. **UpdateAsync**：更新書籍資訊
5. **DeleteAsync**：刪除書籍
6. **驗證**：Title、Author 不可為空；ISBN 必須唯一；Price > 0

### 解答

#### DTO 定義

```csharp
// Dto/BookDto.cs
public class BookDto : FullAuditedEntityDto<Guid>
{
    public string Title { get; set; }
    public string Author { get; set; }
    public string ISBN { get; set; }
    public DateTime PublishDate { get; set; }
    public decimal Price { get; set; }
}

public class CreateBookDto
{
    [Required(ErrorMessage = "書名不可為空")]
    [StringLength(256, MinimumLength = 1)]
    public string Title { get; set; }

    [Required(ErrorMessage = "作者不可為空")]
    [StringLength(128, MinimumLength = 1)]
    public string Author { get; set; }

    [Required(ErrorMessage = "ISBN 不可為空")]
    [RegularExpression(@"^[0-9\-]{10,20}$", ErrorMessage = "ISBN 格式無效")]
    public string ISBN { get; set; }

    public DateTime PublishDate { get; set; }

    [Range(0.01, 99999.99, ErrorMessage = "價格必須大於 0")]
    public decimal Price { get; set; }
}

public class UpdateBookDto : CreateBookDto
{
}

public class GetBooksInputDto : PagedAndSortedResultRequestDto
{
    public string Author { get; set; }
    public DateTime? PublishDateFrom { get; set; }
    public DateTime? PublishDateTo { get; set; }
}
```

#### 應用服務實現

```csharp
// BookAppService.cs
[RemoteService(IsMetadataEnabled = true)]
[Authorize(BookStorePermissions.Books.Default)]
public class BookAppService : ApplicationService, IBookAppService
{
    private readonly IRepository<Book, Guid> _bookRepository;
    private readonly IBookRepository _customRepository;

    public BookAppService(
        IRepository<Book, Guid> bookRepository,
        IBookRepository customRepository)
    {
        _bookRepository = bookRepository;
        _customRepository = customRepository;
    }

    [Authorize(BookStorePermissions.Books.Create)]
    public async Task<BookDto> CreateAsync(CreateBookDto input)
    {
        // 檢查 ISBN 唯一性
        var existingBook = await _customRepository.GetByISBNAsync(input.ISBN);
        if (existingBook != null)
            throw new UserFriendlyException("ISBN 已存在");

        // 創建實體
        var book = new Book(
            Guid.NewGuid(),
            input.Title,
            input.Author,
            input.ISBN,
            input.PublishDate,
            input.Price);

        // 保存
        await _bookRepository.InsertAsync(book, autoSave: true);

        return ObjectMapper.Map<Book, BookDto>(book);
    }

    [Authorize(BookStorePermissions.Books.Edit)]
    public async Task<BookDto> UpdateAsync(Guid id, UpdateBookDto input)
    {
        var book = await _bookRepository.GetAsync(id);

        // 若 ISBN 改變，檢查唯一性
        if (book.ISBN != input.ISBN)
        {
            var existingBook = await _customRepository.GetByISBNAsync(input.ISBN);
            if (existingBook != null && existingBook.Id != id)
                throw new UserFriendlyException("ISBN 已存在");
        }

        // 更新屬性
        book.Update(
            input.Title,
            input.Author,
            input.ISBN,
            input.PublishDate,
            input.Price);

        await _bookRepository.UpdateAsync(book, autoSave: true);

        return ObjectMapper.Map<Book, BookDto>(book);
    }

    [Authorize(BookStorePermissions.Books.Delete)]
    public async Task DeleteAsync(Guid id)
    {
        await _bookRepository.DeleteAsync(id, autoSave: true);
    }

    [AllowAnonymous]
    public async Task<PagedResultDto<BookDto>> GetListAsync(GetBooksInputDto input)
    {
        var query = (await _bookRepository.GetQueryableAsync())
            .WhereIf(!input.Author.IsNullOrWhiteSpace(), b => b.Author.Contains(input.Author))
            .WhereIf(input.PublishDateFrom.HasValue, b => b.PublishDate >= input.PublishDateFrom)
            .WhereIf(input.PublishDateTo.HasValue, b => b.PublishDate <= input.PublishDateTo)
            .OrderBy(input.Sorting ?? "id");

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip(input.SkipCount)
            .Take(input.MaxResultCount)
            .ToListAsync();

        return new PagedResultDto<BookDto>(
            totalCount,
            ObjectMapper.Map<List<Book>, List<BookDto>>(items));
    }

    public async Task<List<BookDto>> GetByAuthorAsync(string author)
    {
        var books = await _customRepository.GetByAuthorAsync(author);
        return ObjectMapper.Map<List<Book>, List<BookDto>>(books);
    }
}
```

#### 權限定義

```csharp
public class BookStorePermissions
{
    public const string GroupName = "BookStore";

    public static class Books
    {
        public const string Default = GroupName + ".Books";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
    }
}

public class BookStorePermissionDefinitionProvider : PermissionDefinitionProvider
{
    public override void Define(IPermissionDefinitionContext context)
    {
        var group = context.AddGroup(BookStorePermissions.GroupName, "圖書管理");
        var bookPermission = group.AddPermission(BookStorePermissions.Books.Default, "查看書籍");
        bookPermission.AddChild(BookStorePermissions.Books.Create, "創建書籍");
        bookPermission.AddChild(BookStorePermissions.Books.Edit, "編輯書籍");
        bookPermission.AddChild(BookStorePermissions.Books.Delete, "刪除書籍");
    }
}
```

---

## 習題 6：實作/編碼題 ⭐⭐⭐

**題目：為 BookAppService 編寫單元測試，測試以下場景：**

1. 成功創建書籍
2. 建立重複 ISBN 時拋出異常
3. 無效的 ISBN 格式時驗證失敗
4. 分頁查詢返回正確結果

### 解答

#### 測試設定

```csharp
// BookAppServiceTests.cs
public class BookAppServiceTests : BookStoreApplicationTestBase
{
    private readonly BookAppService _bookAppService;
    private readonly IRepository<Book, Guid> _bookRepository;

    public BookAppServiceTests()
    {
        _bookAppService = GetRequiredService<BookAppService>();
        _bookRepository = GetRequiredService<IRepository<Book, Guid>>();
    }

    [Fact]
    public async Task CreateAsync_ShouldCreateBook_WhenInputValid()
    {
        // Arrange
        var input = new CreateBookDto
        {
            Title = "Clean Code",
            Author = "Robert C. Martin",
            ISBN = "978-0132350884",
            PublishDate = new DateTime(2008, 8, 1),
            Price = 50.00m
        };

        // Act
        var result = await _bookAppService.CreateAsync(input);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(input.Title, result.Title);
        Assert.Equal(input.Author, result.Author);
        Assert.Equal(input.ISBN, result.ISBN);
        Assert.Equal(input.Price, result.Price);
    }

    [Fact]
    public async Task CreateAsync_ShouldThrow_WhenISBNDuplicate()
    {
        // Arrange
        var isbn = "978-0132350884";
        var input1 = new CreateBookDto
        {
            Title = "Book 1",
            Author = "Author 1",
            ISBN = isbn,
            PublishDate = DateTime.Now,
            Price = 50.00m
        };
        var input2 = new CreateBookDto
        {
            Title = "Book 2",
            Author = "Author 2",
            ISBN = isbn, // 重複 ISBN
            PublishDate = DateTime.Now,
            Price = 60.00m
        };

        // Act & Assert
        await _bookAppService.CreateAsync(input1);
        var exception = await Assert.ThrowsAsync<UserFriendlyException>(
            () => _bookAppService.CreateAsync(input2));
        Assert.Contains("ISBN 已存在", exception.Message);
    }

    [Theory]
    [InlineData("invalid-isbn")]
    [InlineData("123")]
    [InlineData("")]
    public async Task CreateAsync_ShouldThrow_WhenISBNInvalid(string isbn)
    {
        // Arrange
        var input = new CreateBookDto
        {
            Title = "Test Book",
            Author = "Test Author",
            ISBN = isbn,
            PublishDate = DateTime.Now,
            Price = 50.00m
        };

        // Act & Assert
        var exception = await Assert.ThrowsAsync<AbpValidationException>(
            () => _bookAppService.CreateAsync(input));
        Assert.NotNull(exception);
    }

    [Fact]
    public async Task GetListAsync_ShouldReturnPagedResult()
    {
        // Arrange
        for (int i = 0; i < 15; i++)
        {
            await _bookAppService.CreateAsync(new CreateBookDto
            {
                Title = $"Book {i}",
                Author = $"Author {i}",
                ISBN = $"978-{i:0000000000}",
                PublishDate = DateTime.Now.AddDays(-i),
                Price = 50.00m + i
            });
        }

        var input = new GetBooksInputDto
        {
            MaxResultCount = 10,
            SkipCount = 0
        };

        // Act
        var result = await _bookAppService.GetListAsync(input);

        // Assert
        Assert.Equal(15, result.TotalCount);
        Assert.Equal(10, result.Items.Count);
    }

    [Fact]
    public async Task GetByAuthorAsync_ShouldReturnBooksByAuthor()
    {
        // Arrange
        var author = "Stephen King";
        await _bookAppService.CreateAsync(new CreateBookDto
        {
            Title = "The Shining",
            Author = author,
            ISBN = "978-0385333312",
            PublishDate = new DateTime(1977, 1, 28),
            Price = 40.00m
        });

        await _bookAppService.CreateAsync(new CreateBookDto
        {
            Title = "It",
            Author = author,
            ISBN = "978-0451191564",
            PublishDate = new DateTime(1986, 9, 15),
            Price = 35.00m
        });

        // Act
        var result = await _bookAppService.GetByAuthorAsync(author);

        // Assert
        Assert.Equal(2, result.Count);
        Assert.All(result, b => Assert.Equal(author, b.Author));
    }
}
```

---

## 深入主題：測試驅動開發（TDD）在 ABP 中的應用

### TDD 流程

1. **紅色階段**：編寫失敗的測試
2. **綠色階段**：編寫最簡單的代碼使測試通過
3. **重構階段**：改進代碼質量並保持測試通過

### 範例：TDD 開發 Book 實體的 Borrow 方法

```csharp
// 第一步：編寫測試（RED）
[Fact]
public void Borrow_ShouldChangeStatusToBorrowed()
{
    var book = new Book(Guid.NewGuid(), "Title", "Author", "ISBN", DateTime.Now, 50);
    book.Borrow();
    Assert.Equal(BookStatus.Borrowed, book.Status);
}

// 第二步：實作最簡單代碼（GREEN）
public class Book : AggregateRoot<Guid>
{
    public BookStatus Status { get; private set; }
    public void Borrow() => Status = BookStatus.Borrowed;
}

// 第三步：重構並添加更多測試
[Fact]
public void Borrow_WhenAlreadyBorrowed_ShouldThrow()
{
    var book = new Book(...);
    book.Borrow();
    Assert.Throws<InvalidOperationException>(() => book.Borrow());
}

// 重構後的實現
public void Borrow()
{
    if (Status == BookStatus.Borrowed)
        throw new InvalidOperationException("書籍已被借閱");
    Status = BookStatus.Borrowed;
    AddDomainEvent(new BookBorrowedEvent(Id));
}
```

### TDD 優勢

- 設計更清晰（先思考接口）
- 測試覆蓋率高
- 重構時信心足
- 文檔效果（測試即文檔）

---

## 參考資源

- [ABP 官方文檔 - Application Services](https://docs.abp.io/en/abp/latest/Application-Services)（content7）
- [ABP 官方文檔 - Testing](https://docs.abp.io/en/abp/latest/Testing)（content7）
- [Entity Framework Core 文檔](https://docs.microsoft.com/en-us/ef/core/)
- [FluentValidation 文檔](https://fluentvalidation.net/)
