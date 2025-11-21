# 第十四章：微服務架構設計 - 習題解答

本文件提供第十四章實戰練習的完整解答，涵蓋微服務方案建立、跨服務通訊和 API Gateway 配置。

---

## 練習 1：建立微服務方案

### 題目

1. 使用 ABP CLI 建立微服務方案（注意：社群版沒有微服務範本，需手動建立多個 `app` 專案並配置）。
   - 提示：建立 `ProductService` 與 `OrderService` 兩個獨立專案。
2. 配置 RabbitMQ 作為分散式事件匯流排。

### 解答

#### 步驟 1：建立 ProductService

```bash
# 建立 ProductService
abp new ProductService -t app --database-provider ef --ui none

cd ProductService
```

#### 步驟 2：建立 OrderService

```bash
# 建立 OrderService
abp new OrderService -t app --database-provider ef --ui none

cd OrderService
```

#### 步驟 3：配置 RabbitMQ（ProductService）

**安裝 NuGet 套件**：

```bash
cd src/ProductService.HttpApi.Host
dotnet add package Volo.Abp.EventBus.RabbitMQ
```

**配置 Module**：

```csharp
// ProductServiceHttpApiHostModule.cs
using Volo.Abp.EventBus.RabbitMQ;

[DependsOn(
    typeof(AbpEventBusRabbitMqModule),
    // ... 其他依賴
)]
public class ProductServiceHttpApiHostModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        var configuration = context.Services.GetConfiguration();

        // 配置 RabbitMQ
        Configure<AbpRabbitMqEventBusOptions>(options =>
        {
            options.ClientName = "ProductService";
            options.ExchangeName = "BookStore";
        });

        // 配置連線
        Configure<AbpRabbitMqOptions>(options =>
        {
            options.Connections.Default.HostName = configuration["RabbitMQ:HostName"];
            options.Connections.Default.Port = Convert.ToInt32(configuration["RabbitMQ:Port"]);
            options.Connections.Default.UserName = configuration["RabbitMQ:UserName"];
            options.Connections.Default.Password = configuration["RabbitMQ:Password"];
        });
    }
}
```

**appsettings.json**：

```json
{
  "RabbitMQ": {
    "HostName": "localhost",
    "Port": 5672,
    "UserName": "guest",
    "Password": "guest"
  }
}
```

#### 步驟 4：配置 RabbitMQ（OrderService）

重複步驟 3，但將 `ClientName` 改為 `"OrderService"`。

#### 步驟 5：定義共享的事件 DTO

建立一個共享專案或在各自的 `Domain.Shared` 中定義：

```csharp
// ProductService.Domain.Shared/Events/ProductStockChangedEto.cs
using System;
using Volo.Abp.EventBus;

namespace ProductService.Events
{
    [EventName("ProductService.ProductStockChanged")]
    public class ProductStockChangedEto
    {
        public Guid ProductId { get; set; }
        public int NewStock { get; set; }
        public int ChangedAmount { get; set; }
    }
}
```

#### 步驟 6：發布事件（ProductService）

```csharp
// ProductService.Application/Products/ProductAppService.cs
using Volo.Abp.EventBus.Distributed;

public class ProductAppService : ApplicationService
{
    private readonly IDistributedEventBus _distributedEventBus;
    private readonly IRepository<Product, Guid> _productRepository;

    public ProductAppService(
        IDistributedEventBus distributedEventBus,
        IRepository<Product, Guid> productRepository)
    {
        _distributedEventBus = distributedEventBus;
        _productRepository = productRepository;
    }

    public async Task DeductStockAsync(Guid productId, int quantity)
    {
        var product = await _productRepository.GetAsync(productId);

        if (product.Stock < quantity)
        {
            throw new BusinessException("ProductService:InsufficientStock");
        }

        product.Stock -= quantity;
        await _productRepository.UpdateAsync(product);

        // 發布事件
        await _distributedEventBus.PublishAsync(new ProductStockChangedEto
        {
            ProductId = productId,
            NewStock = product.Stock,
            ChangedAmount = -quantity
        });
    }
}
```

