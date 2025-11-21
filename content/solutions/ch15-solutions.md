# 第十五章：模組化開發 - 習題解答

本文件提供第十五章實戰練習的完整解答，涵蓋 ABP 模組的建立、整合和發布。

---

## 練習 1：建立一個「評論 (Comment)」模組

### 題目

1. 使用 `abp new Volo.Comment -t module` 建立模組。
2. 定義 `Comment` 實體（包含 `EntityType`, `EntityId`, `Content`）。這是一個通用的評論模組，可以掛在任何實體上。
3. 實作 `CommentAppService`。

### 解答

#### 步驟 1：建立模組

```bash
abp new Volo.Comment -t module --no-ui
cd Volo.Comment
```

這會生成以下專案結構：

```
Volo.Comment/
├── src/
│   ├── Volo.Comment.Domain/
│   ├── Volo.Comment.Domain.Shared/
│   ├── Volo.Comment.Application/
│   ├── Volo.Comment.Application.Contracts/
│   ├── Volo.Comment.EntityFrameworkCore/
│   ├── Volo.Comment.HttpApi/
│   └── Volo.Comment.HttpApi.Client/
└── test/
    └── Volo.Comment.TestBase/
```

#### 步驟 2：定義 Comment 實體

```csharp
// Volo.Comment.Domain/Comments/Comment.cs
using System;
using Volo.Abp.Domain.Entities.Auditing;
using Volo.Abp.MultiTenancy;

namespace Volo.Comment.Comments
{
    public class Comment : FullAuditedAggregateRoot<Guid>, IMultiTenant
    {
        public Guid? TenantId { get; set; }

        /// <summary>
        /// 實體類型（例如：Book, Product, Article）
        /// </summary>
        public string EntityType { get; set; }

        /// <summary>
        /// 實體 ID
        /// </summary>
        public string EntityId { get; set; }

        /// <summary>
        /// 評論內容
        /// </summary>
        public string Content { get; set; }

        /// <summary>
        /// 評分（1-5 星）
        /// </summary>
        public int? Rating { get; set; }

        /// <summary>
        /// 父評論 ID（用於回覆功能）
        /// </summary>
        public Guid? ParentId { get; set; }

        protected Comment()
        {
            // 用於 ORM
        }

        public Comment(
            Guid id,
            string entityType,
            string entityId,
            string content,
            int? rating = null,
            Guid? parentId = null,
            Guid? tenantId = null)
            : base(id)
        {
            EntityType = entityType;
            EntityId = entityId;
            Content = content;
            Rating = rating;
            ParentId = parentId;
            TenantId = tenantId;
        }

        public void UpdateContent(string content)
        {
            Content = content;
        }

        public void UpdateRating(int rating)
        {
            if (rating < 1 || rating > 5)
            {
                throw new ArgumentException("Rating must be between 1 and 5", nameof(rating));
            }

            Rating = rating;
        }
    }
}
```

#### 步驟 3：定義 DbContext

```csharp
// Volo.Comment.EntityFrameworkCore/EntityFrameworkCore/CommentDbContext.cs
using Microsoft.EntityFrameworkCore;
using Volo.Abp.Data;
using Volo.Abp.EntityFrameworkCore;
using Volo.Comment.Comments;

namespace Volo.Comment.EntityFrameworkCore
{
    [ConnectionStringName(CommentDbProperties.ConnectionStringName)]
    public class CommentDbContext : AbpDbContext<CommentDbContext>, ICommentDbContext
    {
        public DbSet<Comments.Comment> Comments { get; set; }

        public CommentDbContext(DbContextOptions<CommentDbContext> options)
            : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.ConfigureComment();
        }
    }
}
```

```csharp
// Volo.Comment.EntityFrameworkCore/EntityFrameworkCore/CommentDbContextModelCreatingExtensions.cs
using Microsoft.EntityFrameworkCore;
using Volo.Abp;
using Volo.Abp.EntityFrameworkCore.Modeling;

namespace Volo.Comment.EntityFrameworkCore
{
    public static class CommentDbContextModelCreatingExtensions
    {
        public static void ConfigureComment(this ModelBuilder builder)
        {
            Check.NotNull(builder, nameof(builder));

            builder.Entity<Comments.Comment>(b =>
            {
                b.ToTable(CommentDbProperties.DbTablePrefix + "Comments", CommentDbProperties.DbSchema);
                b.ConfigureByConvention();

                b.Property(x => x.EntityType).IsRequired().HasMaxLength(128);
                b.Property(x => x.EntityId).IsRequired().HasMaxLength(128);
                b.Property(x => x.Content).IsRequired().HasMaxLength(2000);

                b.HasIndex(x => new { x.EntityType, x.EntityId });
                b.HasIndex(x => x.CreatorId);
            });
        }
    }
}
```

