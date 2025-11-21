# 第九章習題解答

## 習題 1：概念題 ⭐

**題目：解釋什麼是聚合（Aggregate）及其在 DDD 中的核心意義。**

### 解答

**聚合定義**：一組相關物件的集合，以聚合根為單一入口，共同維護業務一致性邊界。

#### 核心意義

```
不使用聚合：
Order ─直接─> OrderLine
  ├─ 直接修改 OrderLine 可能違反業務規則
  └─ 難以保證一致性

使用聚合：
Order (聚合根) ─控制入口─> OrderLine (子實體)
  ├─ 所有修改必須通過 Order 的方法
  └─ 業務規則集中在 Order 中
```

#### 代碼示例

```csharp
// ❌ 不良做法：直接修改子實體
orderLine.Quantity = 0; // 可能違反規則

// ✅ 正確做法：通過聚合根
order.UpdateLineItem(lineId, newQuantity); // 驗證業務規則

public class Order : AggregateRoot<Guid>
{
    public List<OrderLine> Lines { get; private set; }

    public void UpdateLineItem(Guid lineId, int quantity)
    {
        if (quantity <= 0) throw new InvalidOperationException("數量必須大於 0");

        var line = Lines.First(l => l.Id == lineId);
        line.Update(quantity);

        AddDomainEvent(new OrderLineUpdatedEvent(Id, lineId, quantity));
    }
}
```

---

## 習題 2：概念題 ⭐

**題目：值物件（Value Object）與實體（Entity）的區別？**

### 解答

| 特性         | 值物件                      | 實體                 |
| ------------ | --------------------------- | -------------------- |
| **身份**     | 無獨立身份                  | 有唯一 ID            |
| **可變性**   | 不可變（Immutable）         | 可變                 |
| **相等性**   | 按值相等                    | 按 ID 相等           |
| **生命週期** | 依附於實體                  | 獨立生命週期         |
| **例子**     | Money、Address、PhoneNumber | User、Order、Product |

#### 代碼對比

```csharp
// ❌ 值物件實現錯誤
public class Address
{
    public string Street { get; set; }
    public string City { get; set; }
}

// ✅ 值物件正確實現
public class Address : ValueObject
{
    public string Street { get; private set; }
    public string City { get; private set; }

    public Address(string street, string city)
    {
        Street = street;
        City = city;
    }

    protected override IEnumerable<object> GetEqualityComponents()
    {
        yield return Street;
        yield return City;
    }
}

// 使用
var addr1 = new Address("Main St", "NYC");
var addr2 = new Address("Main St", "NYC");
Assert.True(addr1 == addr2); // 按值相等 ✓
```

---

## 習題 3：計算/練習題 💻

**題目：設計一個「訂單系統」的聚合根，定義邊界並實現關鍵業務規則。**

### 解答

#### 聚合邊界設計

```
Order (聚合根)
├─ OrderId
├─ CustomerId (外鍵引用，不直接包含 Customer)
├─ OrderDate
├─ Status
├─ Items (OrderLine 集合 - 聚合內)
│  ├─ LineId
│  ├─ ProductId
│  ├─ Quantity
│  └─ UnitPrice
└─ ShippingAddress (值物件 - 聚合內)
   ├─ Street
   ├─ City
   └─ PostalCode
```

#### 實現

