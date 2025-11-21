# 第十三章：Blazor WebAssembly UI 開發 - 習題解答

本文件提供第十三章實戰練習的完整解答，涵蓋 Blazor CRUD 頁面開發、權限控制和自訂元件。

---

## 練習 1：建立 CRUD 頁面

### 題目

1. 建立 `Books.razor`。
2. 繼承 `AbpCrudPageBase`。
3. 使用 `DataGrid` 顯示書籍列表。
4. 實作 `CreateModal` 與 `EditModal` (使用 `Modal` 元件)。

### 解答

#### 步驟 1：建立 Books.razor

```razor
@page "/books"
@using BookStore.Books
@using BookStore.Localization
@using BookStore.Permissions
@using Microsoft.Extensions.Localization
@using Volo.Abp.Application.Dtos
@using Volo.Abp.AspNetCore.Components.Web
@inherits AbpCrudPageBase<IBookAppService, BookDto, Guid, PagedAndSortedResultRequestDto, CreateUpdateBookDto>
@inject IStringLocalizer<BookStoreResource> L
@inject AbpBlazorMessageLocalizerHelper<BookStoreResource> LH

<Card>
    <CardHeader>
        <Row Class="justify-content-between">
            <Column ColumnSize="ColumnSize.IsAuto">
                <h2>@L["Books"]</h2>
            </Column>
            <Column ColumnSize="ColumnSize.IsAuto">
                @if (HasCreatePermission)
                {
                    <Button Color="Color.Primary"
                            Clicked="OpenCreateModalAsync">
                        <Icon Name="IconName.Add" />
                        @L["NewBook"]
                    </Button>
                }
            </Column>
        </Row>
    </CardHeader>
    <CardBody>
        <DataGrid TItem="BookDto"
                  Data="Entities"
                  ReadData="OnDataGridReadAsync"
                  TotalItems="TotalCount"
                  ShowPager="true"
                  PageSize="PageSize"
                  CurrentPage="CurrentPage"
                  Responsive="true">
            <DataGridColumns>
                <DataGridColumn TItem="BookDto"
                                Field="@nameof(BookDto.Name)"
                                Caption="@L["Name"]">
                </DataGridColumn>
                <DataGridColumn TItem="BookDto"
                                Field="@nameof(BookDto.Type)"
                                Caption="@L["Type"]">
                    <DisplayTemplate>
                        @L[$"Enum:BookType.{context.Type}"]
                    </DisplayTemplate>
                </DataGridColumn>
                <DataGridColumn TItem="BookDto"
                                Field="@nameof(BookDto.PublishDate)"
                                Caption="@L["PublishDate"]">
                    <DisplayTemplate>
                        @context.PublishDate.ToShortDateString()
                    </DisplayTemplate>
                </DataGridColumn>
                <DataGridColumn TItem="BookDto"
                                Field="@nameof(BookDto.Price)"
                                Caption="@L["Price"]">
                    <DisplayTemplate>
                        @context.Price.ToString("C")
                    </DisplayTemplate>
                </DataGridColumn>
                <DataGridColumn TItem="BookDto"
                                Field="@nameof(BookDto.CreationTime)"
                                Caption="@L["CreationTime"]">
                    <DisplayTemplate>
                        @context.CreationTime.ToShortDateString()
                    </DisplayTemplate>
                </DataGridColumn>
                <DataGridEntityActionsColumn TItem="BookDto" @ref="@EntityActionsColumn">
                    <DisplayTemplate>
                        <EntityActions TItem="BookDto" EntityActionsColumn="@EntityActionsColumn">
                            <EntityAction TItem="BookDto"
                                          Text="@L["Edit"]"
                                          Visible="@HasUpdatePermission"
                                          Clicked="async () => await OpenEditModalAsync(context)" />
                            <EntityAction TItem="BookDto"
                                          Text="@L["Delete"]"
                                          Visible="@HasDeletePermission"
                                          Clicked="async () => await DeleteEntityAsync(context)"
                                          ConfirmationMessage="@(() => GetDeleteConfirmationMessage(context))" />
                        </EntityActions>
                    </DisplayTemplate>
                </DataGridEntityActionsColumn>
            </DataGridColumns>
        </DataGrid>
    </CardBody>
</Card>

<Modal @ref="@CreateModal">
    <ModalContent Centered="true">
        <Form>
            <ModalHeader>
                <ModalTitle>@L["NewBook"]</ModalTitle>
                <CloseButton Clicked="CloseCreateModalAsync" />
            </ModalHeader>
            <ModalBody>
                <Validations @ref="@CreateValidationsRef" Model="@NewEntity" ValidateOnLoad="false">
                    <Validation MessageLocalizer="@LH.Localize">
                        <Field>
                            <FieldLabel>@L["Name"]</FieldLabel>
                            <TextEdit @bind-Text="@NewEntity.Name">
                                <Feedback>
                                    <ValidationError />
                                </Feedback>
                            </TextEdit>
                        </Field>
                    </Validation>
                    <Validation MessageLocalizer="@LH.Localize">
                        <Field>
                            <FieldLabel>@L["Type"]</FieldLabel>
                            <Select TValue="BookType" @bind-SelectedValue="@NewEntity.Type">
                                @foreach (var bookTypeValue in Enum.GetValues(typeof(BookType)))
                                {
                                    <SelectItem TValue="BookType" Value="@((BookType)bookTypeValue)">
                                        @L[$"Enum:BookType.{bookTypeValue}"]
                                    </SelectItem>
                                }
                            </Select>
                        </Field>
                    </Validation>
                    <Validation MessageLocalizer="@LH.Localize">
                        <Field>
                            <FieldLabel>@L["PublishDate"]</FieldLabel>
                            <DateEdit TValue="DateTime" @bind-Date="@NewEntity.PublishDate">
                                <Feedback>
                                    <ValidationError />
                                </Feedback>
                            </DateEdit>
                        </Field>
                    </Validation>
                    <Validation MessageLocalizer="@LH.Localize">
                        <Field>
                            <FieldLabel>@L["Price"]</FieldLabel>
                            <NumericEdit TValue="float" @bind-Value="@NewEntity.Price">
                                <Feedback>
                                    <ValidationError />
                                </Feedback>
                            </NumericEdit>
                        </Field>
                    </Validation>
                </Validations>
            </ModalBody>
            <ModalFooter>
                <Button Color="Color.Secondary" Clicked="CloseCreateModalAsync">
                    @L["Cancel"]
                </Button>
                <Button Color="Color.Primary" Type="@ButtonType.Submit" PreventDefaultOnSubmit="true" Clicked="CreateEntityAsync">
                    @L["Save"]
                </Button>
            </ModalFooter>
        </Form>
    </ModalContent>
</Modal>

<Modal @ref="@EditModal">
    <ModalContent Centered="true">
        <Form>
            <ModalHeader>
                <ModalTitle>@L["Edit"]</ModalTitle>
                <CloseButton Clicked="CloseEditModalAsync" />
            </ModalHeader>
            <ModalBody>
                <Validations @ref="@EditValidationsRef" Model="@EditingEntity" ValidateOnLoad="false">
                    <Validation MessageLocalizer="@LH.Localize">
                        <Field>
                            <FieldLabel>@L["Name"]</FieldLabel>
                            <TextEdit @bind-Text="@EditingEntity.Name">
                                <Feedback>
                                    <ValidationError />
                                </Feedback>
                            </TextEdit>
                        </Field>
                    </Validation>
                    <Validation MessageLocalizer="@LH.Localize">
                        <Field>
                            <FieldLabel>@L["Type"]</FieldLabel>
                            <Select TValue="BookType" @bind-SelectedValue="@EditingEntity.Type">
                                @foreach (var bookTypeValue in Enum.GetValues(typeof(BookType)))
                                {
                                    <SelectItem TValue="BookType" Value="@((BookType)bookTypeValue)">
                                        @L[$"Enum:BookType.{bookTypeValue}"]
                                    </SelectItem>
                                }
                            </Select>
                        </Field>
                    </Validation>
                    <Validation MessageLocalizer="@LH.Localize">
                        <Field>
                            <FieldLabel>@L["PublishDate"]</FieldLabel>
                            <DateEdit TValue="DateTime" @bind-Date="@EditingEntity.PublishDate">
                                <Feedback>
                                    <ValidationError />
                                </Feedback>
                            </DateEdit>
                        </Field>
                    </Validation>
                    <Validation MessageLocalizer="@LH.Localize">
                        <Field>
                            <FieldLabel>@L["Price"]</FieldLabel>
                            <NumericEdit TValue="float" @bind-Value="@EditingEntity.Price">
                                <Feedback>
                                    <ValidationError />
                                </Feedback>
                            </NumericEdit>
                        </Field>
                    </Validation>
                </Validations>
            </ModalBody>
            <ModalFooter>
                <Button Color="Color.Secondary" Clicked="CloseEditModalAsync">
                    @L["Cancel"]
                </Button>
                <Button Color="Color.Primary" Type="@ButtonType.Submit" PreventDefaultOnSubmit="true" Clicked="UpdateEntityAsync">
                    @L["Save"]
                </Button>
            </ModalFooter>
        </Form>
    </ModalContent>
</Modal>

@code {
    public Books()
    {
        CreatePolicyName = BookStorePermissions.Books.Create;
        UpdatePolicyName = BookStorePermissions.Books.Edit;
        DeletePolicyName = BookStorePermissions.Books.Delete;
    }
}
```

