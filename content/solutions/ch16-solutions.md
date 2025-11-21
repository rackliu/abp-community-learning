# 第十六章：多租戶架構 - 習題解答

本文件提供第十六章實戰練習的完整解答，涵蓋多租戶應用建立、Feature-based 定價和獨立資料庫遷移。

---

## 練習 1：建立多租戶應用

### 題目

1. 啟用多租戶功能。
2. 建立兩個租戶：`TenantA` 與 `TenantB`。
3. 分別以兩個租戶的身分建立書籍，驗證資料隔離。

### 解答

#### 步驟 1：啟用多租戶功能

```csharp
// BookStore.Domain/BookStoreDomainModule.cs
using Volo.Abp.MultiTenancy;

[DependsOn(typeof(AbpMultiTenancyModule))]
public class BookStoreDomainModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        Configure<AbpMultiTenancyOptions>(options =>
        {
            options.IsEnabled = true;
        });
    }
}
```

#### 步驟 2：確保實體實作 IMultiTenant

```csharp
// BookStore.Domain/Books/Book.cs
using Volo.Abp.MultiTenancy;

public class Book : FullAuditedAggregateRoot<Guid>, IMultiTenant
{
    public Guid? TenantId { get; set; } // ABP 會自動管理此欄位

    public string Name { get; set; }
    public BookType Type { get; set; }
    public DateTime PublishDate { get; set; }
    public float Price { get; set; }

    // ... 其他屬性和方法
}
```

#### 步驟 3：建立租戶（使用 UI 或程式碼）

**方法 1：使用 ABP 內建的租戶管理 UI**

1. 啟動應用程式
2. 以 admin 身分登入
3. 導航至「管理」→「租戶」
4. 點擊「新增租戶」
5. 輸入租戶名稱：`TenantA`
6. 設定管理員 Email 和密碼
7. 重複步驟建立 `TenantB`

**方法 2：使用程式碼建立**

```csharp
// BookStore.DbMigrator/DbMigratorHostedService.cs
using Volo.Abp.TenantManagement;

public class DbMigratorHostedService : IHostedService
{
    private readonly ITenantManager _tenantManager;
    private readonly ITenantRepository _tenantRepository;

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        // 建立 TenantA
        var tenantA = await _tenantManager.CreateAsync("TenantA");
        await _tenantRepository.InsertAsync(tenantA);

        // 建立 TenantB
        var tenantB = await _tenantManager.CreateAsync("TenantB");
        await _tenantRepository.InsertAsync(tenantB);

        await _unitOfWorkManager.Current.SaveChangesAsync();
    }
}
```

#### 步驟 4：配置租戶解析器

```csharp
// BookStore.HttpApi.Host/BookStoreHttpApiHostModule.cs
using Volo.Abp.MultiTenancy;

public override void ConfigureServices(ServiceConfigurationContext context)
{
    Configure<AbpTenantResolveOptions>(options =>
    {
        // 優先使用 Header 解析
        options.TenantResolvers.Clear();
        options.TenantResolvers.Add(new HeaderTenantResolveContributor());
        options.TenantResolvers.Add(new QueryStringTenantResolveContributor());
        options.TenantResolvers.Add(new CookieTenantResolveContributor());
    });
}
```

#### 步驟 5：測試資料隔離

**使用 Postman 或 curl 測試**：

```bash
# 為 TenantA 建立書籍
curl -X POST http://localhost:5000/api/app/book \
  -H "Content-Type: application/json" \
  -H "__tenant: TenantA" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "TenantA的書籍",
    "type": 0,
    "publishDate": "2024-01-01",
    "price": 99.99
  }'

# 為 TenantB 建立書籍
curl -X POST http://localhost:5000/api/app/book \
  -H "Content-Type: application/json" \
  -H "__tenant: TenantB" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "TenantB的書籍",
    "type": 1,
    "publishDate": "2024-01-01",
    "price": 199.99
  }'

# 查詢 TenantA 的書籍（應該只看到 TenantA 的書）
curl -X GET http://localhost:5000/api/app/book \
  -H "__tenant: TenantA" \
  -H "Authorization: Bearer <token>"

# 查詢 TenantB 的書籍（應該只看到 TenantB 的書）
curl -X GET http://localhost:5000/api/app/book \
  -H "__tenant: TenantB" \
  -H "Authorization: Bearer <token>"
```

