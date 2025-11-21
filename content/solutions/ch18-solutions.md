# 第十八章：效能優化 - 習題解答

本文件提供第十八章實戰練習的完整解答，涵蓋快取實作、N+1 問題解決和效能基準測試。

---

## 練習 1：實作快取層

### 題目

1. 為 `BookAppService` 的所有查詢方法加入 Redis 快取。
2. 實作快取失效策略（更新/刪除時移除快取）。
3. 監控快取命中率。

### 解答

#### 步驟 1：配置 Redis

```bash
# 安裝套件
dotnet add package Microsoft.Extensions.Caching.StackExchangeRedis
dotnet add package Volo.Abp.Caching.StackExchangeRedis
```

```csharp
// BookStoreApplicationModule.cs
using Volo.Abp.Caching;
using Volo.Abp.Caching.StackExchangeRedis;

[DependsOn(typeof(AbpCachingStackExchangeRedisModule))]
public class BookStoreApplicationModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        var configuration = context.Services.GetConfiguration();

        Configure<AbpDistributedCacheOptions>(options =>
        {
            options.KeyPrefix = "BookStore:";
            options.GlobalCacheEntryOptions.SlidingExpiration = TimeSpan.FromMinutes(20);
            options.GlobalCacheEntryOptions.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1);
        });

        context.Services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = configuration["Redis:Configuration"];
            options.InstanceName = "BookStore:";
        });
    }
}
```

```json
// appsettings.json
{
  "Redis": {
    "Configuration": "localhost:6379"
  }
}
```

#### 步驟 2：實作帶快取的 BookAppService

```csharp
// Application/Books/BookAppService.cs
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Distributed;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Caching;
using Volo.Abp.Domain.Repositories;

namespace BookStore.Books
{
    public class BookAppService : ApplicationService, IBookAppService
    {
        private readonly IRepository<Book, Guid> _bookRepository;
        private readonly IDistributedCache<BookDto> _bookCache;
        private readonly IDistributedCache<PagedResultDto<BookDto>> _bookListCache;

        public BookAppService(
            IRepository<Book, Guid> bookRepository,
            IDistributedCache<BookDto> bookCache,
            IDistributedCache<PagedResultDto<BookDto>> bookListCache)
        {
            _bookRepository = bookRepository;
            _bookCache = bookCache;
            _bookListCache = bookListCache;
        }

        public async Task<BookDto> GetAsync(Guid id)
        {
            var cacheKey = $"Book:{id}";

            // 嘗試從快取讀取
            var cached = await _bookCache.GetAsync(cacheKey);
            if (cached != null)
            {
                Logger.LogDebug("Cache hit for book {BookId}", id);
                return cached;
            }

            Logger.LogDebug("Cache miss for book {BookId}", id);

            // 從資料庫讀取
            var book = await _bookRepository.GetAsync(id);
            var dto = ObjectMapper.Map<Book, BookDto>(book);

            // 儲存到快取（10 分鐘）
            await _bookCache.SetAsync(
                cacheKey,
                dto,
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
                });

            return dto;
        }

        public async Task<PagedResultDto<BookDto>> GetListAsync(PagedAndSortedResultRequestDto input)
        {
            var cacheKey = $"BookList:{input.SkipCount}:{input.MaxResultCount}:{input.Sorting}";

            // 嘗試從快取讀取
            var cached = await _bookListCache.GetAsync(cacheKey);
            if (cached != null)
            {
                Logger.LogDebug("Cache hit for book list");
                return cached;
            }

            Logger.LogDebug("Cache miss for book list");

            // 從資料庫讀取
            var queryable = await _bookRepository.GetQueryableAsync();
            var totalCount = await AsyncExecuter.CountAsync(queryable);

            var books = await AsyncExecuter.ToListAsync(
                queryable
                    .OrderBy(input.Sorting ?? "name")
                    .Skip(input.SkipCount)
                    .Take(input.MaxResultCount));

            var result = new PagedResultDto<BookDto>(
                totalCount,
                ObjectMapper.Map<List<Book>, List<BookDto>>(books));

            // 儲存到快取（5 分鐘）
            await _bookListCache.SetAsync(
                cacheKey,
                result,
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
                });

            return result;
        }

        public async Task<BookDto> CreateAsync(CreateUpdateBookDto input)
        {
            var book = new Book(
                GuidGenerator.Create(),
                input.Name,
                input.Type,
                input.PublishDate,
                input.Price);

            await _bookRepository.InsertAsync(book);

            // 清除列表快取
            await InvalidateListCacheAsync();

            return ObjectMapper.Map<Book, BookDto>(book);
        }

        public async Task<BookDto> UpdateAsync(Guid id, CreateUpdateBookDto input)
        {
            var book = await _bookRepository.GetAsync(id);

            book.Name = input.Name;
            book.Type = input.Type;
            book.PublishDate = input.PublishDate;
            book.Price = input.Price;

            await _bookRepository.UpdateAsync(book);

            // 移除單一書籍快取
            await _bookCache.RemoveAsync($"Book:{id}");

            // 清除列表快取
            await InvalidateListCacheAsync();

            return ObjectMapper.Map<Book, BookDto>(book);
        }

        public async Task DeleteAsync(Guid id)
        {
            await _bookRepository.DeleteAsync(id);

            // 移除單一書籍快取
            await _bookCache.RemoveAsync($"Book:{id}");

            // 清除列表快取
            await InvalidateListCacheAsync();
        }

        private async Task InvalidateListCacheAsync()
        {
            // 簡單的做法：移除所有列表快取
            // 更好的做法：使用 Redis 的 pattern matching 或 cache tags
            await _bookListCache.RemoveManyAsync(new[] { "BookList:*" });
        }
    }
}
```

