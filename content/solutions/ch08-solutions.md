# 第八章習題解答

## 習題 1：概念題 ⭐

**題目：ABP 社群版提供的自動 API 生成機制（Auto API Controllers）如何工作？**

### 解答

ABP 的自動 API 生成通過 **Reflection** 與 **Convention** 自動為應用服務建立 RESTful 端點。

#### 自動生成流程

```
應用服務 (AppService)
    ↓
ABP 掃描 [RemoteService] Attribute
    ↓
自動生成路由 (/api/app/{service}/{method})
    ↓
自動 DTO 對映
    ↓
暴露 Swagger/OpenAPI
```

#### 實現範例

```csharp
// Domain/Books/Book.cs
public class Book : AggregateRoot<Guid>
{
    public string Title { get; set; }
    public string Author { get; set; }
}

// Application/Books/BookAppService.cs
[RemoteService(IsMetadataEnabled = true)]
public class BookAppService : ApplicationService, IBookAppService
{
    private readonly IRepository<Book, Guid> _repository;

    public BookAppService(IRepository<Book, Guid> repository)
    {
        _repository = repository;
    }

    // ✅ 自動生成 POST /api/app/books/create
    public async Task<BookDto> CreateAsync(CreateBookDto input)
    {
        var book = new Book { Title = input.Title, Author = input.Author };
        await _repository.InsertAsync(book);
        return ObjectMapper.Map<Book, BookDto>(book);
    }

    // ✅ 自動生成 GET /api/app/books/get/{id}
    public async Task<BookDto> GetAsync(Guid id)
    {
        var book = await _repository.GetAsync(id);
        return ObjectMapper.Map<Book, BookDto>(book);
    }

    // ✅ 自動生成 GET /api/app/books/get-list
    public async Task<PagedResultDto<BookDto>> GetListAsync(GetBooksInputDto input)
    {
        var query = (await _repository.GetQueryableAsync())
            .OrderBy(b => b.Title);

        var totalCount = await query.CountAsync();
        var items = await query.Skip(input.SkipCount).Take(input.MaxResultCount).ToListAsync();

        return new PagedResultDto<BookDto>(totalCount,
            ObjectMapper.Map<List<Book>, List<BookDto>>(items));
    }
}
```

#### 生成的 API 端點

```
POST   /api/app/books/create
GET    /api/app/books/get?id={id}
GET    /api/app/books/get-list?skipCount=0&maxResultCount=10
PUT    /api/app/books/update
DELETE /api/app/books/delete?id={id}
```

#### 常見錯誤

```csharp
// ❌ 不會生成 API（缺少 RemoteService Attribute）
public class BookAppService : ApplicationService { }

// ✅ 會生成 API
[RemoteService]
public class BookAppService : ApplicationService { }

// ❌ 公開方法必須返回 DTO
public Book GetBook(Guid id) { } // 返回 Entity

// ✅ 應返回 DTO
public BookDto GetBook(Guid id) { }
```

---

## 習題 2：概念題 ⭐

**題目：多語言支援（Localization）在 ABP 中如何實現？舉例說明。**

### 解答

ABP 提供內建多語言支援，使用 **IStringLocalizer** 與 JSON 資源檔。

#### 實現步驟

```
1. 定義本地化資源檔
2. 在代碼中使用 IStringLocalizer
3. 根據 RequestCulture 自動切換語言
```

#### 代碼實現

```csharp
// Infrastructure/Localization/BookStoreResourceDefinitionProvider.cs
public class BookStoreResourceDefinitionProvider : LocalizationResourceDefinitionProvider
{
    public override void Define(ILocalizationResourceDefinitionContext context)
    {
        context.AddVirtualJson(
            "/Localization/BookStore"
        );
    }
}

// Localization/BookStore/zh-Hans.json
{
  "Book:Title": "書籍",
  "Book:Create": "建立書籍",
  "Book:Edit": "編輯書籍",
  "Book:Delete": "刪除書籍",
  "Menu": {
    "Home": "首頁"
  }
}


// Localization/BookStore/en.json
{
  "Book:Title": "Books",
  "Book:Create": "Create Book",
  "Book:Edit": "Edit Book",
  "Book:Delete": "Delete Book"
}

// Application/Books/BookAppService.cs
public class BookAppService : ApplicationService
{
    private readonly IStringLocalizer<BookStoreResource> _localizer;

    public BookAppService(IStringLocalizer<BookStoreResource> localizer)
    {
        _localizer = localizer;
    }

    public async Task<BookDto> CreateAsync(CreateBookDto input)
    {
        // ✅ 自動根據請求語言返回
        var title = _localizer["Book:Create"];
        // 中文：建立書籍
        // 英文：Create Book

        var book = new Book { Title = input.Title };
        await _repository.InsertAsync(book);
        return ObjectMapper.Map<Book, BookDto>(book);
    }
}

// 前端使用
app.get("/books/list", (req, res) => {
    const culture = req.headers["accept-language"];
    // 自動根據 Accept-Language 切換
});
```

