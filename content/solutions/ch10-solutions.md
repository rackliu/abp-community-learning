# 第十章習題解答

## 概念題（易）⭐

### Q1. 為什麼 OrderItem 應在 Order 聚合內部而非獨立聚合？

**解答：**

OrderItem 應在 Order 聚合內部的原因如下：

1. **生命週期依賴**

   - OrderItem 的生命週期完全依賴於 Order
   - 沒有 Order 就不存在 OrderItem
   - 刪除 Order 時應同時刪除所有 OrderItem

2. **一致性邊界**

   - OrderItem 的變更必須與 Order 的 TotalAmount 保持一致
   - 這種強一致性需求表明它們屬於同一聚合
   - 跨聚合只能保證最終一致性

3. **事務邊界**

   - Order 和 OrderItem 的修改需要在同一個事務中完成
   - 例如：新增 OrderItem 必須同時更新 Order 的總金額
   - 獨立聚合會導致事務複雜度增加

4. **業務語義**
   - 從業務角度看，OrderItem 是 Order 的組成部分
   - 不具備獨立的業務意義
   - 業務操作始終是對整個訂單的操作

**核心重點：**

- 聚合設計的首要原則是「不變性邊界」
- 需要強一致性保證的實體應在同一聚合內
- 聚合根是唯一可以從外部直接存取的入口

**常見錯誤：**

```csharp
// ❌ 錯誤：將 OrderItem 設計為獨立聚合
public class OrderItemAppService
{
    public async Task AddAsync(CreateOrderItemDto input)
    {
        // 無法保證與 Order.TotalAmount 的一致性
        var item = new OrderItem(input.ProductId, input.Quantity, input.Price);
        await _repository.InsertAsync(item);
    }
}

// ✅ 正確：通過 Order 聚合根操作
public class OrderAppService
{
    public async Task AddItemAsync(Guid orderId, AddOrderItemDto input)
    {
        var order = await _orderRepository.GetAsync(orderId);
        order.AddItem(input.ProductId, input.Quantity, input.Price);
        // TotalAmount 自動更新，保證一致性
    }
}
```

### Q2. 值物件與實體的主要差異在持久化時如何體現？

**解答：**

值物件與實體在持久化時的差異：

| 特性             | 實體（Entity）      | 值物件（Value Object） |
| ---------------- | ------------------- | ---------------------- |
| **識別方式**     | 通過 Id 識別        | 通過屬性值識別         |
| **資料表設計**   | 獨立資料表，有主鍵  | 通常嵌入父實體資料表   |
| **更新方式**     | 可修改屬性值        | 整體替換（不可變）     |
| **相等性比較**   | Id 相同即相等       | 所有屬性值相同才相等   |
| **EF Core 配置** | 使用 `Entity<TKey>` | 使用 OwnsOne/OwnsMany  |

**實體持久化範例：**

```csharp
// 實體：有獨立的 Id 和生命週期
public class OrderItem : Entity<Guid>
{
    public Guid ProductId { get; private set; }
    public int Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }
}

// EF Core 配置：獨立資料表
builder.Entity<OrderItem>(b =>
{
    b.ToTable("OrderItems");
    b.HasKey(x => x.Id); // 有主鍵
    b.Property(x => x.ProductId).IsRequired();
});
```

**值物件持久化範例：**

```csharp
// 值物件：無 Id，不可變
public class Money : ValueObject
{
    public decimal Amount { get; }
    public string Currency { get; }

    public Money(decimal amount, string currency)
    {
        Amount = amount;
        Currency = currency;
    }

    protected override IEnumerable<object> GetAtomicValues()
    {
        yield return Amount;
        yield return Currency;
    }
}

// EF Core 配置：嵌入父實體
builder.Entity<Order>(b =>
{
    b.ToTable("Orders");
    b.OwnsOne(x => x.TotalPrice, price =>
    {
        price.Property(p => p.Amount).HasColumnName("TotalAmount");
        price.Property(p => p.Currency).HasColumnName("Currency");
    });
    // 資料存儲在 Orders 資料表的欄位中，不是獨立資料表
});
```

**資料表結構差異：**

```sql
-- 實體：獨立資料表
CREATE TABLE OrderItems (
    Id UNIQUEIDENTIFIER PRIMARY KEY,
    OrderId UNIQUEIDENTIFIER NOT NULL,
    ProductId UNIQUEIDENTIFIER NOT NULL,
    Quantity INT NOT NULL,
    UnitPrice DECIMAL(18,2) NOT NULL
);

-- 值物件：嵌入欄位
CREATE TABLE Orders (
    Id UNIQUEIDENTIFIER PRIMARY KEY,
    OrderNo NVARCHAR(50) NOT NULL,
    TotalAmount DECIMAL(18,2) NOT NULL,  -- Money.Amount
    Currency NVARCHAR(3) NOT NULL         -- Money.Currency
);
```

**最佳實踐：**

1. **使用值物件的場景**：

   - 地址（Address）、金額（Money）、日期範圍（DateRange）
   - 無需獨立查詢或修改的複合資料
   - 需要封裝驗證邏輯的資料組合

2. **使用實體的場景**：
   - 需要追蹤變更歷史
   - 具有獨立生命週期
   - 需要獨立查詢或修改

---

## 計算 / 練習題（中）💻

### Q3. 設計 Product 聚合，列舉應包含的欄位、驗證規則與至少兩個業務方法。

**解答：**

**完整的 Product 聚合設計：**

