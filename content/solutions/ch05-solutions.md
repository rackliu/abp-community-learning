# 第五章習題解答

## 習題 1：概念題 ⭐

**題目：解釋 ABP Module 的生命週期中 ConfigureServices、Configure、OnApplicationInitialization 三個方法的執行順序與職責。**

### 解答

#### 執行順序與職責

```
1. ConfigureServices（啟動前 - 依賴注入階段）
   ├─ 用途：註冊服務、配置選項、加載模組依賴
   ├─ 執行時機：應用啟動時，在所有 HTTP 請求前
   └─ 特點：可訪問 IServiceCollection，不可訪問 HttpContext

2. Configure（啟動中 - 中介軟體配置階段）
   ├─ 用途：配置 HTTP 中介軟體、請求管道
   ├─ 執行時機：在 ConfigureServices 之後
   └─ 特點：可配置 IApplicationBuilder

3. OnApplicationInitialization（啟動後 - 初始化階段）
   ├─ 用途：執行初始化邏輯、資料庫種子、外部服務連接
   ├─ 執行時機：應用已可處理請求，但在首個請求前
   └─ 特點：可訪問 DI 容器和 HttpContext
```

#### 代碼示例

```csharp
public class MyModule : AbpModule
{
    // 1. 第一步：註冊服務（必須）
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        var services = context.Services;
        var configuration = context.Services.GetConfiguration();

        // 註冊自訂服務
        services.AddScoped<IMyService, MyService>();

        // 配置選項
        Configure<MyModuleOptions>(options =>
        {
            options.Enabled = configuration["MyModule:Enabled"] == "true";
        });

        // 新增外部庫
        services.AddMemoryCache();
    }

    // 2. 第二步：配置中介軟體（可選）
    public override void Configure(ModuleConfigurationContext context)
    {
        var app = context.GetApplicationBuilder();

        // 注冊自訂中介軟體
        app.UseMiddleware<MyCustomMiddleware>();
    }

    // 3. 第三步：應用初始化（可選）
    public override async Task OnApplicationInitializationAsync(ApplicationInitializationContext context)
    {
        var logger = context.ServiceProvider.GetRequiredService<ILogger<MyModule>>();
        var myService = context.ServiceProvider.GetRequiredService<IMyService>();

        logger.LogInformation("MyModule 初始化中...");

        // 執行初始化邏輯
        await myService.InitializeAsync();

        logger.LogInformation("MyModule 初始化完成");
    }

    // 應用關閉時清理
    public override async Task OnApplicationShutdownAsync(ApplicationShutdownContext context)
    {
        var logger = context.ServiceProvider.GetRequiredService<ILogger<MyModule>>();
        logger.LogInformation("MyModule 正在關閉...");
    }
}
```

#### 常見陷阱

```csharp
// ❌ 錯誤：在 ConfigureServices 中訪問 HttpContext
public override void ConfigureServices(ServiceConfigurationContext context)
{
    var httpContext = context.GetHttpContext(); // ❌ 會拋出異常
}

// ✅ 正確：在 OnApplicationInitialization 中訪問
public override async Task OnApplicationInitializationAsync(ApplicationInitializationContext context)
{
    var app = context.GetApplicationBuilder();
    // 現在可以訪問應用上下文
}

// ❌ 錯誤：在 ConfigureServices 中執行阻塞 I/O
public override void ConfigureServices(ServiceConfigurationContext context)
{
    var db = context.ServiceProvider.GetRequiredService<MyDbContext>();
    db.Database.Migrate(); // ❌ 阻塞啟動
}

// ✅ 正確：在 OnApplicationInitialization 中執行
public override async Task OnApplicationInitializationAsync(ApplicationInitializationContext context)
{
    var db = context.ServiceProvider.GetRequiredService<MyDbContext>();
    await db.Database.MigrateAsync();
}
```

---

## 習題 2：概念題 ⭐

**題目：說明依賴注入中服務生命週期的三種類型：Transient、Scoped、Singleton，各適用場景。**

### 解答

#### 三種生命週期對比