---

## 習題 3：計算/練習題 💻

**題目：實作一個社群模組集成案例：整合 EasyAbp DataDictionary 模組，並在應用中使用。**

### 解答

#### 步驟 1：安裝模組

```bash
dotnet add package EasyAbp.DataDictionary
```

#### 步驟 2：註冊模組

```csharp
// MyModule.cs
[DependsOn(
    typeof(AbpCoreModule),
    typeof(DataDictionaryModule))] // 新增依賴
public class MyModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        // 模組會自動配置
    }
}
```

#### 步驟 3：資料庫遷移

```bash
dotnet ef migrations add AddDataDictionary
dotnet ef database update
```

#### 步驟 4：在應用中使用

```csharp
public class BookAppService : ApplicationService
{
    private readonly IDataDictionaryItemAppService _dataDictService;

    public BookAppService(IDataDictionaryItemAppService dataDictService)
    {
        _dataDictService = dataDictService;
    }

    public async Task<BookDto> CreateAsync(CreateBookDto input)
    {
        // 獲取書籍分類字典
        var categories = await _dataDictService
            .GetListAsync("BookCategory");

        var book = new Book
        {
            Title = input.Title,
            Category = input.CategoryCode // 使用字典編碼
        };

        await _repository.InsertAsync(book);
        return ObjectMapper.Map<Book, BookDto>(book);
    }
}
```

#### 字典管理 UI

```html
<!-- 後台管理頁面 -->
<div>
  <h3>書籍分類</h3>
  <table>
    <tr>
      <th>編碼</th>
      <th>名稱</th>
      <th>操作</th>
    </tr>
    <tr>
      <td>novel</td>
      <td>小說</td>
      <td><button>編輯</button></td>
    </tr>
    <tr>
      <td>history</td>
      <td>歷史</td>
      <td><button>編輯</button></td>
    </tr>
  </table>
</div>
```

---

## 習題 4：計算/練習題 💻

**題目：設計一個快取策略系統，包含本地快取、分散式快取、快取失效機制。**

### 解答

#### 快取架構圖

```
請求 → L1 Cache (Memory) → L2 Cache (Redis) → Database
       [10min]              [1hour]

更新時 → 清除 L1 Cache + L2 Cache → 重新查詢
```

#### 實現

```csharp
public class CachedBookAppService : ApplicationService
{
    private readonly IRepository<Book, Guid> _repository;
    private readonly IMemoryCache _memoryCache;
    private readonly IDistributedCache _distributedCache;
    private const string CacheKeyPattern = "book:{0}";
    private const int MemoryCacheDurationSeconds = 600; // 10 min
    private const int DistributedCacheDurationSeconds = 3600; // 1 hour

    public CachedBookAppService(
        IRepository<Book, Guid> repository,
        IMemoryCache memoryCache,
        IDistributedCache distributedCache)
    {
        _repository = repository;
        _memoryCache = memoryCache;
        _distributedCache = distributedCache;
    }

    // L1 + L2 快取讀取
    public async Task<BookDto> GetAsync(Guid id)
    {
        var key = string.Format(CacheKeyPattern, id);

        // 1. 檢查 L1 Cache (Memory)
        if (_memoryCache.TryGetValue(key, out BookDto cachedDto))
        {
            return cachedDto;
        }

        // 2. 檢查 L2 Cache (Redis)
        var distributedCached = await _distributedCache.GetAsync(key);
        if (distributedCached != null)
        {
            var dto = JsonConvert.DeserializeObject<BookDto>(
                Encoding.UTF8.GetString(distributedCached));

            // 回寫 L1 Cache
            _memoryCache.Set(key, dto,
                TimeSpan.FromSeconds(MemoryCacheDurationSeconds));

            return dto;
        }

        // 3. 讀取資料庫
        var book = await _repository.GetAsync(id);
        var result = ObjectMapper.Map<Book, BookDto>(book);

        // 寫入 L2 Cache
        await _distributedCache.SetAsync(key,
            Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(result)),
            new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow =
                    TimeSpan.FromSeconds(DistributedCacheDurationSeconds)
            });

        // 寫入 L1 Cache
        _memoryCache.Set(key, result,
            TimeSpan.FromSeconds(MemoryCacheDurationSeconds));

        return result;
    }

    // 更新時清除快取
    public async Task<BookDto> UpdateAsync(Guid id, UpdateBookDto input)
    {
        var book = await _repository.GetAsync(id);
        book.Title = input.Title;
        await _repository.UpdateAsync(book);

        // 清除快取
        var key = string.Format(CacheKeyPattern, id);
        _memoryCache.Remove(key);
        await _distributedCache.RemoveAsync(key);

        return ObjectMapper.Map<Book, BookDto>(book);
    }

    // 監控快取效率
    public async Task<CacheStatisticsDto> GetStatisticsAsync()
    {
        return new CacheStatisticsDto
        {
            MemoryCacheCount = _memoryCache.Count,
            DistributedCacheKeys = await GetRedisKeysAsync()
        };
    }
}
```

