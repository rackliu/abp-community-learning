# 第六部：多租戶與功能管理（章 16）

本檔為章 16 教材草稿，聚焦於 ABP v9.3 社群版的多租戶架構與功能管理（Feature Management）。

## 學習目標
- 了解多租戶模型（單一資料庫 vs 多租戶資料庫）
- 能啟用並配置 ABP 的多租戶功能
- 實作租戶隔離與租戶切換
- 設計功能開關（Feature）以控制租戶級別的功能

## 先修需求
- 熟悉 ASP.NET Core、ABP Module 與 DI
- 了解基本資料庫遷移與配置

## 多租戶模型概述
- Shared database, shared schema（單一 DB、共用 schema）
- Shared database, separate schema（單一 DB、多 schema）
- Separate databases（每租戶獨立 DB）

### 選型指引
- 小型 SaaS 或測試環境可選 shared database  
- 追求資料隔離與合規要求考慮 separate databases  
- 依據運維能力、成本與合規性決策

## 在 ABP 中啟用多租戶
編輯 Module 的 ConfigureServices：

```csharp
// csharp
public override void ConfigureServices(ServiceConfigurationContext context)
{
    Configure<AbpMultiTenancyOptions>(options =>
    {
        options.IsEnabled = true; // 啟用多租戶
    });
}
```

ABP 內建 Tenant Management 模組可用於租戶 CRUD 與管理，模板通常已預先包含該模組。

## 租戶資料隔離策略
- 使用 ICurrentTenant 在程式碼中取得當前租戶：

```csharp
// csharp
public class MyService
{
    private readonly ICurrentTenant _currentTenant;
    public MyService(ICurrentTenant currentTenant) => _currentTenant = currentTenant;
    public Guid? GetTenantId() => _currentTenant.Id;
}
```

- 若採用 "Separate databases"，請在 DbContext 建立或 resolve connection string 時根據租戶切換連線。  
- 建議在啟動階段與遷移流程中為每租戶建立資料庫與執行遷移（可用腳本或 CI 工作）。

## 租戶專屬設定與連線字串
- 租戶可以擁有自己的 ConnectionString（ABP 支援租戶層級連線字串）  
- 透過 Tenant Management UI 或程式初始化設定租戶連線字串

```csharp
// csharp（示意）
public override void OnApplicationInitialization(ApplicationInitializationContext context)
{
    // 在此可註冊租戶連線字串解析器或預先載入租戶資料
}
```

## Feature Management（功能管理）
- Feature 用於控制全域或租戶級別功能開關  
- 定義 Feature：

```csharp
// csharp
public class MyFeatureDefinitionProvider : FeatureDefinitionProvider
{
    public override void Define(IFeatureDefinitionContext context)
    {
        var group = context.AddGroup("MyFeatures", "My features");
        group.AddFeature("MyFeatures.EnableAwesome", defaultValue: "false");
    }
}
```

- 使用 IFeatureCheckerService 或 IFeatureValueStore 讀取與設定功能值

```csharp
// csharp
public class MyAppService : ApplicationService
{
    private readonly IFeatureChecker _featureChecker;
    public MyAppService(IFeatureChecker featureChecker) => _featureChecker = featureChecker;
    public async Task<bool> IsAwesomeEnabledAsync() => await _featureChecker.IsEnabledAsync("MyFeatures.EnableAwesome");
}
```

## 租戶切換（測試場景）
- 開發模式下可使用 ICurrentTenant.Change(...) 來在範例或測試中切換租戶範圍

```csharp
// csharp
using (_currentTenant.Change(tenantId))
{
    // 在此範圍內的操作以指定 tenantId 為當前租戶
}
```

## 流程建議：建立與初始化租戶
1. 建立租戶實體（Tenant）與基本資料（Owner、連線字串、功能預設）  
2. 若採 Separate DB，建立資料庫並執行遷移  
3. 設定租戶角色與預設使用者  
4. 驗證租戶層級功能與授權

## CLI / 自動化範例（常見指令）
- 安裝 / 更新 ABP CLI：

```bash
# bash
dotnet tool install -g Volo.Abp.Studio.Cli
abp --version
```

- 使用 CLI 建立專案（含 TenantManagement 模組的範本通常自帶）：

```bash
# bash
abp new MySaaSApp -t app
```

## 實務案例：為租戶自動建立資料庫
- 在 CI 中加入工作：讀取租戶清單、針對每租戶執行 dotnet ef database update（或使用腳本化遷移）  
- 範例腳本（示意）：

```bash
# bash
tenants=("tenant1" "tenant2")
for t in "${tenants[@]}"; do
  # 依租戶設定不同 CONN 字串並執行遷移
  dotnet ef database update --connection "Server=...;Database=${t};..."
done
```

## 常見問題（FAQ）
Q：如何在程式中判斷是否啟用多租戶？  
A：讀取 AbpMultiTenancyOptions 或使用 ICurrentTenant 判斷 _currentTenant.Id 是否為 null。

Q：Feature 的預設值如何為租戶覆寫？  
A：可透過 Feature 管理 UI 或程式使用 IFeatureValueStore.SetAsync 在租戶層級設定值。

## 最佳實務
- 明確定義租戶邊界與資料隔離策略  
- 若需高度隔離優先選 Separate DB，並自動化遷移流程  
- 使用 Feature 管理控制租戶差異化功能，避免在程式碼中散布多重條件  
- 在設計時考慮租戶資料量與備份/恢復策略

## 參考資源
- ABP 官方文件（Multi-Tenancy）：https://docs.abp.io/en/abp/latest/Multi-Tenancy  
- Feature Management 文件：https://docs.abp.io/en/abp/latest/Features

--- 

檔案：[`content/part06-ch16.md`](content/part06-ch16.md:1)