```csharp
// Domain/Products/Product.cs
public class Product : FullAuditedAggregateRoot<Guid>
{
    // 基本資訊
    public string Name { get; private set; }
    public string Sku { get; private set; }
    public string Description { get; private set; }

    // 分類與標籤
    public Guid CategoryId { get; private set; }
    public List<string> Tags { get; private set; } = new();

    // 定價資訊
    public Money Price { get; private set; }
    public Money? DiscountPrice { get; private set; }

    // 庫存管理
    public int Stock { get; private set; }
    public int ReorderLevel { get; private set; }

    // 狀態
    public ProductStatus Status { get; private set; }

    private Product() { } // EF Core 需要

    public Product(
        Guid id,
        string name,
        string sku,
        Guid categoryId,
        Money price,
        int initialStock = 0) : base(id)
    {
        SetName(name);
        SetSku(sku);
        CategoryId = categoryId;
        SetPrice(price);
        Stock = initialStock;
        ReorderLevel = 10; // 預設值
        Status = ProductStatus.Draft;
    }

    // 業務方法 1：調整價格
    public void SetPrice(Money newPrice, Money? discountPrice = null)
    {
        if (newPrice == null)
            throw new ArgumentNullException(nameof(newPrice));

        if (newPrice.Amount <= 0)
            throw new BusinessException("產品價格必須大於零");

        if (discountPrice != null && discountPrice.Amount >= newPrice.Amount)
            throw new BusinessException("折扣價必須低於原價");

        Price = newPrice;
        DiscountPrice = discountPrice;

        AddDomainEvent(new ProductPriceChangedEvent(Id, newPrice, discountPrice));
    }

    // 業務方法 2：庫存調整
    public void AdjustStock(int quantity, string reason)
    {
        if (Stock + quantity < 0)
            throw new BusinessException($"庫存不足，當前庫存：{Stock}，需要：{Math.Abs(quantity)}");

        var oldStock = Stock;
        Stock += quantity;

        // 庫存低於補貨點時發出警告事件
        if (Stock <= ReorderLevel && oldStock > ReorderLevel)
        {
            AddDomainEvent(new ProductLowStockEvent(Id, Stock, ReorderLevel));
        }

        AddDomainEvent(new ProductStockAdjustedEvent(Id, oldStock, Stock, quantity, reason));
    }

    // 業務方法 3：發佈產品
    public void Publish()
    {
        if (string.IsNullOrWhiteSpace(Name))
            throw new BusinessException("產品名稱不能為空");

        if (Price == null || Price.Amount <= 0)
            throw new BusinessException("必須設定有效價格");

        if (Stock < 0)
            throw new BusinessException("庫存數量不能為負數");

        Status = ProductStatus.Published;
        AddDomainEvent(new ProductPublishedEvent(Id));
    }

    // 業務方法 4：下架產品
    public void Archive()
    {
        if (Status == ProductStatus.Archived)
            throw new BusinessException("產品已經下架");

        Status = ProductStatus.Archived;
        AddDomainEvent(new ProductArchivedEvent(Id));
    }

    // 驗證方法
    private void SetName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("產品名稱不能為空");

        if (name.Length > 200)
            throw new ArgumentException("產品名稱不能超過 200 字元");

        Name = name.Trim();
    }

    private void SetSku(string sku)
    {
        if (string.IsNullOrWhiteSpace(sku))
            throw new ArgumentException("SKU 不能為空");

        if (!System.Text.RegularExpressions.Regex.IsMatch(sku, @"^[A-Z0-9\-]+$"))
            throw new ArgumentException("SKU 格式無效，只能包含大寫字母、數字和連字號");

        Sku = sku;
    }

    // 查詢方法
    public Money GetEffectivePrice()
    {
        return DiscountPrice ?? Price;
    }

    public bool IsLowStock()
    {
        return Stock <= ReorderLevel;
    }

    public bool IsAvailable()
    {
        return Status == ProductStatus.Published && Stock > 0;
    }
}

// 產品狀態枚舉
public enum ProductStatus
{
    Draft,      // 草稿
    Published,  // 已發佈
    Archived    // 已下架
}
```

**領域事件定義：**

```csharp
// Domain/Products/Events/ProductPriceChangedEvent.cs
public class ProductPriceChangedEvent : DomainEvent
{
    public Guid ProductId { get; }
    public Money NewPrice { get; }
    public Money? DiscountPrice { get; }

    public ProductPriceChangedEvent(Guid productId, Money newPrice, Money? discountPrice)
    {
        ProductId = productId;
        NewPrice = newPrice;
        DiscountPrice = discountPrice;
    }
}

// Domain/Products/Events/ProductLowStockEvent.cs
public class ProductLowStockEvent : DomainEvent
{
    public Guid ProductId { get; }
    public int CurrentStock { get; }
    public int ReorderLevel { get; }

    public ProductLowStockEvent(Guid productId, int currentStock, int reorderLevel)
    {
        ProductId = productId;
        CurrentStock = currentStock;
        ReorderLevel = reorderLevel;
    }
}
```

**驗證規則總結：**

1. **名稱驗證**：非空、長度限制 200 字元
2. **SKU 驗證**：非空、格式限制（大寫字母、數字、連字號）
3. **價格驗證**：必須大於零、折扣價必須低於原價
4. **庫存驗證**：調整後不能為負數
5. **發佈驗證**：必須有名稱、有效價格、庫存非負

**最佳實踐：**

- 使用私有 setter 保護封裝性
- 所有修改通過公開方法，確保驗證
- 發佈領域事件通知其他模組
- 使用值物件（Money）封裝複雜概念

### Q4. 描述領域事件在分散式系統中保證一致性的流程（至少 5 步驟）。

**解答：**

**領域事件保證分散式一致性的完整流程：**

