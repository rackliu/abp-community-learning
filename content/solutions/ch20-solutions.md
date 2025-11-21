# 第二十章：Docker 容器化與部署 - 習題解答

本文件提供第二十章實戰練習的完整解答，涵蓋容器化應用、Kubernetes 部署和 CI/CD 配置。

---

## 練習 1：容器化應用

### 題目

1. 為您的 ABP 應用程式撰寫 Dockerfile。
2. 使用 Docker Compose 在本地啟動完整環境（App + DB + Redis）。
3. 驗證應用程式正常運作。

### 解答

#### 步驟 1：撰寫 Dockerfile

```dockerfile
# Dockerfile
# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# 複製專案檔案並還原（利用 Docker 快取層）
COPY ["src/BookStore.DbMigrator/BookStore.DbMigrator.csproj", "src/BookStore.DbMigrator/"]
COPY ["src/BookStore.HttpApi.Host/BookStore.HttpApi.Host.csproj", "src/BookStore.HttpApi.Host/"]
COPY ["src/BookStore.Application/BookStore.Application.csproj", "src/BookStore.Application/"]
COPY ["src/BookStore.Application.Contracts/BookStore.Application.Contracts.csproj", "src/BookStore.Application.Contracts/"]
COPY ["src/BookStore.Domain/BookStore.Domain.csproj", "src/BookStore.Domain/"]
COPY ["src/BookStore.Domain.Shared/BookStore.Domain.Shared.csproj", "src/BookStore.Domain.Shared/"]
COPY ["src/BookStore.EntityFrameworkCore/BookStore.EntityFrameworkCore.csproj", "src/BookStore.EntityFrameworkCore/"]
COPY ["src/BookStore.HttpApi/BookStore.HttpApi.csproj", "src/BookStore.HttpApi/"]

RUN dotnet restore "src/BookStore.HttpApi.Host/BookStore.HttpApi.Host.csproj"

# 複製所有原始碼並建置
COPY . .
WORKDIR "/src/src/BookStore.HttpApi.Host"
RUN dotnet build "BookStore.HttpApi.Host.csproj" -c Release -o /app/build

# Stage 2: Publish
FROM build AS publish
RUN dotnet publish "BookStore.HttpApi.Host.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# 安裝 curl（用於健康檢查）
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# 建立非 root 使用者（安全性最佳實踐）
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
USER appuser

EXPOSE 8080
EXPOSE 8081

COPY --from=publish /app/publish .

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "BookStore.HttpApi.Host.dll"]
```

#### 步驟 2：建立 .dockerignore

```
# .dockerignore
**/bin/
**/obj/
**/out/
**/.vs/
**/.vscode/
**/*.user
**/.git/
**/node_modules/
**/wwwroot/lib/
**/.idea/
**/TestResults/
**/*.DotSettings.user
```

#### 步驟 3：撰寫 Docker Compose

```yaml
# docker-compose.yml
version: "3.8"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: bookstore-app
    ports:
      - "8080:8080"
      - "8081:8081"
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
      - ASPNETCORE_URLS=http://+:8080
      - ConnectionStrings__Default=Server=db;Database=BookStore;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=True
      - Redis__Configuration=redis:6379
      - AuthServer__Authority=http://localhost:8080
      - AuthServer__RequireHttpsMetadata=false
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - bookstore-network
    restart: unless-stopped

  db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    container_name: bookstore-db
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=YourStrong@Passw0rd
      - MSSQL_PID=Developer
    ports:
      - "1433:1433"
    volumes:
      - sqldata:/var/opt/mssql
    networks:
      - bookstore-network
    healthcheck:
      test: /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P YourStrong@Passw0rd -Q "SELECT 1" || exit 1
      interval: 10s
      timeout: 3s
      retries: 10
      start_period: 10s
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: bookstore-redis
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    networks:
      - bookstore-network
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    restart: unless-stopped

  # DbMigrator - 執行資料庫遷移
  migrator:
    build:
      context: .
      dockerfile: Dockerfile.Migrator
    container_name: bookstore-migrator
    environment:
      - ConnectionStrings__Default=Server=db;Database=BookStore;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=True
    depends_on:
      db:
        condition: service_healthy
    networks:
      - bookstore-network

volumes:
  sqldata:
    driver: local
  redisdata:
    driver: local

networks:
  bookstore-network:
    driver: bridge
```

#### 步驟 4：建立 DbMigrator 的 Dockerfile

```dockerfile
# Dockerfile.Migrator
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY ["src/BookStore.DbMigrator/BookStore.DbMigrator.csproj", "src/BookStore.DbMigrator/"]
COPY ["src/BookStore.Domain/BookStore.Domain.csproj", "src/BookStore.Domain/"]
COPY ["src/BookStore.Domain.Shared/BookStore.Domain.Shared.csproj", "src/BookStore.Domain.Shared/"]
COPY ["src/BookStore.EntityFrameworkCore/BookStore.EntityFrameworkCore.csproj", "src/BookStore.EntityFrameworkCore/"]

RUN dotnet restore "src/BookStore.DbMigrator/BookStore.DbMigrator.csproj"

COPY . .
WORKDIR "/src/src/BookStore.DbMigrator"
RUN dotnet build "BookStore.DbMigrator.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "BookStore.DbMigrator.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/runtime:9.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "BookStore.DbMigrator.dll"]
```

