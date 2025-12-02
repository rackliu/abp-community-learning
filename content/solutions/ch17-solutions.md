# 第十七章：測試策略與自動化 - 習題解答

本文件提供第十七章實戰練習的完整解答，涵蓋單元測試、整合測試和 CI/CD 配置。

---

## 練習 1：單元測試覆蓋

### 題目

1. 為 `Order` 聚合根撰寫至少 10 個單元測試，涵蓋所有業務規則。
2. 使用 `[Theory]` 測試邊界條件。

### 解答

#### 步驟 1：定義 Order 聚合根（參考）

```csharp
// Domain/Orders/Order.cs
using System;
using System.Collections.Generic;
using System.Linq;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace BookStore.Orders
{
    public class Order : FullAuditedAggregateRoot<Guid>
    {
        public string OrderNumber { get; private set; }
        public OrderStatus Status { get; private set; }
        public decimal TotalAmount { get; private set; }
        public Guid CustomerId { get; private set; }

        private readonly List<OrderItem> _items = new();
        public IReadOnlyList<OrderItem> Items => _items.AsReadOnly();

        protected Order()
        {
            // 用於 ORM
        }

        public Order(Guid id, string orderNumber, Guid customerId)
            : base(id)
        {
            OrderNumber = Check.NotNullOrWhiteSpace(orderNumber, nameof(orderNumber));
            CustomerId = customerId;
            Status = OrderStatus.Pending;
            TotalAmount = 0;
        }

        public void AddItem(Guid productId, int quantity, decimal unitPrice)
        {
            if (quantity <= 0)
            {
                throw new BusinessException("Order:InvalidQuantity")
                    .WithData("Quantity", quantity);
            }

            if (unitPrice < 0)
            {
                throw new BusinessException("Order:InvalidPrice")
                    .WithData("UnitPrice", unitPrice);
            }

            if (Status != OrderStatus.Pending)
            {
                throw new BusinessException("Order:CannotModifyNonPendingOrder");
            }

            var existingItem = _items.FirstOrDefault(i => i.ProductId == productId);
            if (existingItem != null)
            {
                existingItem.IncreaseQuantity(quantity);
            }
            else
            {
                _items.Add(new OrderItem(Guid.NewGuid(), productId, quantity, unitPrice));
            }

            RecalculateTotal();
        }

        public void RemoveItem(Guid productId)
        {
            if (Status != OrderStatus.Pending)
            {
                throw new BusinessException("Order:CannotModifyNonPendingOrder");
            }

            var item = _items.FirstOrDefault(i => i.ProductId == productId);
            if (item == null)
            {
                throw new BusinessException("Order:ItemNotFound");
            }

            _items.Remove(item);
            RecalculateTotal();
        }

        public void Confirm()
        {
            if (Status != OrderStatus.Pending)
            {
                throw new BusinessException("Order:CannotConfirmNonPendingOrder");
            }

            if (!_items.Any())
            {
                throw new BusinessException("Order:CannotConfirmEmptyOrder");
            }

            Status = OrderStatus.Confirmed;
        }

        public void Cancel()
        {
            if (Status == OrderStatus.Completed || Status == OrderStatus.Cancelled)
            {
                throw new BusinessException("Order:CannotCancelCompletedOrCancelledOrder");
            }

            Status = OrderStatus.Cancelled;
        }

        public void Complete()
        {
            if (Status != OrderStatus.Confirmed)
            {
                throw new BusinessException("Order:CanOnlyCompleteConfirmedOrder");
            }

            Status = OrderStatus.Completed;
        }

        private void RecalculateTotal()
        {
            TotalAmount = _items.Sum(i => i.TotalPrice);
        }
    }

    public enum OrderStatus
    {
        Pending,
        Confirmed,
        Completed,
        Cancelled
    }

    public class OrderItem : Entity<Guid>
    {
        public Guid ProductId { get; private set; }
        public int Quantity { get; private set; }
        public decimal UnitPrice { get; private set; }
        public decimal TotalPrice => Quantity * UnitPrice;

        protected OrderItem() { }

        public OrderItem(Guid id, Guid productId, int quantity, decimal unitPrice)
            : base(id)
        {
            ProductId = productId;
            Quantity = quantity;
            UnitPrice = unitPrice;
        }

        public void IncreaseQuantity(int quantity)
        {
            Quantity += quantity;
        }
    }
}
```