```csharp
// 步驟 1：在聚合中發佈領域事件
public class Order : FullAuditedAggregateRoot<Guid>
{
    public void Confirm()
    {
        ValidateCanConfirm();
        Status = OrderStatus.Confirmed;

        // 發佈領域事件（尚未持久化）
        AddDomainEvent(new OrderConfirmedEvent(Id, TotalAmount, Items));
    }
}

// 步驟 2：Repository 儲存聚合與事件（同一事務）
public class OrderRepository : EfCoreRepository<Order, Guid>, IOrderRepository
{
    public override async Task<Order> InsertAsync(Order entity, bool autoSave = false)
    {
        // ABP 會自動在同一事務中：
        // 1. 儲存 Order 實體
        // 2. 儲存 DomainEvents 到 Outbox 資料表
        return await base.InsertAsync(entity, autoSave);
    }
}

// 步驟 3：本地事件處理器處理（同步）
public class OrderConfirmedEventHandler : ILocalEventHandler<OrderConfirmedEvent>
{
    private readonly IRepository<Product, Guid> _productRepository;
    private readonly IDistributedEventBus _distributedEventBus;

    public async Task HandleEventAsync(OrderConfirmedEvent eventData)
    {
        // 3.1 扣減庫存（同一事務內）
        foreach (var item in eventData.Items)
        {
            var product = await _productRepository.GetAsync(item.ProductId);
            product.AdjustStock(-item.Quantity, $"訂單 {eventData.OrderId} 確認");
        }

        // 3.2 發佈分散式事件到訊息佇列
        await _distributedEventBus.PublishAsync(
            new OrderConfirmedIntegrationEvent(
                eventData.OrderId,
                eventData.TotalAmount
            )
        );
    }
}

// 步驟 4：訊息佇列傳遞事件（RabbitMQ/Kafka）
// ABP 會自動序列化事件並發送到 MQ
// 配置在 Module 中：
public override void ConfigureServices(ServiceConfigurationContext context)
{
    Configure<AbpDistributedEventBusOptions>(options =>
    {
        options.Outboxes.Configure(config =>
        {
            config.UseDbContext<YourDbContext>();
        });
    });

    Configure<AbpRabbitMqEventBusOptions>(options =>
    {
        options.ClientName = "OrderService";
        options.ExchangeName = "AbpEventBus";
    });
}

// 步驟 5：其他微服務訂閱並處理事件
// 在支付服務中：
public class OrderConfirmedIntegrationEventHandler
    : IDistributedEventHandler<OrderConfirmedIntegrationEvent>
{
    private readonly IPaymentService _paymentService;

    public async Task HandleEventAsync(OrderConfirmedIntegrationEvent eventData)
    {
        // 建立支付記錄
        await _paymentService.CreatePaymentAsync(
            eventData.OrderId,
            eventData.TotalAmount
        );
    }
}

// 在通知服務中：
public class OrderConfirmedNotificationHandler
    : IDistributedEventHandler<OrderConfirmedIntegrationEvent>
{
    private readonly IEmailSender _emailSender;

    public async Task HandleEventAsync(OrderConfirmedIntegrationEvent eventData)
    {
        // 發送確認郵件
        await _emailSender.SendOrderConfirmationAsync(eventData.OrderId);
    }
}
```

**完整流程圖解：**

```
訂單服務 (Order Service)
┌─────────────────────────────────────────┐
│ 1. Order.Confirm()                       │
│    └─> AddDomainEvent(OrderConfirmed)   │
│                                          │
│ 2. SaveChangesAsync()                    │
│    ├─> 儲存 Order (已確認)               │
│    └─> 儲存 Event 到 Outbox 資料表       │
│        (同一事務，保證一致性)              │
│                                          │
│ 3. LocalEventHandler                     │
│    ├─> 扣減庫存                          │
│    └─> 發佈 IntegrationEvent             │
└─────────────────────────────────────────┘
                 ↓
         RabbitMQ / Kafka
┌─────────────────────────────────────────┐
│ 4. 訊息佇列保證至少一次傳遞                │
│    ├─> 持久化訊息                         │
│    └─> 重試機制                           │
└─────────────────────────────────────────┘
                 ↓
    ┌────────────┴────────────┐
    ↓                         ↓
支付服務              通知服務
┌──────────┐        ┌──────────┐
│ 5. 建立   │        │ 5. 發送   │
│   支付單  │        │   郵件    │
└──────────┘        └──────────┘
```

**保證一致性的關鍵機制：**

1. **Outbox 模式**：

```csharp
public class OutboxEvent
{
    public Guid Id { get; set; }
    public string EventType { get; set; }
    public string EventData { get; set; }
    public DateTime CreationTime { get; set; }
    public bool IsProcessed { get; set; }
    public int RetryCount { get; set; }
}

// 背景工作處理 Outbox
public class OutboxEventProcessor : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var events = await _repository.GetUnprocessedEventsAsync();

            foreach (var evt in events)
            {
                try
                {
                    await _eventBus.PublishAsync(evt.EventData);
                    evt.IsProcessed = true;
                }
                catch
                {
                    evt.RetryCount++;
                    // 重試邏輯
                }
            }

            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
    }
}
```

2. **冪等性處理**：

```csharp
public class OrderConfirmedIntegrationEventHandler
    : IDistributedEventHandler<OrderConfirmedIntegrationEvent>
{
    public async Task HandleEventAsync(OrderConfirmedIntegrationEvent eventData)
    {
        // 檢查是否已處理過（防止重複處理）
        var isProcessed = await _repository.IsEventProcessedAsync(eventData.EventId);
        if (isProcessed) return;

        // 執行業務邏輯
        await _paymentService.CreatePaymentAsync(eventData.OrderId, eventData.TotalAmount);

        // 標記為已處理
        await _repository.MarkEventAsProcessedAsync(eventData.EventId);
    }
}
```

3. **補償機制**：

```csharp
public class StockReservationFailedEventHandler
    : IDistributedEventHandler<StockReservationFailedEvent>
{
    public async Task HandleEventAsync(StockReservationFailedEvent eventData)
    {
        // 庫存不足時取消訂單（補償動作）
        var order = await _orderRepository.GetAsync(eventData.OrderId);
        order.Cancel("庫存不足");

        // 發送取消通知
        await _eventBus.PublishAsync(new OrderCancelledIntegrationEvent(eventData.OrderId));
    }
}
```

**最佳實踐總結：**

1. ✅ 使用 Outbox 模式確保事件至少發送一次
2. ✅ 實現冪等性處理避免重複執行
3. ✅ 設計補償機制處理失敗場景
4. ✅ 使用訊息佇列的 ACK 機制
5. ✅ 記錄事件處理狀態便於追蹤與偵錯

---

## 實作 / 編碼題（較難）🚀

### Q5. 實作一個 ShoppingCart 聚合，包含 AddProduct、RemoveProduct、Calculate 方法，並撰寫完整單元測試。

**解答：**

**完整的 ShoppingCart 聚合實作：**

