const initSite = () => {
  const root = document.documentElement;
  const toggleButton = document.getElementById("theme-toggle");

  const syncThemeButton = () => {
    if (!toggleButton) return;
    const isDark = root.classList.contains("dark");
    toggleButton.setAttribute("aria-pressed", String(isDark));
    toggleButton.setAttribute("aria-label", isDark ? "切换到浅色主题" : "切换到深色主题");
  };

  syncThemeButton();
  toggleButton?.addEventListener("click", () => {
    const isDark = root.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    syncThemeButton();
  });

  if (/Mac|iPhone|iPad/.test(navigator.platform)) {
    document.querySelectorAll(".shortcut-modifier").forEach((element) => {
      element.textContent = "⌘";
    });
  }

  window.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      window.openLocalSearch?.();
    }
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSite, { once: true });
} else {
  initSite();
}
