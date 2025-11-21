# 強制設定控制台編碼為 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Mastering ABP Framework PDF 生成工具  " -ForegroundColor Cyan
Write-Host "  (含習題解答版 - V4)                   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 0. 設定輸出檔名與清理
$outputPdf = "abp-community-learning-kit_with_solutions.pdf"

if (Test-Path $outputPdf) {
    Write-Host "嘗試刪除舊檔案: $outputPdf ..." -ForegroundColor Yellow
    try {
        Remove-Item $outputPdf -Force -ErrorAction Stop
        Write-Host "✓ 舊檔案已刪除" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ 無法刪除舊檔案，請確認檔案未被開啟！" -ForegroundColor Red
        Write-Host "錯誤訊息: $_" -ForegroundColor Red
        exit 1
    }
}

# 1. 執行 Node.js 預先渲染腳本 (含解答版)
Write-Host "步驟 1: 執行預先渲染 (Node.js)..." -ForegroundColor Yellow
node pre-render-with-solutions.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 預先渲染失敗" -ForegroundColor Red
    exit 1
}

# 2. 設定 Pandoc 參數
$tempMd = "temp_combined_with_solutions.md"

# 添加 MiKTeX 到 PATH
$miktexPath = "$env:LOCALAPPDATA\Programs\MiKTeX\miktex\bin\x64"
if (Test-Path $miktexPath) { $env:PATH = "$miktexPath;$env:PATH" }

Write-Host ""
Write-Host "步驟 2: 生成 PDF (Pandoc)..." -ForegroundColor Yellow
Write-Host "輸出檔案: $outputPdf" -ForegroundColor Cyan

# 執行 Pandoc
pandoc $tempMd `
    -o $outputPdf `
    --pdf-engine=xelatex `
    --toc `
    --toc-depth=2 `
    -V CJKmainfont="Microsoft YaHei" `
    -V geometry:margin=2.5cm `
    -V fontsize=12pt `
    -V documentclass=report `
    -V papersize=a4 `
    -V "header-includes=\usepackage{fvextra} \DefineVerbatimEnvironment{Highlighting}{Verbatim}{breaklines=true,commandchars=\\\{\}}" `
    --highlight-style=tango

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ PDF 生成成功！" -ForegroundColor Green
    Write-Host "📄 檔案: $outputPdf" -ForegroundColor Cyan
    
    $open = Read-Host "是否開啟 PDF？(Y/N)"
    if ($open -eq "Y" -or $open -eq "y") { Start-Process $outputPdf }
}
else {
    Write-Host "❌ PDF 生成失敗" -ForegroundColor Red
}
