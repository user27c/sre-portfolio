const initMermaid = () => {
  if (!window.mermaid) return;
  const theme = document.documentElement.classList.contains("dark") ? "dark" : "default";
  window.mermaid.initialize({
    startOnLoad: false,
    theme,
    securityLevel: "strict",
  });
  window.mermaid.run({ querySelector: "pre.mermaid", suppressErrors: true });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMermaid, { once: true });
} else {
  initMermaid();
}