#### 步驟 7：訂閱事件（OrderService）

```csharp
// OrderService.Application/EventHandlers/ProductStockChangedHandler.cs
using ProductService.Events;
using Volo.Abp.DependencyInjection;
using Volo.Abp.EventBus.Distributed;

namespace OrderService.EventHandlers
{
    public class ProductStockChangedHandler :
        IDistributedEventHandler<ProductStockChangedEto>,
        ITransientDependency
    {
        private readonly ILogger<ProductStockChangedHandler> _logger;

        public ProductStockChangedHandler(ILogger<ProductStockChangedHandler> logger)
        {
            _logger = logger;
        }

        public async Task HandleEventAsync(ProductStockChangedEto eventData)
        {
            _logger.LogInformation(
                "Product {ProductId} stock changed to {NewStock}",
                eventData.ProductId,
                eventData.NewStock);

            // 可以在這裡更新本地的產品快取或執行其他邏輯
            await Task.CompletedTask;
        }
    }
}
```

#### 步驟 8：啟動 RabbitMQ

使用 Docker 快速啟動：

```bash
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management
```

訪問管理介面：http://localhost:15672（帳號/密碼：guest/guest）

---

## 練習 2：實作跨服務通訊

### 題目

1. 在 `ProductService` 中建立商品。
2. 在 `OrderService` 中建立訂單時，透過 `HttpApi.Client` 同步檢查商品是否存在。
3. 訂單建立後，發布事件通知 `ProductService` 扣減庫存。

### 解答

#### 步驟 1：在 ProductService 中實作商品 API

```csharp
// ProductService.Application.Contracts/Products/IProductAppService.cs
public interface IProductAppService : IApplicationService
{
    Task<ProductDto> GetAsync(Guid id);
    Task<bool> CheckExistsAsync(Guid id);
    Task DeductStockAsync(Guid productId, int quantity);
}
```

```csharp
// ProductService.Application/Products/ProductAppService.cs
public class ProductAppService : ApplicationService, IProductAppService
{
    private readonly IRepository<Product, Guid> _productRepository;

    public async Task<ProductDto> GetAsync(Guid id)
    {
        var product = await _productRepository.GetAsync(id);
        return ObjectMapper.Map<Product, ProductDto>(product);
    }

    public async Task<bool> CheckExistsAsync(Guid id)
    {
        return await _productRepository.AnyAsync(p => p.Id == id);
    }

    public async Task DeductStockAsync(Guid productId, int quantity)
    {
        // 如練習 1 所示
    }
}
```

#### 步驟 2：在 OrderService 中配置 HTTP Client

**安裝 NuGet 套件**：

```bash
cd src/OrderService.HttpApi.Host
dotnet add package Volo.Abp.Http.Client
# 引用 ProductService.Application.Contracts
dotnet add reference ../../../ProductService/src/ProductService.Application.Contracts/ProductService.Application.Contracts.csproj
```

**配置 Module**：

```csharp
// OrderServiceHttpApiHostModule.cs
using Volo.Abp.Http.Client;
using ProductService;

[DependsOn(
    typeof(AbpHttpClientModule),
    typeof(ProductServiceApplicationContractsModule)
)]
public class OrderServiceHttpApiHostModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        var configuration = context.Services.GetConfiguration();

        // 配置 HTTP Client Proxy
        context.Services.AddHttpClientProxies(
            typeof(ProductServiceApplicationContractsModule).Assembly,
            remoteServiceConfigurationName: "ProductService"
        );

        // 配置遠端服務地址
        Configure<AbpRemoteServiceOptions>(options =>
        {
            options.RemoteServices.Configure("ProductService", config =>
            {
                config.BaseUrl = configuration["RemoteServices:ProductService:BaseUrl"];
            });
        });
    }
}
```

**appsettings.json**：

```json
{
  "RemoteServices": {
    "ProductService": {
      "BaseUrl": "http://localhost:5001"
    }
  }
}
```

#### 步驟 3：在 OrderService 中使用 HTTP Client