#### 步驟 2：撰寫單元測試

```csharp
// Test/Domain/Orders/OrderTests.cs
using System;
using Shouldly;
using Volo.Abp;
using Xunit;

namespace BookStore.Orders
{
    public class OrderTests
    {
        [Fact]
        public void Constructor_ShouldCreatePendingOrder()
        {
            // Arrange & Act
            var order = new Order(Guid.NewGuid(), "ORD-001", Guid.NewGuid());

            // Assert
            order.OrderNumber.ShouldBe("ORD-001");
            order.Status.ShouldBe(OrderStatus.Pending);
            order.TotalAmount.ShouldBe(0);
            order.Items.ShouldBeEmpty();
        }

        [Fact]
        public void Constructor_WithNullOrderNumber_ShouldThrow()
        {
            // Arrange, Act & Assert
            Should.Throw<ArgumentException>(() =>
                new Order(Guid.NewGuid(), null, Guid.NewGuid()));
        }

        [Fact]
        public void AddItem_WithValidData_ShouldAddItem()
        {
            // Arrange
            var order = new Order(Guid.NewGuid(), "ORD-001", Guid.NewGuid());
            var productId = Guid.NewGuid();

            // Act
            order.AddItem(productId, 2, 100m);

            // Assert
            order.Items.Count.ShouldBe(1);
            order.Items[0].ProductId.ShouldBe(productId);
            order.Items[0].Quantity.ShouldBe(2);
            order.TotalAmount.ShouldBe(200m);
        }

        [Fact]
        public void AddItem_WithZeroQuantity_ShouldThrow()
        {
            // Arrange
            var order = new Order(Guid.NewGuid(), "ORD-001", Guid.NewGuid());

            // Act & Assert
            var exception = Should.Throw<BusinessException>(() =>
                order.AddItem(Guid.NewGuid(), 0, 100m));

            exception.Code.ShouldBe("Order:InvalidQuantity");
        }

        [Fact]
        public void AddItem_WithNegativePrice_ShouldThrow()
        {
            // Arrange
            var order = new Order(Guid.NewGuid(), "ORD-001", Guid.NewGuid());

            // Act & Assert
            var exception = Should.Throw<BusinessException>(() =>
                order.AddItem(Guid.NewGuid(), 1, -10m));

            exception.Code.ShouldBe("Order:InvalidPrice");
        }

        [Theory]
        [InlineData(1, 100, 100)]
        [InlineData(5, 20, 100)]
        [InlineData(10, 15.5, 155)]
        [InlineData(100, 1.99, 199)]
        public void AddItem_ShouldCalculateCorrectTotal(int quantity, decimal price, decimal expectedTotal)
        {
            // Arrange
            var order = new Order(Guid.NewGuid(), "ORD-001", Guid.NewGuid());

            // Act
            order.AddItem(Guid.NewGuid(), quantity, price);

            // Assert
            order.TotalAmount.ShouldBe(expectedTotal);
        }

        [Fact]
        public void AddItem_SameProduct_ShouldIncreaseQuantity()
        {
            // Arrange
            var order = new Order(Guid.NewGuid(), "ORD-001", Guid.NewGuid());
            var productId = Guid.NewGuid();

            // Act
            order.AddItem(productId, 2, 100m);
            order.AddItem(productId, 3, 100m);

            // Assert
            order.Items.Count.ShouldBe(1);
            order.Items[0].Quantity.ShouldBe(5);
            order.TotalAmount.ShouldBe(500m);
        }

        [Fact]
        public void AddItem_ToNonPendingOrder_ShouldThrow()
        {
            // Arrange
            var order = new Order(Guid.NewGuid(), "ORD-001", Guid.NewGuid());
            order.AddItem(Guid.NewGuid(), 1, 100m);
            order.Confirm();

            // Act & Assert
            Should.Throw<BusinessException>(() =>
                order.AddItem(Guid.NewGuid(), 1, 100m));
        }

        [Fact]
        public void RemoveItem_ExistingItem_ShouldRemoveAndRecalculate()
        {
            // Arrange
            var order = new Order(Guid.NewGuid(), "ORD-001", Guid.NewGuid());
            var productId1 = Guid.NewGuid();
            var productId2 = Guid.NewGuid();
            order.AddItem(productId1, 2, 100m);
            order.AddItem(productId2, 3, 50m);

            // Act
            order.RemoveItem(productId1);

            // Assert
            order.Items.Count.ShouldBe(1);
            order.TotalAmount.ShouldBe(150m);
        }

        [Fact]
        public void RemoveItem_NonExistingItem_ShouldThrow()
        {
            // Arrange
            var order = new Order(Guid.NewGuid(), "ORD-001", Guid.NewGuid());

            // Act & Assert
            Should.Throw<BusinessException>(() =>
                order.RemoveItem(Guid.NewGuid()));
        }

        [Fact]
        public void Confirm_ValidOrder_ShouldChangeStatus()
        {
            // Arrange
            var order = new Order(Guid.NewGuid(), "ORD-001", Guid.NewGuid());
            order.AddItem(Guid.NewGuid(), 1, 100m);

            // Act
            order.Confirm();

            // Assert
            order.Status.ShouldBe(OrderStatus.Confirmed);
        }

        [Fact]
        public void Confirm_EmptyOrder_ShouldThrow()
        {
            // Arrange
            var order = new Order(Guid.NewGuid(), "ORD-001", Guid.NewGuid());

            // Act & Assert
            Should.Throw<BusinessException>(() => order.Confirm());
        }

        [Fact]
        public void Cancel_PendingOrder_ShouldChangeStatus()
        {
            // Arrange
            var order = new Order(Guid.NewGuid(), "ORD-001", Guid.NewGuid());

            // Act
            order.Cancel();

            // Assert
            order.Status.ShouldBe(OrderStatus.Cancelled);
        }

        [Fact]
        public void Cancel_CompletedOrder_ShouldThrow()
        {
            // Arrange
            var order = new Order(Guid.NewGuid(), "ORD-001", Guid.NewGuid());
            order.AddItem(Guid.NewGuid(), 1, 100m);
            order.Confirm();
            order.Complete();

            // Act & Assert
            Should.Throw<BusinessException>(() => order.Cancel());
        }

        [Fact]
        public void Complete_ConfirmedOrder_ShouldChangeStatus()
        {
            // Arrange
            var order = new Order(Guid.NewGuid(), "ORD-001", Guid.NewGuid());
            order.AddItem(Guid.NewGuid(), 1, 100m);
            order.Confirm();

            // Act
            order.Complete();

            // Assert
            order.Status.ShouldBe(OrderStatus.Completed);
        }

        [Fact]
        public void Complete_PendingOrder_ShouldThrow()
        {
            // Arrange
            var order = new Order(Guid.NewGuid(), "ORD-001", Guid.NewGuid());

            // Act & Assert
            Should.Throw<BusinessException>(() => order.Complete());
        }
    }
}
```