```csharp
public class Order : AggregateRoot<Guid>
{
    public Guid CustomerId { get; private set; }
    public DateTime OrderDate { get; private set; }
    public OrderStatus Status { get; private set; }
    public List<OrderLine> Items { get; private set; } = new();
    public Address ShippingAddress { get; private set; }
    public decimal TotalAmount { get; private set; }

    public Order(Guid id, Guid customerId, Address shippingAddress) : base(id)
    {
        CustomerId = customerId;
        ShippingAddress = shippingAddress;
        OrderDate = DateTime.UtcNow;
        Status = OrderStatus.Created;
    }

    // 業務規則：添加行項
    public void AddItem(Guid productId, int quantity, decimal unitPrice)
    {
        if (Status != OrderStatus.Created)
            throw new InvalidOperationException("只能在 Created 狀態添加行項");

        if (quantity <= 0)
            throw new ArgumentException("數量必須大於 0");

        if (Items.Count >= 100)
            throw new InvalidOperationException("行項數量不能超過 100");

        var existingItem = Items.FirstOrDefault(i => i.ProductId == productId);
        if (existingItem != null)
        {
            existingItem.IncreaseQuantity(quantity);
        }
        else
        {
            Items.Add(new OrderLine(Guid.NewGuid(), productId, quantity, unitPrice));
        }

        UpdateTotalAmount();
        AddDomainEvent(new OrderItemAddedEvent(Id, productId, quantity));
    }

    // 業務規則：確認訂單
    public void Confirm()
    {
        if (Status != OrderStatus.Created)
            throw new InvalidOperationException("訂單已確認");

        if (!Items.Any())
            throw new InvalidOperationException("訂單必須包含至少一個行項");

        Status = OrderStatus.Confirmed;
        AddDomainEvent(new OrderConfirmedEvent(Id, TotalAmount));
    }

    // 業務規則：取消訂單
    public void Cancel()
    {
        if (Status == OrderStatus.Shipped || Status == OrderStatus.Completed)
            throw new InvalidOperationException("已發貨或已完成的訂單不能取消");

        Status = OrderStatus.Cancelled;
        AddDomainEvent(new OrderCancelledEvent(Id));
    }

    private void UpdateTotalAmount()
    {
        TotalAmount = Items.Sum(i => i.Quantity * i.UnitPrice);
    }
}

public class OrderLine
{
    public Guid Id { get; private set; }
    public Guid ProductId { get; private set; }
    public int Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }

    public OrderLine(Guid id, Guid productId, int quantity, decimal unitPrice)
    {
        Id = id;
        ProductId = productId;
        Quantity = quantity;
        UnitPrice = unitPrice;
    }

    public void IncreaseQuantity(int quantity)
    {
        Quantity += quantity;
    }
}

public enum OrderStatus
{
    Created,
    Confirmed,
    Shipped,
    Completed,
    Cancelled
}
```

---

## 習題 4：計算/練習題 💻

**題目：實作事件溯源（Event Sourcing），記錄 Order 的所有狀態變化。**

### 解答

#### 事件設計

```csharp
public abstract class DomainEvent
{
    public Guid AggregateId { get; set; }
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
}

public class OrderCreatedEvent : DomainEvent
{
    public Guid CustomerId { get; set; }
    public Address ShippingAddress { get; set; }
}

public class OrderItemAddedEvent : DomainEvent
{
    public Guid ProductId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

public class OrderConfirmedEvent : DomainEvent
{
    public decimal TotalAmount { get; set; }
}

public class OrderCancelledEvent : DomainEvent { }
```

#### 事件存儲

```csharp
public interface IEventStore
{
    Task AppendAsync(Guid aggregateId, IEnumerable<DomainEvent> events);
    Task<List<DomainEvent>> GetEventsAsync(Guid aggregateId);
}

public class EventStore : IEventStore
{
    private readonly IRepository<StoredEvent, Guid> _repository;

    public async Task AppendAsync(Guid aggregateId, IEnumerable<DomainEvent> events)
    {
        foreach (var @event in events)
        {
            var storedEvent = new StoredEvent
            {
                Id = Guid.NewGuid(),
                AggregateId = aggregateId,
                EventType = @event.GetType().Name,
                EventData = JsonConvert.SerializeObject(@event),
                OccurredAt = @event.OccurredAt
            };

            await _repository.InsertAsync(storedEvent);
        }
    }

    public async Task<List<DomainEvent>> GetEventsAsync(Guid aggregateId)
    {
        var storedEvents = await _repository
            .GetListAsync(e => e.AggregateId == aggregateId);

        var events = new List<DomainEvent>();
        foreach (var stored in storedEvents)
        {
            var type = Type.GetType($"YourNamespace.{stored.EventType}");
            var @event = JsonConvert.DeserializeObject(stored.EventData, type) as DomainEvent;
            events.Add(@event);
        }

        return events;
    }
}

public class StoredEvent : Entity<Guid>
{
    public Guid AggregateId { get; set; }
    public string EventType { get; set; }
    public string EventData { get; set; }
    public DateTime OccurredAt { get; set; }
}
```

#### 重建聚合根

```csharp
public class OrderRepository : IOrderRepository
{
    private readonly IEventStore _eventStore;

    public async Task<Order> GetAsync(Guid id)
    {
        var events = await _eventStore.GetEventsAsync(id);

        // 從事件流重建 Order
        var order = new Order(id, Guid.Empty, null);

        foreach (var @event in events)
        {
            switch (@event)
            {
                case OrderCreatedEvent created:
                    order = new Order(id, created.CustomerId, created.ShippingAddress);
                    break;
                case OrderItemAddedEvent added:
                    order.AddItem(added.ProductId, added.Quantity, added.UnitPrice);
                    break;
                case OrderConfirmedEvent:
                    order.Confirm();
                    break;
                case OrderCancelledEvent:
                    order.Cancel();
                    break;
            }
        }

        return order;
    }
}
```