#### 步驟 2：理解 AbpCrudPageBase

`AbpCrudPageBase` 提供了以下功能：

- **自動 CRUD 操作**：`CreateEntityAsync`、`UpdateEntityAsync`、`DeleteEntityAsync`
- **Modal 管理**：`OpenCreateModalAsync`、`OpenEditModalAsync`、`CloseCreateModalAsync`、`CloseEditModalAsync`
- **資料載入**：`OnDataGridReadAsync` 自動處理分頁、排序
- **權限檢查**：`HasCreatePermission`、`HasUpdatePermission`、`HasDeletePermission`
- **實體狀態**：`NewEntity`（建立中）、`EditingEntity`（編輯中）、`Entities`（列表）

#### 步驟 3：簡化版本（使用預設 Modal）

如果不需要自訂 Modal 樣式，可以使用更簡潔的寫法：

```razor
@page "/books"
@using BookStore.Books
@inherits AbpCrudPageBase<IBookAppService, BookDto, Guid, PagedAndSortedResultRequestDto, CreateUpdateBookDto>

<AbpCrudPageLayout>
    <AbpCrudPageToolbar>
        <AbpButton Color="Color.Primary" Clicked="OpenCreateModalAsync">
            @L["NewBook"]
        </AbpButton>
    </AbpCrudPageToolbar>

    <AbpCrudPageDataGrid>
        <DataGridColumn Field="@nameof(BookDto.Name)" Caption="@L["Name"]" />
        <DataGridColumn Field="@nameof(BookDto.Type)" Caption="@L["Type"]" />
        <DataGridColumn Field="@nameof(BookDto.Price)" Caption="@L["Price"]" />
    </AbpCrudPageDataGrid>
</AbpCrudPageLayout>
```