---

## 習題 5：案例分析題 📋

**題目：分析一個真實場景：電商平台的商品查詢系統，需要同時支援海量查詢、分類快速切換、庫存實時更新。設計解決方案。**

### 解答

#### 場景需求

```
場景：1000萬商品、1000萬日活用戶、500萬QPS查詢

挑戰：
- 海量數據查詢效能
- 分類篩選實時性
- 庫存同步一致性
```

#### 系統架構

```
┌─────────────────┐
│   User Request  │
└────────┬────────┘
         │
    ┌────▼─────┐
    │ Gateway   │ (YARP)
    └────┬─────┘
         │
    ┌────▼────────────────────────────┐
    │  Query Service (讀優化)          │
    │  ├─ Redis Cache (分類)           │
    │  ├─ ElasticSearch (全文搜尋)     │
    │  └─ Replica Database (讀庫)      │
    └────┬───────────────────────────┘
         │
    ┌────▼────────────────────────────┐
    │  Command Service (寫優化)        │
    │  ├─ Primary Database (主庫)      │
    │  ├─ Event Bus (庫存變更事件)    │
    │  └─ Cache Invalidation          │
    └─────────────────────────────────┘
```

#### 分層實現

```csharp
// 1. 查詢層（CQRS Read）
[RemoteService]
public class ProductQueryService : ApplicationService
{
    private readonly IDistributedCache _cache;
    private readonly IElasticsearchRepository _elasticsearch;

    // 分類快速查詢（從快取）
    public async Task<List<ProductDto>> GetByCategoryAsync(string category)
    {
        var cacheKey = $"products:category:{category}";
        var cached = await _cache.GetAsync(cacheKey);

        if (cached != null)
            return JsonConvert.DeserializeObject<List<ProductDto>>(
                Encoding.UTF8.GetString(cached));

        // 改為從 ElasticSearch 查詢（秒級返回）
        var products = await _elasticsearch
            .Query(p => p.Category == category)
            .ToListAsync();

        // 存入快取 1 小時
        await _cache.SetAsync(cacheKey,
            Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(products)),
            new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
            });

        return products;
    }

    // 全文搜尋（ElasticSearch）
    public async Task<PagedResultDto<ProductDto>> SearchAsync(string keyword)
    {
        var result = await _elasticsearch
            .Query(keyword)
            .ToPagedListAsync();

        return result;
    }
}

// 2. 命令層（CQRS Write）
[RemoteService]
public class ProductCommandService : ApplicationService
{
    private readonly IRepository<Product, Guid> _repository;
    private readonly IDistributedEventBus _eventBus;

    // 庫存更新
    public async Task UpdateStockAsync(Guid productId, int quantity)
    {
        var product = await _repository.GetAsync(productId);
        var oldStock = product.Stock;
        product.Stock -= quantity;

        await _repository.UpdateAsync(product);

        // 發佈庫存變更事件
        await _eventBus.PublishAsync(new StockChangedEvent
        {
            ProductId = productId,
            OldStock = oldStock,
            NewStock = product.Stock,
            Timestamp = DateTime.UtcNow
        });
    }
}

// 3. 事件處理（Cache Invalidation）
public class StockChangedEventHandler : IDistributedEventHandler<StockChangedEvent>
{
    private readonly IDistributedCache _cache;

    public async Task HandleEventAsync(StockChangedEvent eventData)
    {
        // 清除相關快取
        await _cache.RemoveAsync($"products:{eventData.ProductId}");
        await _cache.RemoveAsync($"products:category:*"); // 清除分類快取

        // 同步至 ElasticSearch
        await UpdateElasticsearchAsync(eventData);
    }
}
```

#### 效能指標

```
查詢 QPS：
- 無快取：100 QPS（受限於 DB）
- 一級快取：1,000 QPS（Memory）
- 二級快取：10,000 QPS（Redis）
- ElasticSearch：50,000+ QPS

延遲：
- DB 直接查詢：100ms
- 快取命中：5ms
- ElasticSearch：20–50ms
```

---

## 習題 6：案例分析題 📋

**題目：設計一個 ABP 社群版的實時通知系統，支援使用者通知推送、批量通知、重試機制。**

### 解答

#### 系統架構

```
通知發送 → SignalR Hub → 使用者
          ↓
       Message Queue (RabbitMQ)
          ↓
      重試 + 持久化
```

