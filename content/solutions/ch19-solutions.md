# 第十九章：安全性與資料保護 - 習題解答

本文件提供第十九章實戰練習的完整解答，涵蓋權限系統、資料加密和 GDPR 合規。

---

## 練習 1：實作權限系統

### 題目

1. 定義完整的權限樹（至少 10 個權限）。
2. 為不同角色分配權限。
3. 測試未授權存取會被拒絕。

### 解答

#### 步驟 1：定義權限結構

```csharp
// Application.Contracts/Permissions/BookStorePermissions.cs
namespace BookStore.Permissions
{
    public static class BookStorePermissions
    {
        public const string GroupName = "BookStore";

        // 書籍管理
        public static class Books
        {
            public const string Default = GroupName + ".Books";
            public const string Create = Default + ".Create";
            public const string Edit = Default + ".Edit";
            public const string Delete = Default + ".Delete";
            public const string Export = Default + ".Export";
        }

        // 作者管理
        public static class Authors
        {
            public const string Default = GroupName + ".Authors";
            public const string Create = Default + ".Create";
            public const string Edit = Default + ".Edit";
            public const string Delete = Default + ".Delete";
        }

        // 訂單管理
        public static class Orders
        {
            public const string Default = GroupName + ".Orders";
            public const string Create = Default + ".Create";
            public const string Edit = Default + ".Edit";
            public const string Delete = Default + ".Delete";
            public const string Approve = Default + ".Approve";
            public const string ViewAll = Default + ".ViewAll"; // 查看所有訂單（管理員）
        }

        // 報表
        public static class Reports
        {
            public const string Default = GroupName + ".Reports";
            public const string Sales = Default + ".Sales";
            public const string Inventory = Default + ".Inventory";
            public const string Advanced = Default + ".Advanced";
        }

        // 系統設定
        public static class Settings
        {
            public const string Default = GroupName + ".Settings";
            public const string Manage = Default + ".Manage";
        }
    }
}
```

#### 步驟 2：定義權限提供者

```csharp
// Application.Contracts/Permissions/BookStorePermissionDefinitionProvider.cs
using BookStore.Localization;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.Localization;

namespace BookStore.Permissions
{
    public class BookStorePermissionDefinitionProvider : PermissionDefinitionProvider
    {
        public override void Define(IPermissionDefinitionContext context)
        {
            var bookStoreGroup = context.AddGroup(
                BookStorePermissions.GroupName,
                L("Permission:BookStore"));

            // 書籍權限
            var booksPermission = bookStoreGroup.AddPermission(
                BookStorePermissions.Books.Default,
                L("Permission:Books"));

            booksPermission.AddChild(
                BookStorePermissions.Books.Create,
                L("Permission:Books.Create"));

            booksPermission.AddChild(
                BookStorePermissions.Books.Edit,
                L("Permission:Books.Edit"));

            booksPermission.AddChild(
                BookStorePermissions.Books.Delete,
                L("Permission:Books.Delete"));

            booksPermission.AddChild(
                BookStorePermissions.Books.Export,
                L("Permission:Books.Export"));

            // 作者權限
            var authorsPermission = bookStoreGroup.AddPermission(
                BookStorePermissions.Authors.Default,
                L("Permission:Authors"));

            authorsPermission.AddChild(
                BookStorePermissions.Authors.Create,
                L("Permission:Authors.Create"));

            authorsPermission.AddChild(
                BookStorePermissions.Authors.Edit,
                L("Permission:Authors.Edit"));

            authorsPermission.AddChild(
                BookStorePermissions.Authors.Delete,
                L("Permission:Authors.Delete"));

            // 訂單權限
            var ordersPermission = bookStoreGroup.AddPermission(
                BookStorePermissions.Orders.Default,
                L("Permission:Orders"));

            ordersPermission.AddChild(
                BookStorePermissions.Orders.Create,
                L("Permission:Orders.Create"));

            ordersPermission.AddChild(
                BookStorePermissions.Orders.Edit,
                L("Permission:Orders.Edit"));

            ordersPermission.AddChild(
                BookStorePermissions.Orders.Delete,
                L("Permission:Orders.Delete"));

            ordersPermission.AddChild(
                BookStorePermissions.Orders.Approve,
                L("Permission:Orders.Approve"));

            ordersPermission.AddChild(
                BookStorePermissions.Orders.ViewAll,
                L("Permission:Orders.ViewAll"));

            // 報表權限
            var reportsPermission = bookStoreGroup.AddPermission(
                BookStorePermissions.Reports.Default,
                L("Permission:Reports"));

            reportsPermission.AddChild(
                BookStorePermissions.Reports.Sales,
                L("Permission:Reports.Sales"));

            reportsPermission.AddChild(
                BookStorePermissions.Reports.Inventory,
                L("Permission:Reports.Inventory"));

            reportsPermission.AddChild(
                BookStorePermissions.Reports.Advanced,
                L("Permission:Reports.Advanced"));

            // 系統設定權限
            var settingsPermission = bookStoreGroup.AddPermission(
                BookStorePermissions.Settings.Default,
                L("Permission:Settings"));

            settingsPermission.AddChild(
                BookStorePermissions.Settings.Manage,
                L("Permission:Settings.Manage"));
        }

        private static LocalizableString L(string name)
        {
            return LocalizableString.Create<BookStoreResource>(name);
        }
    }
}
```