#### 步驟 4：定義 DTOs

```csharp
// Volo.Comment.Application.Contracts/Comments/CommentDto.cs
using System;
using Volo.Abp.Application.Dtos;

namespace Volo.Comment.Comments
{
    public class CommentDto : FullAuditedEntityDto<Guid>
    {
        public string EntityType { get; set; }
        public string EntityId { get; set; }
        public string Content { get; set; }
        public int? Rating { get; set; }
        public Guid? ParentId { get; set; }
        public string CreatorUserName { get; set; }
    }
}
```

```csharp
// Volo.Comment.Application.Contracts/Comments/CreateCommentDto.cs
using System;
using System.ComponentModel.DataAnnotations;

namespace Volo.Comment.Comments
{
    public class CreateCommentDto
    {
        [Required]
        [StringLength(128)]
        public string EntityType { get; set; }

        [Required]
        [StringLength(128)]
        public string EntityId { get; set; }

        [Required]
        [StringLength(2000)]
        public string Content { get; set; }

        [Range(1, 5)]
        public int? Rating { get; set; }

        public Guid? ParentId { get; set; }
    }
}
```

```csharp
// Volo.Comment.Application.Contracts/Comments/GetCommentsInput.cs
using Volo.Abp.Application.Dtos;

namespace Volo.Comment.Comments
{
    public class GetCommentsInput : PagedAndSortedResultRequestDto
    {
        public string EntityType { get; set; }
        public string EntityId { get; set; }
    }
}
```

#### 步驟 5：實作 CommentAppService

```csharp
// Volo.Comment.Application.Contracts/Comments/ICommentAppService.cs
using System;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Volo.Comment.Comments
{
    public interface ICommentAppService : IApplicationService
    {
        Task<PagedResultDto<CommentDto>> GetListAsync(GetCommentsInput input);
        Task<CommentDto> GetAsync(Guid id);
        Task<CommentDto> CreateAsync(CreateCommentDto input);
        Task<CommentDto> UpdateAsync(Guid id, UpdateCommentDto input);
        Task DeleteAsync(Guid id);
    }
}
```

```csharp
// Volo.Comment.Application/Comments/CommentAppService.cs
using System;
using System.Linq;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Users;

namespace Volo.Comment.Comments
{
    public class CommentAppService : ApplicationService, ICommentAppService
    {
        private readonly IRepository<Comment, Guid> _commentRepository;
        private readonly ICurrentUser _currentUser;

        public CommentAppService(
            IRepository<Comment, Guid> commentRepository,
            ICurrentUser currentUser)
        {
            _commentRepository = commentRepository;
            _currentUser = currentUser;
        }

        public async Task<PagedResultDto<CommentDto>> GetListAsync(GetCommentsInput input)
        {
            var queryable = await _commentRepository.GetQueryableAsync();

            // 過濾條件
            if (!string.IsNullOrWhiteSpace(input.EntityType))
            {
                queryable = queryable.Where(x => x.EntityType == input.EntityType);
            }

            if (!string.IsNullOrWhiteSpace(input.EntityId))
            {
                queryable = queryable.Where(x => x.EntityId == input.EntityId);
            }

            // 只取頂層評論（不包含回覆）
            queryable = queryable.Where(x => x.ParentId == null);

            // 排序
            queryable = queryable.OrderByDescending(x => x.CreationTime);

            // 分頁
            var totalCount = await AsyncExecuter.CountAsync(queryable);
            var comments = await AsyncExecuter.ToListAsync(
                queryable.Skip(input.SkipCount).Take(input.MaxResultCount));

            return new PagedResultDto<CommentDto>(
                totalCount,
                ObjectMapper.Map<List<Comment>, List<CommentDto>>(comments));
        }

        public async Task<CommentDto> GetAsync(Guid id)
        {
            var comment = await _commentRepository.GetAsync(id);
            return ObjectMapper.Map<Comment, CommentDto>(comment);
        }

        public async Task<CommentDto> CreateAsync(CreateCommentDto input)
        {
            var comment = new Comment(
                GuidGenerator.Create(),
                input.EntityType,
                input.EntityId,
                input.Content,
                input.Rating,
                input.ParentId,
                CurrentTenant.Id);

            await _commentRepository.InsertAsync(comment);

            return ObjectMapper.Map<Comment, CommentDto>(comment);
        }

        public async Task<CommentDto> UpdateAsync(Guid id, UpdateCommentDto input)
        {
            var comment = await _commentRepository.GetAsync(id);

            // 檢查權限：只有建立者可以編輯
            if (comment.CreatorId != _currentUser.Id)
            {
                throw new BusinessException("Comment:CannotEditOthersComment");
            }

            comment.UpdateContent(input.Content);

            if (input.Rating.HasValue)
            {
                comment.UpdateRating(input.Rating.Value);
            }

            await _commentRepository.UpdateAsync(comment);

            return ObjectMapper.Map<Comment, CommentDto>(comment);
        }

        public async Task DeleteAsync(Guid id)
        {
            var comment = await _commentRepository.GetAsync(id);

            // 檢查權限：只有建立者可以刪除
            if (comment.CreatorId != _currentUser.Id)
            {
                throw new BusinessException("Comment:CannotDeleteOthersComment");
            }

            await _commentRepository.DeleteAsync(id);
        }
    }
}
```