```csharp
// Domain/ShoppingCarts/ShoppingCart.cs
public class ShoppingCart : AggregateRoot<Guid>
{
    public Guid UserId { get; private set; }
    public List<CartItem> Items { get; private set; } = new();
    public Money TotalAmount { get; private set; }
    public DateTime? ExpiresAt { get; private set; }
    public CartStatus Status { get; private set; }

    private ShoppingCart() { } // EF Core

    public ShoppingCart(Guid id, Guid userId) : base(id)
    {
        UserId = userId;
        TotalAmount = new Money(0, "TWD");
        ExpiresAt = DateTime.UtcNow.AddDays(7); // 7 天後過期
        Status = CartStatus.Active;
    }

    // 業務方法 1：新增商品
    public void AddProduct(Guid productId, string productName, Money price, int quantity = 1)
    {
        ValidateCanModify();
        ValidateQuantity(quantity);

        var existingItem = Items.FirstOrDefault(i => i.ProductId == productId);

        if (existingItem != null)
        {
            // 已存在，增加數量
            existingItem.IncreaseQuantity(quantity);
        }
        else
        {
            // 新商品
            Items.Add(new CartItem(productId, productName, price, quantity));
        }

        Calculate();
        AddDomainEvent(new ProductAddedToCartEvent(Id, productId, quantity));
    }

    // 業務方法 2：移除商品
    public void RemoveProduct(Guid productId)
    {
        ValidateCanModify();

        var item = Items.FirstOrDefault(i => i.ProductId == productId);
        if (item == null)
            throw new BusinessException($"購物車中不存在商品 {productId}");

        Items.Remove(item);
        Calculate();
        AddDomainEvent(new ProductRemovedFromCartEvent(Id, productId));
    }

    // 業務方法 3：更新商品數量
    public void UpdateQuantity(Guid productId, int newQuantity)
    {
        ValidateCanModify();
        ValidateQuantity(newQuantity);

        var item = Items.FirstOrDefault(i => i.ProductId == productId);
        if (item == null)
            throw new BusinessException($"購物車中不存在商品 {productId}");

        var oldQuantity = item.Quantity;
        item.SetQuantity(newQuantity);
        Calculate();

        AddDomainEvent(new CartItemQuantityChangedEvent(Id, productId, oldQuantity, newQuantity));
    }

    // 業務方法 4：計算總金額
    public void Calculate()
    {
        var total = Items.Sum(item => item.Subtotal.Amount);
        TotalAmount = new Money(total, "TWD");
    }

    // 業務方法 5：清空購物車
    public void Clear()
    {
        ValidateCanModify();

        Items.Clear();
        TotalAmount = new Money(0, "TWD");
        AddDomainEvent(new CartClearedEvent(Id));
    }

    // 業務方法 6：結帳
    public void Checkout()
    {
        ValidateCanCheckout();

        Status = CartStatus.CheckedOut;
        AddDomainEvent(new CartCheckedOutEvent(Id, UserId, Items.Select(i =>
            new CheckoutItem(i.ProductId, i.Quantity, i.Price)).ToList(), TotalAmount));
    }

    // 驗證方法
    private void ValidateCanModify()
    {
        if (Status == CartStatus.CheckedOut)
            throw new BusinessException("已結帳的購物車無法修改");

        if (Status == CartStatus.Expired)
            throw new BusinessException("已過期的購物車無法修改");

        if (ExpiresAt.HasValue && DateTime.UtcNow > ExpiresAt.Value)
        {
            Status = CartStatus.Expired;
            throw new BusinessException("購物車已過期");
        }
    }

    private void ValidateCanCheckout()
    {
        if (!Items.Any())
            throw new BusinessException("購物車是空的，無法結帳");

        ValidateCanModify();
    }

    private void ValidateQuantity(int quantity)
    {
        if (quantity <= 0)
            throw new ArgumentException("數量必須大於零");

        if (quantity > 999)
            throw new ArgumentException("單項商品數量不能超過 999");
    }

    // 查詢方法
    public int GetItemCount()
    {
        return Items.Count;
    }

    public int GetTotalQuantity()
    {
        return Items.Sum(i => i.Quantity);
    }

    public bool IsExpired()
    {
        return Status == CartStatus.Expired ||
               (ExpiresAt.HasValue && DateTime.UtcNow > ExpiresAt.Value);
    }
}

// 購物車項目（實體）
public class CartItem : Entity
{
    public Guid ProductId { get; private set; }
    public string ProductName { get; private set; }
    public Money Price { get; private set; }
    public int Quantity { get; private set; }
    public Money Subtotal { get; private set; }

    private CartItem() { } // EF Core

    public CartItem(Guid productId, string productName, Money price, int quantity)
    {
        ProductId = productId;
        ProductName = productName;
        Price = price;
        SetQuantity(quantity);
    }

    public void SetQuantity(int quantity)
    {
        if (quantity <= 0)
            throw new ArgumentException("數量必須大於零");

        Quantity = quantity;
        Subtotal = new Money(Price.Amount * quantity, Price.Currency);
    }

    public void IncreaseQuantity(int amount)
    {
        SetQuantity(Quantity + amount);
    }

    public override object[] GetKeys()
    {
        return new object[] { ProductId };
    }
}

// 購物車狀態
public enum CartStatus
{
    Active,      // 活躍
    CheckedOut,  // 已結帳
    Expired      // 已過期
}
```

**領域事件：**

```csharp
public class ProductAddedToCartEvent : DomainEvent
{
    public Guid CartId { get; }
    public Guid ProductId { get; }
    public int Quantity { get; }

    public ProductAddedToCartEvent(Guid cartId, Guid productId, int quantity)
    {
        CartId = cartId;
        ProductId = productId;
        Quantity = quantity;
    }
}

public class CartCheckedOutEvent : DomainEvent
{
    public Guid CartId { get; }
    public Guid UserId { get; }
    public List<CheckoutItem> Items { get; }
    public Money TotalAmount { get; }

    public CartCheckedOutEvent(Guid cartId, Guid userId, List<CheckoutItem> items, Money totalAmount)
    {
        CartId = cartId;
        UserId = userId;
        Items = items;
        TotalAmount = totalAmount;
    }
}

public class CheckoutItem
{
    public Guid ProductId { get; }
    public int Quantity { get; }
    public Money Price { get; }

    public CheckoutItem(Guid productId, int quantity, Money price)
    {
        ProductId = productId;
        Quantity = quantity;
        Price = price;
    }
}
```

