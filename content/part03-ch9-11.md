# 第三部：領域驅動設計（章 9–11）

本檔為教材第三部（章 9–11）教學草稿，聚焦於 DDD 理論與實務實作，包含範例、測試、Mapster、授權與最佳實務。

## 學習目標
- 理解 DDD 基本概念：聚合、實體、值物件、邊界上下文
- 能設計聚合根、領域事件與應用層服務
- 掌握 DTO 設計、Mapster 對映與授權實作
- 撰寫測試驗證商業邏輯與授權

## 先修需求
- 熟悉 C#、.NET、ASP.NET Core、ABP Module 概念

## 9 領域驅動設計理論（DDD）
### 核心概念
- 聚合（Aggregate）與聚合根（Aggregate Root）
- 值物件（Value Object）
- 邊界上下文（Bounded Context）
- 領域事件（Domain Event）

### 設計原則要點
- 聚合大小應由一致性邊界決定
- 避免跨聚合事務（使用事件或最終一致性）
- 將商業規則封裝於聚合方法中

## 10 領域層實作
### 聚合根範例：訂單 Order
```csharp
// csharp
public class Order : AggregateRoot<Guid>
{
    public string OrderNo { get; private set; }
    public List<OrderItem> Items { get; private set; } = new();
    public OrderStatus Status { get; private set; }

    public Order(Guid id, string orderNo) : base(id)
    {
        OrderNo = orderNo;
        Status = OrderStatus.Created;
    }

    public void AddItem(Guid productId, int qty, decimal price)
    {
        if (qty <= 0) throw new ArgumentException("Quantity must be positive", nameof(qty));
        Items.Add(new OrderItem(productId, qty, price));
        AddDomainEvent(new OrderItemAddedEvent(Id, productId, qty));
    }

    public void Confirm() 
    {
        if (!Items.Any()) throw new InvalidOperationException("Order has no items");
        Status = OrderStatus.Confirmed;
        AddDomainEvent(new OrderConfirmedEvent(Id));
    }
}
```

```csharp
// csharp
public class OrderItem
{
    public Guid ProductId { get; private set; }
    public int Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }

    public OrderItem(Guid productId, int quantity, decimal unitPrice)
    {
        ProductId = productId;
        Quantity = quantity;
        UnitPrice = unitPrice;
    }
}
```

### 領域事件範例
```csharp
public class OrderItemAddedEvent : DomainEvent
{
    public Guid OrderId { get; }
    public Guid ProductId { get; }
    public int Quantity { get; }
    public OrderItemAddedEvent(Guid orderId, Guid productId, int quantity)
    {
        OrderId = orderId; ProductId = productId; Quantity = quantity;
    }
}
```

## 11 應用層設計
### DTO 設計原則
- 明確區分輸入（Create/Update DTO）與輸出（Display DTO）
- 避免將整個實體直接回傳給前端
- 依使用情境設計輕量 DTO

### Mapster 對映範例
```csharp
// csharp
TypeAdapterConfig<Order, OrderDto>.NewConfig()
    .Map(dest => dest.Total, src => src.Items.Sum(i => i.Quantity * i.UnitPrice));
```

```csharp
public class OrderDto
{
    public Guid Id { get; set; }
    public string OrderNo { get; set; }
    public List<OrderItemDto> Items { get; set; }
    public decimal Total { get; set; }
}

public class OrderItemDto
{
    public Guid ProductId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}
```

### 應用服務與授權
```csharp
// csharp
public class OrderAppService : ApplicationService, IOrderAppService
{
    private readonly IOrderRepository _orderRepository;
    public OrderAppService(IOrderRepository orderRepository) => _orderRepository = orderRepository;

    [Authorize("Order.Create")]
    public async Task<OrderDto> CreateAsync(CreateOrderDto input)
    {
        var order = new Order(Guid.NewGuid(), input.OrderNo);
        foreach(var it in input.Items) order.AddItem(it.ProductId, it.Quantity, it.UnitPrice);
        await _orderRepository.InsertAsync(order);
        return ObjectMapper.Map<Order, OrderDto>(order);
    }
}
```

### 測試導向設計（TDD）
- 為聚合行為撰寫單元測試，驗證商業規則

```csharp
// csharp
public class OrderTests
{
    [Fact]
    public void AddItem_ShouldRaiseEvent()
    {
        var order = new Order(Guid.NewGuid(), "ON-1");
        order.AddItem(Guid.NewGuid(), 1, 100);
        Assert.Contains(order.DomainEvents, e => e is OrderItemAddedEvent);
    }
}
```

## 最佳實務總結
- 聚合應小而專注，以一致性邊界為導向
- 領域邏輯放在領域模型，應用層僅協調流程
- 使用領域事件解耦跨聚合通訊
- 撰寫充足的單元與整合測試

## 常見問題（FAQ）
Q：何時使用值物件？  
A：當資料以不可變且無獨立 ID 的形式存在（如地址、金額）。

Q：聚合內集合過大怎麼辦？  
A：考慮拆分子聚合或改為參照集合並使用懶載入與查詢優化。

## 參考資源
- ABP 官方 DDD 文件：https://docs.abp.io/en/abp/latest/Domain-Driven-Design
- Mapster：https://github.com/MapsterMapper/Mapster

---