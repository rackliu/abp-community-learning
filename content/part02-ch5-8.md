# 第二部：ABP Framework 基礎建設（章 5–8）

本檔為教材第二部（章 5–8）教學草稿，涵蓋 ASP.NET Core 與 ABP 架構、資料存取、橫切關注與開源服務。內容包含實務案例、程式範例、最佳實務與常見問題。

## 學習目標
- 理解 Module 與啟動生命週期
- 熟悉 Entity/Repository/UoW 與 EF Core / MongoDB 整合
- 掌握權限、驗證、例外、日誌與審核追蹤配置
- 能導入並擴充常見社群模組

## 先修需求
- 完成第一部或具備 ASP.NET Core、C# 與 DI 概念

## 5 ASP.NET Core 與 ABP 架構深入解析
### Module 與啟動流程
ABP 以 Module 為單位管理註冊與啟動順序。Module 提供 ConfigureServices、Configure、OnApplicationInitialization 等方法做註冊與初始化。

// csharp
public class MyModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        context.Services.AddScoped<IMyService, MyService>();
    }

    public override void OnApplicationInitialization(ApplicationInitializationContext context)
    {
        // 啟動邏輯
    }
}

### 依賴注入與生命週期要點
- 儘量於 ConfigureServices 註冊服務，將 I/O 初始化放在 OnApplicationInitialization
- 使用介面與抽象以提高可測試性

## 6 資料存取基礎設施
### Entity / Repository / UoW
- Entity：聚合根與值物件
- Repository：負責資料存取邏輯
- UoW：ABP 自動管理交易邊界

// csharp
[ConnectionStringName("Default")]
public class AppDbContext : AbpDbContext<AppDbContext>
{
    public DbSet<Book> Books { get; set; }
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.Entity<Book>(b =>
        {
            b.ToTable("Books");
            b.HasKey(x => x.Id);
            b.Property(x => x.Title).IsRequired().HasMaxLength(256);
        });
    }
}

// csharp
public class BookRepository : EfCoreRepository<AppDbContext, Book, Guid>, IBookRepository
{
    public BookRepository(IDbContextProvider<AppDbContext> dbContextProvider) : base(dbContextProvider) { }
    public async Task<List<Book>> GetByAuthorAsync(string author)
    {
        var dbSet = await GetDbSetAsync();
        return await dbSet.Where(b => b.Author == author).ToListAsync();
    }
}

### EF Core 與 MongoDB
- 使用 AddAbpDbContext 註冊 EF Core
- 使用 AddMongoDbContext 註冊 MongoDB（社群版支持）
// bash
abp new MyApp -t app -d mongo

## 7 橫切關注（Cross-Cutting Concerns）
### 權限管理與驗證
- 使用 PermissionDefinitionProvider 定義權限

// csharp
public class MyPermissionDefinitionProvider : PermissionDefinitionProvider
{
    public override void Define(IPermissionDefinitionContext context)
    {
        var group = context.AddGroup("MyGroup", "My group description");
        group.AddPermission("MyGroup.MyPermission", "使用範例");
    }
}

### 例外處理與驗證
- 使用 ABP 內建的 ExceptionHandling 與 FluentValidation 整合
- 將錯誤轉換為一致的 API 回應格式

### 日誌與審核
- 使用 Serilog 或內建日誌，並啟用 Audit Logging 以紀錄重要操作
- 在 Module 中註冊審核服務與審核過濾器

## 8 開源特色與服務功能
- 使用者管理、Role/Permission、Localization、多語言支援
- 自動生成 API（Auto API Controllers）與資料篩選、快取
- 導入 EasyAbp 模組：abp add-module EasyAbp.DataDictionary

## 實務案例（精要）
- 建立多層式專案，註冊自訂 Repository，並導入審核與權限
- 步驟要點：
  1. 使用 ABP CLI 建立專案：`abp new MyApp -t app`
  2. 實作 Domain 與 Repository
  3. 在 Module ConfigureServices 中註冊 Repository 與審核
  4. 撰寫單元/整合測試驗證交易行為

## 常見問題
Q：如何在 Module 中替換預設 Repository？  
A：使用 options.AddRepository<Book, BookRepository>() 或在 ConfigureServices 中註冊替代實作。

## 參考文件
- https://docs.abp.io/en/abp/latest/（官方文件）
- EasyAbp 社群模組（https://www.easyabp.io）