#### 步驟 5：啟動環境

```bash
# 建置並啟動所有服務
docker-compose up -d

# 查看日誌
docker-compose logs -f app

# 查看所有容器狀態
docker-compose ps

# 執行資料庫遷移
docker-compose up migrator

# 停止所有服務
docker-compose down

# 停止並移除所有資料
docker-compose down -v
```

#### 步驟 6：驗證應用程式

```bash
# 檢查健康狀態
curl http://localhost:8080/health

# 檢查 API
curl http://localhost:8080/api/abp/application-configuration

# 檢查 Swagger
# 瀏覽器開啟 http://localhost:8080/swagger
```

---

## 練習 2：Kubernetes 部署

### 題目

1. 建立 Deployment, Service, ConfigMap, Secret。
2. 部署到本地 Kubernetes（如 Docker Desktop 或 Minikube）。
3. 測試 Pod 的自動重啟與負載均衡。

### 解答

#### 步驟 1：建立 Kubernetes 配置檔案

**Namespace**:

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: bookstore
```

**ConfigMap**:

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: bookstore-config
  namespace: bookstore
data:
  ASPNETCORE_ENVIRONMENT: "Production"
  ASPNETCORE_URLS: "http://+:8080"
  AuthServer__RequireHttpsMetadata: "false"
```

**Secret**:

```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: bookstore-secret
  namespace: bookstore
type: Opaque
stringData:
  connection-string: "Server=bookstore-db;Database=BookStore;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=True"
  redis-configuration: "bookstore-redis:6379"
```

**SQL Server Deployment**:

```yaml
# k8s/db-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bookstore-db
  namespace: bookstore
spec:
  replicas: 1
  selector:
    matchLabels:
      app: bookstore-db
  template:
    metadata:
      labels:
        app: bookstore-db
    spec:
      containers:
        - name: mssql
          image: mcr.microsoft.com/mssql/server:2022-latest
          ports:
            - containerPort: 1433
          env:
            - name: ACCEPT_EULA
              value: "Y"
            - name: SA_PASSWORD
              value: "YourStrong@Passw0rd"
            - name: MSSQL_PID
              value: "Developer"
          resources:
            requests:
              memory: "2Gi"
              cpu: "1000m"
            limits:
              memory: "4Gi"
              cpu: "2000m"
          volumeMounts:
            - name: mssql-data
              mountPath: /var/opt/mssql
      volumes:
        - name: mssql-data
          persistentVolumeClaim:
            claimName: mssql-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: bookstore-db
  namespace: bookstore
spec:
  selector:
    app: bookstore-db
  ports:
    - protocol: TCP
      port: 1433
      targetPort: 1433
  type: ClusterIP
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mssql-pvc
  namespace: bookstore
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

**Redis Deployment**:

```yaml
# k8s/redis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bookstore-redis
  namespace: bookstore
spec:
  replicas: 1
  selector:
    matchLabels:
      app: bookstore-redis
  template:
    metadata:
      labels:
        app: bookstore-redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: bookstore-redis
  namespace: bookstore
spec:
  selector:
    app: bookstore-redis
  ports:
    - protocol: TCP
      port: 6379
      targetPort: 6379
  type: ClusterIP
```

**Application Deployment**:

```yaml
# k8s/app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bookstore-app
  namespace: bookstore
spec:
  replicas: 3
  selector:
    matchLabels:
      app: bookstore
      tier: backend
  template:
    metadata:
      labels:
        app: bookstore
        tier: backend
    spec:
      containers:
        - name: app
          image: bookstore:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8080
              name: http
          env:
            - name: ConnectionStrings__Default
              valueFrom:
                secretKeyRef:
                  name: bookstore-secret
                  key: connection-string
            - name: Redis__Configuration
              valueFrom:
                secretKeyRef:
                  name: bookstore-secret
                  key: redis-configuration
          envFrom:
            - configMapRef:
                name: bookstore-config
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 60
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
---
apiVersion: v1
kind: Service
metadata:
  name: bookstore-app
  namespace: bookstore
spec:
  type: LoadBalancer
  selector:
    app: bookstore
    tier: backend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
```

**HorizontalPodAutoscaler**:

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: bookstore-app-hpa
  namespace: bookstore
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: bookstore-app
  minReplicas: 2
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
```

#### 步驟 2：部署到 Kubernetes

```bash
# 建立命名空間
kubectl apply -f k8s/namespace.yaml

# 部署配置
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# 部署資料庫和 Redis
kubectl apply -f k8s/db-deployment.yaml
kubectl apply -f k8s/redis-deployment.yaml

# 等待資料庫就緒
kubectl wait --for=condition=ready pod -l app=bookstore-db -n bookstore --timeout=300s

# 執行資料庫遷移（使用 Job）
kubectl apply -f k8s/migrator-job.yaml

# 部署應用程式
kubectl apply -f k8s/app-deployment.yaml

# 部署 HPA
kubectl apply -f k8s/hpa.yaml

# 查看部署狀態
kubectl get all -n bookstore

# 查看 Pod 日誌
kubectl logs -f deployment/bookstore-app -n bookstore

# 查看服務
kubectl get svc -n bookstore
```

