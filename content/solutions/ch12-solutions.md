# 第十二章：MVC/Razor Pages 前端開發 - 習題解答

本文件提供第十二章實戰練習的完整解答，涵蓋 ABP Tag Helpers、JavaScript API 代理和分頁實作。

---

## 練習 1：使用 Tag Helpers 建立表單

### 題目

1. 建立一個 `CreateModal.cshtml`。
2. 使用 `abp-input` 為 `CreateBookDto` 的每個屬性建立輸入框。
3. 使用 `abp-modal` 包裝整個表單。

### 解答

#### 步驟 1：建立 CreateModal.cshtml

在 `Pages/Books/` 目錄下建立 `CreateModal.cshtml` 檔案：

```html
@page
@using BookStore.Books
@using BookStore.Localization
@using Microsoft.Extensions.Localization
@using Volo.Abp.AspNetCore.Mvc.UI.Bootstrap.TagHelpers.Modal
@model BookStore.Web.Pages.Books.CreateModalModel
@inject IStringLocalizer<BookStoreResource> L

@{
    Layout = null;
}

<abp-dynamic-form abp-model="Book" asp-page="/Books/CreateModal">
    <abp-modal>
        <abp-modal-header title="@L["NewBook"].Value"></abp-modal-header>
        <abp-modal-body>
            <abp-input asp-for="Book.Name" />
            <abp-input asp-for="Book.Type" />
            <abp-input asp-for="Book.PublishDate" />
            <abp-input asp-for="Book.Price" />
        </abp-modal-body>
        <abp-modal-footer buttons="@(AbpModalButtons.Cancel|AbpModalButtons.Save)"></abp-modal-footer>
    </abp-modal>
</abp-dynamic-form>
```

#### 步驟 2：建立 CreateModal.cshtml.cs (PageModel)

```csharp
// Pages/Books/CreateModal.cshtml.cs
using System.Threading.Tasks;
using BookStore.Books;
using Microsoft.AspNetCore.Mvc;

namespace BookStore.Web.Pages.Books
{
    public class CreateModalModel : BookStorePageModel
    {
        [BindProperty]
        public CreateUpdateBookDto Book { get; set; }

        private readonly IBookAppService _bookAppService;

        public CreateModalModel(IBookAppService bookAppService)
        {
            _bookAppService = bookAppService;
        }

        public void OnGet()
        {
            Book = new CreateUpdateBookDto();
        }

        public async Task<IActionResult> OnPostAsync()
        {
            await _bookAppService.CreateAsync(Book);
            return NoContent();
        }
    }
}
```

#### 步驟 3：詳細的 Tag Helpers 說明

**使用 `abp-input` 的優勢**：

- 自動生成 Label（從本地化資源）
- 自動綁定驗證訊息
- 自動應用 Bootstrap 樣式
- 支援多種輸入類型（Text、Number、Date、Select 等）

**進階範例：自訂每個欄位**

```html
<abp-modal>
    <abp-modal-header title="@L["NewBook"].Value"></abp-modal-header>
    <abp-modal-body>
        <!-- 書名 -->
        <abp-input asp-for="Book.Name"
                   label="@L["BookName"].Value"
                   info="@L["BookNameInfo"].Value" />

        <!-- 書籍類型（下拉選單） -->
        <abp-select asp-for="Book.Type"
                    asp-items="@Model.BookTypes"
                    label="@L["BookType"].Value" />

        <!-- 出版日期 -->
        <abp-input asp-for="Book.PublishDate"
                   type="date"
                   label="@L["PublishDate"].Value" />

        <!-- 價格 -->
        <abp-input asp-for="Book.Price"
                   type="number"
                   label="@L["Price"].Value"
                   step="0.01" />
    </abp-modal-body>
    <abp-modal-footer buttons="@(AbpModalButtons.Cancel|AbpModalButtons.Save)"></abp-modal-footer>
</abp-modal>
```

#### 步驟 4：使用 `abp-dynamic-form`（自動生成）

如果不想手動定義每個欄位，可以使用 `abp-dynamic-form`：

```html
@page
@model BookStore.Web.Pages.Books.CreateModalModel

<abp-dynamic-form abp-model="Book" asp-page="/Books/CreateModal">
    <abp-modal>
        <abp-modal-header title="@L["NewBook"].Value"></abp-modal-header>
        <abp-modal-body>
            <!-- 自動根據 CreateUpdateBookDto 的屬性生成表單 -->
        </abp-modal-body>
        <abp-modal-footer buttons="@(AbpModalButtons.Cancel|AbpModalButtons.Save)"></abp-modal-footer>
    </abp-modal>
</abp-dynamic-form>
```

**理論依據**：

