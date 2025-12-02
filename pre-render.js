const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 設定
const contentDir = path.join(__dirname, 'content');
const imagesDir = path.join(__dirname, 'generated_diagrams');
const outputFile = path.join(__dirname, 'temp_combined_for_pdf.md');
const readmeFile = path.join(__dirname, 'README.md');

console.log("Starting pre-render process...");

// 確保圖片目錄存在
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
}

// 讀取 README
let combinedContent = "";

// 添加 Front Matter (YAML Metadata)
// 移除 title, author 等，避免 Pandoc 自動生成封面導致衝突
combinedContent += "---\n";
combinedContent += "documentclass: report\n";
combinedContent += "papersize: a4\n";
combinedContent += "fontsize: 12pt\n";
combinedContent += "geometry: margin=2.5cm\n";
combinedContent += "toc: true\n";
combinedContent += "toc-depth: 2\n";
combinedContent += "CJKmainfont: 'Microsoft YaHei'\n";
combinedContent += "---\n\n";

// 強制生成封面 (LaTeX)
// 使用 \begin{titlepage} ... \end{titlepage} 確保封面獨立
combinedContent += "\\begin{titlepage}\n";
combinedContent += "\\centering\n";
combinedContent += "\\vspace*{5cm}\n";
combinedContent += "{\\Huge\\bfseries ABP Community Learning V10.0\\\\開源社群版教學\\par}\n";
combinedContent += "\\vspace{2cm}\n";
combinedContent += "{\\Large abp-community-learning-kit V1.0\\par}\n";
combinedContent += "\\vspace{4cm}\n";
combinedContent += "{\\Large Google Gemini 3.0 Pro (Antigravity IDE)\\par}\n";
combinedContent += "\\vfill\n";
combinedContent += "{\\large 2025 年 11 月 21 日\\par}\n";
combinedContent += "\\end{titlepage}\n\n";

// 強制分頁，確保封面後是全新的頁面
combinedContent += "\\clearpage\n\n";

// 添加 README (前言)
if (fs.existsSync(readmeFile)) {
    console.log("Processing README...");
    let readme = fs.readFileSync(readmeFile, 'utf8');
    
    // 移除 BOM
    if (readme.charCodeAt(0) === 0xFEFF) {
        readme = readme.slice(1);
    }

    // 移除 README 可能存在的 YAML front matter
    readme = readme.replace(/^\s*---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
    
    combinedContent += "# 前言 {-}\n\n"; // {-} 表示不編號
    combinedContent += readme + "\n\n";
    combinedContent += "\\newpage\n\n";
} else {
    console.warn("Warning: README.md not found!");
}

// 處理章節
let diagramCount = 0;
let totalDiagramsFound = 0;

for (let i = 1; i <= 25; i++) {
    const chapterNum = i.toString().padStart(2, '0');
    const chapterPath = path.join(contentDir, `ch${chapterNum}.md`);

    if (fs.existsSync(chapterPath)) {
        console.log(`Processing Chapter ${i}...`);
        let content = fs.readFileSync(chapterPath, 'utf8');

        // 移除 BOM (Byte Order Mark)
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
        }

        // 移除 YAML Front Matter (允許開頭有空白)
        content = content.replace(/^\s*---\r?\n[\s\S]*?\r?\n---\r?\n/, '');

        // 處理 Mermaid 區塊
        // 使用更寬鬆的正則表達式
        const mermaidRegex = /```mermaid\s+([\s\S]*?)\s*```/g;
        
        content = content.replace(mermaidRegex, (match, code) => {
            totalDiagramsFound++;
            diagramCount++;
            const imgName = `diagram_${chapterNum}_${diagramCount}.png`;
            const imgPath = path.join(imagesDir, imgName);
            const mmdPath = path.join(imagesDir, 'temp.mmd');

            console.log(`  Found diagram #${diagramCount}, rendering to ${imgName}...`);

            // 寫入臨時 mmd 檔案 (UTF-8)
            fs.writeFileSync(mmdPath, code, 'utf8');

            // 執行 mmdc
            try {
                // 嘗試尋找 mmdc.cmd
                let mmdcCmd = 'mmdc';
                // 在 Windows 上，如果全域安裝，通常是 mmdc.cmd
                if (process.platform === 'win32') {
                    mmdcCmd = 'mmdc.cmd';
                }

                // 執行命令
                // -i: input, -o: output, -b: background transparent
                execSync(`${mmdcCmd} -i "${mmdPath}" -o "${imgPath}" -b transparent`, { stdio: 'pipe' }); // pipe 隱藏輸出，除非出錯
                
                // 檢查圖片是否真的生成
                if (fs.existsSync(imgPath)) {
                    console.log(`    ✓ Generated: ${imgName}`);
                    // 返回圖片 Markdown (使用 forward slashes)
                    return `![](${imagesDir.replace(/\\/g, '/')}/${imgName})\n`;
                } else {
                    console.error(`    ❌ Failed to generate image: ${imgName} (File not found)`);
                    return match;
                }
            } catch (e) {
                console.error(`    ❌ Error rendering diagram ${imgName}:`);
                console.error(`       Command failed: ${e.message}`);
                // 嘗試使用 npx 作為備案
                try {
                    console.log("    Attempting with npx...");
                    execSync(`npx -y @mermaid-js/mermaid-cli -i "${mmdPath}" -o "${imgPath}" -b transparent`, { stdio: 'pipe' });
                    if (fs.existsSync(imgPath)) {
                        console.log(`    ✓ Generated with npx: ${imgName}`);
                        return `![](${imagesDir.replace(/\\/g, '/')}/${imgName})\n`;
                    }
                } catch (e2) {
                    console.error(`    ❌ npx also failed: ${e2.message}`);
                }
                return match; // 如果失敗，保留原始代碼
            }
        });

        combinedContent += content + "\n\n\\newpage\n\n";
    }
}

console.log(`\nTotal diagrams found: ${totalDiagramsFound}`);
console.log(`Total diagrams processed: ${diagramCount}`);

// 寫入合併後的檔案
fs.writeFileSync(outputFile, combinedContent, 'utf8');
console.log(`\nSuccessfully created ${outputFile}`);