**完整單元測試：**

```csharp
// Tests/Domain/ShoppingCarts/ShoppingCartTests.cs
public class ShoppingCartTests
{
    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _product1Id = Guid.NewGuid();
    private readonly Guid _product2Id = Guid.NewGuid();

    [Fact]
    public void Constructor_ShouldInitializeCorrectly()
    {
        // Arrange & Act
        var cart = new ShoppingCart(Guid.NewGuid(), _userId);

        // Assert
        Assert.Equal(_userId, cart.UserId);
        Assert.Empty(cart.Items);
        Assert.Equal(0, cart.TotalAmount.Amount);
        Assert.Equal(CartStatus.Active, cart.Status);
        Assert.NotNull(cart.ExpiresAt);
    }

    [Fact]
    public void AddProduct_NewProduct_ShouldAddToCart()
    {
        // Arrange
        var cart = new ShoppingCart(Guid.NewGuid(), _userId);
        var price = new Money(100, "TWD");

        // Act
        cart.AddProduct(_product1Id, "Product 1", price, 2);

        // Assert
        Assert.Single(cart.Items);
        Assert.Equal(2, cart.Items.First().Quantity);
        Assert.Equal(200, cart.TotalAmount.Amount);
        Assert.Single(cart.DomainEvents);
        Assert.IsType<ProductAddedToCartEvent>(cart.DomainEvents.First());
    }

    [Fact]
    public void AddProduct_ExistingProduct_ShouldIncreaseQuantity()
    {
        // Arrange
        var cart = new ShoppingCart(Guid.NewGuid(), _userId);
        var price = new Money(100, "TWD");
        cart.AddProduct(_product1Id, "Product 1", price, 2);
        cart.DomainEvents.Clear(); // 清除第一次的事件

        // Act
        cart.AddProduct(_product1Id, "Product 1", price, 3);

        // Assert
        Assert.Single(cart.Items);
        Assert.Equal(5, cart.Items.First().Quantity);
        Assert.Equal(500, cart.TotalAmount.Amount);
    }

    [Fact]
    public void AddProduct_InvalidQuantity_ShouldThrow()
    {
        // Arrange
        var cart = new ShoppingCart(Guid.NewGuid(), _userId);
        var price = new Money(100, "TWD");

        // Act & Assert
        Assert.Throws<ArgumentException>(() =>
            cart.AddProduct(_product1Id, "Product 1", price, 0));

        Assert.Throws<ArgumentException>(() =>
            cart.AddProduct(_product1Id, "Product 1", price, -1));

        Assert.Throws<ArgumentException>(() =>
            cart.AddProduct(_product1Id, "Product 1", price, 1000));
    }

    [Fact]
    public void RemoveProduct_ExistingProduct_ShouldRemove()
    {
        // Arrange
        var cart = new ShoppingCart(Guid.NewGuid(), _userId);
        var price = new Money(100, "TWD");
        cart.AddProduct(_product1Id, "Product 1", price, 2);
        cart.AddProduct(_product2Id, "Product 2", price, 1);

        // Act
        cart.RemoveProduct(_product1Id);

        // Assert
        Assert.Single(cart.Items);
        Assert.Equal(_product2Id, cart.Items.First().ProductId);
        Assert.Equal(100, cart.TotalAmount.Amount);
    }

    [Fact]
    public void RemoveProduct_NonExistingProduct_ShouldThrow()
    {
        // Arrange
        var cart = new ShoppingCart(Guid.NewGuid(), _userId);

        // Act & Assert
        var exception = Assert.Throws<BusinessException>(() =>
            cart.RemoveProduct(_product1Id));

        Assert.Contains("不存在商品", exception.Message);
    }

    [Fact]
    public void UpdateQuantity_ExistingProduct_ShouldUpdate()
    {
        // Arrange
        var cart = new ShoppingCart(Guid.NewGuid(), _userId);
        var price = new Money(100, "TWD");
        cart.AddProduct(_product1Id, "Product 1", price, 2);

        // Act
        cart.UpdateQuantity(_product1Id, 5);

        // Assert
        Assert.Equal(5, cart.Items.First().Quantity);
        Assert.Equal(500, cart.TotalAmount.Amount);
    }

    [Fact]
    public void Calculate_MultipleProducts_ShouldCalculateCorrectly()
    {
        // Arrange
        var cart = new ShoppingCart(Guid.NewGuid(), _userId);
        cart.AddProduct(_product1Id, "Product 1", new Money(100, "TWD"), 2);
        cart.AddProduct(_product2Id, "Product 2", new Money(50, "TWD"), 3);

        // Act
        cart.Calculate();

        // Assert
        Assert.Equal(350, cart.TotalAmount.Amount); // (100*2) + (50*3)
    }

    [Fact]
    public void Clear_ShouldRemoveAllItems()
    {
        // Arrange
        var cart = new ShoppingCart(Guid.NewGuid(), _userId);
        cart.AddProduct(_product1Id, "Product 1", new Money(100, "TWD"), 2);
        cart.AddProduct(_product2Id, "Product 2", new Money(50, "TWD"), 3);

        // Act
        cart.Clear();

        // Assert
        Assert.Empty(cart.Items);
        Assert.Equal(0, cart.TotalAmount.Amount);
        Assert.Contains(cart.DomainEvents, e => e is CartClearedEvent);
    }

    [Fact]
    public void Checkout_WithItems_ShouldSucceed()
    {
        // Arrange
        var cart = new ShoppingCart(Guid.NewGuid(), _userId);
        cart.AddProduct(_product1Id, "Product 1", new Money(100, "TWD"), 2);

        // Act
        cart.Checkout();

        // Assert
        Assert.Equal(CartStatus.CheckedOut, cart.Status);
        Assert.Contains(cart.DomainEvents, e => e is CartCheckedOutEvent);
    }

    [Fact]
    public void Checkout_EmptyCart_ShouldThrow()
    {
        // Arrange
        var cart = new ShoppingCart(Guid.NewGuid(), _userId);

        // Act & Assert
        var exception = Assert.Throws<BusinessException>(() => cart.Checkout());
        Assert.Contains("購物車是空的", exception.Message);
    }

    [Fact]
    public void AddProduct_AfterCheckout_ShouldThrow()
    {
        // Arrange
        var cart = new ShoppingCart(Guid.NewGuid(), _userId);
        cart.AddProduct(_product1Id, "Product 1", new Money(100, "TWD"), 1);
        cart.Checkout();

        // Act & Assert
        var exception = Assert.Throws<BusinessException>(() =>
            cart.AddProduct(_product2Id, "Product 2", new Money(50, "TWD"), 1));

        Assert.Contains("已結帳的購物車無法修改", exception.Message);
    }

    [Fact]
    public void GetItemCount_ShouldReturnCorrectCount()
    {
        // Arrange
        var cart = new ShoppingCart(Guid.NewGuid(), _userId);
        cart.AddProduct(_product1Id, "Product 1", new Money(100, "TWD"), 2);
        cart.AddProduct(_product2Id, "Product 2", new Money(50, "TWD"), 3);

        // Act
        var count = cart.GetItemCount();

        // Assert
        Assert.Equal(2, count);
    }

    [Fact]
    public void GetTotalQuantity_ShouldReturnCorrectTotal()
    {
        // Arrange
        var cart = new ShoppingCart(Guid.NewGuid(), _userId);
        cart.AddProduct(_product1Id, "Product 1", new Money(100, "TWD"), 2);
        cart.AddProduct(_product2Id, "Product 2", new Money(50, "TWD"), 3);

        // Act
        var total = cart.GetTotalQuantity();

        // Assert
        Assert.Equal(5, total);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(5)]
    [InlineData(100)]
    public void AddProduct_VariousQuantities_ShouldWork(int quantity)
    {
        // Arrange
        var cart = new ShoppingCart(Guid.NewGuid(), _userId);
        var price = new Money(100, "TWD");

        // Act
        cart.AddProduct(_product1Id, "Product 1", price, quantity);

        // Assert
        Assert.Equal(quantity, cart.Items.First().Quantity);
        Assert.Equal(100 * quantity, cart.TotalAmount.Amount);
    }
}
```