```csharp
// OrderService.Application/Orders/OrderAppService.cs
using ProductService.Products;
using Volo.Abp.EventBus.Distributed;

public class OrderAppService : ApplicationService
{
    private readonly IProductAppService _productAppService; // 遠端代理
    private readonly IRepository<Order, Guid> _orderRepository;
    private readonly IDistributedEventBus _distributedEventBus;

    public OrderAppService(
        IProductAppService productAppService,
        IRepository<Order, Guid> orderRepository,
        IDistributedEventBus distributedEventBus)
    {
        _productAppService = productAppService;
        _orderRepository = orderRepository;
        _distributedEventBus = distributedEventBus;
    }

    public async Task<OrderDto> CreateAsync(CreateOrderDto input)
    {
        // 1. 同步檢查商品是否存在
        var productExists = await _productAppService.CheckExistsAsync(input.ProductId);
        if (!productExists)
        {
            throw new BusinessException("OrderService:ProductNotFound");
        }

        // 2. 建立訂單
        var order = new Order(
            GuidGenerator.Create(),
            input.ProductId,
            input.Quantity,
            OrderStatus.Pending
        );

        await _orderRepository.InsertAsync(order);

        // 3. 發布事件通知 ProductService 扣減庫存
        await _distributedEventBus.PublishAsync(new OrderCreatedEto
        {
            OrderId = order.Id,
            ProductId = input.ProductId,
            Quantity = input.Quantity
        });

        return ObjectMapper.Map<Order, OrderDto>(order);
    }
}
```

#### 步驟 4：在 ProductService 中訂閱訂單事件

```csharp
// ProductService.Application/EventHandlers/OrderCreatedHandler.cs
using OrderService.Events;

public class OrderCreatedHandler :
    IDistributedEventHandler<OrderCreatedEto>,
    ITransientDependency
{
    private readonly IProductAppService _productAppService;

    public OrderCreatedHandler(IProductAppService productAppService)
    {
        _productAppService = productAppService;
    }

    public async Task HandleEventAsync(OrderCreatedEto eventData)
    {
        try
        {
            await _productAppService.DeductStockAsync(
                eventData.ProductId,
                eventData.Quantity);
        }
        catch (BusinessException ex) when (ex.Code == "ProductService:InsufficientStock")
        {
            // 發布庫存不足事件，讓 OrderService 取消訂單
            await _distributedEventBus.PublishAsync(new StockDeductionFailedEto
            {
                OrderId = eventData.OrderId,
                Reason = "InsufficientStock"
            });
        }
    }
}
```

---

## 練習 3：配置 YARP Gateway

### 題目

1. 建立一個新的 ASP.NET Core 空專案作為 Gateway。
2. 安裝 `Yarp.ReverseProxy`。
3. 配置路由將 `/api/products` 轉發到 `ProductService`，將 `/api/orders` 轉發到 `OrderService`。

### 解答

#### 步驟 1：建立 Gateway 專案

```bash
dotnet new web -n ApiGateway
cd ApiGateway
dotnet add package Yarp.ReverseProxy
```

#### 步驟 2：配置 Program.cs

```csharp
// Program.cs
using Yarp.ReverseProxy.Configuration;

var builder = WebApplication.CreateBuilder(args);

// 加入 YARP
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

var app = builder.Build();

// 使用 YARP
app.MapReverseProxy();

app.Run();
```

#### 步驟 3：配置 appsettings.json

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ReverseProxy": {
    "Routes": {
      "product-route": {
        "ClusterId": "product-cluster",
        "Match": {
          "Path": "/api/products/{**catch-all}"
        },
        "Transforms": [
          {
            "PathPattern": "/api/app/product/{**catch-all}"
          }
        ]
      },
      "order-route": {
        "ClusterId": "order-cluster",
        "Match": {
          "Path": "/api/orders/{**catch-all}"
        },
        "Transforms": [
          {
            "PathPattern": "/api/app/order/{**catch-all}"
          }
        ]
      }
    },
    "Clusters": {
      "product-cluster": {
        "Destinations": {
          "destination1": {
            "Address": "http://localhost:5001"
          }
        }
      },
      "order-cluster": {
        "Destinations": {
          "destination1": {
            "Address": "http://localhost:5002"
          }
        }
      }
    }
  }
}
```

#### 步驟 4：加入健康檢查

```csharp
// Program.cs
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"))
    .AddHealthChecks();