#### 步驟 6：配置 AutoMapper

```csharp
// Volo.Comment.Application/CommentApplicationAutoMapperProfile.cs
using AutoMapper;
using Volo.Comment.Comments;

namespace Volo.Comment
{
    public class CommentApplicationAutoMapperProfile : Profile
    {
        public CommentApplicationAutoMapperProfile()
        {
            CreateMap<Comment, CommentDto>();
            CreateMap<CreateCommentDto, Comment>();
        }
    }
}
```

---

## 練習 2：在主應用程式中使用模組

### 題目

1. 在現有的 `BookStore` 應用程式中，加入 `Volo.Comment` 的專案引用（或 NuGet 引用）。
2. 在 `BookStore` 的各層 Module 中加入 `[DependsOn]`。
3. 執行 `DbMigrator`，確保評論模組的資料表被建立。

### 解答

#### 步驟 1：加入專案引用

```bash
# 在 BookStore.Domain 中引用 Comment.Domain
cd src/BookStore.Domain
dotnet add reference ../../Volo.Comment/src/Volo.Comment.Domain/Volo.Comment.Domain.csproj

# 在 BookStore.Application 中引用 Comment.Application
cd ../BookStore.Application
dotnet add reference ../../Volo.Comment/src/Volo.Comment.Application/Volo.Comment.Application.csproj

# 在 BookStore.EntityFrameworkCore 中引用 Comment.EntityFrameworkCore
cd ../BookStore.EntityFrameworkCore
dotnet add reference ../../Volo.Comment/src/Volo.Comment.EntityFrameworkCore/Volo.Comment.EntityFrameworkCore.csproj

# 在 BookStore.HttpApi 中引用 Comment.HttpApi
cd ../BookStore.HttpApi
dotnet add reference ../../Volo.Comment/src/Volo.Comment.HttpApi/Volo.Comment.HttpApi.csproj
```

#### 步驟 2：加入模組依賴

```csharp
// BookStore.Domain/BookStoreDomainModule.cs
using Volo.Comment;

[DependsOn(
    typeof(CommentDomainModule),
    // ... 其他依賴
)]
public class BookStoreDomainModule : AbpModule
{
    // ...
}
```

```csharp
// BookStore.Application/BookStoreApplicationModule.cs
using Volo.Comment;

[DependsOn(
    typeof(CommentApplicationModule),
    // ... 其他依賴
)]
public class BookStoreApplicationModule : AbpModule
{
    // ...
}
```

```csharp
// BookStore.EntityFrameworkCore/BookStoreEntityFrameworkCoreModule.cs
using Volo.Comment.EntityFrameworkCore;

[DependsOn(
    typeof(CommentEntityFrameworkCoreModule),
    // ... 其他依賴
)]
public class BookStoreEntityFrameworkCoreModule : AbpModule
{
    // ...
}
```

