# 第二十三章：升級策略與遷移指引 - 習題解答

本文件提供第二十三章習題的完整解答，涵蓋版本升級、資料庫遷移和多租戶升級策略。

---

## 概念題

### 題目 1：SemVer 中的主、次、修訂版本各代表什麼？（難度：易）

#### 解答

**語意化版本（Semantic Versioning, SemVer）**格式：`MAJOR.MINOR.PATCH`

例如：`9.3.1`

**各部分意義**：

1. **MAJOR（主版本）**：`9`

   - **何時遞增**：有不相容的 API 變更（Breaking Changes）
   - **範例**：
     - 移除已棄用的 API
     - 變更方法簽章
     - 變更預設行為
   - **影響**：可能需要修改程式碼才能升級

2. **MINOR（次版本）**：`3`

   - **何時遞增**：新增向後相容的功能
   - **範例**：
     - 新增新的 API 方法
     - 新增可選參數
     - 新增新功能
   - **影響**：可以安全升級，不需修改現有程式碼

3. **PATCH（修訂版本）**：`1`
   - **何時遞增**：向後相容的錯誤修復
   - **範例**：
     - 修復 bug
     - 效能優化
     - 安全性修補
   - **影響**：應該立即升級，無風險

**ABP Framework 範例**：

```
9.2.0 → 9.2.1  (PATCH)   ✅ 安全升級，只是 bug 修復
9.2.1 → 9.3.0  (MINOR)   ⚠️  新功能，測試後升級
9.3.0 → 10.0.0 (MAJOR)   ❌ 破壞性變更，需要仔細評估
```

**升級策略**：

```csharp
// 檢查版本相容性
public class VersionCompatibilityChecker
{
    public bool IsCompatible(string currentVersion, string targetVersion)
    {
        var current = ParseVersion(currentVersion);
        var target = ParseVersion(targetVersion);

        // MAJOR 版本不同：不相容
        if (current.Major != target.Major)
        {
            return false;
        }

        // MINOR 版本向後相容
        if (target.Minor >= current.Minor)
        {
            return true;
        }

        return false;
    }

    private (int Major, int Minor, int Patch) ParseVersion(string version)
    {
        var parts = version.Split('.');
        return (
            int.Parse(parts[0]),
            int.Parse(parts[1]),
            int.Parse(parts[2])
        );
    }
}
```

---

### 題目 2：為何升級前應備份資料庫？（難度：中）

#### 解答

**原因**：

1. **資料庫遷移可能失敗**：

   - Migration 腳本可能有錯誤
   - 資料轉換可能失敗
   - 約束條件可能衝突

2. **破壞性變更**：

   - 某些 Migration 會刪除欄位或表格
   - 資料格式變更可能導致資料遺失
   - 無法自動回滾

3. **回滾需求**：

   - 新版本可能有未預期的問題
   - 效能問題
   - 業務邏輯錯誤

4. **合規要求**：
   - 資料保護法規要求
   - 稽核需求
   - 災難復原計畫

**備份策略**：

```bash
# 1. 完整備份（升級前）
pg_dump -h localhost -U postgres -d BookStore > backup_before_upgrade_$(date +%Y%m%d_%H%M%S).sql

# 2. 驗證備份
pg_restore --list backup_before_upgrade_20250120_100000.sql

# 3. 測試還原（在測試環境）
createdb BookStore_Test
pg_restore -h localhost -U postgres -d BookStore_Test backup_before_upgrade_20250120_100000.sql

# 4. 執行升級
dotnet ef database update

# 5. 若失敗，還原備份
dropdb BookStore
createdb BookStore
pg_restore -h localhost -U postgres -d BookStore backup_before_upgrade_20250120_100000.sql
```

**自動化備份腳本**：

```csharp
// Domain/Migrations/DatabaseBackupService.cs
public class DatabaseBackupService : ITransientDependency
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<DatabaseBackupService> _logger;

    public async Task<string> CreateBackupAsync()
    {
        var connectionString = _configuration.GetConnectionString("Default");
        var backupPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            "backups",
            $"backup_{DateTime.Now:yyyyMMdd_HHmmss}.sql"
        );

        Directory.CreateDirectory(Path.GetDirectoryName(backupPath));

        var processInfo = new ProcessStartInfo
        {
            FileName = "pg_dump",
            Arguments = $"-h localhost -U postgres -d BookStore -f {backupPath}",
            RedirectStandardOutput = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using var process = Process.Start(processInfo);
        await process.WaitForExitAsync();

        if (process.ExitCode == 0)
        {
            _logger.LogInformation("Backup created successfully: {BackupPath}", backupPath);
            return backupPath;
        }
        else
        {
            throw new Exception($"Backup failed with exit code {process.ExitCode}");
        }
    }
}
```

---

## 計算/練習題

### 題目 3：設計 50 個租戶的升級策略，評估時間與風險。（難度：中）

#### 解答

**情境**：

- 50 個租戶
- 從 ABP 9.2.0 升級到 9.3.0
- 每個租戶有獨立資料庫
- 平均每個租戶資料庫大小：5GB
- 平均 Migration 時間：5 分鐘