```

```json
{
  "ReverseProxy": {
    "Clusters": {
      "product-cluster": {
        "HealthCheck": {
          "Active": {
            "Enabled": true,
            "Interval": "00:00:10",
            "Timeout": "00:00:05",
            "Policy": "ConsecutiveFailures",
            "Path": "/health"
          }
        },
        "Destinations": {
          "destination1": {
            "Address": "http://localhost:5001",
            "Health": "http://localhost:5001/health"
          }
        }
      }
    }
  }
}
```

#### 步驟 5：加入認證與授權

```csharp
// Program.cs
using Microsoft.AspNetCore.Authentication.JwtBearer;

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = "http://localhost:5000"; // IdentityServer
        options.RequireHttpsMetadata = false;
        options.Audience = "BookStore";
    });

builder.Services.AddAuthorization();

// ...

app.UseAuthentication();
app.UseAuthorization();
app.MapReverseProxy();
```

#### 步驟 6：加入速率限制

```bash
dotnet add package AspNetCoreRateLimit
```

```csharp
// Program.cs
using AspNetCoreRateLimit;

builder.Services.AddMemoryCache();
builder.Services.Configure<IpRateLimitOptions>(builder.Configuration.GetSection("IpRateLimiting"));
builder.Services.AddInMemoryRateLimiting();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();

// ...

app.UseIpRateLimiting();
app.MapReverseProxy();
```

```json
{
  "IpRateLimiting": {
    "EnableEndpointRateLimiting": true,
    "StackBlockedRequests": false,
    "RealIpHeader": "X-Real-IP",
    "ClientIdHeader": "X-ClientId",
    "HttpStatusCode": 429,
    "GeneralRules": [
      {
        "Endpoint": "*",
        "Period": "1m",
        "Limit": 100
      }
    ]
  }
}
```

#### 步驟 7：測試 Gateway

啟動所有服務：

```bash
# Terminal 1: ProductService
cd ProductService/src/ProductService.HttpApi.Host
dotnet run --urls="http://localhost:5001"

# Terminal 2: OrderService
cd OrderService/src/OrderService.HttpApi.Host
dotnet run --urls="http://localhost:5002"

# Terminal 3: Gateway
cd ApiGateway
dotnet run --urls="http://localhost:5000"
```

測試請求：

```bash
# 透過 Gateway 存取 ProductService
curl http://localhost:5000/api/products

# 透過 Gateway 存取 OrderService
curl http://localhost:5000/api/orders
```

---

## 總結

本章練習涵蓋了微服務架構的核心實作：

1. **微服務方案建立**：

   - 建立多個獨立的 ABP 應用程式
   - 配置 RabbitMQ 作為事件匯流排
   - 實作事件發布與訂閱

2. **跨服務通訊**：

   - 使用 HTTP Client Proxy 進行同步通訊
   - 使用分散式事件進行非同步通訊
   - 處理跨服務的錯誤與補償

3. **API Gateway**：
   - 使用 YARP 建立反向代理
   - 配置路由與轉換
   - 加入健康檢查、認證和速率限制

**最佳實踐**：

- 優先使用非同步通訊減少耦合
- 實作 Saga 模式處理分散式交易
- 使用 API Gateway 統一入口
- 加入完整的可觀測性（日誌、追蹤、監控）
- 每個服務擁有自己的資料庫

---

## 參考資源

- [微軟微服務架構指南](https://docs.microsoft.com/en-us/dotnet/architecture/microservices/)
- [YARP 官方文件](https://microsoft.github.io/reverse-proxy/)
- [RabbitMQ 官方文件](https://www.rabbitmq.com/documentation.html)
- [ABP 分散式事件匯流排文件](https://docs.abp.io/en/abp/latest/Distributed-Event-Bus)