#### 步驟 6：在資料庫中驗證

```sql
-- 查看所有書籍及其租戶
SELECT Id, Name, TenantId FROM AppBooks;

-- 應該看到：
-- | Id | Name | TenantId |
-- | ... | TenantA的書籍 | <TenantA的GUID> |
-- | ... | TenantB的書籍 | <TenantB的GUID> |
```

#### 步驟 7：在程式碼中手動切換租戶（用於測試或後台任務）

```csharp
// 測試程式碼
public class BookServiceTests
{
    private readonly ICurrentTenant _currentTenant;
    private readonly IBookAppService _bookAppService;

    [Fact]
    public async Task Should_Isolate_Data_Between_Tenants()
    {
        Guid tenantAId = /* TenantA 的 ID */;
        Guid tenantBId = /* TenantB 的 ID */;

        // 以 TenantA 身分建立書籍
        Guid bookIdA;
        using (_currentTenant.Change(tenantAId))
        {
            var book = await _bookAppService.CreateAsync(new CreateUpdateBookDto
            {
                Name = "TenantA的書籍",
                Type = BookType.Adventure,
                PublishDate = DateTime.Now,
                Price = 99.99f
            });
            bookIdA = book.Id;
        }

        // 以 TenantB 身分查詢，應該查不到 TenantA 的書
        using (_currentTenant.Change(tenantBId))
        {
            var books = await _bookAppService.GetListAsync(new PagedAndSortedResultRequestDto());
            books.Items.ShouldNotContain(b => b.Id == bookIdA);
        }
    }
}
```

---

## 練習 2：實作 Feature-based 定價

### 題目

1. 定義三個 Features：`MaxUsers`, `AdvancedReporting`, `APIAccess`。
2. 建立三個定價方案：
   - **Basic**: MaxUsers=10, 其他關閉。
   - **Pro**: MaxUsers=100, AdvancedReporting=開啟。
   - **Enterprise**: 全部開啟。
3. 為不同租戶設定不同方案，並測試功能限制。

### 解答

#### 步驟 1：定義 Features

```csharp
// BookStore.Domain.Shared/Features/BookStoreFeatureDefinitionProvider.cs
using Volo.Abp.Features;
using Volo.Abp.Localization;
using Volo.Abp.Validation.StringValues;

namespace BookStore.Features
{
    public class BookStoreFeatureDefinitionProvider : FeatureDefinitionProvider
    {
        public override void Define(IFeatureDefinitionContext context)
        {
            var group = context.AddGroup("BookStore", L("Feature:BookStore"));

            // 最大使用者數
            group.AddFeature(
                BookStoreFeatures.MaxUsers,
                defaultValue: "10",
                displayName: L("Feature:MaxUsers"),
                description: L("Feature:MaxUsersDescription"),
                valueType: new FreeTextStringValueType(
                    new NumericValueValidator(1, 10000))
            );

            // 進階報表功能
            group.AddFeature(
                BookStoreFeatures.AdvancedReporting,
                defaultValue: "false",
                displayName: L("Feature:AdvancedReporting"),
                description: L("Feature:AdvancedReportingDescription"),
                valueType: new ToggleStringValueType()
            );

            // API 存取權限
            group.AddFeature(
                BookStoreFeatures.APIAccess,
                defaultValue: "false",
                displayName: L("Feature:APIAccess"),
                description: L("Feature:APIAccessDescription"),
                valueType: new ToggleStringValueType()
            );
        }

        private static LocalizableString L(string name)
        {
            return LocalizableString.Create<BookStoreResource>(name);
        }
    }
}
```