---

## 練習 2：整合測試

### 題目

1. 為 `BookAppService` 撰寫整合測試，測試 CRUD 操作。
2. 使用 Testcontainers 啟動真實的 SQL Server。

### 解答

#### 步驟 1：安裝 Testcontainers

```bash
dotnet add package Testcontainers.MsSql
```

#### 步驟 2：建立測試基類

```csharp
// Test/BookStoreTestBase.cs
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.MsSql;
using Volo.Abp;
using Volo.Abp.Testing;
using Xunit;

namespace BookStore
{
    public abstract class BookStoreTestBase<TStartupModule> :
        AbpIntegratedTest<TStartupModule>,
        IAsyncLifetime
        where TStartupModule : IAbpModule
    {
        protected readonly MsSqlContainer _sqlContainer;

        protected BookStoreTestBase()
        {
            _sqlContainer = new MsSqlBuilder()
                .WithImage("mcr.microsoft.com/mssql/server:2022-latest")
                .WithPassword("YourStrong@Passw0rd")
                .Build();
        }

        public async Task InitializeAsync()
        {
            await _sqlContainer.StartAsync();
        }

        public async Task DisposeAsync()
        {
            await _sqlContainer.DisposeAsync();
        }

        protected override void SetAbpApplicationCreationOptions(AbpApplicationCreationOptions options)
        {
            options.UseAutofac();
        }
    }
}
```

#### 步驟 3：配置測試模組

