const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 設定
const contentDir = path.join(__dirname, 'content');
const imagesDir = path.join(__dirname, 'generated_diagrams');
const outputFile = path.join(__dirname, 'temp_combined_with_solutions.md');
const readmeFile = path.join(__dirname, 'README.md');

console.log("Starting pre-render process (WITH SOLUTIONS)...");

// 確保圖片目錄存在
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
}

// 讀取 README
let combinedContent = "";

// 添加 Front Matter (YAML Metadata)
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
combinedContent += "\\begin{titlepage}\n";
combinedContent += "\\centering\n";
combinedContent += "\\vspace*{5cm}\n";
combinedContent += "{\\Huge\\bfseries ABP Community Learning V10.0\\\\開源社群版教學\\par}\n";
combinedContent += "\\vspace{1cm}\n";
combinedContent += "{\\Large (含習題解答版)\\par}\n"; // 區分版本
combinedContent += "\\vspace{2cm}\n";
combinedContent += "{\\Large abp-community-learning-kit V1.0\\par}\n";
combinedContent += "\\vspace{4cm}\n";
combinedContent += "{\\Large Google Gemini 3.0 Pro (Antigravity IDE)\\par}\n";
combinedContent += "\\vfill\n";
combinedContent += "{\\large 2025 年 11 月 21 日\\par}\n";
combinedContent += "\\end{titlepage}\n\n";

// 強制分頁
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
    
    combinedContent += "# 前言 {-}\n\n";
    combinedContent += readme + "\n\n";
    combinedContent += "\\clearpage\n\n";
} else {
    console.warn("Warning: README.md not found!");
}

// Mermaid 處理函數
function processMermaid(content, chapterNum) {
    const mermaidRegex = /```mermaid\s+([\s\S]*?)\s*```/g;
    return content.replace(mermaidRegex, (match, code) => {
        diagramCount++;
        const imgName = `diagram_${chapterNum}_${diagramCount}.png`;
        const imgPath = path.join(imagesDir, imgName);
        const mmdPath = path.join(imagesDir, 'temp.mmd');

        console.log(`    Rendering diagram #${diagramCount} to ${imgName}...`);

        fs.writeFileSync(mmdPath, code, 'utf8');

        try {
            let mmdcCmd = process.platform === 'win32' ? 'mmdc.cmd' : 'mmdc';
            execSync(`${mmdcCmd} -i "${mmdPath}" -o "${imgPath}" -b transparent`, { stdio: 'pipe' });
            
            if (fs.existsSync(imgPath)) {
                return `![](${imagesDir.replace(/\\/g, '/')}/${imgName})\n`;
            } else {
                return match;
            }
        } catch (e) {
            try {
                execSync(`npx -y @mermaid-js/mermaid-cli -i "${mmdPath}" -o "${imgPath}" -b transparent`, { stdio: 'pipe' });
                if (fs.existsSync(imgPath)) {
                    return `![](${imagesDir.replace(/\\/g, '/')}/${imgName})\n`;
                }
            } catch (e2) {}
            return match;
        }
    });
}

// 處理章節
let diagramCount = 0;

for (let i = 1; i <= 25; i++) {
    const chapterNum = i.toString().padStart(2, '0');
    const chapterPath = path.join(contentDir, `ch${chapterNum}.md`);
    const solutionPath = path.join(contentDir, 'solutions', `ch${chapterNum}-solutions.md`);

    if (fs.existsSync(chapterPath)) {
        console.log(`Processing Chapter ${i}...`);
        let content = fs.readFileSync(chapterPath, 'utf8');

        // 移除 BOM
        if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

        // 移除 YAML Front Matter
        content = content.replace(/^\s*---\r?\n[\s\S]*?\r?\n---\r?\n/, '');

        // 處理 Mermaid
        content = processMermaid(content, chapterNum);

        combinedContent += content + "\n\n";

        // 處理解答
        if (fs.existsSync(solutionPath)) {
            console.log(`  Found solutions for Chapter ${i}...`);
            let solutionContent = fs.readFileSync(solutionPath, 'utf8');

            if (solutionContent.charCodeAt(0) === 0xFEFF) solutionContent = solutionContent.slice(1);
            solutionContent = solutionContent.replace(/^\s*---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
            
            // 解答中也可能有 Mermaid
            solutionContent = processMermaid(solutionContent, `${chapterNum}_sol`);

            combinedContent += "\n\n---\n\n### 📝 習題解答\n\n" + solutionContent + "\n\n";
        }

        combinedContent += "\\clearpage\n\n";
    }
}

// 寫入合併後的檔案
fs.writeFileSync(outputFile, combinedContent, 'utf8');
console.log(`\nSuccessfully created ${outputFile}`);
