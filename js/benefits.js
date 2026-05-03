const styleBlock = document.createElement('style');
styleBlock.textContent = `
  .card-avatar-text {
    background: #eff6ff;
    color: #1e3a8a;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1.5rem;
  }
  .btn-maps {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: #eff6ff;
    color: var(--primary, #0052ff);
    padding: 0.5rem 0.8rem;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .btn-maps:hover {
    background: #dbeafe;
  }
  .empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 4rem 1rem;
    background: var(--bg-muted, #f9fafb);
    border-radius: 12px;
    color: var(--text-muted, #6b7280);
  }
  .empty-state h3 {
    margin-top: 1rem;
    color: var(--text-main, #111827);
    font-size: 1.25rem;
  }
  .btn-maps svg {
    flex-shrink: 0;
  }
  .filters-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  @media (max-width: 768px) {
    .filters-wrapper {
      flex-direction: column;
      align-items: flex-start;
    }
  }
`;
document.head.appendChild(styleBlock);

document.addEventListener('DOMContentLoaded', () => {
  const loadingEl = document.getElementById('benefits-loading');
  const gridEl = document.getElementById('benefits-grid');
  const cityFilter = document.getElementById('city-filter');
  const categoryFilter = document.getElementById('category-filter');
  
  // Wrap filters dynamically to add results count on the right
  const filtersDiv = document.querySelector('.filters');
  if (filtersDiv) {
    const wrapper = document.createElement('div');
    wrapper.className = 'filters-wrapper';
    filtersDiv.parentNode.insertBefore(wrapper, filtersDiv);
    wrapper.appendChild(filtersDiv);
    
    // Check if we already have the results count (prevent duplicates during hot-reloads)
    if(!document.getElementById('results-count')) {
      const resultsCountEl = document.createElement('div');
      resultsCountEl.id = 'results-count';
      resultsCountEl.className = 'text-muted';
      wrapper.appendChild(resultsCountEl);
    }
  }

  const resultsCount = document.getElementById('results-count');

  let cities = [];
  let categories = [];
  let shuffledPartners = [];

  // Utilities
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function getCity(id) { return cities.find(c => c.id === id); }
  function getCategory(id) { return categories.find(c => c.id === id); }
  
  function getInitials(name) {
    if (!name) return '';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  function buildMapsUrl(partner) {
    if (partner.google_maps_url) return partner.google_maps_url;
    const city = getCity(partner.city_id);
    const q = encodeURIComponent(`${partner.business_name} ${partner.address} ${city ? city.name : ''}`);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }

  async function fetchBenefits() {
    try {
      const response = await fetch('/api/public-benefits');
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      cities = data.cities || [];
      categories = data.categories || [];
      
      // Populate filters dynamically
      cityFilter.innerHTML = '<option value="all" selected>Todas las ciudades</option>';
      cities.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.slug;
        opt.textContent = c.name;
        cityFilter.appendChild(opt);
      });

      categoryFilter.innerHTML = '<option value="all" selected>Todas las categorías</option>';
      categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.slug;
        opt.textContent = c.name;
        categoryFilter.appendChild(opt);
      });

      // Store and sort/shuffle partners (those with active benefits first)
      const allPartners = data.partners || [];
      const hasBenefits = allPartners.filter(p => p.benefits && p.benefits.length > 0);
      const noBenefits = allPartners.filter(p => !p.benefits || p.benefits.length === 0);
      
      shuffledPartners = [...shuffle(hasBenefits), ...shuffle(noBenefits)];
      
      loadingEl.style.display = 'none';
      gridEl.style.display = 'grid'; // .grid-3 is on the element
      render();

    } catch (error) {
      console.error("Error fetching benefits:", error);
      loadingEl.style.display = '';
      loadingEl.innerHTML = `<span style="color:red">No pudimos cargar los beneficios. Intenta recargar la página.</span>`;
    }
  }

  function renderCard(partner, index) {
    const city = getCity(partner.city_id);
    const cat = getCategory(partner.category_id);
    const mapsUrl = buildMapsUrl(partner);
    const delay = Math.min(index * 0.04, 0.6);

    let benefitTitleStr = '';
    let partnerDescStr = partner.description || '';

    if (partner.benefits && partner.benefits.length > 0) {
      benefitTitleStr = partner.benefits.map(b => b.title).join(' • ');
    } else {
      benefitTitleStr = '🔥 VIENE LO BUENO';
      const pendingDesc = 'Estamos cerrando el trato. Va a valer la pena.';
      partnerDescStr = partnerDescStr ? pendingDesc + '<br><br>' + partnerDescStr : pendingDesc;
    }

    const avatarHTML = partner.logo_url
      ? `<img src="${partner.logo_url}" alt="${partner.business_name}">`
      : `<div class="card-avatar-text" style="width:100%; height:100%; border-radius:50%;"><span>${getInitials(partner.business_name)}</span></div>`;

    let igHandle = partner.instagram || '';
    if (igHandle) {
      if (igHandle.includes('instagram.com/')) igHandle = igHandle.split('instagram.com/')[1].replace('/', '');
      igHandle = igHandle.split('?')[0].replace('@', '');
    }

    const igHTML = igHandle
      ? `
        <a href="https://www.instagram.com/${igHandle}/" target="_blank" onclick="event.stopPropagation()" class="social-link-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg> @${igHandle}
        </a>`
      : '';

    return `
      <article class="card card-clickable relative" onclick="window.location.href='/hazte-socio/'" style="animation-delay: ${delay}s; animation-fill-mode: both; animation-name: fadeInUp;">
        <div class="badge-exclusive">🔒 Exclusivo</div>
        <div class="card-header">
          <div class="card-avatar">
            ${avatarHTML}
          </div>
          <div>
            <div class="card-tags">
              <span class="chip">${cat ? cat.name : ''}</span>
              <span class="chip chip-secondary">${city ? city.name : ''}</span>
            </div>
            <h3 class="card-title">${partner.business_name}</h3>
            ${igHTML}
          </div>
        </div>
        
        <p class="text-muted card-description" style="flex:1;">
          👉 <strong>${benefitTitleStr}</strong>${partnerDescStr ? ' <br>' + partnerDescStr : ''}
        </p>
        
        <div class="benefit-conditions" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0; margin-top: auto;">
          <div style="flex:1; display:flex; gap:0.25rem; line-height: 1.3;" title="${[partner.address, city ? city.name : ''].filter(Boolean).join(', ')}">
            <span style="flex-shrink:0;">📍</span>
            <span>${[partner.address, city ? city.name : ''].filter(Boolean).join(', ')}</span>
          </div>
          <a href="${mapsUrl}" target="_blank" rel="noopener" class="btn-maps" style="flex-shrink:0;" onclick="event.stopPropagation()">
            <span>Cómo llegar</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </article>
    `;
  }

  function renderEmpty() {
    return `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <h3>No encontramos beneficios</h3>
        <p>Intenta con otra combinación de filtros.</p>
      </div>
    `;
  }

  function render() {
    const cityVal = cityFilter.value;
    const catVal = categoryFilter.value;

    const filtered = shuffledPartners.filter(p => {
      const city = getCity(p.city_id);
      const cat = getCategory(p.category_id);
      const cityMatch = cityVal === 'all' || (city && city.slug === cityVal);
      const catMatch = catVal === 'all' || (cat && cat.slug === catVal);
      return cityMatch && catMatch;
    });

    if (filtered.length === 0) {
      gridEl.innerHTML = renderEmpty();
    } else {
      gridEl.innerHTML = filtered.map((p, i) => renderCard(p, i)).join('');
    }

    // Update count
    const cityLabel = cityVal === 'all' ? 'todas las ciudades' : (cities.find(c => c.slug === cityVal)?.name || '');
    if (resultsCount) {
      resultsCount.innerHTML = `Mostrando <strong>${filtered.length}</strong> beneficio${filtered.length !== 1 ? 's' : ''} en ${cityLabel}`;
    }
  }

  cityFilter.addEventListener('change', render);
  categoryFilter.addEventListener('change', render);

  fetchBenefits();
});