#### 步驟 3：在本地化資源中定義權限名稱

```json
// Domain.Shared/Localization/BookStore/zh-Hant.json
{
  "culture": "zh-Hant",
  "texts": {
    "Permission:BookStore": "書店管理",
    "Permission:Books": "書籍管理",
    "Permission:Books.Create": "建立書籍",
    "Permission:Books.Edit": "編輯書籍",
    "Permission:Books.Delete": "刪除書籍",
    "Permission:Books.Export": "匯出書籍",
    "Permission:Authors": "作者管理",
    "Permission:Authors.Create": "建立作者",
    "Permission:Authors.Edit": "編輯作者",
    "Permission:Authors.Delete": "刪除作者",
    "Permission:Orders": "訂單管理",
    "Permission:Orders.Create": "建立訂單",
    "Permission:Orders.Edit": "編輯訂單",
    "Permission:Orders.Delete": "刪除訂單",
    "Permission:Orders.Approve": "核准訂單",
    "Permission:Orders.ViewAll": "查看所有訂單",
    "Permission:Reports": "報表",
    "Permission:Reports.Sales": "銷售報表",
    "Permission:Reports.Inventory": "庫存報表",
    "Permission:Reports.Advanced": "進階報表",
    "Permission:Settings": "系統設定",
    "Permission:Settings.Manage": "管理系統設定"
  }
}
```

#### 步驟 4：為角色分配權限