```csharp
// BookStore.Domain.Shared/Features/BookStoreFeatures.cs
namespace BookStore.Features
{
    public static class BookStoreFeatures
    {
        public const string GroupName = "BookStore";

        public const string MaxUsers = GroupName + ".MaxUsers";
        public const string AdvancedReporting = GroupName + ".AdvancedReporting";
        public const string APIAccess = GroupName + ".APIAccess";
    }
}
```

#### 步驟 2：建立定價方案服務

```csharp
// BookStore.Domain/Pricing/PricingPlan.cs
namespace BookStore.Pricing
{
    public enum PricingPlan
    {
        Basic,
        Pro,
        Enterprise
    }

    public class PricingPlanConfiguration
    {
        public int MaxUsers { get; set; }
        public bool AdvancedReporting { get; set; }
        public bool APIAccess { get; set; }

        public static PricingPlanConfiguration GetConfiguration(PricingPlan plan)
        {
            return plan switch
            {
                PricingPlan.Basic => new PricingPlanConfiguration
                {
                    MaxUsers = 10,
                    AdvancedReporting = false,
                    APIAccess = false
                },
                PricingPlan.Pro => new PricingPlanConfiguration
                {
                    MaxUsers = 100,
                    AdvancedReporting = true,
                    APIAccess = false
                },
                PricingPlan.Enterprise => new PricingPlanConfiguration
                {
                    MaxUsers = 10000,
                    AdvancedReporting = true,
                    APIAccess = true
                },
                _ => throw new ArgumentException("Invalid pricing plan", nameof(plan))
            };
        }
    }
}
```

```csharp
// BookStore.Application/Pricing/PricingPlanAppService.cs
using Volo.Abp.Features;
using BookStore.Features;

namespace BookStore.Pricing
{
    public class PricingPlanAppService : ApplicationService
    {
        private readonly IFeatureManager _featureManager;

        public PricingPlanAppService(IFeatureManager featureManager)
        {
            _featureManager = featureManager;
        }

        public async Task SetPricingPlanAsync(Guid tenantId, PricingPlan plan)
        {
            var config = PricingPlanConfiguration.GetConfiguration(plan);

            await _featureManager.SetForTenantAsync(
                tenantId,
                BookStoreFeatures.MaxUsers,
                config.MaxUsers.ToString());

            await _featureManager.SetForTenantAsync(
                tenantId,
                BookStoreFeatures.AdvancedReporting,
                config.AdvancedReporting.ToString().ToLowerInvariant());

            await _featureManager.SetForTenantAsync(
                tenantId,
                BookStoreFeatures.APIAccess,
                config.APIAccess.ToString().ToLowerInvariant());
        }
    }
}
```

#### 步驟 3：在應用服務中檢查 Features

```csharp
// BookStore.Application/Users/UserAppService.cs
using Volo.Abp.Features;
using BookStore.Features;

public class UserAppService : ApplicationService
{
    public async Task<UserDto> CreateAsync(CreateUserDto input)
    {
        // 檢查是否超過最大使用者數限制
        var maxUsers = await FeatureChecker.GetAsync<int>(BookStoreFeatures.MaxUsers);
        var currentUserCount = await _userRepository.GetCountAsync();

        if (currentUserCount >= maxUsers)
        {
            throw new BusinessException("BookStore:MaxUsersExceeded")
                .WithData("MaxUsers", maxUsers)
                .WithData("CurrentUsers", currentUserCount);
        }

        // 建立使用者...
    }
}
```

```csharp
// BookStore.Application/Reports/ReportAppService.cs
using Volo.Abp.Features;
using BookStore.Features;

public class ReportAppService : ApplicationService
{
    [RequiresFeature(BookStoreFeatures.AdvancedReporting)]
    public async Task<byte[]> GenerateAdvancedReportAsync(ReportInput input)
    {
        // 只有啟用進階報表功能的租戶才能呼叫此方法
        // ABP 會自動檢查並拋出異常

        // 生成報表邏輯...
    }

    public async Task<byte[]> GenerateBasicReportAsync(ReportInput input)
    {
        // 所有租戶都可以使用基本報表

        // 生成報表邏輯...
    }
}
```