```csharp
// BookStore.HttpApi/BookStoreHttpApiModule.cs
using Volo.Comment;

[DependsOn(
    typeof(CommentHttpApiModule),
    // ... 其他依賴
)]
public class BookStoreHttpApiModule : AbpModule
{
    // ...
}
```

#### 步驟 3：配置 DbContext

```csharp
// BookStore.EntityFrameworkCore/EntityFrameworkCore/BookStoreDbContext.cs
using Volo.Comment.EntityFrameworkCore;

public class BookStoreDbContext :
    AbpDbContext<BookStoreDbContext>,
    ICommentDbContext // 實作 Comment 模組的介面
{
    public DbSet<Comment> Comments { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.ConfigureBookStore();
        builder.ConfigureComment(); // 配置 Comment 模組的實體
    }
}
```

#### 步驟 4：建立 Migration

```bash
cd src/BookStore.EntityFrameworkCore
dotnet ef migrations add AddedCommentModule
```

#### 步驟 5：執行 DbMigrator

```bash
cd src/BookStore.DbMigrator
dotnet run
```

驗證資料表是否建立：

```sql
SELECT * FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE '%Comment%';
```

---

## 練習 3：整合功能

### 題目

1. 在書籍詳情頁面，呼叫 `CommentAppService` 顯示該書籍的評論。
2. 實作「新增評論」功能。

### 解答

#### 步驟 1：在 Razor Pages 中顯示評論

```csharp
// Pages/Books/Detail.cshtml.cs
using Volo.Comment.Comments;

public class DetailModel : BookStorePageModel
{
    public BookDto Book { get; set; }
    public PagedResultDto<CommentDto> Comments { get; set; }

    private readonly IBookAppService _bookAppService;
    private readonly ICommentAppService _commentAppService;

    public DetailModel(
        IBookAppService bookAppService,
        ICommentAppService commentAppService)
    {
        _bookAppService = bookAppService;
        _commentAppService = commentAppService;
    }

    public async Task OnGetAsync(Guid id)
    {
        Book = await _bookAppService.GetAsync(id);

        Comments = await _commentAppService.GetListAsync(new GetCommentsInput
        {
            EntityType = "Book",
            EntityId = id.ToString(),
            MaxResultCount = 10
        });
    }
}
```

```html
<!-- Pages/Books/Detail.cshtml -->
@page
@model DetailModel

<h1>@Model.Book.Name</h1>
<p>@Model.Book.Description</p>

<hr />

<h3>評論</h3>

@if (Model.Comments.TotalCount == 0)
{
    <p class="text-muted">目前沒有評論</p>
}
else
{
    @foreach (var comment in Model.Comments.Items)
    {
        <div class="card mb-3">
            <div class="card-body">
                <p>@comment.Content</p>
                @if (comment.Rating.HasValue)
                {
                    <div>
                        @for (int i = 1; i <= 5; i++)
                        {
                            <i class="fas fa-star @(i <= comment.Rating ? "text-warning" : "text-muted")"></i>
                        }
                    </div>
                }
                <small class="text-muted">
                    @comment.CreatorUserName - @comment.CreationTime.ToString("yyyy-MM-dd HH:mm")
                </small>
            </div>
        </div>
    }
}

<hr />

<h4>新增評論</h4>
<form method="post" asp-page-handler="CreateComment">
    <input type="hidden" name="bookId" value="@Model.Book.Id" />

    <div class="mb-3">
        <label>評分</label>
        <select name="rating" class="form-select">
            <option value="">不評分</option>
            <option value="5">5 星</option>
            <option value="4">4 星</option>
            <option value="3">3 星</option>
            <option value="2">2 星</option>
            <option value="1">1 星</option>
        </select>
    </div>

    <div class="mb-3">
        <label>評論內容</label>
        <textarea name="content" class="form-control" rows="4" required></textarea>
    </div>

    <button type="submit" class="btn btn-primary">送出評論</button>
</form>
```

#### 步驟 2：處理評論提交

```csharp
// Pages/Books/Detail.cshtml.cs
public async Task<IActionResult> OnPostCreateCommentAsync(Guid bookId, string content, int? rating)
{
    await _commentAppService.CreateAsync(new CreateCommentDto
    {
        EntityType = "Book",
        EntityId = bookId.ToString(),
        Content = content,
        Rating = rating
    });

    return RedirectToPage(new { id = bookId });
}
```

