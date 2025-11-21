# 第七部：測試與自動化（章 17）

本檔為章 17 教材草稿，說明 ABP v9.3 的測試策略、範例、常見陷阱與 CI 整合。

## 學習目標
- 理解單元測試、整合測試與端對端 (E2E) 測試的差異與用途
- 使用 ABP 提供的測試基底類別建立測試
- 在本地與 CI 中執行測試並整合測試資源（資料庫、外部服務）
- 採用測試最佳實務與自動化策略

## 先修需求
- 熟悉 C#、.NET 測試工具（xUnit/NUnit）
- 了解 DI 與 ABP Module 啟動流程

## 17.1 測試類型總覽
- 單元測試（Unit Tests）：測試單一類別或方法，使用 mock 隔離外部依賴  
- 整合測試（Integration Tests）：在真實或輕量化外部元件（DB、MQ）下驗證多個元件整合  
- 端對端測試（E2E）：模擬完整系統使用情境，含 UI/API

## 17.2 使用 ABP 測試基底
ABP 提供測試基底類別協助建構測試環境，如 `AbpIntegratedTestBase<TStartupModule>` 與專案範例的 `BookStoreApplicationTestBase`。

[`csharp()`](content/part07-ch17.md:1)
```csharp
// csharp
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
    public async Task CreateAsync_ShouldCreateBook()
    {
        var input = new CreateBookDto { Title = "t", Author = "a" };
        var result = await _bookAppService.CreateAsync(input);
        Assert.NotNull(result);
        Assert.Equal(input.Title, result.Title);
    }
}
```

## 17.3 單元測試實務
- 使用 mock 框架（Moq）隔離依賴  
- 將商業邏輯放在可測試的領域/服務中  
- 避免在單元測試中存取真實資料庫

[`csharp()`](content/part07-ch17.md:2)
```csharp
// csharp
public class OrderDomainTests
{
    [Fact]
    public void AddItem_WhenQuantityInvalid_ShouldThrow()
    {
        var order = new Order(Guid.NewGuid(), "ON-1");
        Assert.Throws<ArgumentException>(() => order.AddItem(Guid.NewGuid(), 0, 100));
    }
}
```

## 17.4 整合測試（含 DB）
- 使用 `AbpIntegratedTestBase` 或專案自訂 TestBase  
- 可於測試啟動時建立資料庫或使用容器（Testcontainers）  
- 使用 `GetRequiredService<T>()` 取得 DbContext 或 Repository

[`csharp()`](content/part07-ch17.md:3)
```csharp
// csharp
public class BookRepositoryTests : BookStoreApplicationTestBase
{
    private readonly BookStoreDbContext _dbContext;

    public BookRepositoryTests()
    {
        _dbContext = GetRequiredService<BookStoreDbContext>();
    }

    [Fact]
    public async Task InsertAndQuery_ShouldWork()
    {
        var book = new Book(Guid.NewGuid(), "t", "a", DateTime.Now, 10);
        _dbContext.Books.Add(book);
        await _dbContext.SaveChangesAsync();

        var found = await _dbContext.Books.FindAsync(book.Id);
        Assert.NotNull(found);
    }
}
```

## 17.5 使用 Testcontainers 啟動測試資料庫
- 建議在 CI/本地使用 Testcontainers 啟動隔離的 DB 實例，降低環境差異影響

[`csharp()`](content/part07-ch17.md:4)
```csharp
// csharp
public class DatabaseFixture : IAsyncLifetime
{
    public MsSqlTestcontainer Container { get; private set; }

    public async Task InitializeAsync()
    {
        var builder = new TestcontainersBuilder<MsSqlTestcontainer>()
            .WithDatabase(new MsSqlTestcontainerConfiguration
            {
                Password = "yourStrong(!)Password"
            });
        Container = builder.Build();
        await Container.StartAsync();
        // 設定連線字串，注入至測試主機
    }

    public async Task DisposeAsync() => await Container.DisposeAsync();
}
```

## 17.6 測試資料與隔離
- 使用資料種子或 Factory 建立測試資料  
- 每個測試使用交易或重建資料庫以確保隔離  
- 對於整合測試，可在每個測試執行前清除關鍵表或使用事務回滾

## 17.7 CI 流程與 GitHub Actions 範例
- 在 CI 中執行：restore → build → test → publish  
- 可使用 GitHub Actions services 啟動資料庫容器以減少環境準備時間

[`bash()`](content/part07-ch17.md:5)
```bash
# bash
name: .NET CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    services:
      mssql:
        image: mcr.microsoft.com/mssql/server:2019-latest
        env:
          ACCEPT_EULA: "Y"
          SA_PASSWORD: "Your_password123"
        ports:
          - 1433:1433
    steps:
      - uses: actions/checkout@v3
      - name: Setup .NET
        uses: actions/setup-dotnet@v3
        with:
          dotnet-version: 9.0.x
      - name: Restore
        run: dotnet restore
      - name: Build
        run: dotnet build --no-restore --configuration Release
      - name: Test
        run: dotnet test --no-build --configuration Release --verbosity normal
```

## 17.8 E2E 與 API 測試
- 使用測試專用的 API 環境與測試資料  
- 使用工具如 RestSharp、Playwright 或 Selenium 執行 E2E  
- 建議將 API 層啟動在獨立 port 並使用測試用 JWT

[`csharp()`](content/part07-ch17.md:6)
```csharp
// csharp (示意使用 HttpClient)
public async Task Test_GetBooks_ReturnsOk()
{
    var client = _testServer.CreateClient();
    var response = await client.GetAsync("/api/books");
    response.EnsureSuccessStatusCode();
}
```

## 17.9 常見問題與除錯
- 測試在本地可通過但 CI 失敗：檢查環境變數、資料庫連線、權限（SA 密碼限制）  
- 測試耗時長：使用輕量替代（InMemory DB）或整合測試分組，並在 CI 使用並行 job  
- 模擬（Mock）靜態呼叫：避免靜態依賴，或使用封裝進介面以便替換

## 17.10 測試最佳實務總結
- 優先單元測試並針對關鍵整合路徑建立整合測試  
- 使用測試夾具與共用 TestBase 標準化測試初始化  
- 在 CI 中自動執行測試並把測試報告與覆蓋率納入回饋  
- 保持測試可重現與隔離，避免測試之間互相影響

## 參考資源
- ABP Testing 文件：https://docs.abp.io/en/abp/latest/Testing
- Testcontainers for .NET：https://testcontainers.org/
- xUnit：https://xunit.net/

---

檔案：[`content/part07-ch17.md`](content/part07-ch17.md:1)