| 類型          | 生命週期                 | 使用次數       | 記憶體 | 線程安全 | 適用場景            |
| ------------- | ------------------------ | -------------- | ------ | -------- | ------------------- |
| **Transient** | 每次請求都建立新實例     | 每次呼叫都新建 | 較多   | ✓        | 無狀態服務、工具類  |
| **Scoped**    | 每個 HTTP 請求建立一個   | 同一請求內重用 | 中等   | ✓        | DbContext、業務服務 |
| **Singleton** | 整個應用生命週期只有一個 | 全局共享       | 少     | ❌       | 配置、快取、連線池  |

#### 代碼示例

```csharp
// 定義三個服務
public interface ITransientService { Guid Id { get; } }
public interface IScopedService { Guid Id { get; } }
public interface ISingletonService { Guid Id { get; } }

public class TransientService : ITransientService { public Guid Id { get; } = Guid.NewGuid(); }
public class ScopedService : IScopedService { public Guid Id { get; } = Guid.NewGuid(); }
public class SingletonService : ISingletonService { public Guid Id { get; } = Guid.NewGuid(); }

// 註冊
services.AddTransient<ITransientService, TransientService>();
services.AddScoped<IScopedService, ScopedService>();
services.AddSingleton<ISingletonService, SingletonService>();

// 測試
public class LifecycleTests
{
    [Fact]
    public void Transient_CreatesNewInstanceEveryTime()
    {
        var id1 = _serviceProvider.GetRequiredService<ITransientService>().Id;
        var id2 = _serviceProvider.GetRequiredService<ITransientService>().Id;
        Assert.NotEqual(id1, id2); // ✓ 每次不同
    }

    [Fact]
    public void Scoped_ReusesInstanceInSameScope()
    {
        using (var scope = _serviceProvider.CreateScope())
        {
            var id1 = scope.ServiceProvider.GetRequiredService<IScopedService>().Id;
            var id2 = scope.ServiceProvider.GetRequiredService<IScopedService>().Id;
            Assert.Equal(id1, id2); // ✓ 同一 scope 相同
        }

        using (var scope2 = _serviceProvider.CreateScope())
        {
            var id3 = scope2.ServiceProvider.GetRequiredService<IScopedService>().Id;
            var id4 = scope2.ServiceProvider.GetRequiredService<IScopedService>().Id;
            Assert.Equal(id3, id4); // ✓ 第二個 scope 相同
            Assert.NotEqual(id1, id3); // ✓ 跨 scope 不同
        }
    }

    [Fact]
    public void Singleton_ReusesInstanceGlobally()
    {
        var id1 = _serviceProvider.GetRequiredService<ISingletonService>().Id;
        var id2 = _serviceProvider.GetRequiredService<ISingletonService>().Id;
        var id3 = _serviceProvider.GetRequiredService<ISingletonService>().Id;

        Assert.Equal(id1, id2);
        Assert.Equal(id2, id3); // ✓ 全局相同
    }
}
```

#### 實務建議

```csharp
// ✅ Transient：無狀態、無副作用
services.AddTransient<IEmailValidator, EmailValidator>();
services.AddTransient<IPasswordHasher, PasswordHasher>();

// ✅ Scoped：需要隔離的業務邏輯（DbContext 默認 Scoped）
services.AddScoped<IUnitOfWork, UnitOfWork>();
services.AddScoped<IRepository<Book>, BookRepository>();
services.AddScoped<BookAppService>();

// ✅ Singleton：全局配置、快取、連線
services.AddSingleton<IConfiguration>(configuration);
services.AddSingleton<IDistributedCache, MemoryCache>();
services.AddSingleton<HttpClientFactory>();

// ❌ 避免：Singleton 中含有 Scoped 服務（會導致記憶體洩漏）
// services.AddSingleton<MyService>(); // 含有 IRepository 注入 ❌
```

---

## 習題 3：計算/練習題 ⭐⭐

**題目：設計一個 ABP Module 結構，包含多個子模組的依賴關係。描述注冊順序與常見錯誤。**

### 解答

#### Module 依賴結構設計

```
┌─────────────────────────┐
│  ApplicationModule      │ （主應用模組）
│  DependsOn:             │
│  - CoreModule           │
│  - InfrastructureModule │
└─────────────────────────┘
         ↑         ↑
         │         │
    ┌────┴─────────┴─────┐
    │                    │
┌───┴───────────┐  ┌─────┴────────────┐
│ CoreModule    │  │ InfrastructureModule
│ DependsOn:    │  │ DependsOn:
│ - AbpModule   │  │ - CoreModule
└───────────────┘  │ - AbpEFCoreModule
                   └──────────────────┘
```

