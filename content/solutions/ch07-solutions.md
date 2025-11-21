# 第七章習題解答

## 習題 1：概念題 ⭐

**題目：解釋橫切關注（Cross-Cutting Concerns）的概念，列舉三個例子。**

### 解答

**橫切關注**：在應用中多個模組都需要的功能，但不屬於業務邏輯本身。

#### 常見橫切關注

| 關注點       | 用途                     | 實現方式                   |
| ------------ | ------------------------ | -------------------------- |
| **日誌**     | 記錄執行過程、參數、結果 | Interceptor、Middleware    |
| **授權**     | 檢查使用者權限           | AuthorizeAttribute、Policy |
| **快取**     | 避免重複計算             | IDistributedCache          |
| **審計**     | 追蹤資料變化             | Audit Logging Module       |
| **驗證**     | 檢查輸入資料             | FluentValidation           |
| **異常處理** | 統一錯誤回應             | ExceptionFilter            |

#### 在 ABP 中實現

```csharp
// ❌ 傳統方式：邏輯混雜
public async Task<BookDto> GetBookAsync(Guid id)
{
    // 日誌
    _logger.LogInformation($"Getting book {id}");

    // 授權
    if (!await _permissionChecker.IsGrantedAsync("Book.View"))
        throw new UnauthorizedAccessException();

    // 快取
    var cached = await _cache.GetAsync($"book:{id}");
    if (cached != null) return cached;

    // 業務邏輯
    var book = await _repository.GetAsync(id);

    // 快取存儲
    await _cache.SetAsync($"book:{id}", book);

    return book;
}

// ✅ ABP 方式：橫切關注分離
[Authorize("Book.View")]
[Cached("book:{0}", Duration = 600)]
[Audited]
public virtual async Task<BookDto> GetBookAsync(Guid id)
{
    // 只有業務邏輯
    var book = await _repository.GetAsync(id);
    return ObjectMapper.Map<Book, BookDto>(book);
}
```

---

## 習題 2：概念題 ⭐

**題目：Permission 與 Role 的區別？在 ABP 中如何定義與檢查？**

### 解答

| 特性     | Role（角色）          | Permission（權限）                  |
| -------- | --------------------- | ----------------------------------- |
| **粒度** | 粗                    | 細                                  |
| **例子** | Admin、User、Manager  | Book.Create、Book.Edit、Book.Delete |
| **層級** | 高級                  | 細粒度操作                          |
| **關係** | 可包含多個 Permission | 可分配給多個 Role                   |

#### 定義 Permission

```csharp
public class BookManagementPermissionDefinitionProvider : PermissionDefinitionProvider
{
    public override void Define(IPermissionDefinitionContext context)
    {
        var group = context.AddGroup("BookManagement", "圖書管理");

        var bookPermission = group.AddPermission(
            BookManagementPermissions.Books.Default,
            "瀏覽書籍"
        );

        bookPermission.AddChild(
            BookManagementPermissions.Books.Create,
            "創建書籍"
        );

        bookPermission.AddChild(
            BookManagementPermissions.Books.Edit,
            "編輯書籍"
        );

        bookPermission.AddChild(
            BookManagementPermissions.Books.Delete,
            "刪除書籍"
        );
    }
}

// 常數定義
public static class BookManagementPermissions
{
    public const string GroupName = "BookManagement";

    public static class Books
    {
        public const string Default = GroupName + ".Books";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
    }
}
```

#### 在應用層使用

```csharp
public class BookAppService : ApplicationService
{
    private readonly IRepository<Book, Guid> _repository;
    private readonly IPermissionChecker _permissionChecker;

    public BookAppService(
        IRepository<Book, Guid> repository,
        IPermissionChecker permissionChecker)
    {
        _repository = repository;
        _permissionChecker = permissionChecker;
    }

    // 方式 1：使用 Attribute
    [Authorize(BookManagementPermissions.Books.Create)]
    public async Task<BookDto> CreateAsync(CreateBookDto input)
    {
        var book = new Book(...);
        await _repository.InsertAsync(book);
        return ObjectMapper.Map<Book, BookDto>(book);
    }

    // 方式 2：手動檢查
    public async Task<List<BookDto>> GetAllAsync()
    {
        if (!await _permissionChecker.IsGrantedAsync(BookManagementPermissions.Books.Default))
            throw new UnauthorizedAccessException("無權瀏覽書籍");

        var books = await _repository.GetListAsync();
        return ObjectMapper.Map<List<Book>, List<BookDto>>(books);
    }

    // 方式 3：策略授權
    [Authorize(policy: "BookManager")]
    public async Task<BookDto> ApproveAsync(Guid id)
    {
        var book = await _repository.GetAsync(id);
        book.Approve();
        await _repository.UpdateAsync(book);
        return ObjectMapper.Map<Book, BookDto>(book);
    }
}
```

#### Role 與 Permission 映射

```csharp
// 在身份管理中設定
public class RoleInitializer
{
    public async Task InitializeAsync(IServiceProvider serviceProvider)
    {
        var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();

        // 建立 Admin 角色
        var adminRole = new IdentityRole { Name = "Admin" };
        await roleManager.CreateAsync(adminRole);

        // 分配所有權限給 Admin
        await roleManager.AddPermissionAsync(adminRole,
            BookManagementPermissions.Books.Create);
        await roleManager.AddPermissionAsync(adminRole,
            BookManagementPermissions.Books.Edit);
        await roleManager.AddPermissionAsync(adminRole,
            BookManagementPermissions.Books.Delete);

        // 建立 Reader 角色（僅瀏覽權限）
        var readerRole = new IdentityRole { Name = "Reader" };
        await roleManager.CreateAsync(readerRole);

        await roleManager.AddPermissionAsync(readerRole,
            BookManagementPermissions.Books.Default);
    }
}
```