#### 步驟 3：測試自動重啟和負載均衡

**測試 Pod 自動重啟**:

```bash
# 刪除一個 Pod
kubectl delete pod -l app=bookstore -n bookstore --force

# 觀察 Kubernetes 自動建立新的 Pod
kubectl get pods -n bookstore -w

# 查看事件
kubectl get events -n bookstore --sort-by='.lastTimestamp'
```

**測試負載均衡**:

```bash
# 取得服務 IP
kubectl get svc bookstore-app -n bookstore

# 多次呼叫 API，觀察不同 Pod 處理請求
for i in {1..10}; do
  curl http://<SERVICE_IP>/api/app/book
  echo ""
done

# 查看每個 Pod 的日誌
kubectl logs -l app=bookstore -n bookstore --tail=10
```

**測試自動擴展**:

```bash
# 產生負載
kubectl run -i --tty load-generator --rm --image=busybox --restart=Never -n bookstore -- /bin/sh -c "while sleep 0.01; do wget -q -O- http://bookstore-app; done"

# 在另一個終端觀察 HPA
kubectl get hpa -n bookstore -w

# 觀察 Pod 數量變化
kubectl get pods -n bookstore -w
```

---

## 練習 3：CI/CD

### 題目

1. 設定 GitHub Actions 自動建置並推送映像。
2. 實作自動部署到 Kubernetes。

### 解答

#### 步驟 1：建立 GitHub Actions Workflow

```.github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [ main, develop ]
    tags: [ 'v*' ]
  pull_request:
    branches: [ main ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '9.0.x'

      - name: Restore dependencies
        run: dotnet restore

      - name: Build
        run: dotnet build --no-restore --configuration Release

      - name: Test
        run: dotnet test --no-build --configuration Release --verbosity normal

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix={{branch}}-

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/v')

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: 'latest'

      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > kubeconfig
          export KUBECONFIG=kubeconfig

      - name: Deploy to Kubernetes
        env:
          KUBECONFIG: kubeconfig
        run: |
          # 更新映像標籤
          kubectl set image deployment/bookstore-app \
            app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            -n bookstore

          # 等待部署完成
          kubectl rollout status deployment/bookstore-app -n bookstore --timeout=5m

      - name: Verify deployment
        env:
          KUBECONFIG: kubeconfig
        run: |
          kubectl get pods -n bookstore
          kubectl get svc -n bookstore

      - name: Notify on success
        if: success()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
          payload: |
            {
              "text": "✅ Deployment successful for ${{ github.repository }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Deployment Successful*\n\nRepository: ${{ github.repository }}\nBranch: ${{ github.ref }}\nCommit: ${{ github.sha }}\n\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Details>"
                  }
                }
              ]
            }

      - name: Notify on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
          payload: |
            {
              "text": "❌ Deployment failed for ${{ github.repository }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Deployment Failed*\n\nRepository: ${{ github.repository }}\nBranch: ${{ github.ref }}\nCommit: ${{ github.sha }}\n\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Details>"
                  }
                }
              ]
            }
```

#### 步驟 2：設定 GitHub Secrets

在 GitHub Repository 的 Settings → Secrets and variables → Actions 中新增：

- `KUBE_CONFIG`: Kubernetes 配置檔案（base64 編碼）
- `SLACK_WEBHOOK_URL`: Slack Webhook URL（選擇性）

```bash
# 取得 kubeconfig 並編碼
cat ~/.kube/config | base64 -w 0
```

#### 步驟 3：建立多環境部署

```.github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [ develop ]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging

    steps:
      # ... 與 deploy.yml 類似，但部署到 staging 命名空間
      - name: Deploy to Staging
        run: |
          kubectl set image deployment/bookstore-app \
            app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            -n bookstore-staging
```

---

## 總結

本章練習涵蓋了容器化與部署的完整流程：

1. **容器化應用**：

   - 撰寫多階段 Dockerfile 減少映像大小
   - 使用 Docker Compose 編排多容器環境
   - 實作健康檢查和優雅關閉

2. **Kubernetes 部署**：

   - 建立完整的 K8s 資源配置
   - 實作自動擴展（HPA）
   - 測試高可用性和負載均衡

3. **CI/CD**：
   - 使用 GitHub Actions 自動化建置和部署
   - 實作多環境部署策略
   - 整合通知機制

**最佳實踐**：

- 使用多階段建置減少映像大小
- 實作完整的健康檢查
- 使用非 root 使用者執行容器
- 設定適當的資源限制
- 實作自動化測試和部署
- 使用 Secret 管理敏感資訊

---

## 參考資源

- [Docker 官方文件](https://docs.docker.com/)
- [Kubernetes 官方文件](https://kubernetes.io/docs/)
- [GitHub Actions 文件](https://docs.github.com/en/actions)
- [ABP 部署文件](https://docs.abp.io/en/abp/latest/Deployment)