```csharp
// Test/BookStoreApplicationTestModule.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Volo.Abp.EntityFrameworkCore;
using Volo.Abp.Modularity;

namespace BookStore
{
    [DependsOn(
        typeof(BookStoreApplicationModule),
        typeof(BookStoreEntityFrameworkCoreModule),
        typeof(AbpTestBaseModule)
    )]
    public class BookStoreApplicationTestModule : AbpModule
    {
        public override void ConfigureServices(ServiceConfigurationContext context)
        {
            // 使用 Testcontainers 提供的連線字串
            var connectionString = context.Services.GetSingletonInstance<MsSqlContainer>()
                .GetConnectionString();

            Configure<AbpDbContextOptions>(options =>
            {
                options.Configure(abpDbContextConfigurationContext =>
                {
                    abpDbContextConfigurationContext.DbContextOptions
                        .UseSqlServer(connectionString);
                });
            });
        }
    }
}
```

#### 步驟 4：撰寫整合測試

```csharp
// Test/Application/Books/BookAppService_IntegrationTests.cs
using System;
using System.Threading.Tasks;
using BookStore.Books;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Xunit;

namespace BookStore.Application.Books
{
    public class BookAppService_IntegrationTests : BookStoreTestBase<BookStoreApplicationTestModule>
    {
        private readonly IBookAppService _bookAppService;
        private readonly IRepository<Book, Guid> _bookRepository;

        public BookAppService_IntegrationTests()
        {
            _bookAppService = GetRequiredService<IBookAppService>();
            _bookRepository = GetRequiredService<IRepository<Book, Guid>>();
        }

        [Fact]
        public async Task CreateAsync_ShouldPersistToDatabase()
        {
            // Arrange
            var input = new CreateUpdateBookDto
            {
                Name = "The Hobbit",
                Type = BookType.Fantasy,
                PublishDate = new DateTime(1937, 9, 21),
                Price = 12.99f
            };

            // Act
            var result = await _bookAppService.CreateAsync(input);

            // Assert
            result.Id.ShouldNotBe(Guid.Empty);
            result.Name.ShouldBe("The Hobbit");

            // 驗證資料庫中確實存在
            var bookInDb = await _bookRepository.GetAsync(result.Id);
            bookInDb.ShouldNotBeNull();
            bookInDb.Name.ShouldBe("The Hobbit");
            bookInDb.Type.ShouldBe(BookType.Fantasy);
        }

        [Fact]
        public async Task GetAsync_ExistingBook_ShouldReturnBook()
        {
            // Arrange
            var book = new Book(Guid.NewGuid(), "1984", BookType.Dystopia, DateTime.Now, 15.99f);
            await _bookRepository.InsertAsync(book);

            // Act
            var result = await _bookAppService.GetAsync(book.Id);

            // Assert
            result.ShouldNotBeNull();
            result.Id.ShouldBe(book.Id);
            result.Name.ShouldBe("1984");
        }

        [Fact]
        public async Task GetListAsync_ShouldReturnPagedResult()
        {
            // Arrange
            await _bookRepository.InsertAsync(new Book(Guid.NewGuid(), "Book 1", BookType.Fiction, DateTime.Now, 10f));
            await _bookRepository.InsertAsync(new Book(Guid.NewGuid(), "Book 2", BookType.Fiction, DateTime.Now, 20f));
            await _bookRepository.InsertAsync(new Book(Guid.NewGuid(), "Book 3", BookType.Fiction, DateTime.Now, 30f));

            // Act
            var result = await _bookAppService.GetListAsync(new PagedAndSortedResultRequestDto
            {
                MaxResultCount = 2,
                SkipCount = 0
            });

            // Assert
            result.TotalCount.ShouldBeGreaterThanOrEqualTo(3);
            result.Items.Count.ShouldBe(2);
        }

        [Fact]
        public async Task UpdateAsync_ShouldModifyBook()
        {
            // Arrange
            var book = new Book(Guid.NewGuid(), "Original Name", BookType.Fiction, DateTime.Now, 10f);
            await _bookRepository.InsertAsync(book);

            var updateDto = new CreateUpdateBookDto
            {
                Name = "Updated Name",
                Type = BookType.ScienceFiction,
                PublishDate = DateTime.Now,
                Price = 20f
            };

            // Act
            await _bookAppService.UpdateAsync(book.Id, updateDto);

            // Assert
            var updatedBook = await _bookRepository.GetAsync(book.Id);
            updatedBook.Name.ShouldBe("Updated Name");
            updatedBook.Type.ShouldBe(BookType.ScienceFiction);
            updatedBook.Price.ShouldBe(20f);
        }

        [Fact]
        public async Task DeleteAsync_ShouldRemoveBook()
        {
            // Arrange
            var book = new Book(Guid.NewGuid(), "To Delete", BookType.Fiction, DateTime.Now, 10f);
            await _bookRepository.InsertAsync(book);

            // Act
            await _bookAppService.DeleteAsync(book.Id);

            // Assert
            var exists = await _bookRepository.AnyAsync(b => b.Id == book.Id);
            exists.ShouldBeFalse();
        }
    }
}
```

