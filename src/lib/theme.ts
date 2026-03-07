const LIGHT_THEME_COLOR = "#ffffff";
const DARK_THEME_COLOR = "#09090b";

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute("content", isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
  }
}

export function syncSystemTheme() {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const update = (isDark: boolean) => applyTheme(isDark);

  update(media.matches);

  const listener = (event: MediaQueryListEvent) => {
    update(event.matches);
  };

  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }

  media.addListener(listener);
  return () => media.removeListener(listener);
}