```csharp
// BookStore.HttpApi/Controllers/ApiController.cs
using Microsoft.AspNetCore.Mvc;
using Volo.Abp.Features;
using BookStore.Features;

[ApiController]
[Route("api/[controller]")]
public class BooksApiController : AbpController
{
    private readonly IFeatureChecker _featureChecker;
    private readonly IBookAppService _bookAppService;

    [HttpGet]
    public async Task<IActionResult> GetListAsync()
    {
        // 檢查 API 存取權限
        if (!await _featureChecker.IsEnabledAsync(BookStoreFeatures.APIAccess))
        {
            return Forbid("API access is not enabled for your plan");
        }

        var books = await _bookAppService.GetListAsync(new PagedAndSortedResultRequestDto());
        return Ok(books);
    }
}
```

#### 步驟 4：設定租戶的定價方案

```csharp
// 在 DbMigrator 或管理介面中設定
public async Task SeedTenantsAsync()
{
    var tenantA = await _tenantRepository.FindByNameAsync("TenantA");
    var tenantB = await _tenantRepository.FindByNameAsync("TenantB");
    var tenantC = await _tenantRepository.FindByNameAsync("TenantC");

    // TenantA: Basic 方案
    await _pricingPlanAppService.SetPricingPlanAsync(tenantA.Id, PricingPlan.Basic);

    // TenantB: Pro 方案
    await _pricingPlanAppService.SetPricingPlanAsync(tenantB.Id, PricingPlan.Pro);

    // TenantC: Enterprise 方案
    await _pricingPlanAppService.SetPricingPlanAsync(tenantC.Id, PricingPlan.Enterprise);
}
```

#### 步驟 5：在 UI 中顯示方案限制

```razor
@* Blazor 範例 *@
@inject IFeatureChecker FeatureChecker

<Card>
    <CardHeader>
        <h3>您的方案</h3>
    </CardHeader>
    <CardBody>
        <p>最大使用者數：@maxUsers</p>
        <p>進階報表：@(advancedReporting ? "✓ 已啟用" : "✗ 未啟用")</p>
        <p>API 存取：@(apiAccess ? "✓ 已啟用" : "✗ 未啟用")</p>

        @if (!advancedReporting)
        {
            <Alert Color="Color.Info">
                升級至 Pro 方案以使用進階報表功能
            </Alert>
        }
    </CardBody>
</Card>

@code {
    private int maxUsers;
    private bool advancedReporting;
    private bool apiAccess;

    protected override async Task OnInitializedAsync()
    {
        maxUsers = await FeatureChecker.GetAsync<int>(BookStoreFeatures.MaxUsers);
        advancedReporting = await FeatureChecker.IsEnabledAsync(BookStoreFeatures.AdvancedReporting);
        apiAccess = await FeatureChecker.IsEnabledAsync(BookStoreFeatures.APIAccess);
    }
}
```

---

## 練習 3：獨立資料庫遷移

### 題目

1. 為一個租戶配置獨立的資料庫連線字串。
2. 實作自動遷移腳本，在租戶建立時自動建立並初始化資料庫。

### 解答

#### 步驟 1：配置租戶的獨立連線字串

```csharp
// BookStore.Application/Tenants/TenantAppService.cs
using Volo.Abp.TenantManagement;

public class TenantAppService : ApplicationService
{
    private readonly ITenantManager _tenantManager;
    private readonly ITenantRepository _tenantRepository;

    public async Task<TenantDto> CreateWithDatabaseAsync(CreateTenantWithDatabaseDto input)
    {
        // 建立租戶
        var tenant = await _tenantManager.CreateAsync(input.Name);

        // 設定獨立的連線字串
        var connectionString = BuildConnectionString(input.Name, input.DatabaseServer);
        tenant.SetConnectionString(connectionString);

        await _tenantRepository.InsertAsync(tenant);

        return ObjectMapper.Map<Tenant, TenantDto>(tenant);
    }

    private string BuildConnectionString(string tenantName, string server)
    {
        return $"Server={server};Database=BookStore_{tenantName};User Id=sa;Password=YourPassword;TrustServerCertificate=True";
    }
}
```