---

## 習題 5：案例分析題 📋

**題目：對比「訂單系統」與「庫存系統」的邊界上下文（Bounded Context），設計它們的通訊機制。**

### 解答

#### 邊界上下文圖

```
┌──────────────────────────┐
│  Order Bounded Context   │
│                          │
│  ├─ Order (聚合根)       │
│  ├─ OrderLine            │
│  └─ OrderService         │
│                          │
│  通用語言：              │
│  - OrderConfirmed        │
│  - OrderCancelled        │
└────────┬─────────────────┘
         │ 事件驅動通訊
         │ (OrderConfirmedEvent)
         ▼
┌──────────────────────────┐
│ Inventory Bounded Context│
│                          │
│  ├─ Product (聚合根)     │
│  ├─ Stock                │
│  └─ InventoryService     │
│                          │
│  通用語言：              │
│  - StockReserved         │
│  - StockAllocated        │
└──────────────────────────┘
```

#### 事件驅動通訊

```csharp
// Order Context 發佈事件
public class OrderAppService
{
    private readonly IOrderRepository _orderRepository;
    private readonly IDistributedEventBus _eventBus;

    public async Task ConfirmOrderAsync(Guid orderId)
    {
        var order = await _orderRepository.GetAsync(orderId);
        order.Confirm();

        // 發佈事件到 Inventory Context
        await _eventBus.PublishAsync(new OrderConfirmedEvent
        {
            OrderId = orderId,
            Items = order.Items.Select(i => new { i.ProductId, i.Quantity })
        });
    }
}

// Inventory Context 訂閱事件
public class OrderConfirmedEventHandler : IDistributedEventHandler<OrderConfirmedEvent>
{
    private readonly IInventoryService _inventoryService;

    public async Task HandleEventAsync(OrderConfirmedEvent eventData)
    {
        foreach (var item in eventData.Items)
        {
            await _inventoryService.ReserveStockAsync(item.ProductId, item.Quantity);
        }
    }
}
```

---

## 習題 6：案例分析題 📋

**題目：設計一個支援「分佈式事務」的訂單流程，使用 Saga 模式協調多個服務。**

### 解答

#### Saga 流程圖

```
Order Service    Payment Service    Inventory Service
    │                 │                     │
    ├─ CreateOrder    │                     │
    │                 │                     │
    ├──────────────────────────────────────>
                   RequestPayment
    │<──────────────────┤
                        │
                   ProcessPayment
                        │
    │<──────────────────┤
    │                   │
    ├─────────────────────────────────────>
                           ReserveStock
    │<─────────────────────────────────────┤
    │
    ├─ CompleteOrder
```

#### 實現

```csharp
// Saga 定義
public class OrderSaga : ProcessManager
{
    private readonly IOrderService _orderService;
    private readonly IPaymentService _paymentService;
    private readonly IInventoryService _inventoryService;

    public async Task ExecuteAsync(CreateOrderDto input)
    {
        try
        {
            // 1. 建立訂單
            var orderId = await _orderService.CreateAsync(input);

            // 2. 請求支付
            var paymentId = await _paymentService.CreateAsync(new PaymentRequest
            {
                OrderId = orderId,
                Amount = input.TotalAmount
            });

            // 3. 預留庫存
            await _inventoryService.ReserveAsync(new InventoryReservation
            {
                OrderId = orderId,
                Items = input.Items
            });

            // 4. 確認訂單
            await _orderService.ConfirmAsync(orderId);
        }
        catch (Exception ex)
        {
            // 補償事務：回滾所有操作
            await RollbackAsync(input);
            throw;
        }
    }

    private async Task RollbackAsync(CreateOrderDto input)
    {
        await _orderService.CancelAsync(input.OrderId);
        await _paymentService.RefundAsync(input.PaymentId);
        await _inventoryService.ReleaseAsync(input.OrderId);
    }
}
```

---

## 參考資源

- [ABP 官方 DDD 文檔](https://docs.abp.io/en/abp/latest/Domain-Driven-Design)（content7）
- [Martin Fowler - DDD](https://martinfowler.com/bliki/DomainDrivenDesign.html)
