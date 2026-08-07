const initCodeCopy = () => {
  document.querySelectorAll("pre").forEach((block) => {
    if (block.classList.contains("mermaid") || block.querySelector(".copy-code-btn")) return;

    const code = block.querySelector("code");
    if (!code) return;

    block.style.position = "relative";
    const button = document.createElement("button");
    button.className = "copy-code-btn";
    button.type = "button";
    button.textContent = "Copy";
    button.setAttribute("aria-label", "Copy code");
    block.appendChild(button);

    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code.innerText);
        button.textContent = "Copied!";
        button.classList.add("copied");
        window.setTimeout(() => {
          button.textContent = "Copy";
          button.classList.remove("copied");
        }, 1600);
      } catch (error) {
        button.textContent = "Copy failed";
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