```csharp
// Domain/Data/BookStoreDataSeedContributor.cs
using System;
using System.Threading.Tasks;
using BookStore.Permissions;
using Microsoft.AspNetCore.Identity;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Identity;
using Volo.Abp.PermissionManagement;

namespace BookStore.Data
{
    public class BookStoreDataSeedContributor : IDataSeedContributor, ITransientDependency
    {
        private readonly IIdentityRoleRepository _roleRepository;
        private readonly IPermissionManager _permissionManager;
        private readonly RoleManager<IdentityRole> _roleManager;

        public BookStoreDataSeedContributor(
            IIdentityRoleRepository roleRepository,
            IPermissionManager permissionManager,
            RoleManager<IdentityRole> roleManager)
        {
            _roleRepository = roleRepository;
            _permissionManager = permissionManager;
            _roleManager = roleManager;
        }

        public async Task SeedAsync(DataSeedContext context)
        {
            await SeedRolesAndPermissionsAsync();
        }

        private async Task SeedRolesAndPermissionsAsync()
        {
            // 建立角色
            await CreateRoleAsync("Admin", "管理員");
            await CreateRoleAsync("Manager", "經理");
            await CreateRoleAsync("Staff", "員工");
            await CreateRoleAsync("Customer", "客戶");

            // 為管理員分配所有權限
            await GrantPermissionsToRoleAsync("Admin", new[]
            {
                BookStorePermissions.Books.Default,
                BookStorePermissions.Books.Create,
                BookStorePermissions.Books.Edit,
                BookStorePermissions.Books.Delete,
                BookStorePermissions.Books.Export,
                BookStorePermissions.Authors.Default,
                BookStorePermissions.Authors.Create,
                BookStorePermissions.Authors.Edit,
                BookStorePermissions.Authors.Delete,
                BookStorePermissions.Orders.Default,
                BookStorePermissions.Orders.Create,
                BookStorePermissions.Orders.Edit,
                BookStorePermissions.Orders.Delete,
                BookStorePermissions.Orders.Approve,
                BookStorePermissions.Orders.ViewAll,
                BookStorePermissions.Reports.Default,
                BookStorePermissions.Reports.Sales,
                BookStorePermissions.Reports.Inventory,
                BookStorePermissions.Reports.Advanced,
                BookStorePermissions.Settings.Default,
                BookStorePermissions.Settings.Manage
            });

            // 為經理分配部分權限
            await GrantPermissionsToRoleAsync("Manager", new[]
            {
                BookStorePermissions.Books.Default,
                BookStorePermissions.Books.Create,
                BookStorePermissions.Books.Edit,
                BookStorePermissions.Authors.Default,
                BookStorePermissions.Authors.Create,
                BookStorePermissions.Authors.Edit,
                BookStorePermissions.Orders.Default,
                BookStorePermissions.Orders.Create,
                BookStorePermissions.Orders.Edit,
                BookStorePermissions.Orders.Approve,
                BookStorePermissions.Orders.ViewAll,
                BookStorePermissions.Reports.Default,
                BookStorePermissions.Reports.Sales,
                BookStorePermissions.Reports.Inventory
            });

            // 為員工分配基本權限
            await GrantPermissionsToRoleAsync("Staff", new[]
            {
                BookStorePermissions.Books.Default,
                BookStorePermissions.Authors.Default,
                BookStorePermissions.Orders.Default,
                BookStorePermissions.Orders.Create,
                BookStorePermissions.Reports.Default,
                BookStorePermissions.Reports.Sales
            });

            // 為客戶分配最少權限
            await GrantPermissionsToRoleAsync("Customer", new[]
            {
                BookStorePermissions.Books.Default,
                BookStorePermissions.Orders.Default,
                BookStorePermissions.Orders.Create
            });
        }

        private async Task CreateRoleAsync(string name, string displayName)
        {
            var role = await _roleRepository.FindByNormalizedNameAsync(
                _roleManager.NormalizeKey(name));

            if (role == null)
            {
                role = new IdentityRole(Guid.NewGuid(), name)
                {
                    IsDefault = false,
                    IsPublic = true
                };

                await _roleRepository.InsertAsync(role);
            }
        }

        private async Task GrantPermissionsToRoleAsync(string roleName, string[] permissions)
        {
            var role = await _roleRepository.FindByNormalizedNameAsync(
                _roleManager.NormalizeKey(roleName));

            if (role == null)
            {
                return;
            }

            foreach (var permission in permissions)
            {
                await _permissionManager.SetForRoleAsync(
                    roleName,
                    permission,
                    true);
            }
        }
    }
}
```

#### 步驟 5：在 Application Service 中使用權限

```csharp
// Application/Books/BookAppService.cs
using Microsoft.AspNetCore.Authorization;
using BookStore.Permissions;

public class BookAppService : ApplicationService, IBookAppService
{
    public BookAppService(IRepository<Book, Guid> repository) : base(repository)
    {
        GetPolicyName = BookStorePermissions.Books.Default;
        GetListPolicyName = BookStorePermissions.Books.Default;
        CreatePolicyName = BookStorePermissions.Books.Create;
        UpdatePolicyName = BookStorePermissions.Books.Edit;
        DeletePolicyName = BookStorePermissions.Books.Delete;
    }

    [Authorize(BookStorePermissions.Books.Export)]
    public async Task<byte[]> ExportToCsvAsync()
    {
        var books = await Repository.GetListAsync();
        // 匯出邏輯...
        return new byte[0];
    }
}
```

#### 步驟 6：測試未授權存取