- ABP Tag Helpers 基於 ASP.NET Core Tag Helpers
- 使用宣告式語法，減少 HTML 冗餘
- 自動整合本地化、驗證和主題系統

---

## 練習 2：JavaScript API 呼叫

### 題目

1. 在 `Index.js` 中，使用 `volo.bookStore.books.book.create` 來送出表單。
2. 成功後，使用 `abp.notify.success` 顯示成功訊息，並重新載入表格。

### 解答

#### 步驟 1：建立 Index.cshtml

```html
@page @using BookStore.Localization @using BookStore.Web.Pages.Books @using
Microsoft.Extensions.Localization @model IndexModel @inject
IStringLocalizer<BookStoreResource>
  L @section scripts {
  <abp-script src="/Pages/Books/Index.js" />
  }

  <abp-card>
    <abp-card-header>
      <abp-row>
        <abp-column size-md="_6">
          <abp-card-title>@L["Books"]</abp-card-title>
        </abp-column>
        <abp-column size-md="_6" class="text-end">
          <abp-button id="NewBookButton" text="@L["NewBook"].Value" icon="plus"
          button-type="Primary" />
        </abp-column>
      </abp-row>
    </abp-card-header>
    <abp-card-body>
      <abp-table striped-rows="true" id="BooksTable"></abp-table>
    </abp-card-body> </abp-card
></BookStoreResource>
```

#### 步驟 2：建立 Index.js（完整實作）

```javascript
// Pages/Books/Index.js
(function () {
  var l = abp.localization.getResource("BookStore");
  var bookService = volo.bookStore.books.book;
  var createModal = new abp.ModalManager(abp.appPath + "Books/CreateModal");
  var editModal = new abp.ModalManager(abp.appPath + "Books/EditModal");

  var dataTable = $("#BooksTable").DataTable(
    abp.libs.datatables.normalizeConfiguration({
      serverSide: true,
      paging: true,
      order: [[1, "asc"]],
      searching: false,
      scrollX: true,
      ajax: abp.libs.datatables.createAjax(bookService.getList),
      columnDefs: [
        {
          title: l("Name"),
          data: "name",
        },
        {
          title: l("Type"),
          data: "type",
          render: function (data) {
            return l("Enum:BookType." + data);
          },
        },
        {
          title: l("PublishDate"),
          data: "publishDate",
          render: function (data) {
            return luxon.DateTime.fromISO(data, {
              locale: abp.localization.currentCulture.name,
            }).toLocaleString();
          },
        },
        {
          title: l("Price"),
          data: "price",
        },
        {
          title: l("CreationTime"),
          data: "creationTime",
          render: function (data) {
            return luxon.DateTime.fromISO(data, {
              locale: abp.localization.currentCulture.name,
            }).toLocaleString(luxon.DateTime.DATETIME_SHORT);
          },
        },
        {
          title: l("Actions"),
          rowAction: {
            items: [
              {
                text: l("Edit"),
                visible: abp.auth.isGranted("BookStore.Books.Edit"),
                action: function (data) {
                  editModal.open({ id: data.record.id });
                },
              },
              {
                text: l("Delete"),
                visible: abp.auth.isGranted("BookStore.Books.Delete"),
                confirmMessage: function (data) {
                  return l("BookDeletionConfirmationMessage", data.record.name);
                },
                action: function (data) {
                  bookService.delete(data.record.id).then(function () {
                    abp.notify.success(l("SuccessfullyDeleted"));
                    dataTable.ajax.reload();
                  });
                },
              },
            ],
          },
        },
      ],
    })
  );

  // 新增按鈕事件
  $("#NewBookButton").click(function (e) {
    e.preventDefault();
    createModal.open();
  });

  // 建立成功後重新載入表格
  createModal.onResult(function () {
    abp.notify.success(l("SuccessfullyCreated"));
    dataTable.ajax.reload();
  });

  // 編輯成功後重新載入表格
  editModal.onResult(function () {
    abp.notify.success(l("SuccessfullyUpdated"));
    dataTable.ajax.reload();
  });
})();
```

#### 步驟 3：手動呼叫 API（不使用 Modal）

如果想要手動處理表單提交：

```javascript
// 手動呼叫 create API
$("#CreateBookForm").submit(function (e) {
  e.preventDefault();

  var formData = {
    name: $("#Book_Name").val(),
    type: parseInt($("#Book_Type").val()),
    publishDate: $("#Book_PublishDate").val(),
    price: parseFloat($("#Book_Price").val()),
  };

  // 呼叫 JavaScript Proxy
  volo.bookStore.books.book
    .create(formData)
    .then(function (result) {
      // 成功
      abp.notify.success("書籍建立成功！");

      // 重新載入表格
      $("#BooksTable").DataTable().ajax.reload();

      // 關閉 Modal
      $("#CreateBookModal").modal("hide");
    })
    .catch(function (error) {
      // 錯誤處理（ABP 會自動顯示錯誤訊息）
      console.error("建立失敗:", error);
    });
});
```