#### 步驟 2：實作資料庫遷移服務

```csharp
// BookStore.Domain/Tenants/TenantDatabaseMigrationService.cs
using Microsoft.EntityFrameworkCore;
using Volo.Abp.DependencyInjection;
using Volo.Abp.MultiTenancy;
using Volo.Abp.Uow;

namespace BookStore.Tenants
{
    public class TenantDatabaseMigrationService : ITransientDependency
    {
        private readonly ICurrentTenant _currentTenant;
        private readonly IUnitOfWorkManager _unitOfWorkManager;
        private readonly IDbContextProvider<BookStoreDbContext> _dbContextProvider;
        private readonly ILogger<TenantDatabaseMigrationService> _logger;

        public TenantDatabaseMigrationService(
            ICurrentTenant currentTenant,
            IUnitOfWorkManager unitOfWorkManager,
            IDbContextProvider<BookStoreDbContext> dbContextProvider,
            ILogger<TenantDatabaseMigrationService> logger)
        {
            _currentTenant = currentTenant;
            _unitOfWorkManager = unitOfWorkManager;
            _dbContextProvider = dbContextProvider;
            _logger = logger;
        }

        public async Task MigrateTenantDatabaseAsync(Guid tenantId)
        {
            using (_currentTenant.Change(tenantId))
            {
                using (var uow = _unitOfWorkManager.Begin(requiresNew: true, isTransactional: false))
                {
                    try
                    {
                        _logger.LogInformation($"開始遷移租戶 {tenantId} 的資料庫...");

                        var dbContext = await _dbContextProvider.GetDbContextAsync();

                        // 建立資料庫（如果不存在）
                        await dbContext.Database.EnsureCreatedAsync();

                        // 執行 Migration
                        await dbContext.Database.MigrateAsync();

                        _logger.LogInformation($"租戶 {tenantId} 的資料庫遷移完成");

                        await uow.CompleteAsync();
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"租戶 {tenantId} 的資料庫遷移失敗");
                        throw;
                    }
                }
            }
        }

        public async Task MigrateAllTenantsAsync()
        {
            var tenants = await _tenantRepository.GetListAsync();

            foreach (var tenant in tenants)
            {
                await MigrateTenantDatabaseAsync(tenant.Id);
            }
        }
    }
}
```

#### 步驟 3：在租戶建立時自動遷移

```csharp
// BookStore.Application/Tenants/TenantAppService.cs
public class TenantAppService : ApplicationService
{
    private readonly TenantDatabaseMigrationService _migrationService;

    public async Task<TenantDto> CreateWithDatabaseAsync(CreateTenantWithDatabaseDto input)
    {
        // 建立租戶
        var tenant = await _tenantManager.CreateAsync(input.Name);
        tenant.SetConnectionString(BuildConnectionString(input.Name, input.DatabaseServer));
        await _tenantRepository.InsertAsync(tenant);

        // 自動建立並遷移資料庫
        await _migrationService.MigrateTenantDatabaseAsync(tenant.Id);

        // 初始化種子資料（選擇性）
        await SeedTenantDataAsync(tenant.Id);

        return ObjectMapper.Map<Tenant, TenantDto>(tenant);
    }

    private async Task SeedTenantDataAsync(Guid tenantId)
    {
        using (_currentTenant.Change(tenantId))
        {
            // 建立預設角色、權限等
            await _dataSeeder.SeedAsync(new DataSeedContext(tenantId));
        }
    }
}
```

#### 步驟 4：建立 CLI 工具進行批量遷移

