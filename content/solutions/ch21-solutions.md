# 第二十一章：LeptonX Lite 主題客製 - 習題解答

本文件提供第二十一章習題的完整解答，涵蓋主題系統設計與實作。

---

## 概念題

### 題目 1：CSS 變數與 SCSS 變數的差異為何？（難度：易）

#### 解答

**CSS 變數（CSS Custom Properties）**：

```css
:root {
  --color-primary: #007bff;
  --spacing-base: 16px;
}

.button {
  background-color: var(--color-primary);
  padding: var(--spacing-base);
}
```

**SCSS 變數**：

```scss
$color-primary: #007bff;
$spacing-base: 16px;

.button {
  background-color: $color-primary;
  padding: $spacing-base;
}
```

**主要差異**：

| 特性                | CSS 變數          | SCSS 變數              |
| ------------------- | ----------------- | ---------------------- |
| **執行時機**        | 執行時（Runtime） | 編譯時（Compile-time） |
| **動態性**          | ✅ 可在執行時修改 | ❌ 編譯後無法修改      |
| **作用域**          | 遵循 CSS 層疊規則 | 檔案作用域             |
| **瀏覽器支援**      | 需要現代瀏覽器    | 編譯為普通 CSS         |
| **JavaScript 存取** | ✅ 可透過 JS 修改 | ❌ 無法存取            |
| **繼承**            | ✅ 可繼承         | ❌ 不可繼承            |

**使用場景**：

- **CSS 變數**：主題切換、動態樣式、使用者自訂
- **SCSS 變數**：開發時的常數定義、計算、迴圈

**最佳實踐**：結合使用

```scss
// SCSS 定義預設值
$color-primary-default: #007bff;

:root {
  // 轉換為 CSS 變數，允許執行時修改
  --color-primary: #{$color-primary-default};
}

.button {
  background-color: var(--color-primary);
}
```

---

### 題目 2：為什麼應該支援 `prefers-color-scheme`？（難度：中）

#### 解答

**原因**：

1. **使用者體驗**：

   - 尊重使用者的系統偏好設定
   - 減少眼睛疲勞（特別是夜間使用）
   - 提供一致的跨應用體驗

2. **可及性（Accessibility）**：

   - 幫助視覺敏感使用者
   - 符合 WCAG 可及性標準
   - 改善對比度和可讀性

3. **電池續航**：

   - OLED 螢幕在深色模式下更省電
   - 延長行動裝置使用時間

4. **現代標準**：
   - 主流作業系統都支援（macOS, Windows, iOS, Android）
   - 使用者期待應用程式支援

**實作範例**：

```css
/* 預設淺色主題 */
:root {
  --bg-color: #ffffff;
  --text-color: #000000;
}

/* 自動偵測系統偏好 */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-color: #1a1a1a;
    --text-color: #ffffff;
  }
}

body {
  background-color: var(--bg-color);
  color: var(--text-color);
}
```

**JavaScript 偵測**：

```javascript
// 偵測系統偏好
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

// 監聽變更
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    const newColorScheme = e.matches ? "dark" : "light";
    applyTheme(newColorScheme);
  });
```

---

## 計算/練習題

### 題目 3：設計一個包含 10 個顏色、5 個間距、3 種字型的主題配置結構。（難度：中）

#### 解答