---

## 練習 2：實作權限控制

### 題目

1. 在 `Books.razor` 上方加入 `@attribute [Authorize("BookStore.Books")]`。
2. 在 "新增按鈕" 外圍包裹 `<AuthorizeView Policy="BookStore.Books.Create">`。
3. 使用不同權限的使用者登入測試。

### 解答

#### 步驟 1：定義權限

首先在 `Application.Contracts` 專案中定義權限：

```csharp
// Permissions/BookStorePermissions.cs
namespace BookStore.Permissions
{
    public static class BookStorePermissions
    {
        public const string GroupName = "BookStore";

        public static class Books
        {
            public const string Default = GroupName + ".Books";
            public const string Create = Default + ".Create";
            public const string Edit = Default + ".Edit";
            public const string Delete = Default + ".Delete";
        }
    }
}
```

```csharp
// Permissions/BookStorePermissionDefinitionProvider.cs
using BookStore.Localization;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.Localization;

namespace BookStore.Permissions
{
    public class BookStorePermissionDefinitionProvider : PermissionDefinitionProvider
    {
        public override void Define(IPermissionDefinitionContext context)
        {
            var bookStoreGroup = context.AddGroup(BookStorePermissions.GroupName, L("Permission:BookStore"));

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
        }

        private static LocalizableString L(string name)
        {
            return LocalizableString.Create<BookStoreResource>(name);
        }
    }
}
```

#### 步驟 2：在 Books.razor 中加入頁面級權限

```razor
@page "/books"
@attribute [Authorize(BookStorePermissions.Books.Default)]
@using BookStore.Books
@using BookStore.Permissions
@using Microsoft.AspNetCore.Authorization
@inherits AbpCrudPageBase<IBookAppService, BookDto, Guid, PagedAndSortedResultRequestDto, CreateUpdateBookDto>

<!-- 頁面內容 -->
```

