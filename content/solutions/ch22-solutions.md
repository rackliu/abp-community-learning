# 第二十二章：容器化與 Kubernetes 部署 - 習題解答

本文件提供第二十二章習題的完整解答，涵蓋容器化、Kubernetes 配置和高可用部署。

---

## 概念題

### 題目 1：為何 Docker 多階段建置能減少映像大小？（難度：易）

#### 解答

**原理**：

多階段建置允許在一個 Dockerfile 中使用多個 FROM 指令，每個階段可以使用不同的基礎映像，並且只有最終階段的內容會被包含在最終映像中。

**範例對比**：

**單階段建置（較大）**：

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:10.0
WORKDIR /app
COPY . .
RUN dotnet restore
RUN dotnet publish -c Release -o out

# 最終映像包含：SDK + 原始碼 + 建置工具 + 輸出
# 大小：約 1.5GB
```

**多階段建置（較小）**：

```dockerfile
# 階段 1：建置
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore
RUN dotnet publish -c Release -o /app/publish

# 階段 2：執行時
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .

# 最終映像只包含：Runtime + 輸出檔案
# 大小：約 200MB
```

**減少大小的原因**：

1. **移除建置工具**：

   - SDK 映像（~1GB）→ Runtime 映像（~200MB）
   - 不需要編譯器、建置工具

2. **移除原始碼**：

   - 只複製編譯後的二進位檔案
   - 不包含 .cs、.csproj 等原始檔案

3. **移除中間產物**：

   - obj/、bin/ 等建置目錄不會被包含
   - NuGet 快取不會被包含

4. **安全性提升**：
   - 不暴露原始碼
   - 減少攻擊面

**最佳實踐**：

```dockerfile
# 階段 1：還原依賴（利用快取）
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS restore
WORKDIR /src
COPY ["*.csproj", "./"]
RUN dotnet restore

# 階段 2：建置
FROM restore AS build
COPY . .
RUN dotnet build -c Release --no-restore

# 階段 3：發布
FROM build AS publish
RUN dotnet publish -c Release -o /app/publish --no-build

# 階段 4：最終映像
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS final
WORKDIR /app
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
USER appuser
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "MyApp.dll"]
```

---

### 題目 2：Kubernetes Deployment 與 Service 的角色各為何？（難度：中）

#### 解答

**Deployment**：

- **角色**：管理 Pod 的生命週期和副本數量
- **職責**：
  - 宣告式管理 Pod
  - 確保指定數量的 Pod 始終運行
  - 支援滾動更新和回滾
  - 自動重啟失敗的 Pod

**Service**：

- **角色**：提供穩定的網路端點和負載均衡
- **職責**：
  - 為 Pod 提供固定的 IP 和 DNS 名稱
  - 在多個 Pod 之間分配流量
  - 服務發現
  - 外部存取入口

**關係圖**：

```
外部請求
    ↓
[Service] (穩定的 IP/DNS)
    ↓ (負載均衡)
    ├─→ [Pod 1] ←┐
    ├─→ [Pod 2]  │ 由 Deployment 管理
    └─→ [Pod 3] ←┘
```

**範例**：

```yaml
# Deployment：管理 Pod
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3 # 確保 3 個 Pod 運行
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: app
          image: myapp:1.0.0
---
# Service：提供網路存取
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  selector:
    app: myapp # 選擇 Deployment 建立的 Pod
  ports:
    - port: 80
      targetPort: 8080
  type: LoadBalancer
```

**為什麼需要兩者**：

- **Deployment 不提供網路存取**：Pod IP 會變動，無法直接存取
- **Service 不管理 Pod 生命週期**：只負責路由流量

---

## 計算/練習題

### 題目 3：設計一個高可用 Kubernetes 應用配置。（難度：中）

#### 解答

**需求**：

- 最小 3 副本
- 自動伸縮
- 藍綠部署

**完整配置**：

```yaml
# 1. Deployment（藍色版本）
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-blue
  labels:
    app: myapp
    version: blue
spec:
  replicas: 3 # 最小 3 副本
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
      affinity:
        # Pod 反親和性：確保 Pod 分散在不同節點
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - myapp
                topologyKey: kubernetes.io/hostname
      containers:
        - name: app
          image: myapp:1.0.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
---
# 2. HPA（自動伸縮）
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp-blue
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300 # 5 分鐘穩定期
      policies:
        - type: Percent
          value: 50 # 每次最多縮減 50%
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100 # 每次最多擴展 100%
          periodSeconds: 15
