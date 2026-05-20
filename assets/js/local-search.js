document.addEventListener('DOMContentLoaded', () => {
  let searchData = [];
  let isFetched = false;

  const searchInput = document.getElementById('local-search-input');
  const hitsContainer = document.getElementById('reimu-hits');
  const statsContainer = document.getElementById('reimu-stats');
  const popup = document.querySelector('.popup');
  const mask = document.getElementById('mask');
  const siteSearch = document.querySelector('.site-search');
  const indexUrl = window.__SEARCH_INDEX_URL || '/algolia.json';

  const openSearch = () => {
    document.body.style.overflow = 'hidden';
    siteSearch.classList.add('show');
    mask.classList.remove('hide');
    setTimeout(() => searchInput.focus(), 100);

    // Fetch data lazy load
    if (!isFetched) {
      statsContainer.innerHTML = 'Loading search index...';
      fetch(indexUrl)
        .then(res => res.json())
        .then(data => {
          searchData = data;
          isFetched = true;
          statsContainer.innerHTML = 'Ready to search ' + data.length + ' posts.';
        })
        .catch(err => {
          statsContainer.innerHTML = 'Failed to load search index.';
          console.error('Search JSON fetch error:', err);
        });
    }
  };

  // Close Search Modal
  const closeSearch = () => {
    document.body.style.overflow = '';
    siteSearch.classList.remove('show');
    mask.classList.add('hide');
    searchInput.value = '';
    hitsContainer.innerHTML = '';
    if (isFetched) {
        statsContainer.innerHTML = '';
    }
  };

  if (popup) {
    popup.__closePopup = closeSearch;
  }
  window.openLocalSearch = openSearch;

  // Bind Triggers
  document.querySelectorAll('.popup-trigger').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      openSearch();
    });
  });

  const closeBtn = document.querySelector('.popup-btn-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeSearch);
  }

  // Escape key to close
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && siteSearch.classList.contains('show')) {
      closeSearch();
    }
  });

  // Search Logic
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const query = this.value.trim().toLowerCase();
      if (!query) {
        hitsContainer.innerHTML = '';
        statsContainer.innerHTML = 'Search across ' + searchData.length + ' posts.';
        return;
      }

      const results = searchData.filter(post => {
        return (post.title && post.title.toLowerCase().includes(query)) ||
               (post.content && post.content.toLowerCase().includes(query));
      });

      statsContainer.innerHTML = `Found ${results.length} result(s).`;

      if (results.length === 0) {
        hitsContainer.innerHTML = '<div class="no-results">No posts found matching your query.</div>';
        return;
      }

      let html = '<ul class="search-result-list">';
      results.forEach(post => {
        html += `
          <li class="search-result-item">
            <a href="${post.permalink}" class="search-result-title">${post.title}</a>
          </li>
        `;
      });
      html += '</ul>';

      hitsContainer.innerHTML = html;
    });
  }
});