#### 步驟 3：實作快取命中率監控

```csharp
// Application/Books/CacheMetricsService.cs
using System.Collections.Concurrent;
using System.Threading.Tasks;
using Volo.Abp.DependencyInjection;

namespace BookStore.Books
{
    public class CacheMetricsService : ISingletonDependency
    {
        private readonly ConcurrentDictionary<string, CacheMetrics> _metrics = new();

        public void RecordHit(string cacheKey)
        {
            var metrics = _metrics.GetOrAdd(cacheKey, _ => new CacheMetrics());
            metrics.Hits++;
        }

        public void RecordMiss(string cacheKey)
        {
            var metrics = _metrics.GetOrAdd(cacheKey, _ => new CacheMetrics());
            metrics.Misses++;
        }

        public CacheMetrics GetMetrics(string cacheKey)
        {
            return _metrics.GetOrAdd(cacheKey, _ => new CacheMetrics());
        }

        public Dictionary<string, CacheMetrics> GetAllMetrics()
        {
            return new Dictionary<string, CacheMetrics>(_metrics);
        }
    }

    public class CacheMetrics
    {
        public long Hits { get; set; }
        public long Misses { get; set; }
        public double HitRate => Hits + Misses == 0 ? 0 : (double)Hits / (Hits + Misses) * 100;
    }
}
```

```csharp
// 在 BookAppService 中使用
public class BookAppService : ApplicationService, IBookAppService
{
    private readonly CacheMetricsService _cacheMetrics;

    public async Task<BookDto> GetAsync(Guid id)
    {
        var cacheKey = $"Book:{id}";
        var cached = await _bookCache.GetAsync(cacheKey);

        if (cached != null)
        {
            _cacheMetrics.RecordHit(cacheKey);
            return cached;
        }

        _cacheMetrics.RecordMiss(cacheKey);
        // ... 其餘邏輯
    }
}
```

```csharp
// Application/Books/CacheMetricsAppService.cs
public class CacheMetricsAppService : ApplicationService
{
    private readonly CacheMetricsService _cacheMetrics;

    public Dictionary<string, CacheMetrics> GetCacheMetrics()
    {
        return _cacheMetrics.GetAllMetrics();
    }
}
```

---

## 練習 2：解決 N+1 問題

### 題目

1. 在現有專案中找出所有的 N+1 查詢。
2. 使用 `Include` 或投影重構。
3. 使用 SQL Profiler 驗證查詢次數減少。

### 解答

#### 步驟 1：識別 N+1 問題

**問題範例**：

```csharp
// ❌ 錯誤：會產生 N+1 查詢
public async Task<List<OrderDto>> GetOrdersWithCustomersAsync()
{
    var orders = await _orderRepository.GetListAsync();

    var orderDtos = new List<OrderDto>();
    foreach (var order in orders)
    {
        // 每個訂單都會觸發一次查詢
        var customer = await _customerRepository.GetAsync(order.CustomerId);

        orderDtos.Add(new OrderDto
        {
            Id = order.Id,
            OrderNumber = order.OrderNumber,
            CustomerName = customer.Name // N+1 問題
        });
    }

    return orderDtos;
}
```

#### 步驟 2：使用 Include 解決