```csharp
// Test/Application/Books/BookAppService_AuthorizationTests.cs
using System;
using System.Threading.Tasks;
using BookStore.Books;
using BookStore.Permissions;
using Shouldly;
using Volo.Abp.Authorization;
using Xunit;

namespace BookStore.Application.Books
{
    public class BookAppService_AuthorizationTests : BookStoreApplicationTestBase
    {
        private readonly IBookAppService _bookAppService;

        public BookAppService_AuthorizationTests()
        {
            _bookAppService = GetRequiredService<IBookAppService>();
        }

        [Fact]
        public async Task CreateAsync_WithoutPermission_ShouldThrow()
        {
            // Arrange
            // 登入為沒有建立權限的使用者
            await LoginAsCustomerAsync();

            var input = new CreateUpdateBookDto
            {
                Name = "Test Book",
                Type = BookType.Fiction,
                PublishDate = DateTime.Now,
                Price = 10f
            };

            // Act & Assert
            await Should.ThrowAsync<AbpAuthorizationException>(async () =>
            {
                await _bookAppService.CreateAsync(input);
            });
        }

        [Fact]
        public async Task CreateAsync_WithPermission_ShouldSucceed()
        {
            // Arrange
            // 登入為有建立權限的使用者（管理員）
            await LoginAsAdminAsync();

            var input = new CreateUpdateBookDto
            {
                Name = "Test Book",
                Type = BookType.Fiction,
                PublishDate = DateTime.Now,
                Price = 10f
            };

            // Act
            var result = await _bookAppService.CreateAsync(input);

            // Assert
            result.ShouldNotBeNull();
            result.Name.ShouldBe("Test Book");
        }

        [Fact]
        public async Task DeleteAsync_WithoutPermission_ShouldThrow()
        {
            // Arrange
            await LoginAsStaffAsync(); // 員工沒有刪除權限

            // Act & Assert
            await Should.ThrowAsync<AbpAuthorizationException>(async () =>
            {
                await _bookAppService.DeleteAsync(Guid.NewGuid());
            });
        }

        private async Task LoginAsAdminAsync()
        {
            // 模擬管理員登入
            // 實作取決於您的測試基礎設施
        }

        private async Task LoginAsCustomerAsync()
        {
            // 模擬客戶登入
        }

        private async Task LoginAsStaffAsync()
        {
            // 模擬員工登入
        }
    }
}
```

---

## 練習 2：資料加密

### 題目

1. 為 `User` 實體的 `IdCardNumber` 欄位實作自動加密。
2. 驗證資料庫中儲存的是密文。

### 解答

#### 步驟 1：配置 Data Protection

```csharp
// Web/BookStoreWebModule.cs
using Microsoft.AspNetCore.DataProtection;

public class BookStoreWebModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        var configuration = context.Services.GetConfiguration();

        context.Services.AddDataProtection()
            .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(Directory.GetCurrentDirectory(), "keys")))
            .SetApplicationName("BookStore")
            .SetDefaultKeyLifetime(TimeSpan.FromDays(90));

        // 生產環境應使用憑證保護金鑰
        if (!context.Services.GetHostingEnvironment().IsDevelopment())
        {
            // context.Services.AddDataProtection()
            //     .ProtectKeysWithCertificate(certificate);
        }
    }
}
```

#### 步驟 2：建立加密 Value Converter

```csharp
// EntityFrameworkCore/ValueConverters/EncryptedStringConverter.cs
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace BookStore.EntityFrameworkCore.ValueConverters
{
    public class EncryptedStringConverter : ValueConverter<string, string>
    {
        public EncryptedStringConverter(IDataProtector protector, ConverterMappingHints mappingHints = null)
            : base(
                v => protector.Protect(v ?? string.Empty),
                v => protector.Unprotect(v ?? string.Empty),
                mappingHints)
        {
        }
    }
}
```

#### 步驟 3：在 DbContext 中配置加密

```csharp
// EntityFrameworkCore/BookStoreDbContext.cs
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using BookStore.EntityFrameworkCore.ValueConverters;
using Volo.Abp.Identity;

namespace BookStore.EntityFrameworkCore
{
    public class BookStoreDbContext : AbpDbContext<BookStoreDbContext>
    {
        private readonly IDataProtectionProvider _dataProtectionProvider;

        public BookStoreDbContext(
            DbContextOptions<BookStoreDbContext> options,
            IDataProtectionProvider dataProtectionProvider)
            : base(options)
        {
            _dataProtectionProvider = dataProtectionProvider;
        }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.ConfigureBookStore();

            // 配置加密欄位
            ConfigureEncryption(builder);
        }

        private void ConfigureEncryption(ModelBuilder builder)
        {
            var protector = _dataProtectionProvider.CreateProtector("BookStore.PersonalData");

            builder.Entity<IdentityUser>(b =>
            {
                // 加密身分證字號
                b.Property(e => e.GetType().GetProperty("IdCardNumber")?.GetValue(e) as string)
                    .HasConversion(new EncryptedStringConverter(protector))
                    .HasColumnName("IdCardNumber");
            });

            // 如果有自訂的 User 實體
            builder.Entity<AppUser>(b =>
            {
                b.Property(e => e.IdCardNumber)
                    .HasConversion(new EncryptedStringConverter(protector))
                    .IsRequired(false);

                b.Property(e => e.CreditCardNumber)
                    .HasConversion(new EncryptedStringConverter(protector))
                    .IsRequired(false);
            });
        }
    }
}
```