---

## 習題 3：計算/練習題 ⭐⭐

**題目：實作一個 Permission 檢查機制，包含父子權限關係與繼承。**

### 解答

#### 權限層級結構

```
Book.Default (瀏覽書籍)
├── Book.Create (創建)
├── Book.Edit (編輯)
│   ├── Book.Edit.Title (編輯標題)
│   └── Book.Edit.Price (編輯價格)
└── Book.Delete (刪除)
```

#### 定義實現

```csharp
public class AdvancedPermissionDefinitionProvider : PermissionDefinitionProvider
{
    public override void Define(IPermissionDefinitionContext context)
    {
        var group = context.AddGroup("BookManagement");

        var defaultPermission = group.AddPermission("Book.Default", "瀏覽書籍");

        var createPermission = defaultPermission.AddChild("Book.Create", "創建書籍");

        var editPermission = defaultPermission.AddChild("Book.Edit", "編輯書籍");
        editPermission.AddChild("Book.Edit.Title", "編輯標題");
        editPermission.AddChild("Book.Edit.Price", "編輯價格");

        defaultPermission.AddChild("Book.Delete", "刪除書籍");
    }
}
```

#### 檢查實現

```csharp
public class PermissionCheckService
{
    private readonly IPermissionChecker _permissionChecker;

    public PermissionCheckService(IPermissionChecker permissionChecker)
    {
        _permissionChecker = permissionChecker;
    }

    // 檢查權限及所有子權限
    public async Task<bool> HasPermissionWithChildrenAsync(string permission)
    {
        // 檢查該權限或任何子權限
        var hasParent = await _permissionChecker.IsGrantedAsync(permission);

        if (hasParent)
            return true;

        // 此處可實現檢查子權限的邏輯
        return false;
    }

    // 限制編輯：只允許編輯標題或價格
    public async Task<bool> CanEditBookAsync(BookEditType editType)
    {
        return editType switch
        {
            BookEditType.Title => await _permissionChecker.IsGrantedAsync("Book.Edit.Title"),
            BookEditType.Price => await _permissionChecker.IsGrantedAsync("Book.Edit.Price"),
            _ => false
        };
    }
}

public enum BookEditType
{
    Title,
    Price,
    All
}
```

---

## 習題 4：計算/練習題 ⭐⭐

**題目：實作日誌與審計，記錄所有 Book 的 CRUD 操作。**

### 解答

#### 啟用審計

```csharp
public class InfrastructureModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        // 啟用審計日誌
        Configure<AbpAuditingOptions>(options =>
        {
            options.IsEnabled = true;
            options.IsEnabledForGetRequests = true;
            options.AlwaysLogSelectors.Add(typeof(BookAppService));
        });

        // 配置要審計的實體
        Configure<AbpAuditedEntityOptions>(options =>
        {
            options.IsEnabled = true;
            options.EntityHistorySelectors.Add(
                new FullAuditedEntityHistorySelector(typeof(Book)));
        });
    }
}
```

#### 自訂日誌 Interceptor

```csharp
public class BookLoggingInterceptor : AbpInterceptor
{
    private readonly ILogger<BookLoggingInterceptor> _logger;

    public BookLoggingInterceptor(ILogger<BookLoggingInterceptor> logger)
    {
        _logger = logger;
    }

    public override async Task InterceptAsync(AbpMethodInvocationContext context)
    {
        var methodName = context.Method.Name;
        var parameters = context.Method.GetParameters();

        _logger.LogInformation($"開始執行 {methodName}");

        try
        {
            await context.Proceed();
            _logger.LogInformation($"{methodName} 執行成功");
        }
        catch (Exception ex)
        {
            _logger.LogError($"{methodName} 執行失敗: {ex.Message}");
            throw;
        }
    }
}

// 註冊
context.Services.AddScoped(typeof(BookLoggingInterceptor));
```

#### 審計查詢

```csharp
public class AuditLogAppService : ApplicationService
{
    private readonly IAuditLogRepository _auditLogRepository;

    public AuditLogAppService(IAuditLogRepository auditLogRepository)
    {
        _auditLogRepository = auditLogRepository;
    }

    public async Task<List<AuditLog>> GetBookAuditLogsAsync(Guid bookId)
    {
        var auditLogs = await _auditLogRepository.GetListAsync();

        return auditLogs
            .Where(log => log.EntityId == bookId.ToString() &&
                         log.EntityType == nameof(Book))
            .ToList();
    }
}
```

---

## 習題 5 & 6：實作題

_(簡化版本，詳見第二章解答範本)_

---

## 參考資源

- [ABP 官方文檔 - Authorization](https://docs.abp.io/en/abp/latest/Authorization)（content7）
- [ABP 官方文檔 - Auditing](https://docs.abp.io/en/abp/latest/Audit-Logging)（content7）
- [ABP 官方文檔 - Logging](https://docs.abp.io/en/abp/latest/Logging)（content7）
