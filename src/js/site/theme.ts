export type Theme = "dark" | "light";

export const THEME_KEY = "rinne-theme";

export function currentTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // storage unavailable (private mode, blocked): theme stays for this page only
  }
}

/** Wires the theme toggle button. The initial theme is applied inline in <head> to avoid a flash. */
export function initTheme(): void {
  const button = document.getElementById("themeBtn");
  if (!button) return;
  button.addEventListener("click", () => {
    applyTheme(currentTheme() === "dark" ? "light" : "dark");
  });
}