#### 步驟 4：擴展 IdentityUser 或建立自訂 User 實體

```csharp
// Domain/Users/AppUser.cs
using System;
using Volo.Abp.Domain.Entities.Auditing;
using Volo.Abp.Identity;

namespace BookStore.Users
{
    public class AppUser : FullAuditedAggregateRoot<Guid>
    {
        public Guid IdentityUserId { get; set; }

        /// <summary>
        /// 身分證字號（將被加密）
        /// </summary>
        public string IdCardNumber { get; set; }

        /// <summary>
        /// 信用卡號（將被加密）
        /// </summary>
        public string CreditCardNumber { get; set; }

        /// <summary>
        /// 電話號碼（明文）
        /// </summary>
        public string PhoneNumber { get; set; }

        protected AppUser()
        {
        }

        public AppUser(Guid id, Guid identityUserId, string idCardNumber = null)
            : base(id)
        {
            IdentityUserId = identityUserId;
            IdCardNumber = idCardNumber;
        }

        public void UpdateIdCardNumber(string idCardNumber)
        {
            IdCardNumber = idCardNumber;
        }
    }
}
```

#### 步驟 5：建立 Migration

```bash
cd src/BookStore.EntityFrameworkCore
dotnet ef migrations add AddedEncryptedFields
dotnet ef database update
```

#### 步驟 6：驗證加密

```csharp
// Test/EntityFrameworkCore/EncryptionTests.cs
using System;
using System.Linq;
using System.Threading.Tasks;
using BookStore.Users;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Xunit;

namespace BookStore.EntityFrameworkCore
{
    public class EncryptionTests : BookStoreEntityFrameworkCoreTestBase
    {
        private readonly IRepository<AppUser, Guid> _userRepository;
        private readonly BookStoreDbContext _dbContext;

        public EncryptionTests()
        {
            _userRepository = GetRequiredService<IRepository<AppUser, Guid>>();
            _dbContext = GetRequiredService<BookStoreDbContext>();
        }

        [Fact]
        public async Task IdCardNumber_ShouldBeEncryptedInDatabase()
        {
            // Arrange
            var plainIdCard = "A123456789";
            var user = new AppUser(
                Guid.NewGuid(),
                Guid.NewGuid(),
                plainIdCard);

            // Act
            await _userRepository.InsertAsync(user);
            await _dbContext.SaveChangesAsync();

            // Assert - 從應用程式讀取應該是明文
            var userFromApp = await _userRepository.GetAsync(user.Id);
            userFromApp.IdCardNumber.ShouldBe(plainIdCard);

            // Assert - 直接從資料庫讀取應該是密文
            var connection = _dbContext.Database.GetDbConnection();
            await connection.OpenAsync();

            using (var command = connection.CreateCommand())
            {
                command.CommandText = $"SELECT IdCardNumber FROM AppUsers WHERE Id = '{user.Id}'";
                var encryptedValue = (string)await command.ExecuteScalarAsync();

                // 密文應該與明文不同
                encryptedValue.ShouldNotBe(plainIdCard);

                // 密文應該是 Base64 編碼的字串
                encryptedValue.ShouldNotBeNullOrWhiteSpace();
                encryptedValue.Length.ShouldBeGreaterThan(plainIdCard.Length);
            }
        }
    }
}
```

---

## 練習 3：GDPR 合規

### 題目

1. 實作完整的資料刪除流程。
2. 實作資料匯出功能（Right to Data Portability）。

### 解答

#### 步驟 1：實作資料刪除服務