**升級策略**：

**方案 1：序列升級（最安全）**

```
時間軸：
租戶1 → 租戶2 → 租戶3 → ... → 租戶50

總時間：50 × 5 分鐘 = 250 分鐘（約 4.2 小時）
風險：低
優點：問題容易定位
缺點：時間長
```

**方案 2：批次升級（平衡）**

```
批次 1（10 個租戶）→ 驗證 → 批次 2（10 個租戶）→ ... → 批次 5

每批次時間：10 × 5 分鐘 = 50 分鐘
驗證時間：10 分鐘
總時間：5 × (50 + 10) = 300 分鐘（5 小時）
風險：中
優點：可以及早發現問題
缺點：需要人工監控
```

**方案 3：並行升級（最快）**

```
同時升級所有 50 個租戶（使用 10 個並行執行緒）

理論時間：50 / 10 × 5 = 25 分鐘
實際時間：約 40 分鐘（考慮資源競爭）
風險：高
優點：最快
缺點：問題影響範圍大
```

**推薦方案：金絲雀 + 批次**

```
階段 1：金絲雀（1-2 個租戶）
  - 選擇小型、非關鍵租戶
  - 時間：10 分鐘
  - 監控 24 小時

階段 2：小批次（5 個租戶）
  - 時間：25 分鐘
  - 監控 12 小時

階段 3：中批次（10 個租戶 × 2）
  - 時間：50 分鐘 × 2 = 100 分鐘
  - 監控 6 小時

階段 4：大批次（剩餘 33 個租戶，分 3 批）
  - 時間：約 60 分鐘
  - 持續監控

總時間：約 3-4 天（包含監控時間）
風險：低
```

**實作**：

```csharp
// Application/Tenants/TenantUpgradeService.cs
public class TenantUpgradeService : ITransientDependency
{
    private readonly ITenantRepository _tenantRepository;
    private readonly DatabaseBackupService _backupService;
    private readonly TenantDatabaseMigrationService _migrationService;
    private readonly ILogger<TenantUpgradeService> _logger;

    public async Task UpgradeTenantsAsync(UpgradeStrategy strategy)
    {
        var tenants = await _tenantRepository.GetListAsync();

        switch (strategy)
        {
            case UpgradeStrategy.Sequential:
                await UpgradeSequentiallyAsync(tenants);
                break;
            case UpgradeStrategy.Batch:
                await UpgradeBatchAsync(tenants, batchSize: 10);
                break;
            case UpgradeStrategy.Canary:
                await UpgradeCanaryAsync(tenants);
                break;
        }
    }

    private async Task UpgradeSequentiallyAsync(List<Tenant> tenants)
    {
        foreach (var tenant in tenants)
        {
            await UpgradeSingleTenantAsync(tenant);
        }
    }

    private async Task UpgradeBatchAsync(List<Tenant> tenants, int batchSize)
    {
        var batches = tenants.Chunk(batchSize);

        foreach (var batch in batches)
        {
            _logger.LogInformation("Upgrading batch of {Count} tenants", batch.Length);

            var tasks = batch.Select(UpgradeSingleTenantAsync);
            await Task.WhenAll(tasks);

            _logger.LogInformation("Batch completed. Waiting for verification...");
            await Task.Delay(TimeSpan.FromMinutes(10)); // 驗證時間
        }
    }

    private async Task UpgradeCanaryAsync(List<Tenant> tenants)
    {
        // 階段 1：金絲雀
        var canary = tenants.Take(2).ToList();
        foreach (var tenant in canary)
        {
            await UpgradeSingleTenantAsync(tenant);
        }

        _logger.LogWarning("Canary deployment completed. Please verify before continuing.");
        // 等待人工確認

        // 階段 2-4：批次升級
        var remaining = tenants.Skip(2).ToList();
        await UpgradeBatchAsync(remaining, batchSize: 10);
    }

    private async Task UpgradeSingleTenantAsync(Tenant tenant)
    {
        try
        {
            _logger.LogInformation("Upgrading tenant {TenantName} ({TenantId})", tenant.Name, tenant.Id);

            // 1. 備份
            var backupPath = await _backupService.CreateBackupAsync(tenant.Id);

            // 2. 執行 Migration
            await _migrationService.MigrateTenantDatabaseAsync(tenant.Id);

            // 3. 驗證
            await ValidateTenantAsync(tenant.Id);

            _logger.LogInformation("Tenant {TenantName} upgraded successfully", tenant.Name);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upgrade tenant {TenantName}", tenant.Name);

            // 回滾
            await RollbackTenantAsync(tenant.Id);
            throw;
        }
    }

    private async Task ValidateTenantAsync(Guid tenantId)
    {
        // 驗證資料完整性
        // 驗證關鍵功能
        // 檢查錯誤日誌
    }

    private async Task RollbackTenantAsync(Guid tenantId)
    {
        _logger.LogWarning("Rolling back tenant {TenantId}", tenantId);
        // 從備份還原
    }
}

public enum UpgradeStrategy
{
    Sequential,
    Batch,
    Canary
}
```