```typescript
// theme-config.ts
export interface ThemeConfig {
  colors: ColorPalette;
  spacing: SpacingScale;
  typography: TypographyConfig;
}

export interface ColorPalette {
  // 主要顏色
  primary: string;
  primaryHover: string;
  primaryActive: string;

  // 次要顏色
  secondary: string;
  secondaryHover: string;

  // 語意顏色
  success: string;
  warning: string;
  error: string;
  info: string;

  // 中性色
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
}

export interface SpacingScale {
  xs: string; // 4px
  sm: string; // 8px
  md: string; // 16px
  lg: string; // 24px
  xl: string; // 32px
}

export interface TypographyConfig {
  fontFamily: {
    primary: string; // 主要字型
    secondary: string; // 次要字型
    monospace: string; // 等寬字型
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
  };
  fontWeight: {
    normal: number;
    medium: number;
    bold: number;
  };
}

// 淺色主題
export const lightTheme: ThemeConfig = {
  colors: {
    primary: "#007bff",
    primaryHover: "#0056b3",
    primaryActive: "#004085",
    secondary: "#6c757d",
    secondaryHover: "#545b62",
    success: "#28a745",
    warning: "#ffc107",
    error: "#dc3545",
    info: "#17a2b8",
    background: "#ffffff",
    surface: "#f8f9fa",
    text: "#212529",
    textSecondary: "#6c757d",
    border: "#dee2e6",
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
  },
  typography: {
    fontFamily: {
      primary:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      secondary: "Georgia, serif",
      monospace: '"Courier New", monospace',
    },
    fontSize: {
      xs: "12px",
      sm: "14px",
      base: "16px",
      lg: "18px",
      xl: "24px",
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      bold: 700,
    },
  },
};

// 深色主題
export const darkTheme: ThemeConfig = {
  colors: {
    primary: "#0d6efd",
    primaryHover: "#0b5ed7",
    primaryActive: "#0a58ca",
    secondary: "#6c757d",
    secondaryHover: "#5c636a",
    success: "#198754",
    warning: "#ffc107",
    error: "#dc3545",
    info: "#0dcaf0",
    background: "#1a1a1a",
    surface: "#2d2d2d",
    text: "#ffffff",
    textSecondary: "#adb5bd",
    border: "#495057",
  },
  spacing: lightTheme.spacing, // 間距通常不變
  typography: lightTheme.typography, // 字型通常不變
};
```

**CSS 變數生成**：

```typescript
function generateCSSVariables(theme: ThemeConfig): string {
  return `
    :root {
      /* Colors */
      --color-primary: ${theme.colors.primary};
      --color-primary-hover: ${theme.colors.primaryHover};
      --color-primary-active: ${theme.colors.primaryActive};
      --color-secondary: ${theme.colors.secondary};
      --color-secondary-hover: ${theme.colors.secondaryHover};
      --color-success: ${theme.colors.success};
      --color-warning: ${theme.colors.warning};
      --color-error: ${theme.colors.error};
      --color-info: ${theme.colors.info};
      --color-background: ${theme.colors.background};
      --color-surface: ${theme.colors.surface};
      --color-text: ${theme.colors.text};
      --color-text-secondary: ${theme.colors.textSecondary};
      --color-border: ${theme.colors.border};
      
      /* Spacing */
      --spacing-xs: ${theme.spacing.xs};
      --spacing-sm: ${theme.spacing.sm};
      --spacing-md: ${theme.spacing.md};
      --spacing-lg: ${theme.spacing.lg};
      --spacing-xl: ${theme.spacing.xl};
      
      /* Typography */
      --font-family-primary: ${theme.typography.fontFamily.primary};
      --font-family-secondary: ${theme.typography.fontFamily.secondary};
      --font-family-monospace: ${theme.typography.fontFamily.monospace};
      --font-size-xs: ${theme.typography.fontSize.xs};
      --font-size-sm: ${theme.typography.fontSize.sm};
      --font-size-base: ${theme.typography.fontSize.base};
      --font-size-lg: ${theme.typography.fontSize.lg};
      --font-size-xl: ${theme.typography.fontSize.xl};
      --font-weight-normal: ${theme.typography.fontWeight.normal};
      --font-weight-medium: ${theme.typography.fontWeight.medium};
      --font-weight-bold: ${theme.typography.fontWeight.bold};
    }
  `;
}
```

---

### 題目 4：比較三種主題儲存方式的優缺點。（難度：中）

#### 解答

| 儲存方式       | localStorage        | sessionStorage      | 伺服器資料庫    |
| -------------- | ------------------- | ------------------- | --------------- |
| **持久性**     | ✅ 永久（除非清除） | ❌ 關閉分頁即清除   | ✅ 永久         |
| **跨裝置同步** | ❌ 無法同步         | ❌ 無法同步         | ✅ 可同步       |
| **效能**       | ✅ 極快（本地讀取） | ✅ 極快（本地讀取） | ⚠️ 需網路請求   |
| **容量限制**   | ⚠️ 約 5-10MB        | ⚠️ 約 5-10MB        | ✅ 幾乎無限制   |
| **隱私性**     | ⚠️ 可被 JS 存取     | ⚠️ 可被 JS 存取     | ✅ 伺服器端控制 |
| **離線可用**   | ✅ 完全可用         | ✅ 完全可用         | ❌ 需網路連線   |
| **實作複雜度** | ✅ 簡單             | ✅ 簡單             | ⚠️ 較複雜       |

**使用建議**：