**測試覆蓋要點：**

1. ✅ 建構函數初始化測試
2. ✅ 新增商品（新商品、已存在商品）
3. ✅ 移除商品（存在、不存在）
4. ✅ 更新數量
5. ✅ 計算總金額
6. ✅ 清空購物車
7. ✅ 結帳流程
8. ✅ 狀態驗證（已結帳後無法修改）
9. ✅ 邊界條件測試（無效數量、空購物車）
10. ✅ 領域事件發佈驗證
11. ✅ 查詢方法測試
12. ✅ 參數化測試（Theory）

### Q6. 設計一個跨聚合的業務場景（例如訂單確認時驗證商品庫存），使用領域服務與事件實現，並說明如何保證一致性。

**解答：**

**業務場景：訂單確認時驗證商品庫存並扣減**

此場景涉及兩個聚合：

- **Order 聚合**：管理訂單狀態
- **Product 聚合**：管理商品庫存

**完整實作：**

```csharp
// ============================================
// 1. 領域服務：處理跨聚合邏輯
// ============================================
public class OrderConfirmationDomainService : DomainService
{
    private readonly IRepository<Product, Guid> _productRepository;
    private readonly IRepository<Order, Guid> _orderRepository;
    private readonly ILogger<OrderConfirmationDomainService> _logger;

    public OrderConfirmationDomainService(
        IRepository<Product, Guid> productRepository,
        IRepository<Order, Guid> orderRepository,
        ILogger<OrderConfirmationDomainService> logger)
    {
        _productRepository = productRepository;
        _orderRepository = orderRepository;
        _logger = logger;
    }

    /// <summary>
    /// 確認訂單並扣減庫存（使用 Saga 模式）
    /// </summary>
    public async Task<OrderConfirmationResult> ConfirmOrderAsync(Guid orderId)
    {
        // 步驟 1：載入訂單聚合
        var order = await _orderRepository.GetAsync(orderId);

        if (order.Status != OrderStatus.Created)
        {
            throw new BusinessException($"訂單狀態無效：{order.Status}");
        }

        // 步驟 2：驗證所有商品庫存（在實際扣減前先檢查）
        var validationResult = await ValidateStockAvailabilityAsync(order);
        if (!validationResult.IsValid)
        {
            _logger.LogWarning($"訂單 {orderId} 庫存驗證失敗：{validationResult.Message}");
            return OrderConfirmationResult.Failed(validationResult.Message);
        }

        // 步驟 3：嘗試扣減庫存（使用補償模式）
        var reservedProducts = new List<(Product Product, int Quantity)>();

        try
        {
            foreach (var item in order.Items)
            {
                var product = await _productRepository.GetAsync(item.ProductId);

                // 扣減庫存
                product.AdjustStock(-item.Quantity, $"訂單 {order.OrderNo} 確認");
                reservedProducts.Add((product, item.Quantity));

                _logger.LogInformation(
                    $"商品 {product.Id} 庫存扣減 {item.Quantity}，剩餘 {product.Stock}");
            }

            // 步驟 4：確認訂單
            order.Confirm();

            _logger.LogInformation($"訂單 {orderId} 確認成功");

            return OrderConfirmationResult.Success();
        }
        catch (Exception ex)
        {
            // 步驟 5：補償動作 - 回滾已扣減的庫存
            _logger.LogError(ex, $"訂單 {orderId} 確認失敗，開始回滾庫存");

            foreach (var (product, quantity) in reservedProducts)
            {
                try
                {
                    product.AdjustStock(quantity, $"訂單 {order.OrderNo} 確認失敗回滾");
                    _logger.LogInformation($"商品 {product.Id} 庫存回滾 {quantity}");
                }
                catch (Exception rollbackEx)
                {
                    _logger.LogError(rollbackEx,
                        $"商品 {product.Id} 庫存回滾失敗，需要人工介入");

                    // 發佈補償失敗事件，需要人工處理
                    // 這裡可以發送通知給管理員
                }
            }

            throw new BusinessException("訂單確認失敗，庫存已回滾", ex);
        }
    }

    private async Task<StockValidationResult> ValidateStockAvailabilityAsync(Order order)
    {
        foreach (var item in order.Items)
        {
            var product = await _productRepository.GetAsync(item.ProductId);

            if (!product.IsAvailable())
            {
                return StockValidationResult.Invalid(
                    $"商品 {product.Name} 目前不可購買");
            }

            if (product.Stock < item.Quantity)
            {
                return StockValidationResult.Invalid(
                    $"商品 {product.Name} 庫存不足，需要 {item.Quantity}，剩餘 {product.Stock}");
            }
        }

        return StockValidationResult.Valid();
    }
}

// 驗證結果
public class StockValidationResult
{
    public bool IsValid { get; private set; }
    public string Message { get; private set; }

    public static StockValidationResult Valid() => new() { IsValid = true };

    public static StockValidationResult Invalid(string message) =>
        new() { IsValid = false, Message = message };
}

// 確認結果
public class OrderConfirmationResult
{
    public bool IsSuccess { get; private set; }
    public string Message { get; private set; }

    public static OrderConfirmationResult Success() =>
        new() { IsSuccess = true, Message = "訂單確認成功" };

    public static OrderConfirmationResult Failed(string message) =>
        new() { IsSuccess = false, Message = message };
}

// ============================================
// 2. 應用層服務：協調領域服務
// ============================================
public class OrderAppService : ApplicationService, IOrderAppService
{
    private readonly OrderConfirmationDomainService _confirmationService;
    private readonly IRepository<Order, Guid> _orderRepository;
    private readonly IUnitOfWorkManager _unitOfWorkManager;

    public async Task<OrderDto> ConfirmOrderAsync(Guid id)
    {
        // 使用明確的工作單元確保事務一致性
        using var uow = _unitOfWorkManager.Begin(requiresNew: true);

        try
        {
            // 呼叫領域服務
            var result = await _confirmationService.ConfirmOrderAsync(id);

            if (!result.IsSuccess)
            {
                throw new UserFriendlyException(result.Message);
            }

            // 提交事務（同時儲存 Order 和 Product 的變更）
            await uow.CompleteAsync();

            // 查詢並返回
            var order = await _orderRepository.GetAsync(id);
            return ObjectMapper.Map<Order, OrderDto>(order);
        }
        catch
        {
            // 發生例外時自動回滾
            await uow.RollbackAsync();
            throw;
        }
    }
}

// ============================================
// 3. 事件驅動的替代方案（最終一致性）
// ============================================

// 方案 A：使用本地事件（同步處理，同一事務）
public class OrderConfirmedLocalEventHandler
    : ILocalEventHandler<OrderConfirmedEvent>,
      ITransientDependency
{
    private readonly IRepository<Product, Guid> _productRepository;

    public async Task HandleEventAsync(OrderConfirmedEvent eventData)
    {
        // 在同一個事務內處理
        foreach (var item in eventData.Items)
        {
            var product = await _productRepository.GetAsync(item.ProductId);
            product.AdjustStock(-item.Quantity, $"訂單 {eventData.OrderNo} 確認");
        }

        // 因為在同一個 UnitOfWork 中，所以會一起提交
    }
}

// 方案 B：使用分散式事件（異步處理，最終一致性）
public class OrderConfirmedDistributedEventHandler
    : IDistributedEventHandler<OrderConfirmedIntegrationEvent>,
      ITransientDependency
{
    private readonly IRepository<Product, Guid> _productRepository;
    private readonly IDistributedEventBus _eventBus;
    private readonly ILogger<OrderConfirmedDistributedEventHandler> _logger;

    public async Task HandleEventAsync(OrderConfirmedIntegrationEvent eventData)
    {
        // 異步處理，需要處理冪等性
        var eventId = $"order-confirmed-{eventData.OrderId}";

        // 檢查是否已處理
        if (await IsEventProcessedAsync(eventId))
        {
            _logger.LogInformation($"事件 {eventId} 已處理，跳過");
            return;
        }

        try
        {
            // 扣減庫存
            foreach (var item in eventData.Items)
            {
                var product = await _productRepository.GetAsync(item.ProductId);

                if (product.Stock < item.Quantity)
                {
                    // 庫存不足，發佈補償事件
                    await _eventBus.PublishAsync(new StockReservationFailedEvent(
                        eventData.OrderId,
                        item.ProductId,
                        item.Quantity,
                        product.Stock
                    ));

                    return;
                }

                product.AdjustStock(-item.Quantity, $"訂單 {eventData.OrderNo} 確認");
            }

            // 標記事件已處理
            await MarkEventAsProcessedAsync(eventId);

            _logger.LogInformation($"訂單 {eventData.OrderId} 庫存扣減完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"處理訂單確認事件失敗：{eventData.OrderId}");

            // 發佈失敗事件，觸發補償流程
            await _eventBus.PublishAsync(new OrderConfirmationFailedEvent(
                eventData.OrderId,
                ex.Message
            ));
        }
    }

    private Task<bool> IsEventProcessedAsync(string eventId)
    {
        // 實作檢查邏輯（例如查詢 ProcessedEvents 資料表）
        throw new NotImplementedException();
    }

    private Task MarkEventAsProcessedAsync(string eventId)
    {
        // 實作標記邏輯
        throw new NotImplementedException();
    }
}

// 補償事件處理器
public class StockReservationFailedEventHandler
    : IDistributedEventHandler<StockReservationFailedEvent>
{
    private readonly IRepository<Order, Guid> _orderRepository;

    public async Task HandleEventAsync(StockReservationFailedEvent eventData)
    {
        // 取消訂單（補償動作）
        var order = await _orderRepository.GetAsync(eventData.OrderId);
        order.Cancel("庫存不足");

        // 通知使用者
        // await _notificationService.NotifyAsync(...);
    }
}

// ============================================
// 4. 單元測試
// ============================================
public class OrderConfirmationDomainServiceTests
{
    private readonly Mock<IRepository<Order, Guid>> _orderRepositoryMock;
    private readonly Mock<IRepository<Product, Guid>> _productRepositoryMock;
    private readonly Mock<ILogger<OrderConfirmationDomainService>> _loggerMock;
    private readonly OrderConfirmationDomainService _service;

    public OrderConfirmationDomainServiceTests()
    {
        _orderRepositoryMock = new Mock<IRepository<Order, Guid>>();
        _productRepositoryMock = new Mock<IRepository<Product, Guid>>();
        _loggerMock = new Mock<ILogger<OrderConfirmationDomainService>>();

        _service = new OrderConfirmationDomainService(
            _productRepositoryMock.Object,
            _orderRepositoryMock.Object,
            _loggerMock.Object
        );
    }

    [Fact]
    public async Task ConfirmOrderAsync_WithSufficientStock_ShouldSucceed()
    {
        // Arrange
        var productId = Guid.NewGuid();
        var orderId = Guid.NewGuid();

        var product = new Product(productId, "Product 1", "SKU-001",
            Guid.NewGuid(), new Money(100, "TWD"), 10);
        product.Publish();

        var order = new Order(orderId, "ORD-001");
        order.AddItem(productId, 3, 100);

        _orderRepositoryMock.Setup(r => r.GetAsync(orderId)).ReturnsAsync(order);
        _productRepositoryMock.Setup(r => r.GetAsync(productId)).ReturnsAsync(product);

        // Act
        var result = await _service.ConfirmOrderAsync(orderId);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.Confirmed, order.Status);
        Assert.Equal(7, product.Stock); // 10 - 3 = 7
    }

    [Fact]
    public async Task ConfirmOrderAsync_WithInsufficientStock_ShouldFail()
    {
        // Arrange
        var productId = Guid.NewGuid();
        var orderId = Guid.NewGuid();

        var product = new Product(productId, "Product 1", "SKU-001",
            Guid.NewGuid(), new Money(100, "TWD"), 2); // 只有 2 個庫存
        product.Publish();

        var order = new Order(orderId, "ORD-001");
        order.AddItem(productId, 5, 100); // 需要 5 個

        _orderRepositoryMock.Setup(r => r.GetAsync(orderId)).ReturnsAsync(order);
        _productRepositoryMock.Setup(r => r.GetAsync(productId)).ReturnsAsync(product);

        // Act
        var result = await _service.ConfirmOrderAsync(orderId);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("庫存不足", result.Message);
        Assert.Equal(OrderStatus.Created, order.Status); // 訂單狀態未變更
        Assert.Equal(2, product.Stock); // 庫存未扣減
    }

    [Fact]
    public async Task ConfirmOrderAsync_PartialFailure_ShouldRollback()
    {
        // Arrange
        var product1Id = Guid.NewGuid();
        var product2Id = Guid.NewGuid();
        var orderId = Guid.NewGuid();

        var product1 = new Product(product1Id, "Product 1", "SKU-001",
            Guid.NewGuid(), new Money(100, "TWD"), 10);
        product1.Publish();

        var product2 = new Product(product2Id, "Product 2", "SKU-002",
            Guid.NewGuid(), new Money(50, "TWD"), 2);
        product2.Publish();

        var order = new Order(orderId, "ORD-001");
        order.AddItem(product1Id, 3, 100);
        order.AddItem(product2Id, 5, 50); // 這個會失敗（庫存不足）

        _orderRepositoryMock.Setup(r => r.GetAsync(orderId)).ReturnsAsync(order);
        _productRepositoryMock.Setup(r => r.GetAsync(product1Id)).ReturnsAsync(product1);
        _productRepositoryMock.Setup(r => r.GetAsync(product2Id)).ReturnsAsync(product2);

        // Act
        await Assert.ThrowsAsync<BusinessException>(() =>
            _service.ConfirmOrderAsync(orderId));

        // Assert
        Assert.Equal(10, product1.Stock); // Product 1 庫存已回滾
        Assert.Equal(2, product2.Stock);  // Product 2 庫存未變
        Assert.Equal(OrderStatus.Created, order.Status);
    }
}
```