---

## 練習 3：CI/CD

### 題目

1. 在 GitHub 上建立一個 Repository。
2. 配置 GitHub Actions，在每次 Push 時自動執行測試。
3. 設定測試失敗時發送通知。

### 解答

#### 步驟 1：建立 GitHub Actions Workflow

```.github/workflows/test.yml
name: Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      sqlserver:
        image: mcr.microsoft.com/mssql/server:2022-latest
        env:
          ACCEPT_EULA: Y
          SA_PASSWORD: YourStrong@Passw0rd
        ports:
          - 1433:1433
        options: >-
          --health-cmd="/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P YourStrong@Passw0rd -Q 'SELECT 1'"
          --health-interval=10s
          --health-timeout=3s
          --health-retries=3

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '10.0.x'

      - name: Restore dependencies
        run: dotnet restore

      - name: Build
        run: dotnet build --no-restore --configuration Release

      - name: Run Unit Tests
        run: |
          dotnet test \
            --no-build \
            --configuration Release \
            --filter "Category=Unit" \
            --logger "trx;LogFileName=unit-tests.trx" \
            --collect:"XPlat Code Coverage"

      - name: Run Integration Tests
        env:
          ConnectionStrings__Default: "Server=localhost,1433;Database=BookStore_Test;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=True"
        run: |
          dotnet test \
            --no-build \
            --configuration Release \
            --filter "Category=Integration" \
            --logger "trx;LogFileName=integration-tests.trx" \
            --collect:"XPlat Code Coverage"

      - name: Upload Test Results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: "**/TestResults/*.trx"

      - name: Upload Code Coverage
        uses: codecov/codecov-action@v3
        with:
          files: "**/coverage.cobertura.xml"
          fail_ci_if_error: true

      - name: Publish Test Results
        uses: dorny/test-reporter@v1
        if: always()
        with:
          name: Test Results
          path: "**/TestResults/*.trx"
          reporter: dotnet-trx

      - name: Send Slack Notification on Failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
          payload: |
            {
              "text": "❌ Tests failed for ${{ github.repository }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Tests Failed*\n\nRepository: ${{ github.repository }}\nBranch: ${{ github.ref }}\nCommit: ${{ github.sha }}\n\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Details>"
                  }
                }
              ]
            }
```

#### 步驟 2：配置測試分類

在測試類別上加入 `[Trait]` 屬性：

```csharp
// 單元測試
[Trait("Category", "Unit")]
public class OrderTests
{
    // ...
}

// 整合測試
[Trait("Category", "Integration")]
public class BookAppService_IntegrationTests
{
    // ...
}
```

#### 步驟 3：設定 Slack Webhook（選擇性）

1. 在 Slack 中建立 Incoming Webhook
2. 在 GitHub Repository 的 Settings → Secrets 中新增 `SLACK_WEBHOOK_URL`

---

## 總結

本章練習涵蓋了完整的測試策略：

1. **單元測試**：

   - 測試領域邏輯的所有業務規則
   - 使用 `[Theory]` 測試邊界條件
   - 遵循 AAA 模式（Arrange-Act-Assert）

2. **整合測試**：

   - 使用 Testcontainers 提供真實的資料庫環境
   - 測試完整的 CRUD 操作
   - 驗證資料持久化

3. **CI/CD**：
   - 自動化測試執行
   - 程式碼覆蓋率報告
   - 測試失敗通知

**最佳實踐**：

- 保持測試的獨立性和可重複性
- 使用描述性的測試名稱
- 測試行為而非實作細節
- 定期執行測試並監控覆蓋率
- 將測試整合到 CI/CD 流程中

---

## 參考資源

- [ABP 測試文件](https://docs.abp.io/en/abp/latest/Testing)
- [xUnit 官方文件](https://xunit.net/)
- [Testcontainers 官方文件](https://dotnet.testcontainers.org/)
- [GitHub Actions 文件](https://docs.github.com/en/actions)