#### 代碼實現

```csharp
// 1. 核心模組（最底層）
[DependsOn(typeof(AbpCoreModule))]
public class CoreModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        // 註冊核心服務
        context.Services.AddScoped<ICurrentUser, CurrentUser>();
        context.Services.AddScoped<IPermissionChecker, PermissionChecker>();
    }
}

// 2. 基礎設施模組
[DependsOn(
    typeof(CoreModule),
    typeof(AbpEntityFrameworkCoreModule),
    typeof(AbpAuditingModule))]
public class InfrastructureModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        // 註冊 DbContext
        context.Services.AddAbpDbContext<AppDbContext>();

        // 配置 EF Core
        Configure<AbpDbContextOptions>(options =>
        {
            options.UseNpgsql(); // PostgreSQL
        });
    }
}

// 3. 應用層模組
[DependsOn(
    typeof(CoreModule),
    typeof(InfrastructureModule),
    typeof(AbpApplicationModule))]
public class ApplicationModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        // 自動對映 DTO
        context.Services.AddAutoMapper(typeof(ApplicationModule));

        // 註冊應用服務
        var assembly = typeof(ApplicationModule).Assembly;
        context.Services.AddAssemblyOf<ApplicationModule>(assembly);
    }

    public override async Task OnApplicationInitializationAsync(ApplicationInitializationContext context)
    {
        var logger = context.ServiceProvider.GetRequiredService<ILogger<ApplicationModule>>();
        logger.LogInformation("ApplicationModule 初始化完成");

        // 執行資料庫遷移
        var dbContext = context.ServiceProvider.GetRequiredService<AppDbContext>();
        await dbContext.Database.MigrateAsync();
    }
}

// 4. Web 模組（頂層）
[DependsOn(
    typeof(ApplicationModule),
    typeof(AbpAspNetCoreMvcModule),
    typeof(AbpAutofacModule))]
public class WebModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        context.Services.AddControllersWithViews();
        context.Services.AddRazorPages();
    }

    public override void Configure(ModuleConfigurationContext context)
    {
        var app = context.GetApplicationBuilder();
        app.UseRouting();
        app.UseEndpoints(endpoints =>
        {
            endpoints.MapControllers();
            endpoints.MapRazorPages();
        });
    }
}
```

#### 常見錯誤與解決

```csharp
// ❌ 錯誤 1：循環依賴
[DependsOn(typeof(ModuleB))]
public class ModuleA : AbpModule { }

[DependsOn(typeof(ModuleA))]
public class ModuleB : AbpModule { }
// 結果：啟動時拋出 "Circular dependency detected"

// ✅ 解決：重新整理依賴關係，確保是單向有向無環圖

// ❌ 錯誤 2：遺漏依賴聲明
public class MyModule : AbpModule
{
    // 在 ConfigureServices 中使用 _repository，但未聲明對 InfrastructureModule 的依賴
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        var services = context.Services;
        // services.AddScoped<IRepository<Book>>(); ❌ InfrastructureModule 未載入
    }
}

// ✅ 解決：正確聲明依賴
[DependsOn(typeof(InfrastructureModule))]
public class MyModule : AbpModule { }

// ❌ 錯誤 3：在 ConfigureServices 中執行 I/O
public override void ConfigureServices(ServiceConfigurationContext context)
{
    // await externalApi.FetchData(); ❌ ConfigureServices 不能是 async
}

// ✅ 解決：在 OnApplicationInitialization 中執行
public override async Task OnApplicationInitializationAsync(ApplicationInitializationContext context)
{
    var externalService = context.ServiceProvider.GetRequiredService<IExternalService>();
    await externalService.FetchDataAsync();
}
```

---

## 習題 4：計算/練習題 ⭐⭐

**題目：在 ABP 應用中配置三個不同的連線字串（主資料庫、快取 DB、報表 DB），並在應用中正確使用。**

### 解答

#### 1. appsettings.json 配置

```json
{
  "ConnectionStrings": {
    "Default": "Server=localhost;Database=MainDb;User Id=sa;Password=123456",
    "Cache": "localhost:6379,ssl=False",
    "Reporting": "Server=localhost;Database=ReportDb;User Id=sa;Password=123456"
  }
}
```

