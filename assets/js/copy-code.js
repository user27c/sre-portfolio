const initCodeCopy = () => {
  document.querySelectorAll("pre").forEach((block) => {
    if (block.classList.contains("mermaid") || block.querySelector(".copy-code-btn")) return;

    const code = block.querySelector("code");
    if (!code) return;

    block.style.position = "relative";
    const button = document.createElement("button");
    button.className = "copy-code-btn";
    button.type = "button";
    button.textContent = "复制";
    button.setAttribute("aria-label", "复制代码");
    block.appendChild(button);

    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code.innerText);
        button.textContent = "已复制";
        button.classList.add("copied");
        window.setTimeout(() => {
          button.textContent = "复制";
          button.classList.remove("copied");
        }, 1600);
      } catch (error) {
        button.textContent = "复制失败";
        console.error("Copy code failed:", error);
      }
    });
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCodeCopy, { once: true });
} else {
  initCodeCopy();
}
