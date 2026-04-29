/**
 * ciudad-benefits.js
 * Dynamically loads and renders benefits for a specific city page.
 * Usage: add data-city="city-slug" to the #ciudad-benefits-grid element.
 * The city slug must match the slug in the database (e.g. "puerto-varas").
 */

document.addEventListener('DOMContentLoaded', () => {
  const loadingEl = document.getElementById('ciudad-benefits-loading');
  const gridEl = document.getElementById('ciudad-benefits-grid');

  if (!gridEl) return;

  const citySlug = gridEl.dataset.city;
  if (!citySlug) {
    console.warn('ciudad-benefits.js: no data-city attribute found on #ciudad-benefits-grid');
    return;
  }

  let cities = [];
  let categories = [];

  // ── Utilities ────────────────────────────────────────────────────────────────

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

  // ── Card renderer (mirrors benefits.js) ──────────────────────────────────────

  function renderCard(partner, index) {
    const city = getCity(partner.city_id);
    const cat = getCategory(partner.category_id);
    const mapsUrl = buildMapsUrl(partner);
    const delay = Math.min(index * 0.05, 0.6);

    let benefitTitleStr = '';
    let partnerDescStr = partner.description || '';

    if (partner.benefits && partner.benefits.length > 0) {
      benefitTitleStr = partner.benefits.map(b => b.title).join(' • ');
    } else {
      benefitTitleStr = 'Beneficio se anunciará pronto.';
      const pendingDesc = 'Estamos finalizando los detalles para ofrecerte el mejor descuento.';
      partnerDescStr = partnerDescStr ? pendingDesc + '<br><br>' + partnerDescStr : pendingDesc;
    }

    const avatarHTML = partner.logo_url
      ? `<img src="${partner.logo_url}" alt="${partner.business_name}">`
      : `<div style="width:100%; height:100%; border-radius:50%; background:#eff6ff; color:#1e3a8a; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:1.5rem;">${getInitials(partner.business_name)}</div>`;

    let igHandle = partner.instagram || '';
    if (igHandle) {
      if (igHandle.includes('instagram.com/')) igHandle = igHandle.split('instagram.com/')[1].replace('/', '');
      igHandle = igHandle.split('?')[0].replace('@', '');
    }

    const igHTML = igHandle ? `
      <a href="https://www.instagram.com/${igHandle}/" target="_blank" onclick="event.stopPropagation()" class="social-link-sm">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
        </svg> @${igHandle}
      </a>` : '';

    return `
      <article class="card card-clickable relative" onclick="window.location.href='/hazte-socio/'"
        style="animation-delay:${delay}s; animation-fill-mode:both; animation-name:fadeInUp; cursor:pointer; position:relative; transition:all 0.2s ease;"
        data-city="${citySlug}" data-category="${cat ? cat.slug : ''}">
        <div class="badge-exclusive">🔒 Exclusivo</div>
        <div class="card-header">
          <div class="card-avatar">${avatarHTML}</div>
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
          👉 <strong>${benefitTitleStr}</strong>${partnerDescStr ? '<br>' + partnerDescStr : ''}
        </p>

        <div class="benefit-conditions" style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem; margin-bottom:0; margin-top:auto;">
          <div style="flex:1; display:flex; gap:0.25rem; line-height:1.3;" title="${[partner.address, city ? city.name : ''].filter(Boolean).join(', ')}">
            <span style="flex-shrink:0;">📍</span>
            <span>${[partner.address, city ? city.name : ''].filter(Boolean).join(', ')}</span>
          </div>
          <a href="${mapsUrl}" target="_blank" rel="noopener" class="btn-maps" style="flex-shrink:0; display:inline-flex; align-items:center; gap:0.35rem; background:#eff6ff; color:var(--primary,#0052ff); padding:0.5rem 0.8rem; border-radius:6px; font-size:0.85rem; font-weight:600; text-decoration:none; transition:all 0.2s; white-space:nowrap;" onclick="event.stopPropagation()">
            <span>Cómo llegar</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </article>
    `;
  }

  // ── Fetch & render ────────────────────────────────────────────────────────────

  async function fetchAndRender() {
    try {
      const res = await fetch('/api/public-benefits');
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();

      cities     = data.cities     || [];
      categories = data.categories || [];

      const allPartners = data.partners || [];

      // Filter to only this city's partners
      const cityObj = cities.find(c => c.slug === citySlug);
      const cityPartners = cityObj
        ? allPartners.filter(p => p.city_id === cityObj.id)
        : [];

      // Sort: confirmed benefits first (shuffled), pending last (shuffled)
      function shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      }

      const hasBenefits = cityPartners.filter(p => p.benefits && p.benefits.length > 0);
      const noBenefits  = cityPartners.filter(p => !p.benefits || p.benefits.length === 0);
      const sorted      = [...shuffle(hasBenefits), ...shuffle(noBenefits)];

      if (loadingEl) loadingEl.style.display = 'none';
      gridEl.style.display = 'grid';

      if (sorted.length === 0) {
        gridEl.innerHTML = `
          <div style="grid-column:1/-1; text-align:center; padding:4rem 1rem; background:var(--bg-muted,#f9fafb); border-radius:12px; color:var(--text-muted,#6b7280);">
            <p>Aún no hay beneficios registrados para esta ciudad.</p>
          </div>`;
      } else {
        gridEl.innerHTML = sorted.map((p, i) => renderCard(p, i)).join('');
      }

    } catch (err) {
      console.error('ciudad-benefits.js error:', err);
      if (loadingEl) loadingEl.innerHTML = `<span style="color:red;">No pudimos cargar los beneficios. Intenta recargar la página.</span>`;
    }
  }

  fetchAndRender();
});