#### 步驟 3：使用 AuthorizeView 控制 UI 元素

```razor
<CardHeader>
    <Row Class="justify-content-between">
        <Column ColumnSize="ColumnSize.IsAuto">
            <h2>@L["Books"]</h2>
        </Column>
        <Column ColumnSize="ColumnSize.IsAuto">
            <AuthorizeView Policy="@BookStorePermissions.Books.Create">
                <Authorized>
                    <Button Color="Color.Primary" Clicked="OpenCreateModalAsync">
                        <Icon Name="IconName.Add" />
                        @L["NewBook"]
                    </Button>
                </Authorized>
                <NotAuthorized>
                    <span class="text-muted">@L["NoPermissionToCreate"]</span>
                </NotAuthorized>
            </AuthorizeView>
        </Column>
    </Row>
</CardHeader>
```

#### 步驟 4：在 DataGrid 中控制操作按鈕

```razor
<DataGridEntityActionsColumn TItem="BookDto" @ref="@EntityActionsColumn">
    <DisplayTemplate>
        <EntityActions TItem="BookDto" EntityActionsColumn="@EntityActionsColumn">
            <AuthorizeView Policy="@BookStorePermissions.Books.Edit">
                <Authorized>
                    <EntityAction TItem="BookDto"
                                  Text="@L["Edit"]"
                                  Clicked="async () => await OpenEditModalAsync(context)" />
                </Authorized>
            </AuthorizeView>

            <AuthorizeView Policy="@BookStorePermissions.Books.Delete">
                <Authorized>
                    <EntityAction TItem="BookDto"
                                  Text="@L["Delete"]"
                                  Clicked="async () => await DeleteEntityAsync(context)"
                                  ConfirmationMessage="@(() => GetDeleteConfirmationMessage(context))" />
                </Authorized>
            </AuthorizeView>
        </EntityActions>
    </DisplayTemplate>
</DataGridEntityActionsColumn>
```

#### 步驟 5：使用程式碼檢查權限

```razor
@code {
    private bool CanCreate { get; set; }
    private bool CanEdit { get; set; }
    private bool CanDelete { get; set; }

    protected override async Task OnInitializedAsync()
    {
        await base.OnInitializedAsync();

        // 檢查權限
        CanCreate = await AuthorizationService.IsGrantedAsync(BookStorePermissions.Books.Create);
        CanEdit = await AuthorizationService.IsGrantedAsync(BookStorePermissions.Books.Edit);
        CanDelete = await AuthorizationService.IsGrantedAsync(BookStorePermissions.Books.Delete);
    }
}
```

```razor
@if (CanCreate)
{
    <Button Color="Color.Primary" Clicked="OpenCreateModalAsync">
        @L["NewBook"]
    </Button>
}
```

#### 步驟 6：在 Application Service 中強制權限檢查

```csharp
// Application/Books/BookAppService.cs
using Microsoft.AspNetCore.Authorization;
using BookStore.Permissions;

public class BookAppService : CrudAppService<...>, IBookAppService
{
    public BookAppService(IRepository<Book, Guid> repository) : base(repository)
    {
        GetPolicyName = BookStorePermissions.Books.Default;
        GetListPolicyName = BookStorePermissions.Books.Default;
        CreatePolicyName = BookStorePermissions.Books.Create;
        UpdatePolicyName = BookStorePermissions.Books.Edit;
        DeletePolicyName = BookStorePermissions.Books.Delete;
    }
}
```

#### 步驟 7：測試不同權限的使用者

1. **建立測試角色**：

   - 管理員：擁有所有權限
   - 編輯者：只有 `Books.Edit` 權限
   - 檢視者：只有 `Books.Default` 權限

2. **測試場景**：
   - 以管理員登入：應該看到所有按鈕（新增、編輯、刪除）
   - 以編輯者登入：只看到編輯按鈕
   - 以檢視者登入：只能查看列表，無任何操作按鈕

---

## 練習 3：自訂元件

### 題目

1. 建立一個 `BookCard.razor` 元件，用於以卡片形式顯示書籍資訊。
2. 定義 `[Parameter] public BookDto Book { get; set; }`。
3. 在 `Books.razor` 中使用此元件。

### 解答

#### 步驟 1：建立 BookCard.razor 元件