#### 步驟 4：JavaScript API Proxy 的進階用法

**取得列表（分頁）**：

```javascript
volo.bookStore.books.book
  .getList({
    skipCount: 0,
    maxResultCount: 10,
    sorting: "name asc",
  })
  .then(function (result) {
    console.log("總筆數:", result.totalCount);
    console.log("書籍列表:", result.items);
  });
```

**更新書籍**：

```javascript
volo.bookStore.books.book
  .update(bookId, {
    name: "更新後的書名",
    type: 1,
    publishDate: "2024-01-01",
    price: 99.99,
  })
  .then(function (result) {
    abp.notify.success("更新成功！");
  });
```

**刪除書籍**：

```javascript
volo.bookStore.books.book.delete(bookId).then(function () {
  abp.notify.success("刪除成功！");
  dataTable.ajax.reload();
});
```

**理論依據**：

- ABP 自動為所有 Application Service 生成 JavaScript Proxy
- Proxy 命名空間對應 C# 的命名空間（小寫、駝峰式）
- 自動處理序列化、錯誤處理和 CSRF 保護
- 回傳 Promise，支援 async/await

---

## 練習 3：實作分頁

### 題目

1. 在 `IndexModel` 中處理分頁參數。
2. 在 `Index.cshtml` 中使用 `abp-paginator` 顯示分頁控制項。

### 解答

#### 步驟 1：建立 IndexModel（支援分頁）

```csharp
// Pages/Books/Index.cshtml.cs
using System.Threading.Tasks;
using BookStore.Books;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Volo.Abp.Application.Dtos;

namespace BookStore.Web.Pages.Books
{
    public class IndexModel : BookStorePageModel
    {
        public PagedResultDto<BookDto> BookResult { get; set; }

        [BindProperty(SupportsGet = true)]
        public int CurrentPage { get; set; } = 1;

        [BindProperty(SupportsGet = true)]
        public int PageSize { get; set; } = 10;

        private readonly IBookAppService _bookAppService;

        public IndexModel(IBookAppService bookAppService)
        {
            _bookAppService = bookAppService;
        }

        public async Task OnGetAsync()
        {
            BookResult = await _bookAppService.GetListAsync(
                new PagedAndSortedResultRequestDto
                {
                    SkipCount = (CurrentPage - 1) * PageSize,
                    MaxResultCount = PageSize,
                    Sorting = "Name"
                }
            );
        }
    }
}
```

#### 步驟 2：在 Index.cshtml 中顯示分頁

```html
@page @model BookStore.Web.Pages.Books.IndexModel @inject
IStringLocalizer<BookStoreResource>
  L

  <abp-card>
    <abp-card-header>
      <abp-card-title>@L["Books"]</abp-card-title>
    </abp-card-header>
    <abp-card-body>
      <abp-table striped-rows="true">
        <thead>
          <tr>
            <th>@L["Name"]</th>
            <th>@L["Type"]</th>
            <th>@L["PublishDate"]</th>
            <th>@L["Price"]</th>
          </tr>
        </thead>
        <tbody>
          @foreach (var book in Model.BookResult.Items) {
          <tr>
            <td>@book.Name</td>
            <td>@L[$"Enum:BookType.{book.Type}"]</td>
            <td>@book.PublishDate.ToShortDateString()</td>
            <td>@book.Price.ToString("C")</td>
          </tr>
          }
        </tbody>
      </abp-table>

      <!-- 分頁控制項 -->
      <abp-paginator
        model="@Model.BookResult"
        show-info="true"
        page-size="@Model.PageSize"
        current-page="@Model.CurrentPage"
      />
    </abp-card-body> </abp-card
></BookStoreResource>
```

#### 步驟 3：使用 PagerModel（進階）

ABP 提供了 `PagerModel` 來簡化分頁處理：

```csharp
// Pages/Books/Index.cshtml.cs
using Volo.Abp.AspNetCore.Mvc.UI.Bootstrap.TagHelpers.Pagination;

public class IndexModel : BookStorePageModel
{
    public PagedResultDto<BookDto> BookResult { get; set; }
    public PagerModel PagerModel { get; set; }

    [BindProperty(SupportsGet = true)]
    public int CurrentPage { get; set; } = 1;

    private const int PageSize = 10;
    private readonly IBookAppService _bookAppService;

    public IndexModel(IBookAppService bookAppService)
    {
        _bookAppService = bookAppService;
    }

    public async Task OnGetAsync()
    {
        BookResult = await _bookAppService.GetListAsync(
            new PagedAndSortedResultRequestDto
            {
                SkipCount = (CurrentPage - 1) * PageSize,
                MaxResultCount = PageSize
            }
        );

        // 建立 PagerModel
        PagerModel = new PagerModel(
            BookResult.TotalCount,
            PageSize,
            CurrentPage,
            10, // 顯示的頁碼數量
            Request.Path
        );
    }
}
```