**一致性保證機制總結：**

```
┌─────────────────────────────────────────────────────────────┐
│                     一致性保證機制                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  方案 1：強一致性（同步 + 領域服務）                            │
│  ┌────────────────────────────────────────┐                 │
│  │ 1. 開始事務 (UnitOfWork)                │                 │
│  │ 2. 驗證所有商品庫存                      │                 │
│  │ 3. 扣減所有商品庫存                      │                 │
│  │ 4. 確認訂單狀態                          │                 │
│  │ 5. 提交事務（成功）OR 回滾（失敗）         │                 │
│  └────────────────────────────────────────┘                 │
│  優點：強一致性、簡單直接                                      │
│  缺點：性能較低、擴展性受限                                    │
│                                                              │
│  方案 2：最終一致性（異步 + 事件驅動）                          │
│  ┌────────────────────────────────────────┐                 │
│  │ 1. 訂單確認 → 發佈 OrderConfirmedEvent   │                 │
│  │ 2. 事件處理器異步扣減庫存                 │                 │
│  │ 3. 失敗時發佈補償事件                     │                 │
│  │ 4. 補償處理器取消訂單                     │                 │
│  └────────────────────────────────────────┘                 │
│  優點：高性能、可擴展                                          │
│  缺點：複雜度高、需處理冪等性                                  │
│                                                              │
│  關鍵技術：                                                   │
│  • Outbox Pattern（保證事件發送）                             │
│  • Saga Pattern（編排補償流程）                               │
│  • Idempotent Consumer（防止重複處理）                        │
│  • Compensation（補償機制）                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 最佳實務總結

1. **聚合設計原則**

   - 聚合邊界應與事務邊界一致
   - 一次只修改一個聚合
   - 通過 ID 引用其他聚合

2. **領域服務使用時機**

   - 業務邏輯跨越多個聚合
   - 需要外部依賴（Repository、外部服務）
   - 不適合放在任何一個聚合內的邏輯

3. **事件驅動最佳實踐**
   - 本地事件用於同一事務內的一致性