```razor
@* Components/BookCard.razor *@
@using BookStore.Books
@using BookStore.Localization
@using Microsoft.Extensions.Localization
@inject IStringLocalizer<BookStoreResource> L

<Card Margin="Margin.Is3.FromBottom">
    <CardImage Source="@GetBookCoverUrl()" Alt="@Book.Name" />
    <CardBody>
        <CardTitle Size="5">@Book.Name</CardTitle>
        <CardText>
            <Badge Color="Color.Info">@L[$"Enum:BookType.{Book.Type}"]</Badge>
            <br />
            <small class="text-muted">
                @L["PublishDate"]: @Book.PublishDate.ToShortDateString()
            </small>
        </CardText>
        <CardText>
            <strong class="text-success">@Book.Price.ToString("C")</strong>
        </CardText>
    </CardBody>
    <CardFooter>
        <Row>
            <Column>
                @if (ShowEditButton)
                {
                    <Button Color="Color.Primary" Size="Size.Small" Clicked="OnEditClicked">
                        <Icon Name="IconName.Edit" />
                        @L["Edit"]
                    </Button>
                }
            </Column>
            <Column Class="text-end">
                @if (ShowDeleteButton)
                {
                    <Button Color="Color.Danger" Size="Size.Small" Clicked="OnDeleteClicked">
                        <Icon Name="IconName.Delete" />
                        @L["Delete"]
                    </Button>
                }
            </Column>
        </Row>
    </CardFooter>
</Card>

@code {
    [Parameter]
    public BookDto Book { get; set; }

    [Parameter]
    public bool ShowEditButton { get; set; } = true;

    [Parameter]
    public bool ShowDeleteButton { get; set; } = true;

    [Parameter]
    public EventCallback<BookDto> OnEdit { get; set; }

    [Parameter]
    public EventCallback<BookDto> OnDelete { get; set; }

    private string GetBookCoverUrl()
    {
        // 可以根據書籍類型或其他屬性返回不同的封面圖片
        return $"/images/book-covers/{Book.Type.ToString().ToLower()}.jpg";
    }

    private async Task OnEditClicked()
    {
        await OnEdit.InvokeAsync(Book);
    }

    private async Task OnDeleteClicked()
    {
        await OnDelete.InvokeAsync(Book);
    }
}
```

#### 步驟 2：在 Books.razor 中使用 BookCard

```razor
@page "/books"
@using BookStore.Books
@using BookStore.Components
@inherits AbpCrudPageBase<IBookAppService, BookDto, Guid, PagedAndSortedResultRequestDto, CreateUpdateBookDto>

<Card>
    <CardHeader>
        <Row Class="justify-content-between">
            <Column ColumnSize="ColumnSize.IsAuto">
                <h2>@L["Books"]</h2>
            </Column>
            <Column ColumnSize="ColumnSize.IsAuto">
                <Button Color="Color.Primary" Clicked="OpenCreateModalAsync">
                    <Icon Name="IconName.Add" />
                    @L["NewBook"]
                </Button>
                <Button Color="Color.Secondary" Clicked="ToggleViewMode">
                    <Icon Name="@(IsCardView ? IconName.List : IconName.Grid)" />
                    @(IsCardView ? L["ListView"] : L["CardView"])
                </Button>
            </Column>
        </Row>
    </CardHeader>
    <CardBody>
        @if (IsCardView)
        {
            <Row>
                @foreach (var book in Entities)
                {
                    <Column ColumnSize="ColumnSize.Is12.OnMobile.Is6.OnTablet.Is4.OnDesktop">
                        <BookCard Book="@book"
                                  ShowEditButton="@HasUpdatePermission"
                                  ShowDeleteButton="@HasDeletePermission"
                                  OnEdit="OpenEditModalAsync"
                                  OnDelete="DeleteEntityAsync" />
                    </Column>
                }
            </Row>

            @if (TotalCount > PageSize)
            {
                <Pagination>
                    @for (int i = 1; i <= Math.Ceiling((double)TotalCount / PageSize); i++)
                    {
                        var page = i;
                        <PaginationItem Active="@(CurrentPage == page)">
                            <PaginationLink Clicked="@(() => GoToPage(page))">
                                @page
                            </PaginationLink>
                        </PaginationItem>
                    }
                </Pagination>
            }
        }
        else
        {
            <DataGrid TItem="BookDto"
                      Data="Entities"
                      ReadData="OnDataGridReadAsync"
                      TotalItems="TotalCount"
                      ShowPager="true"
                      PageSize="PageSize">
                <!-- DataGrid 列定義 -->
            </DataGrid>
        }
    </CardBody>
</Card>

@code {
    private bool IsCardView { get; set; } = false;

    private void ToggleViewMode()
    {
        IsCardView = !IsCardView;
    }

    private async Task GoToPage(int page)
    {
        CurrentPage = page;
        await GetEntitiesAsync();
    }
}
```