```csharp
// ✅ 正確：使用 Include
public async Task<List<OrderDto>> GetOrdersWithCustomersAsync()
{
    var orders = await (await _orderRepository.GetQueryableAsync())
        .Include(o => o.Customer)
        .Include(o => o.Items)
            .ThenInclude(i => i.Product)
        .ToListAsync();

    return ObjectMapper.Map<List<Order>, List<OrderDto>>(orders);
}
```

#### 步驟 3：使用投影（Projection）優化

```csharp
// ✅ 更好：使用投影，只查詢需要的欄位
public async Task<List<OrderSummaryDto>> GetOrderSummariesAsync()
{
    return await (await _orderRepository.GetQueryableAsync())
        .Select(o => new OrderSummaryDto
        {
            Id = o.Id,
            OrderNumber = o.OrderNumber,
            CustomerName = o.Customer.Name, // 自動 JOIN
            TotalAmount = o.TotalAmount,
            ItemCount = o.Items.Count,
            CreationTime = o.CreationTime
        })
        .ToListAsync();
}
```

#### 步驟 4：使用 SQL Profiler 驗證

**啟用 EF Core 日誌**：

```csharp
// Program.cs 或 appsettings.json
builder.Logging.AddFilter("Microsoft.EntityFrameworkCore.Database.Command", LogLevel.Information);
```

```json
{
  "Logging": {
    "LogLevel": {
      "Microsoft.EntityFrameworkCore.Database.Command": "Information"
    }
  }
}
```

**執行前後對比**：

```sql
-- ❌ N+1 問題：會產生 1 + N 次查詢
SELECT * FROM Orders;
SELECT * FROM Customers WHERE Id = @p0; -- 重複 N 次

-- ✅ 使用 Include：只產生 1-2 次查詢
SELECT o.*, c.*
FROM Orders o
LEFT JOIN Customers c ON o.CustomerId = c.Id;
```

#### 步驟 5：進階優化 - Split Query

對於多個 Include，使用 Split Query 避免笛卡爾積：

```csharp
public async Task<List<OrderDto>> GetOrdersWithDetailsAsync()
{
    var orders = await (await _orderRepository.GetQueryableAsync())
        .Include(o => o.Customer)
        .Include(o => o.Items)
            .ThenInclude(i => i.Product)
        .AsSplitQuery() // 避免笛卡爾積
        .ToListAsync();

    return ObjectMapper.Map<List<Order>, List<OrderDto>>(orders);
}
```

---

## 練習 3：效能基準測試

### 題目

1. 使用 BenchmarkDotNet 比較三種查詢方式的效能。
2. 分析記憶體使用情況。

### 解答

#### 步驟 1：安裝 BenchmarkDotNet

```bash
dotnet add package BenchmarkDotNet
```

#### 步驟 2：建立基準測試

```csharp
// Benchmarks/BookQueryBenchmarks.cs
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Running;
using Microsoft.EntityFrameworkCore;
using BookStore.Books;
using BookStore.EntityFrameworkCore;

namespace BookStore.Benchmarks
{
    [MemoryDiagnoser]
    [SimpleJob(warmupCount: 3, iterationCount: 10)]
    public class BookQueryBenchmarks
    {
        private BookStoreDbContext _dbContext;

        [GlobalSetup]
        public void Setup()
        {
            var options = new DbContextOptionsBuilder<BookStoreDbContext>()
                .UseSqlServer("Server=localhost;Database=BookStore_Benchmark;User Id=sa;Password=YourPassword;TrustServerCertificate=True")
                .Options;

            _dbContext = new BookStoreDbContext(options);

            // 確保資料庫有測試資料
            SeedData().Wait();
        }

        private async Task SeedData()
        {
            if (!await _dbContext.Books.AnyAsync())
            {
                for (int i = 0; i < 1000; i++)
                {
                    _dbContext.Books.Add(new Book(
                        Guid.NewGuid(),
                        $"Book {i}",
                        BookType.Fiction,
                        DateTime.Now,
                        10 + i));
                }
                await _dbContext.SaveChangesAsync();
            }
        }

        [Benchmark(Baseline = true)]
        public async Task<List<Book>> WithoutTracking()
        {
            return await _dbContext.Books
                .AsNoTracking()
                .ToListAsync();
        }

        [Benchmark]
        public async Task<List<Book>> WithTracking()
        {
            return await _dbContext.Books
                .ToListAsync();
        }

        [Benchmark]
        public async Task<List<BookDto>> WithProjection()
        {
            return await _dbContext.Books
                .Select(b => new BookDto
                {
                    Id = b.Id,
                    Name = b.Name,
                    Price = b.Price
                })
                .ToListAsync();
        }

        [Benchmark]
        public async Task<List<Book>> WithPagination()
        {
            return await _dbContext.Books
                .AsNoTracking()
                .OrderBy(b => b.Name)
                .Skip(0)
                .Take(100)
                .ToListAsync();
        }

        [GlobalCleanup]
        public void Cleanup()
        {
            _dbContext?.Dispose();
        }
    }

    public class BookDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public float Price { get; set; }
    }
}
```

