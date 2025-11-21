# 第一章：習題解答

## 題目與解答索引

- 題目 1–6：本檔提供逐題解答

### 概念題 1（易）解答

解：模組化（Module）是將系統以功能或責任分割成獨立、可重用的單位。ABP 採用模組化設計的原因包括：降低耦合、促進重複使用、支援團隊分工與較細粒度測試，並在啟動階段提供註冊與生命週期管理（如 ConfigureServices、OnApplicationInitialization）。模組化也利於未來將單一應用逐步拆分為微服務。

### 概念題 2（中）解答

解：在權衡單層（Monolith）與微服務時，應考量下列非功能性需求：

- 可擴展性（是否需要獨立水平擴展某個功能）
- 部署頻率與複雜度（是否需獨立部署）
- 團隊組織（多團隊協作時微服務利於分工）
- 資料一致性（同步交易 vs 最終一致性）
- 運維成本（監控、追蹤、部署管線、網路）
- 效能與可靠性需求（跨網路呼叫影響延遲/可用性）

### 計算 / 練習題 3（中）解答

題：每本書平均 2KB，10 萬筆書目在記憶體快取預估空間？

計算：
$$2\ \text{KB} \times 100000 = 200000\ \text{KB}$$
$$200000\ \text{KB} = \frac{200000}{1024}\ \text{MB} \approx 195.3125\ \text{MB}$$

結論：約 $195.3\ \text{MB}$。實務上還需考慮序列化/反序列化開銷、索引與快取元資料，與記憶體碎片與 GC 影響。

### 計算 / 練習題 4（中）解答

題：描述一次從建立專案到啟動 Web 專案的命令序列，並說明每個命令的用途。

解：範例序列（常見）：

```bash
# 安裝 ABP CLI（一次性）
dotnet tool install -g Volo.Abp.Studio.Cli

# 產生專案骨架（以 BookStore 為例）
abp new BookStore -t app -u mvc -d ef

# 進入專案並編譯
cd BookStore
dotnet build

# 啟動 Web 專案（視專案結構）
dotnet run --project src/BookStore.Web
```

用途說明：安裝 CLI → 產生樣板與檔案結構 → 編譯以檢查錯誤 → 執行 Web 專案以開發或測試。實際參數與步驟請以 content7 / 官方 CLI 文件為準。

### 實作 / 編碼題 5（較難）解答

題：實作 Book 聚合包含 Borrow() 行為，並撰寫單元測試驗證 Borrow() 會改變狀態。

解：以下為簡單示範聚合與測試實作。

```csharp
// csharp
public enum BookStatus { Available, Borrowed }

public class Book : FullAuditedAggregateRoot<Guid>
{
    public string Title { get; private set; }
    public string Author { get; private set; }
    public BookStatus Status { get; private set; }

    public Book(Guid id, string title, string author) : base(id)
    {
        Title = title;
        Author = author;
        Status = BookStatus.Available;
    }

    public void Borrow()
    {
        if (Status == BookStatus.Borrowed) throw new InvalidOperationException("Book already borrowed");
        Status = BookStatus.Borrowed;
    }
}
```

單元測試（xUnit 範例）：

```csharp
// csharp
public class BookTests
{
    [Fact]
    public void Borrow_ShouldChangeStatusToBorrowed()
    {
        var book = new Book(Guid.NewGuid(), "Test", "Author");
        book.Borrow();
        Assert.Equal(BookStatus.Borrowed, book.Status);
    }
}
```

### 實作 / 編碼題 6（較難）解答（步驟建議）

題：使用 ABP CLI 建立一個分層專案，將 Book 實體加入 Domain，建立 Repository 與 ApplicationService，並在本地執行完整 CRUD 測試（提交過程截圖或日誌作為驗證）。

解：步驟重點與驗證事項

1. 使用 `abp new` 建立範本（選 Layered / app），或使用 content7 產生最新範本。
2. 在 Domain 專案新增 Book 實體（參考上方範例），並定義 IRepository 介面（若使用 ABP 的 IRepository 可直接注入）。
3. 在 EntityFrameworkCore 專案新增 `DbSet<Book>` 與 OnModelCreating 映射設定。
4. 在 Application 層新增 BookAppService，提供 Create/Get/Update/Delete 接口並使用 ObjectMapper 轉換 DTO。
5. 撰寫並執行 `dotnet ef migrations add Init` 與 `dotnet ef database update`（或使用 DbMigrator 專案），確保資料庫建立成功。
6. 在本地以 `dotnet run` 啟動 API，使用 Postman 或 curl 驗證 CRUD。紀錄測試日誌或截圖作為驗證。
7. 撰寫簡單整合測試（使用 AbpIntegratedTestBase）來驗證 Repository/Service 行為；在 CI 中可使用 Testcontainers 啟動測試 DB。

## 參考與補充

- 章節原稿：[`content/ch01.md`](content/ch01.md:1)
- ABP 官方文件（以 content7 為主要來源）：https://docs.abp.io/en/abp/latest/

## 版權與引用說明

本檔為依原始教材草稿改寫之解答，避免直接複製受版權保護之長段落；ABP 相關更新與 CLI 範例以 content7 為主要來源。

End of file.