#### 步驟 3：進階元件功能

**加入載入狀態**：

```razor
@* Components/BookCard.razor *@
<Card Margin="Margin.Is3.FromBottom">
    @if (IsLoading)
    {
        <CardBody>
            <div class="text-center">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        </CardBody>
    }
    else
    {
        <!-- 原有的卡片內容 -->
    }
</Card>

@code {
    [Parameter]
    public bool IsLoading { get; set; } = false;
}
```

**加入書籍評分顯示**：

```razor
<CardText>
    <div class="book-rating">
        @for (int i = 1; i <= 5; i++)
        {
            <Icon Name="@(i <= Book.Rating ? IconName.Star : IconName.StarOutline)"
                  IconStyle="IconStyle.Solid"
                  TextColor="TextColor.Warning" />
        }
        <small class="text-muted">(@Book.ReviewCount reviews)</small>
    </div>
</CardText>
```

**加入書籍詳情 Modal**：

```razor
@* Components/BookCard.razor *@
<Card Margin="Margin.Is3.FromBottom" Clicked="ShowDetails">
    <!-- 卡片內容 -->
</Card>

<Modal @ref="DetailsModal">
    <ModalContent Size="ModalSize.Large">
        <ModalHeader>
            <ModalTitle>@Book.Name</ModalTitle>
            <CloseButton />
        </ModalHeader>
        <ModalBody>
            <Row>
                <Column ColumnSize="ColumnSize.Is4">
                    <img src="@GetBookCoverUrl()" class="img-fluid" alt="@Book.Name" />
                </Column>
                <Column ColumnSize="ColumnSize.Is8">
                    <h4>@Book.Name</h4>
                    <p><strong>@L["Type"]:</strong> @L[$"Enum:BookType.{Book.Type}"]</p>
                    <p><strong>@L["PublishDate"]:</strong> @Book.PublishDate.ToLongDateString()</p>
                    <p><strong>@L["Price"]:</strong> @Book.Price.ToString("C")</p>
                    <p><strong>@L["Description"]:</strong></p>
                    <p>@Book.Description</p>
                </Column>
            </Row>
        </ModalBody>
        <ModalFooter>
            <Button Color="Color.Secondary" Clicked="HideDetails">@L["Close"]</Button>
        </ModalFooter>
    </ModalContent>
</Modal>

@code {
    private Modal DetailsModal;

    private Task ShowDetails()
    {
        return DetailsModal.Show();
    }

    private Task HideDetails()
    {
        return DetailsModal.Hide();
    }
}
```

---

## 總結

本章練習涵蓋了 Blazor WebAssembly 開發的核心技術：

1. **CRUD 頁面開發**：

   - 使用 `AbpCrudPageBase` 快速建立 CRUD 功能
   - 整合 Blazorise DataGrid 顯示資料
   - 使用 Modal 實作建立和編輯功能

2. **權限控制**：

   - 使用 `[Authorize]` 屬性保護頁面
   - 使用 `<AuthorizeView>` 控制 UI 元素顯示
   - 在 Application Service 中強制權限檢查

3. **自訂元件**：
   - 建立可重用的 Blazor 元件
   - 使用 `[Parameter]` 傳遞資料
   - 使用 `EventCallback` 處理事件
   - 實作響應式設計（卡片視圖 vs 列表視圖）

**最佳實踐**：

- 善用 ABP 提供的基類和元件
- 遵循 Blazor 的元件化開發模式
- 實作適當的權限檢查（前端 + 後端）
- 使用 Blazorise 元件保持 UI 一致性
- 考慮效能優化（虛擬化、延遲載入）

---

## 參考資源

- [ABP Blazor 文件](https://docs.abp.io/en/abp/latest/UI/Blazor/Index)
- [Blazorise 官方文件](https://blazorise.com/docs/)
- [Blazor 官方文件](https://docs.microsoft.com/en-us/aspnet/core/blazor/)
- [ABP Authorization 文件](https://docs.abp.io/en/abp/latest/Authorization)