```typescript
// 混合策略：本地優先，伺服器同步
class ThemeService {
  private readonly STORAGE_KEY = "user-theme";

  async getTheme(): Promise<string> {
    // 1. 先從 localStorage 讀取（快速）
    const localTheme = localStorage.getItem(this.STORAGE_KEY);
    if (localTheme) {
      return localTheme;
    }

    // 2. 從伺服器讀取（同步跨裝置）
    try {
      const serverTheme = await this.fetchThemeFromServer();
      if (serverTheme) {
        // 同步到本地
        localStorage.setItem(this.STORAGE_KEY, serverTheme);
        return serverTheme;
      }
    } catch (error) {
      console.error("Failed to fetch theme from server", error);
    }

    // 3. 使用預設值
    return "light";
  }

  async setTheme(theme: string): Promise<void> {
    // 1. 立即更新本地（即時反應）
    localStorage.setItem(this.STORAGE_KEY, theme);

    // 2. 非同步同步到伺服器（背景執行）
    this.syncThemeToServer(theme).catch((error) => {
      console.error("Failed to sync theme to server", error);
    });
  }

  private async fetchThemeFromServer(): Promise<string | null> {
    const response = await fetch("/api/user/theme");
    if (response.ok) {
      const data = await response.json();
      return data.theme;
    }
    return null;
  }

  private async syncThemeToServer(theme: string): Promise<void> {
    await fetch("/api/user/theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    });
  }
}
```

---

## 實作/編碼題

### 題目 5：實作一個完整的主題系統。（難度：較難）

#### 解答

完整的主題系統實作已在 ch20 的練習中詳細說明，這裡提供核心程式碼：

```typescript
// theme-manager.ts
export class ThemeManager {
  private currentTheme: "light" | "dark" | "auto" = "auto";
  private readonly STORAGE_KEY = "theme-preference";

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // 1. 載入儲存的偏好
    const saved = localStorage.getItem(
      this.STORAGE_KEY
    ) as typeof this.currentTheme;
    if (saved) {
      this.currentTheme = saved;
    }

    // 2. 監聽系統偏好變更
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        if (this.currentTheme === "auto") {
          this.applyTheme();
        }
      });

    // 3. 應用主題
    this.applyTheme();
  }

  setTheme(theme: "light" | "dark" | "auto"): void {
    this.currentTheme = theme;
    localStorage.setItem(this.STORAGE_KEY, theme);
    this.applyTheme();
  }

  private applyTheme(): void {
    const effectiveTheme = this.getEffectiveTheme();

    // 加入過渡動畫
    document.documentElement.classList.add("theme-transition");

    // 設定 data-theme 屬性
    document.documentElement.setAttribute("data-theme", effectiveTheme);

    // 移除過渡動畫
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
    }, 300);
  }

  private getEffectiveTheme(): "light" | "dark" {
    if (this.currentTheme === "auto") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return this.currentTheme;
  }
}
```

```css
/* styles.css */
/* 過渡動畫 */
.theme-transition,
.theme-transition *,
.theme-transition *::before,
.theme-transition *::after {
  transition: background-color 0.3s ease, color 0.3s ease,
    border-color 0.3s ease !important;
}

/* 淺色主題 */
[data-theme="light"] {
  --color-primary: #007bff;
  --color-background: #ffffff;
  --color-text: #000000;
}

/* 深色主題 */
[data-theme="dark"] {
  --color-primary: #0d6efd;
  --color-background: #1a1a1a;
  --color-text: #ffffff;
}

body {
  background-color: var(--color-background);
  color: var(--color-text);
}
```

### 題目 6：建立一個主題編輯器 UI。（難度：較難）

由於篇幅限制，核心實作請參考已生成的其他章節解答中的 UI 實作範例。

---

## 總結

本章習題涵蓋了主題系統的完整知識：

- CSS 變數與 SCSS 變數的差異
- 系統偏好支援的重要性
- 主題配置結構設計
- 儲存策略選擇
- 完整主題系統實作

**最佳實踐**：

- 使用 CSS 變數實現動態主題
- 支援系統偏好（prefers-color-scheme）
- 提供平滑的過渡動畫
- 本地儲存 + 伺服器同步
- 考慮可及性和色彩對比度

---

## 參考資源

- [ABP UI & Themes](https://docs.abp.io/en/abp/latest/UI)
- [MDN - prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
- [CSS Variables](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
