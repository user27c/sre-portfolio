const initLocalSearch = () => {
  const siteSearch = document.getElementById("site-search");
  const popup = siteSearch?.querySelector('[role="dialog"]');
  const input = document.getElementById("local-search-input");
  const hits = document.getElementById("reimu-hits");
  const stats = document.getElementById("reimu-stats");
  const mask = document.getElementById("mask");
  const closeButton = siteSearch?.querySelector(".popup-btn-close");

  if (!siteSearch || !popup || !input || !hits || !stats || !mask) return;

  const indexUrl = siteSearch.dataset.indexUrl || "/algolia.json";
  let searchData = [];
  let fetchPromise = null;
  let previousFocus = null;

  const setExpanded = (expanded) => {
    document.querySelectorAll(".popup-trigger").forEach((trigger) => {
      trigger.setAttribute("aria-expanded", String(expanded));
    });
  };

  const loadIndex = async () => {
    if (fetchPromise) return fetchPromise;

    stats.textContent = "正在载入搜索索引…";
    fetchPromise = fetch(indexUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        searchData = Array.isArray(data) ? data : [];
        stats.textContent = `可搜索 ${searchData.length} 篇文章`;
        return searchData;
      })
      .catch((error) => {
        fetchPromise = null;
        stats.textContent = "搜索索引载入失败，请稍后重试。";
        console.error("Search index fetch failed:", error);
        return [];
      });

    return fetchPromise;
  };

  const openSearch = () => {
    if (siteSearch.classList.contains("show")) return;

    previousFocus = document.activeElement;
    document.body.classList.add("modal-open");
    siteSearch.classList.add("show");
    popup.classList.add("show");
    mask.classList.remove("hide");
    siteSearch.setAttribute("aria-hidden", "false");
    setExpanded(true);
    window.setTimeout(() => input.focus(), 0);
    void loadIndex();
  };

  const closeSearch = () => {
    document.body.classList.remove("modal-open");
    siteSearch.classList.remove("show");
    popup.classList.remove("show");
    mask.classList.add("hide");
    siteSearch.setAttribute("aria-hidden", "true");
    input.value = "";
    hits.replaceChildren();
    stats.textContent = "";
    setExpanded(false);
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
  };

  const renderResults = (query) => {
    hits.replaceChildren();
    if (!query) {
      stats.textContent = `可搜索 ${searchData.length} 篇文章`;
      return;
    }

    const normalizedQuery = query.toLocaleLowerCase();
    const results = searchData
      .filter((post) => {
        const title = String(post.title || "").toLocaleLowerCase();
        const content = String(post.content || "").toLocaleLowerCase();
        return title.includes(normalizedQuery) || content.includes(normalizedQuery);
      })
      .slice(0, 20);

    stats.textContent = results.length
      ? `找到 ${results.length} 条结果`
      : "没有匹配的文章";

    if (!results.length) {
      const empty = document.createElement("p");
      empty.className = "no-results";
      empty.textContent = "试试更短或不同的关键词。";
      hits.appendChild(empty);
      return;
    }

    const list = document.createElement("ul");
    list.className = "search-result-list";
    results.forEach((post) => {
      const item = document.createElement("li");
      item.className = "search-result-item";
      const link = document.createElement("a");
      link.className = "search-result-title";
      link.href = String(post.permalink || "#");
      link.textContent = String(post.title || "未命名文章");
      item.appendChild(link);
      list.appendChild(item);
    });
    hits.appendChild(list);
  };

  document.querySelectorAll(".popup-trigger").forEach((trigger) => {
    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("click", openSearch);
  });
  closeButton?.addEventListener("click", closeSearch);
  mask.addEventListener("click", closeSearch);
  input.addEventListener("input", () => renderResults(input.value.trim()));

  popup.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSearch();
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = [...popup.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  window.openLocalSearch = openSearch;
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLocalSearch, { once: true });
} else {
  initLocalSearch();
}