```html
<!-- 使用 PagerModel -->
<abp-paginator model="@Model.PagerModel" show-info="true" />
```

#### 步驟 4：自訂分頁樣式

```html
<!-- 自訂分頁大小選擇器 -->
<div class="row mb-3">
  <div class="col-md-6">
    <label>每頁顯示：</label>
    <select
      id="PageSizeSelector"
      class="form-select"
      style="width: auto; display: inline-block;"
    >
      <option value="10" selected>10</option>
      <option value="25">25</option>
      <option value="50">50</option>
      <option value="100">100</option>
    </select>
  </div>
</div>

<script>
  $("#PageSizeSelector").change(function () {
    var pageSize = $(this).val();
    window.location.href = "?pageSize=" + pageSize + "&currentPage=1";
  });
</script>
```

#### 步驟 5：AJAX 分頁（不重新載入頁面）

```javascript
// Pages/Books/Index.js
function loadBooks(page, pageSize) {
  volo.bookStore.books.book
    .getList({
      skipCount: (page - 1) * pageSize,
      maxResultCount: pageSize,
    })
    .then(function (result) {
      // 更新表格內容
      var tbody = $("#BooksTable tbody");
      tbody.empty();

      result.items.forEach(function (book) {
        var row = $("<tr>")
          .append($("<td>").text(book.name))
          .append($("<td>").text(book.type))
          .append($("<td>").text(book.publishDate))
          .append($("<td>").text(book.price));
        tbody.append(row);
      });

      // 更新分頁控制項
      updatePagination(result.totalCount, page, pageSize);
    });
}

function updatePagination(totalCount, currentPage, pageSize) {
  var totalPages = Math.ceil(totalCount / pageSize);
  var pagination = $("#Pagination");
  pagination.empty();

  for (var i = 1; i <= totalPages; i++) {
    var pageItem = $('<li class="page-item">')
      .addClass(i === currentPage ? "active" : "")
      .append(
        $('<a class="page-link" href="#">')
          .text(i)
          .click(function (e) {
            e.preventDefault();
            var page = parseInt($(this).text());
            loadBooks(page, pageSize);
          })
      );
    pagination.append(pageItem);
  }
}

// 初始載入
$(document).ready(function () {
  loadBooks(1, 10);
});
```

**理論依據**：

- `abp-paginator` 自動生成 Bootstrap 分頁控制項
- 支援查詢字串參數（`?page=2`）
- 整合 ABP 的本地化系統
- 可自訂樣式和行為

---

## 總結

本章練習涵蓋了 ABP Framework MVC/Razor Pages 開發的核心技術：

1. **Tag Helpers**：

   - 使用 `abp-modal`、`abp-input`、`abp-select` 等簡化 UI 開發
   - 自動整合驗證、本地化和主題
   - 支援動態表單生成

2. **JavaScript API Proxy**：

   - 自動生成的 JavaScript 函式對應後端 API
   - 簡化 AJAX 呼叫，無需手寫 `fetch` 或 `axios`
   - 自動處理錯誤和 CSRF 保護

3. **分頁實作**：
   - 使用 `PagedAndSortedResultRequestDto` 處理分頁參數
   - `abp-paginator` Tag Helper 自動生成分頁控制項
   - 支援伺服器端分頁和客戶端分頁

**最佳實踐**：

- 使用 ABP 提供的 Tag Helpers 而非手寫 HTML
- 善用 JavaScript Proxy 簡化前後端通訊
- 實作分頁時考慮效能（伺服器端分頁 vs 客戶端分頁）
- 使用 DataTables.net 處理複雜的表格需求
- 整合 ABP 的通知系統（`abp.notify`）提供使用者回饋

---

## 參考資源

- [ABP Tag Helpers 文件](https://docs.abp.io/en/abp/latest/UI/AspNetCore/Tag-Helpers/Index)
- [ABP JavaScript API Proxy 文件](https://docs.abp.io/en/abp/latest/UI/AspNetCore/Dynamic-JavaScript-Proxies)
- [ABP Modals 文件](https://docs.abp.io/en/abp/latest/UI/AspNetCore/Modals)
- [DataTables.net 官方文件](https://datatables.net/)