---
# 3. Service
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  selector:
    app: myapp
    version: blue # 指向藍色版本
  ports:
    - port: 80
      targetPort: 8080
  type: LoadBalancer
---
# 4. PodDisruptionBudget（防止過度中斷）
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: myapp-pdb
spec:
  minAvailable: 2 # 至少保持 2 個 Pod 可用
  selector:
    matchLabels:
      app: myapp
```

**藍綠部署流程**：

```bash
# 1. 部署綠色版本（新版本）
kubectl apply -f deployment-green.yaml

# 2. 等待綠色版本就緒
kubectl wait --for=condition=available --timeout=300s deployment/myapp-green

# 3. 切換流量到綠色版本
kubectl patch service myapp-service -p '{"spec":{"selector":{"version":"green"}}}'

# 4. 驗證新版本
# 監控錯誤率、回應時間等指標

# 5. 若成功，刪除藍色版本
kubectl delete deployment myapp-blue

# 6. 若失敗，回滾到藍色版本
kubectl patch service myapp-service -p '{"spec":{"selector":{"version":"blue"}}}'
kubectl delete deployment myapp-green
```

---

### 題目 4：計算不同資源限制下應用能支援的最大並發用戶數。（難度：中）

#### 解答

**假設**：

- 每個請求需要 50MB 記憶體
- 每個請求需要 0.1 CPU 核心
- 平均請求處理時間：200ms

**配置 1：小型 Pod**

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

**計算**：

- 記憶體限制：512MB / 50MB = 10 個並發請求
- CPU 限制：0.5 核心 / 0.1 = 5 個並發請求
- **瓶頸**：CPU（5 個並發請求）
- **3 個 Pod**：5 × 3 = **15 個並發請求**

**配置 2：中型 Pod**

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

**計算**：

- 記憶體限制：1024MB / 50MB = 20 個並發請求
- CPU 限制：1.0 核心 / 0.1 = 10 個並發請求
- **瓶頸**：CPU（10 個並發請求）
- **3 個 Pod**：10 × 3 = **30 個並發請求**

**配置 3：大型 Pod + HPA**

```yaml
resources:
  limits:
    memory: "2Gi"
    cpu: "2000m"
# HPA: 3-10 副本
```

**計算**：

- 單 Pod：2.0 核心 / 0.1 = 20 個並發請求
- 最小配置（3 Pod）：20 × 3 = **60 個並發請求**
- 最大配置（10 Pod）：20 × 10 = **200 個並發請求**

**實際考量**：

```typescript
// 壓力測試驗證
// 使用 k6 或 Apache JMeter

import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
  stages: [
    { duration: "2m", target: 50 }, // 逐步增加到 50 用戶
    { duration: "5m", target: 50 }, // 維持 50 用戶
    { duration: "2m", target: 100 }, // 增加到 100 用戶
    { duration: "5m", target: 100 }, // 維持 100 用戶
    { duration: "2m", target: 0 }, // 逐步減少
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% 請求 < 500ms
    http_req_failed: ["rate<0.01"], // 錯誤率 < 1%
  },
};

export default function () {
  let response = http.get("http://myapp-service/api/test");
  check(response, {
    "status is 200": (r) => r.status === 200,
  });
  sleep(1);
}
```

---

## 實作/編碼題

### 題目 5 & 6：完整的容器化配置與高可用部署

由於這兩題的解答已在 ch20-solutions.md 中詳細說明，這裡提供補充的 Helm Chart 範例：

```yaml
# helm/myapp/values.yaml
replicaCount: 3

image:
  repository: myregistry/myapp
  tag: "1.0.0"
  pullPolicy: IfNotPresent

service:
  type: LoadBalancer
  port: 80

resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

podDisruptionBudget:
  enabled: true
  minAvailable: 2

blueGreen:
  enabled: true
  activeVersion: blue
```

---

## 總結

本章習題涵蓋了容器化與 Kubernetes 部署的核心知識：

- Docker 多階段建置優化
- Deployment 與 Service 的角色
- 高可用配置設計
- 資源容量規劃
- 完整的部署流程

**最佳實踐**：

- 使用多階段建置減少映像大小
- 配置適當的資源限制
- 實作自動伸縮（HPA）
- 使用 PodDisruptionBudget 保證可用性
- 實作藍綠部署或金絲雀部署
- 完整的健康檢查和監控

---

## 參考資源

- [ABP Deployment](https://docs.abp.io/en/abp/latest/Deployment)
- [Docker 官方](https://docs.docker.com/)
- [Kubernetes 官方](https://kubernetes.io/)
- [Helm 官方](https://helm.sh/)