#### 步驟 3：執行基準測試

```csharp
// Program.cs
using BenchmarkDotNet.Running;
using BookStore.Benchmarks;

class Program
{
    static void Main(string[] args)
    {
        var summary = BenchmarkRunner.Run<BookQueryBenchmarks>();
    }
}
```

```bash
dotnet run -c Release
```

#### 步驟 4：分析結果

基準測試會產生類似以下的報告：

```
| Method            | Mean      | Error    | StdDev   | Ratio | Gen0   | Gen1   | Allocated |
|------------------ |----------:|---------:|---------:|------:|-------:|-------:|----------:|
| WithoutTracking   | 45.23 ms  | 0.892 ms | 0.835 ms | 1.00  | 1000.0 | 500.0  | 8.5 MB    |
| WithTracking      | 52.67 ms  | 1.045 ms | 0.977 ms | 1.16  | 1500.0 | 750.0  | 12.3 MB   |
| WithProjection    | 38.91 ms  | 0.765 ms | 0.715 ms | 0.86  | 800.0  | 400.0  | 6.2 MB    |
| WithPagination    | 5.12 ms   | 0.098 ms | 0.092 ms | 0.11  | 100.0  | 50.0   | 850 KB    |
```

**分析**：

- `WithProjection` 最快且記憶體使用最少（只查詢需要的欄位）
- `WithPagination` 因為只載入 100 筆，效能最佳
- `WithTracking` 因為 EF Core 的變更追蹤，記憶體使用較高

#### 步驟 5：進階基準測試 - 快取對比

```csharp
[MemoryDiagnoser]
public class CacheBenchmarks
{
    private IDistributedCache<BookDto> _cache;
    private BookStoreDbContext _dbContext;
    private Guid _testBookId;

    [GlobalSetup]
    public async Task Setup()
    {
        // 設定 Redis 快取
        var services = new ServiceCollection();
        services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = "localhost:6379";
        });
        var provider = services.BuildServiceProvider();
        _cache = provider.GetRequiredService<IDistributedCache<BookDto>>();

        // 設定資料庫
        var options = new DbContextOptionsBuilder<BookStoreDbContext>()
            .UseSqlServer("...")
            .Options;
        _dbContext = new BookStoreDbContext(options);

        // 準備測試資料
        var book = new Book(Guid.NewGuid(), "Test Book", BookType.Fiction, DateTime.Now, 10);
        _dbContext.Books.Add(book);
        await _dbContext.SaveChangesAsync();
        _testBookId = book.Id;

        // 預熱快取
        await _cache.SetAsync($"Book:{_testBookId}", new BookDto { Id = _testBookId, Name = "Test Book" });
    }

    [Benchmark(Baseline = true)]
    public async Task<BookDto> FromDatabase()
    {
        var book = await _dbContext.Books.FindAsync(_testBookId);
        return new BookDto { Id = book.Id, Name = book.Name, Price = book.Price };
    }

    [Benchmark]
    public async Task<BookDto> FromCache()
    {
        return await _cache.GetAsync($"Book:{_testBookId}");
    }
}
```

---

## 總結

本章練習涵蓋了效能優化的核心技術：

1. **快取實作**：

   - 使用 Redis 分散式快取
   - 實作快取失效策略
   - 監控快取命中率

2. **N+1 問題解決**：

   - 使用 `Include` 預先載入關聯資料
   - 使用投影只查詢需要的欄位
   - 使用 SQL Profiler 驗證優化效果

3. **效能基準測試**：
   - 使用 BenchmarkDotNet 進行微基準測試
   - 分析記憶體使用情況
   - 比較不同查詢策略的效能

**最佳實踐**：

- 優先使用快取減少資料庫查詢
- 避免 N+1 問題，使用 Include 或投影
- 對唯讀查詢使用 `AsNoTracking()`
- 始終使用分頁，避免一次載入大量資料
- 使用基準測試驗證優化效果

---

## 參考資源

- [ABP 快取文件](https://docs.abp.io/en/abp/latest/Caching)
- [EF Core 效能指南](https://learn.microsoft.com/en-us/ef/core/performance/)
- [BenchmarkDotNet 官方文件](https://benchmarkdotnet.org/)
- [Redis 官方文件](https://redis.io/documentation)