#### 步驟 3：在 Blazor 中使用（選擇性）

```razor
@page "/books/{id:guid}"
@using Volo.Comment.Comments
@inject IBookAppService BookAppService
@inject ICommentAppService CommentAppService

<h1>@book?.Name</h1>

<h3>評論</h3>
@if (comments == null)
{
    <p>載入中...</p>
}
else if (comments.TotalCount == 0)
{
    <p>目前沒有評論</p>
}
else
{
    @foreach (var comment in comments.Items)
    {
        <Card Margin="Margin.Is3.FromBottom">
            <CardBody>
                <CardText>@comment.Content</CardText>
                @if (comment.Rating.HasValue)
                {
                    <div>
                        @for (int i = 1; i <= 5; i++)
                        {
                            <Icon Name="@(i <= comment.Rating ? IconName.Star : IconName.StarOutline)"
                                  TextColor="@(i <= comment.Rating ? TextColor.Warning : TextColor.Muted)" />
                        }
                    </div>
                }
                <small class="text-muted">
                    @comment.CreatorUserName - @comment.CreationTime.ToString("yyyy-MM-dd HH:mm")
                </small>
            </CardBody>
        </Card>
    }
}

<h4>新增評論</h4>
<Validations @ref="validations">
    <Field>
        <FieldLabel>評分</FieldLabel>
        <Select TValue="int?" @bind-SelectedValue="newRating">
            <SelectItem Value="null">不評分</SelectItem>
            <SelectItem Value="5">5 星</SelectItem>
            <SelectItem Value="4">4 星</SelectItem>
            <SelectItem Value="3">3 星</SelectItem>
            <SelectItem Value="2">2 星</SelectItem>
            <SelectItem Value="1">1 星</SelectItem>
        </Select>
    </Field>

    <Field>
        <FieldLabel>評論內容</FieldLabel>
        <MemoEdit @bind-Text="newContent" Rows="4" />
    </Field>

    <Button Color="Color.Primary" Clicked="CreateCommentAsync">送出評論</Button>
</Validations>

@code {
    [Parameter]
    public Guid Id { get; set; }

    private BookDto book;
    private PagedResultDto<CommentDto> comments;
    private string newContent;
    private int? newRating;
    private Validations validations;

    protected override async Task OnInitializedAsync()
    {
        book = await BookAppService.GetAsync(Id);
        await LoadCommentsAsync();
    }

    private async Task LoadCommentsAsync()
    {
        comments = await CommentAppService.GetListAsync(new GetCommentsInput
        {
            EntityType = "Book",
            EntityId = Id.ToString(),
            MaxResultCount = 10
        });
    }

    private async Task CreateCommentAsync()
    {
        if (await validations.ValidateAll())
        {
            await CommentAppService.CreateAsync(new CreateCommentDto
            {
                EntityType = "Book",
                EntityId = Id.ToString(),
                Content = newContent,
                Rating = newRating
            });

            newContent = string.Empty;
            newRating = null;
            await LoadCommentsAsync();
        }
    }
}
```

---

## 總結

本章練習涵蓋了 ABP 模組化開發的完整流程：

1. **模組建立**：

   - 使用 ABP CLI 建立模組範本
   - 定義通用的實體和業務邏輯
   - 實作完整的 CRUD 功能

2. **模組整合**：

   - 在主應用程式中引用模組
   - 配置模組依賴關係
   - 整合資料庫 DbContext

3. **功能使用**：
   - 在 Razor Pages 和 Blazor 中使用模組功能
   - 實作跨模組的業務邏輯
   - 保持模組的獨立性和可重用性

**最佳實踐**：

- 模組應該是自包含的，最小化外部依賴
- 使用清晰的介面定義模組的公開契約
- 提供完整的文件和範例
- 考慮發布到 NuGet 供其他專案使用
- 遵循 ABP 的分層架構和命名慣例

---

## 參考資源

- [ABP 模組開發指南](https://docs.abp.io/en/abp/latest/Module-Development-Basics)
- [NuGet 官方文件](https://docs.microsoft.com/en-us/nuget/)
- [ABP 模組市場](https://abp.io/modules)