#### 2. Module 中配置

```csharp
[DependsOn(typeof(AbpEntityFrameworkCoreModule))]
public class InfrastructureModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        var configuration = context.Services.GetConfiguration();

        // 主資料庫（EF Core）
        context.Services.AddAbpDbContext<AppDbContext>(options =>
        {
            options.UseNpgsql(
                configuration.GetConnectionString("Default"),
                b => b.MigrationsAssembly("YourApp.EntityFrameworkCore")
            );
        });

        // 報表資料庫（唯讀，單獨 DbContext）
        context.Services.AddAbpDbContext<ReportingDbContext>(options =>
        {
            options.UseNpgsql(
                configuration.GetConnectionString("Reporting"),
                b => b.MigrationsAssembly("YourApp.EntityFrameworkCore.Reporting")
            );
        });

        // 分散式快取（Redis）
        context.Services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = configuration.GetConnectionString("Cache");
        });
    }
}
```

#### 3. 多個 DbContext 定義

```csharp
// 主應用 DbContext
[ConnectionStringName("Default")]
public class AppDbContext : AbpDbContext<AppDbContext>
{
    public DbSet<Book> Books { get; set; }
    public DbSet<User> Users { get; set; }

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
}

// 報表 DbContext（唯讀）
[ConnectionStringName("Reporting")]
public class ReportingDbContext : AbpDbContext<ReportingDbContext>
{
    public DbSet<SalesReport> SalesReports { get; set; }
    public DbSet<UserAnalytics> UserAnalytics { get; set; }

    public ReportingDbContext(DbContextOptions<ReportingDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 設定所有實體為唯讀
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            entity.SetTableName(entity.GetTableName(), schema: "reports");
        }
    }
}
```

#### 4. 服務中使用

```csharp
public class BookAppService : ApplicationService
{
    private readonly IRepository<Book> _bookRepository; // 主 DB
    private readonly ReportingDbContext _reportingDb;   // 報表 DB
    private readonly IDistributedCache _cache;           // Redis

    public BookAppService(
        IRepository<Book> bookRepository,
        ReportingDbContext reportingDb,
        IDistributedCache cache)
    {
        _bookRepository = bookRepository;
        _reportingDb = reportingDb;
        _cache = cache;
    }

    public async Task<BookDto> GetBookAsync(Guid id)
    {
        // 嘗試從快取取
        var cacheKey = $"book:{id}";
        var cachedData = await _cache.GetAsync(cacheKey);
        if (cachedData != null)
        {
            return JsonConvert.DeserializeObject<BookDto>(
                Encoding.UTF8.GetString(cachedData));
        }

        // 從主 DB 查詢
        var book = await _bookRepository.GetAsync(id);
        var dto = ObjectMapper.Map<Book, BookDto>(book);

        // 存入快取
        await _cache.SetAsync(
            cacheKey,
            Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(dto)),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10) }
        );

        return dto;
    }

    public async Task<List<SalesReportDto>> GetSalesReportsAsync()
    {
        // 從報表 DB 查詢（唯讀）
        var reports = await _reportingDb.SalesReports
            .Where(r => r.Date >= DateTime.Now.AddDays(-30))
            .ToListAsync();

        return ObjectMapper.Map<List<SalesReport>, List<SalesReportDto>>(reports);
    }
}
```

#### 5. 資料庫遷移管理

```bash
# 主 DB 遷移
cd src/YourApp.EntityFrameworkCore
dotnet ef migrations add InitialCreate --project . --startup-project ../YourApp.Web
dotnet ef database update

# 報表 DB 遷移（分開管理）
dotnet ef migrations add InitialCreate --project . --startup-project ../YourApp.Web -o Migrations/Reporting -c ReportingDbContext
dotnet ef database update -c ReportingDbContext
```

---

## 習題 5 & 6：實作題

_(由於篇幅限制，請參考第二章解答的實作題模式)_

---

## 參考資源

- [ABP 官方文檔 - Dependency Injection](https://docs.abp.io/en/abp/latest/Dependency-Injection)（content7）
- [ABP 官方文檔 - DbContext Integration](https://docs.abp.io/en/abp/latest/Entity-Framework-Core)（content7）
- [ASP.NET Core DI 文檔](https://docs.microsoft.com/en-us/dotnet/core/extensions/dependency-injection)
