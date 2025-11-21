# PDF 生成指南

本專案提供兩種 PDF 生成方式，可將所有 Markdown 教材轉換為專業的 PDF 文件。

## 📋 前置需求

### 1. 安裝 Pandoc

**使用 Chocolatey（推薦）：**

```powershell
choco install pandoc
```

**或手動下載：**

- 訪問 https://pandoc.org/installing.html
- 下載 Windows 安裝程式
- 執行安裝

### 2. 安裝 MiKTeX（LaTeX 引擎）

**使用 Chocolatey：**

```powershell
choco install miktex
```

**或手動下載：**

- 訪問 https://miktex.org/download
- 下載 Windows 安裝程式
- 執行安裝（選擇 "Install missing packages on-the-fly: Yes"）

### 3. 安裝 Node.js（圖表渲染需要）

**使用 Chocolatey：**

```powershell
choco install nodejs
```

**或手動下載：**

- 訪問 https://nodejs.org/
- 下載 LTS 版本
- 執行安裝

### 4. 安裝圖表渲染工具

**安裝 Mermaid CLI：**

```powershell
npm install -g @mermaid-js/mermaid-cli
npm install -g mermaid-filter
```

**安裝 PlantUML（可選）：**

```powershell
# 需要 Java
choco install openjdk

# 下載 PlantUML
# 訪問 https://plantuml.com/download
# 下載 plantuml.jar
```

### 5. 驗證安裝

```powershell
# 檢查 Pandoc
pandoc --version

# 檢查 XeLaTeX（MiKTeX 的一部分）
xelatex --version

# 檢查 Node.js
node --version

# 檢查 Mermaid CLI
mmdc --version
```

## 🚀 使用方法

### 方案 A：生成教材 PDF（不含習題解答）

```powershell
.\build-pdf.ps1
```

**輸出檔案：** `abp-community-learning-kit.pdf`

**包含內容：**

- ✅ **章節編號**：自動編號所有章節和小節
- ✅ **專業排版**：A4 紙張，2.5cm 邊距，12pt 字體
- ✅ **分頁處理**：每章自動分頁

## 🎨 自訂選項

如需自訂 PDF 樣式，可編輯腳本中的 Pandoc 參數：

```powershell
pandoc $tempMd `
    -o $outputPdf `
    --pdf-engine=xelatex `
    -V CJKmainfont="Microsoft YaHei" `  # 更改字體
    -V geometry:margin=2.5cm `          # 更改邊距
    -V fontsize=12pt `                  # 更改字體大小
    --highlight-style=tango             # 更改程式碼配色
```

### 可用的程式碼配色方案：

- `tango`（推薦）
- `pygments`
- `kate`
- `monochrome`
- `breezedark`
- `haddock`

### 可用的中文字體：

- `Microsoft YaHei`（微軟雅黑）
- `SimSun`（宋體）
- `SimHei`（黑體）
- `KaiTi`（楷體）

## ⚠️ 常見問題

### 問題 1：找不到 pandoc 命令

**解決方案：**

1. 確認已安裝 Pandoc
2. 重啟 PowerShell
3. 檢查環境變數是否包含 Pandoc 路徑

### 問題 2：xelatex 錯誤

**解決方案：**

1. 確認已安裝 MiKTeX
2. 首次執行時，MiKTeX 會自動下載缺少的套件，請耐心等待
3. 如果失敗，手動執行：`mpm --install=xetex`

### 問題 3：中文顯示為方框

## 🔧 進階選項

### 生成特定章節

如需只生成特定章節，可修改腳本中的迴圈：

```powershell
# 只生成 ch01-ch10
for ($i = 1; $i -le 10; $i++) {
    # ...
}
```

### 添加封面圖片

在腳本中添加：

```powershell
-V titlepage=true `
-V titlepage-background="cover.pdf"
```

## 📚 其他轉換方案

### 方案 2：使用 Typora（GUI 工具）

1. 安裝 Typora：https://typora.io/
2. 開啟 Markdown 文件
3. 選擇 `File` → `Export` → `PDF`

**優點：** 簡單易用，所見即所得
**缺點：** 需要手動合併多個文件

### 方案 3：使用 Markdown PDF（VS Code 擴充）

1. 安裝 VS Code 擴充：`Markdown PDF`
2. 開啟 Markdown 文件
3. 右鍵選擇 `Markdown PDF: Export (pdf)`

**優點：** 整合在 VS Code 中
**缺點：** 需要手動合併多個文件

## 📞 技術支援

如遇到問題，請檢查：

1. Pandoc 版本：`pandoc --version`（建議 2.19+）
2. MiKTeX 版本：`xelatex --version`
3. PowerShell 版本：`$PSVersionTable.PSVersion`（建議 5.1+）

---

**最後更新：** 2025 年 11 月 20 日