```csharp
// Domain/Users/UserDataDeletionService.cs
using System;
using System.Threading.Tasks;
using BookStore.Orders;
using Microsoft.Extensions.Logging;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Identity;
using Volo.Abp.Uow;

namespace BookStore.Users
{
    public class UserDataDeletionService : ITransientDependency
    {
        private readonly IRepository<AppUser, Guid> _appUserRepository;
        private readonly IIdentityUserRepository _identityUserRepository;
        private readonly IRepository<Order, Guid> _orderRepository;
        private readonly ILogger<UserDataDeletionService> _logger;

        public UserDataDeletionService(
            IRepository<AppUser, Guid> appUserRepository,
            IIdentityUserRepository identityUserRepository,
            IRepository<Order, Guid> orderRepository,
            ILogger<UserDataDeletionService> logger)
        {
            _appUserRepository = appUserRepository;
            _identityUserRepository = identityUserRepository;
            _orderRepository = orderRepository;
            _logger = logger;
        }

        [UnitOfWork]
        public async Task DeleteUserDataAsync(Guid userId)
        {
            _logger.LogInformation("開始刪除使用者 {UserId} 的個人資料", userId);

            // 1. 匿名化 Identity User
            var identityUser = await _identityUserRepository.GetAsync(userId);
            await AnonymizeIdentityUserAsync(identityUser);

            // 2. 匿名化 App User
            var appUser = await _appUserRepository.FirstOrDefaultAsync(u => u.IdentityUserId == userId);
            if (appUser != null)
            {
                await AnonymizeAppUserAsync(appUser);
            }

            // 3. 匿名化訂單資料
            await AnonymizeUserOrdersAsync(userId);

            _logger.LogInformation("使用者 {UserId} 的個人資料已成功刪除", userId);
        }

        private async Task AnonymizeIdentityUserAsync(IdentityUser user)
        {
            user.SetEmail($"deleted_{user.Id}@anonymized.local");
            user.SetPhoneNumber(null);
            user.Name = "已刪除的使用者";
            user.Surname = "";
            user.IsActive = false;

            await _identityUserRepository.UpdateAsync(user);
        }

        private async Task AnonymizeAppUserAsync(AppUser user)
        {
            user.IdCardNumber = null;
            user.CreditCardNumber = null;
            user.PhoneNumber = null;

            await _appUserRepository.UpdateAsync(user);
        }

        private async Task AnonymizeUserOrdersAsync(Guid userId)
        {
            var orders = await _orderRepository.GetListAsync(o => o.CustomerId == userId);

            foreach (var order in orders)
            {
                order.ShippingAddress = "地址已刪除";
                order.RecipientName = "已刪除的使用者";
                order.RecipientPhone = null;

                await _orderRepository.UpdateAsync(order);
            }
        }
    }
}
```

#### 步驟 2：實作資料匯出服務

```csharp
// Application/Users/UserDataExportService.cs
using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using BookStore.Orders;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Identity;

namespace BookStore.Users
{
    public class UserDataExportService : ApplicationService
    {
        private readonly IRepository<AppUser, Guid> _appUserRepository;
        private readonly IIdentityUserRepository _identityUserRepository;
        private readonly IRepository<Order, Guid> _orderRepository;

        public UserDataExportService(
            IRepository<AppUser, Guid> appUserRepository,
            IIdentityUserRepository identityUserRepository,
            IRepository<Order, Guid> orderRepository)
        {
            _appUserRepository = appUserRepository;
            _identityUserRepository = identityUserRepository;
            _orderRepository = orderRepository;
        }

        public async Task<byte[]> ExportUserDataAsync(Guid userId)
        {
            var data = new Dictionary<string, object>();

            // 1. 匯出基本資料
            var identityUser = await _identityUserRepository.GetAsync(userId);
            data["BasicInfo"] = new
            {
                identityUser.UserName,
                identityUser.Email,
                identityUser.PhoneNumber,
                identityUser.Name,
                identityUser.Surname,
                identityUser.CreationTime
            };

            // 2. 匯出擴展資料
            var appUser = await _appUserRepository.FirstOrDefaultAsync(u => u.IdentityUserId == userId);
            if (appUser != null)
            {
                data["ExtendedInfo"] = new
                {
                    appUser.PhoneNumber,
                    // 注意：敏感資料（如身分證）不應匯出，或需要額外驗證
                    CreationTime = appUser.CreationTime
                };
            }

            // 3. 匯出訂單歷史
            var orders = await _orderRepository.GetListAsync(o => o.CustomerId == userId);
            data["Orders"] = orders.Select(o => new
            {
                o.OrderNumber,
                o.TotalAmount,
                o.Status,
                o.CreationTime,
                o.ShippingAddress
            }).ToList();

            // 4. 轉換為 JSON
            var json = JsonSerializer.Serialize(data, new JsonSerializerOptions
            {
                WriteIndented = true,
                Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
            });

            return Encoding.UTF8.GetBytes(json);
        }
    }
}
```

