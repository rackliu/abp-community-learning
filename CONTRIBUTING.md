# 貢獻指南

感謝您對 ABP Framework 開源社群版學習教材的興趣！本指南將幫助您了解如何貢獻。

## 行為準則

本專案採用 [Contributor Covenant](https://www.contributor-covenant.org/) 行為準則。參與本專案即表示您同意遵守此準則。

## 如何貢獻

### 報告錯誤

如果您發現教材中的錯誤或不準確之處，請提交 Issue：

1. 使用清晰的標題描述問題
2. 提供詳細的描述與重現步驟
3. 指出您使用的 ABP 版本與 .NET 版本
4. 附加相關的程式碼片段或截圖

### 建議功能或改進

如果您有改進教材的建議，請提交 Issue：

1. 使用清晰的標題描述建議
2. 提供詳細的說明與使用場景
3. 列舉可能的實作方式

### 提交程式碼

1. Fork 本倉庫
2. 建立功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'Add amazing feature'`)
4. 推送至分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

### 改進文件

文件改進同樣歡迎！包括：

- 修正拼寫或語法錯誤
- 改進清晰度與可讀性
- 添加缺失的說明或範例
- 翻譯至其他語言

## Pull Request 流程

1. 確保您的程式碼遵循專案的編碼風格
2. 更新相關文件
3. 添加或更新測試
4. 確保所有測試通過
5. 提供清晰的 PR 描述

## 編碼風格

### C# 編碼風格

- 遵循 [Microsoft C# 編碼慣例](https://docs.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions)
- 使用 4 個空格進行縮排
- 使用有意義的變數名稱
- 添加 XML 文件註解

### Markdown 編碼風格

- 使用 2 個空格進行縮排
- 使用 `#` 表示標題（不使用底線）
- 在程式碼塊中指定語言
- 保持行長度在 100 個字元以內

## 教案撰寫指南

### 章節結構

每章應包含：

1. **學習目標**：清晰列舉本章的學習成果
2. **先修知識**：列舉所需的前置知識
3. **建議時數**：估計完成本章所需的時間
4. **核心內容**：分節講解主要概念
5. **程式碼範例**：提供可執行的範例
6. **練習題**：包括基礎、進階、實作題
7. **驗收標準**：列舉完成本章的檢核清單
8. **延伸閱讀**：提供相關資源連結

### 程式碼範例

- 所有程式碼範例必須可執行
- 包含必要的 using 陳述式
- 添加註解解釋複雜邏輯
- 遵循 C# 編碼風格
- 包含錯誤處理

### 練習題

- **基礎題**：測試基本概念理解
- **進階題**：要求分析與設計能力
- **實作題**：要求實際編碼與驗證

每題應包含：

- 清晰的題目描述
- 參考解答或驗收標準
- 難度等級

## 版本與相容性

本教材針對 ABP Framework 10.0.x 開源社群版編寫。

- 所有範例必須在 .NET 10.0 上測試
- 標註任何版本特定的功能
- 提供向後相容性說明（如適用）

## 測試

### 單元測試

- 所有程式碼範例應包含單元測試
- 使用 xUnit 或 MSTest
- 測試覆蓋率應 > 80%

### 整合測試

- 提供整合測試範例
- 使用 Testcontainers 進行資料庫測試
- 測試應在 CI/CD 中自動執行

## 文件建置

### 本地建置

```bash
# 安裝依賴
npm install

# 建置文件
npm run build

# 預覽
npm run serve
```

### PDF 生成

```bash
# 安裝 Pandoc
sudo apt-get install pandoc texlive-xetex

# 生成 PDF
pandoc docs/**/*.md -o output.pdf
```

## 提交訊息規範

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 規範：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 類型

- `feat`: 新功能或章節
- `fix`: 修正錯誤
- `docs`: 文件改進
- `style`: 格式調整
- `refactor`: 重構
- `test`: 測試相關
- `chore`: 維護工作

### 範例

```
feat(ch05): add module system deep dive section

Add comprehensive explanation of ABP module system
including dependency management and configuration.

Closes #123
```

## 審查流程

1. 至少一位維護者審查 PR
2. 自動化測試必須通過
3. 程式碼風格檢查必須通過
4. 文件必須更新
5. 合併前需要批准

## 發行流程

### 版本編號

遵循 [Semantic Versioning](https://semver.org/)：

- MAJOR：不相容的 API 變更
- MINOR：向後相容的功能添加
- PATCH：向後相容的錯誤修復

### 發行步驟

1. 更新 CHANGELOG.md
2. 更新版本號
3. 建立 Git tag
4. 發佈 Release
5. 生成 PDF 文件

## 社群

- **GitHub Discussions**：https://github.com/abpframework/abp/discussions
- **官方文件**：https://docs.abp.io
- **EasyAbp**：https://www.easyabp.io

## 授權

本專案採用 MIT 授權。提交 PR 即表示您同意將您的貢獻授權給本專案。

## 聯絡方式

- 提交 Issue：https://github.com/abpframework/abp/issues
- 社群論壇：https://github.com/abpframework/abp/discussions

感謝您的貢獻！