```csharp
// BookStore.DbMigrator/TenantMigrationCommand.cs
public class TenantMigrationCommand
{
    private readonly TenantDatabaseMigrationService _migrationService;
    private readonly ITenantRepository _tenantRepository;

    public async Task ExecuteAsync(string[] args)
    {
        if (args.Contains("--all-tenants"))
        {
            Console.WriteLine("開始遷移所有租戶的資料庫...");
            await _migrationService.MigrateAllTenantsAsync();
            Console.WriteLine("所有租戶遷移完成！");
        }
        else if (args.Contains("--tenant"))
        {
            var tenantName = args[Array.IndexOf(args, "--tenant") + 1];
            var tenant = await _tenantRepository.FindByNameAsync(tenantName);

            if (tenant == null)
            {
                Console.WriteLine($"找不到租戶：{tenantName}");
                return;
            }

            Console.WriteLine($"開始遷移租戶 {tenantName} 的資料庫...");
            await _migrationService.MigrateTenantDatabaseAsync(tenant.Id);
            Console.WriteLine("遷移完成！");
        }
    }
}
```

使用方式：

```bash
# 遷移所有租戶
dotnet run --project src/BookStore.DbMigrator -- --all-tenants

# 遷移特定租戶
dotnet run --project src/BookStore.DbMigrator -- --tenant TenantA
```

#### 步驟 5：監控和錯誤處理

```csharp
// BookStore.Domain/Tenants/TenantDatabaseMigrationService.cs
public async Task MigrateTenantDatabaseAsync(Guid tenantId)
{
    var maxRetries = 3;
    var retryCount = 0;

    while (retryCount < maxRetries)
    {
        try
        {
            using (_currentTenant.Change(tenantId))
            {
                using (var uow = _unitOfWorkManager.Begin(requiresNew: true, isTransactional: false))
                {
                    var dbContext = await _dbContextProvider.GetDbContextAsync();

                    // 檢查資料庫連線
                    if (!await dbContext.Database.CanConnectAsync())
                    {
                        _logger.LogWarning($"無法連線到租戶 {tenantId} 的資料庫，嘗試建立...");
                        await dbContext.Database.EnsureCreatedAsync();
                    }

                    // 執行 Migration
                    var pendingMigrations = await dbContext.Database.GetPendingMigrationsAsync();
                    if (pendingMigrations.Any())
                    {
                        _logger.LogInformation($"租戶 {tenantId} 有 {pendingMigrations.Count()} 個待執行的遷移");
                        await dbContext.Database.MigrateAsync();
                    }
                    else
                    {
                        _logger.LogInformation($"租戶 {tenantId} 的資料庫已是最新版本");
                    }

                    await uow.CompleteAsync();
                    break; // 成功，跳出重試迴圈
                }
            }
        }
        catch (Exception ex)
        {
            retryCount++;
            _logger.LogError(ex, $"租戶 {tenantId} 的資料庫遷移失敗（嘗試 {retryCount}/{maxRetries}）");

            if (retryCount >= maxRetries)
            {
                throw new BusinessException("BookStore:TenantMigrationFailed")
                    .WithData("TenantId", tenantId)
                    .WithData("Retries", retryCount);
            }

            await Task.Delay(TimeSpan.FromSeconds(5 * retryCount)); // 指數退避
        }
    }
}
```

---

## 總結

本章練習涵蓋了多租戶架構的核心實作：

1. **多租戶應用建立**：

   - 啟用多租戶功能
   - 建立和管理租戶
   - 驗證資料隔離

2. **Feature-based 定價**：

   - 定義和管理 Features
   - 實作定價方案
   - 在應用服務中檢查功能權限

3. **獨立資料庫遷移**：
   - 配置租戶專屬連線字串
   - 自動建立和遷移資料庫
   - 處理遷移錯誤和重試

**最佳實踐**：

- 始終使用 `IMultiTenant` 介面標記需要隔離的實體
- 使用 Feature Management 實現靈活的定價策略
- 為每個租戶提供獨立的資料庫以獲得最佳隔離性
- 實作完善的錯誤處理和監控機制
- 考慮使用資料庫連接池優化效能

---

## 參考資源

- [ABP 多租戶文件](https://docs.abp.io/en/abp/latest/Multi-Tenancy)
- [ABP Feature Management 文件](https://docs.abp.io/en/abp/latest/Features)
- [Entity Framework Core Migrations](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/)