---

### 題目 4：比較三種遷移方式的優缺點。（難度：中）

#### 解答

| 遷移方式     | 停機升級    | 漸進升級    | 藍綠部署      |
| ------------ | ----------- | ----------- | ------------- |
| **停機時間** | ❌ 完全停機 | ⚠️ 部分停機 | ✅ 零停機     |
| **複雜度**   | ✅ 簡單     | ⚠️ 中等     | ❌ 複雜       |
| **資源需求** | ✅ 低       | ⚠️ 中等     | ❌ 高（雙倍） |
| **回滾速度** | ⚠️ 慢       | ⚠️ 中等     | ✅ 即時       |
| **風險**     | ⚠️ 中等     | ✅ 低       | ✅ 低         |
| **適用場景** | 小型應用    | 中型應用    | 大型關鍵應用  |

**詳細說明**：

**1. 停機升級（Downtime Deployment）**

```bash
# 流程
1. 通知使用者即將維護
2. 停止應用程式
3. 備份資料庫
4. 執行 Migration
5. 部署新版本
6. 啟動應用程式
7. 驗證

# 優點
- 實作簡單
- 資源需求低
- 容易理解和執行

# 缺點
- 使用者無法存取
- 停機時間長（可能數小時）
- 對業務影響大
```

**2. 漸進升級（Rolling Update）**

```bash
# 流程
1. 部署新版本到部分伺服器
2. 等待健康檢查通過
3. 逐步替換其他伺服器
4. 最終所有伺服器都是新版本

# 優點
- 部分可用性
- 可以及早發現問題
- 資源需求適中

# 缺點
- 新舊版本共存期間可能有相容性問題
- 資料庫 Migration 複雜
- 回滾較慢
```

**3. 藍綠部署（Blue-Green Deployment）**

```bash
# 流程
1. 部署新版本到綠色環境
2. 在綠色環境完整測試
3. 切換流量到綠色環境
4. 監控新版本
5. 若成功，移除藍色環境
6. 若失敗，切回藍色環境

# 優點
- 零停機
- 即時回滾
- 完整測試後才切換

# 缺點
- 需要雙倍資源
- 資料庫同步複雜
- 實作複雜
```

**實作範例（Kubernetes 藍綠部署）**：

```yaml
# blue-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: blue
  template:
    metadata:
      labels:
        app: myapp
        version: blue
    spec:
      containers:
        - name: app
          image: myapp:1.0.0
---
# green-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: green
  template:
    metadata:
      labels:
        app: myapp
        version: green
    spec:
      containers:
        - name: app
          image: myapp:2.0.0
---
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp
    version: blue # 切換這裡來改變流量方向
  ports:
    - port: 80
      targetPort: 8080
```

---

## 實作/編碼題

### 題目 5 & 6：完整的資料庫遷移與多租戶升級流程

由於篇幅限制，核心實作請參考前面的解答。這裡提供 Feature Toggle 實作：

```csharp
// Domain/Features/FeatureToggleService.cs
public class FeatureToggleService : ITransientDependency
{
    private readonly IDistributedCache<bool> _cache;

    public async Task<bool> IsEnabledAsync(string featureName, Guid? tenantId = null)
    {
        var key = $"FeatureToggle:{featureName}:{tenantId}";
        var cached = await _cache.GetAsync(key);

        if (cached.HasValue)
        {
            return cached.Value;
        }

        // 從資料庫或配置讀取
        var enabled = await GetFeatureStateFromDatabaseAsync(featureName, tenantId);

        await _cache.SetAsync(key, enabled, new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
        });

        return enabled;
    }

    public async Task EnableFeatureAsync(string featureName, Guid? tenantId = null)
    {
        await SetFeatureStateAsync(featureName, true, tenantId);
    }

    public async Task DisableFeatureAsync(string featureName, Guid? tenantId = null)
    {
        await SetFeatureStateAsync(featureName, false, tenantId);
    }
}

// 使用範例
public class OrderAppService : ApplicationService
{
    private readonly FeatureToggleService _featureToggle;

    public async Task<OrderDto> CreateAsync(CreateOrderDto input)
    {
        // 使用 Feature Toggle 控制新功能
        if (await _featureToggle.IsEnabledAsync("NewOrderFlow"))
        {
            return await CreateOrderWithNewFlowAsync(input);
        }
        else
        {
            return await CreateOrderWithOldFlowAsync(input);
        }
    }
}
```

---

## 總結

本章習題涵蓋了升級與遷移的完整知識：

- SemVer 版本管理
- 資料庫備份的重要性
- 多租戶升級策略
- 不同遷移方式的選擇
- Feature Toggle 實作

**最佳實踐**：

- 遵循 SemVer 版本規範
- 升級前必須備份
- 使用金絲雀部署降低風險
- 實作完整的回滾機制
- 使用 Feature Toggle 控制新功能
- 完整的監控和告警

---

## 參考資源

- [ABP Upgrade Guide](https://docs.abp.io/en/abp/latest/)
- [Entity Framework Core Migrations](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/)
- [Semantic Versioning](https://semver.org/)