#### 實現

```csharp
// Domain/Notifications/Notification.cs
public class Notification : AggregateRoot<Guid>
{
    public string Title { get; set; }
    public string Content { get; set; }
    public List<Guid> RecipientIds { get; set; }
    public NotificationStatus Status { get; set; }
    public int RetryCount { get; set; }
}

public enum NotificationStatus
{
    Pending,
    Sent,
    Failed
}

// Application/Notifications/NotificationAppService.cs
[RemoteService]
public class NotificationAppService : ApplicationService
{
    private readonly IRepository<Notification, Guid> _repository;
    private readonly IDistributedEventBus _eventBus;
    private readonly IHubContext<NotificationHub> _hubContext;

    // 發送通知
    public async Task SendAsync(CreateNotificationDto input)
    {
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            Title = input.Title,
            Content = input.Content,
            RecipientIds = input.RecipientIds,
            Status = NotificationStatus.Pending,
            RetryCount = 0
        };

        await _repository.InsertAsync(notification);

        // 發佈事件進入隊列
        await _eventBus.PublishAsync(new NotificationCreatedEvent
        {
            NotificationId = notification.Id
        });
    }

    // 批量發送
    public async Task SendBatchAsync(CreateBatchNotificationDto input)
    {
        var notifications = new List<Notification>();

        foreach (var recipientId in input.RecipientIds)
        {
            notifications.Add(new Notification
            {
                Id = Guid.NewGuid(),
                Title = input.Title,
                Content = input.Content,
                RecipientIds = new List<Guid> { recipientId },
                Status = NotificationStatus.Pending
            });
        }

        await _repository.InsertManyAsync(notifications);

        // 批量發佈事件
        foreach (var n in notifications)
        {
            await _eventBus.PublishAsync(new NotificationCreatedEvent
            {
                NotificationId = n.Id
            });
        }
    }
}

// Infrastructure/Notifications/NotificationHub.cs
public class NotificationHub : Hub
{
    private readonly ICurrentUser _currentUser;

    public NotificationHub(ICurrentUser currentUser)
    {
        _currentUser = currentUser;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = _currentUser.Id?.ToString();
        await Groups.AddToGroupAsync(Connection.ConnectionId, $"user:{userId}");
        await base.OnConnectedAsync();
    }
}

// Application/Notifications/NotificationCreatedEventHandler.cs
public class NotificationCreatedEventHandler :
    IDistributedEventHandler<NotificationCreatedEvent>
{
    private readonly IRepository<Notification, Guid> _repository;
    private readonly IHubContext<NotificationHub> _hubContext;

    public async Task HandleEventAsync(NotificationCreatedEvent eventData)
    {
        var notification = await _repository.GetAsync(eventData.NotificationId);

        foreach (var recipientId in notification.RecipientIds)
        {
            try
            {
                // 通過 SignalR 推送
                await _hubContext.Clients
                    .Group($"user:{recipientId}")
                    .SendAsync("ReceiveNotification", new
                    {
                        notification.Title,
                        notification.Content,
                        Timestamp = DateTime.UtcNow
                    });

                notification.Status = NotificationStatus.Sent;
            }
            catch
            {
                // 重試機制
                if (notification.RetryCount < 3)
                {
                    notification.RetryCount++;
                    // 延遲重試
                    await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, notification.RetryCount)));
                    await HandleEventAsync(eventData);
                }
                else
                {
                    notification.Status = NotificationStatus.Failed;
                }
            }
        }

        await _repository.UpdateAsync(notification);
    }
}
```

#### 前端訂閱

```javascript
const connection = new signalR.HubConnectionBuilder()
  .withUrl("/notification-hub")
  .withAutomaticReconnect()
  .build();

connection.on("ReceiveNotification", (notification) => {
  console.log(`通知: ${notification.Title}`);
  // 顯示通知提示
  showToast(notification.Content);
});

await connection.start();
```

---

## 常見錯誤與提示

| 錯誤                 | 解決方案                     |
| -------------------- | ---------------------------- |
| **模組註冊重複**     | 檢查 DependsOn 避免重複      |
| **快取一致性**       | 使用事件驅動的快取失效       |
| **訊息隊列積壓**     | 監控隊列深度，調整消費者數量 |
| **SignalR 連線斷開** | 配置自動重連機制             |

---

## 參考資源

- [ABP 官方文檔 - Auto API Controllers](https://docs.abp.io/en/abp/latest/API)（content7）
- [ABP 官方文檔 - Localization](https://docs.abp.io/en/abp/latest/Localization)（content7）
- [EasyAbp 官方](https://www.easyabp.io)
- [SignalR 文檔](https://docs.microsoft.com/en-us/aspnet/core/signalr/)
