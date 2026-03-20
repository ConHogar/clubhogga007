document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('benefits-grid');
  const loader = document.getElementById('benefits-loading');
  const cityFilter = document.getElementById('city-filter');
  const categoryFilter = document.getElementById('category-filter');

  if(grid && loader) {
    // In a real scenario, we'll fetch from /api/get-benefits or Supabase directly via public anon key
    // For now we simulate fetching and then show the grid
    setTimeout(() => {
      loader.style.display = 'none';
      grid.style.display = 'grid'; // .grid-3 basically
      applyFilters(); // run once
    }, 600);
  }

  if(cityFilter && categoryFilter) {
    cityFilter.addEventListener('change', applyFilters);
    categoryFilter.addEventListener('change', applyFilters);
  }

  function applyFilters() {
    const selectedCity = cityFilter.value;
    const selectedCategory = categoryFilter.value;
    const cards = document.querySelectorAll('.card');

    cards.forEach(card => {
      const cardCity = card.getAttribute('data-city');
      const cardCat = card.getAttribute('data-category');
      
      let matchCity = (selectedCity === 'all' || selectedCity === cardCity);
      let matchCat = (selectedCategory === 'all' || selectedCategory === cardCat);

      if(matchCity && matchCat) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }
});