#### 步驟 3：建立 Application Service 介面

```csharp
// Application.Contracts/Users/IUserDataManagementAppService.cs
using System;
using System.Threading.Tasks;
using Volo.Abp.Application.Services;

namespace BookStore.Users
{
    public interface IUserDataManagementAppService : IApplicationService
    {
        Task RequestDataDeletionAsync();
        Task<byte[]> ExportMyDataAsync();
    }
}
```

```csharp
// Application/Users/UserDataManagementAppService.cs
using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Services;

namespace BookStore.Users
{
    [Authorize]
    public class UserDataManagementAppService : ApplicationService, IUserDataManagementAppService
    {
        private readonly UserDataDeletionService _deletionService;
        private readonly UserDataExportService _exportService;

        public UserDataManagementAppService(
            UserDataDeletionService deletionService,
            UserDataExportService exportService)
        {
            _deletionService = deletionService;
            _exportService = exportService;
        }

        public async Task RequestDataDeletionAsync()
        {
            // 在實際應用中，這應該建立一個待處理的請求
            // 由管理員審核後才執行刪除
            await _deletionService.DeleteUserDataAsync(CurrentUser.Id.Value);
        }

        public async Task<byte[]> ExportMyDataAsync()
        {
            return await _exportService.ExportUserDataAsync(CurrentUser.Id.Value);
        }
    }
}
```

#### 步驟 4：建立 UI（Razor Pages 範例）

```html
<!-- Pages/Account/MyData.cshtml -->
@page
@model MyDataModel
@inject IStringLocalizer<BookStoreResource> L

<h2>@L["MyPersonalData"]</h2>

<div class="card">
    <div class="card-body">
        <h5>@L["DataExport"]</h5>
        <p>@L["DataExportDescription"]</p>
        <form method="post" asp-page-handler="Export">
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-download"></i> @L["ExportMyData"]
            </button>
        </form>
    </div>
</div>

<div class="card mt-3">
    <div class="card-body">
        <h5 class="text-danger">@L["DataDeletion"]</h5>
        <p>@L["DataDeletionWarning"]</p>
        <form method="post" asp-page-handler="Delete" onsubmit="return confirm('@L["DataDeletionConfirmation"]');">
            <button type="submit" class="btn btn-danger">
                <i class="fas fa-trash"></i> @L["DeleteMyData"]
            </button>
        </form>
    </div>
</div>
```

```csharp
// Pages/Account/MyData.cshtml.cs
using System.Threading.Tasks;
using BookStore.Users;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace BookStore.Web.Pages.Account
{
    public class MyDataModel : PageModel
    {
        private readonly IUserDataManagementAppService _userDataManagement;

        public MyDataModel(IUserDataManagementAppService userDataManagement)
        {
            _userDataManagement = userDataManagement;
        }

        public async Task<IActionResult> OnPostExportAsync()
        {
            var data = await _userDataManagement.ExportMyDataAsync();
            return File(data, "application/json", "my-data.json");
        }

        public async Task<IActionResult> OnPostDeleteAsync()
        {
            await _userDataManagement.RequestDataDeletionAsync();
            return RedirectToPage("/Account/Logout");
        }
    }
}
```

---

## 總結

本章練習涵蓋了安全性與資料保護的核心實作：

1. **權限系統**：

   - 定義完整的權限樹結構
   - 為不同角色分配適當的權限
   - 在應用服務中強制權限檢查
   - 測試未授權存取被正確拒絕

2. **資料加密**：

   - 使用 ASP.NET Core Data Protection API
   - 實作自動加密的 Value Converter
   - 在資料庫層面保護敏感資料
   - 驗證加密效果

3. **GDPR 合規**：
   - 實作資料刪除（Right to Erasure）
   - 實作資料匯出（Right to Data Portability）
   - 資料匿名化而非直接刪除（保留業務記錄）
   - 提供使用者友善的 UI

**最佳實踐**：

- 使用基於權限的授權而非基於角色
- 敏感資料必須加密儲存
- 實作完整的審計日誌
- 遵循 GDPR 和其他資料保護法規
- 定期進行安全審查和滲透測試

---

## 參考資源

- [ABP 授權文件](https://docs.abp.io/en/abp/latest/Authorization)
- [ASP.NET Core Data Protection](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/)
- [GDPR 官方指南](https://gdpr.eu/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
