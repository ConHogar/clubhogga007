const fs = require('fs');
let html = fs.readFileSync('beneficios/index.html', 'utf8');

// 1. Remove <style> block
html = html.replace(/<style>[\s\S]*?<\/style>\n/, '');

// 2. Headings
html = html.replace(/<h1 style="font-size: 3rem; margin-bottom: var\(--space-2\);">/, '<h1 class="heading-xl mb-2">');
html = html.replace(/<div style="text-align: center; margin-bottom: var\(--space-8\);">/, '<div class="text-center mb-8">');

// 3. Logo/Btn
html = html.replace(/<img src="\/images\/logo\.webp" alt="Club Hogga" style="height:32px; margin-right:8px; display:inline-block; vertical-align:middle;">/, '<img src="/images/logo.webp" alt="Club Hogga">');
html = html.replace(/class="btn btn-primary" style="padding: 0\.5rem 1rem;"/, 'class="btn btn-primary btn-sm"');

// 4. Filters
html = html.replace(/<strong style="margin-right: auto;">/, '<strong class="filter-label">');

// 5. Card outer
html = html.replace(/<article class="card" onclick="window\.location\.href='\/hazte-socio\/'" style="cursor: pointer; position: relative; transition: all 0\.2s ease;" onmouseover="this\.style\.transform='translateY\(-4px\)'; this\.style\.boxShadow='var\(--shadow-md\)';" onmouseout="this\.style\.transform='translateY\(0\)'; this\.style\.boxShadow='var\(--shadow-sm\)';"/g, '<article class="card card-clickable relative" onclick="window.location.href=\'/hazte-socio/\'"');

// 6. Exclusivo Badge
html = html.replace(/<div style="position: absolute; top: 1rem; right: 1rem; background: var\(--bg-surface\); padding: 0\.25rem 0\.6rem; border-radius: 99px; font-size: 0\.75rem; font-weight: bold; color: var\(--text-main\); border: 1px solid var\(--border-light\); box-shadow: var\(--shadow-sm\); z-index: 2;">/g, '<div class="badge-exclusive">');

// 7. Card header flex
html = html.replace(/<div style="display: flex; align-items: center; gap: 1rem; margin-bottom: var\(--space-4\);">/g, '<div class="card-header">');

// 8. Card Avatar Text (DMOOV/Espacio Blu)
html = html.replace(/<div style="width: 60px; height: 60px; border-radius: 50%; overflow: hidden; border: 1px solid var\(--border-light\); flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: var\(--bg-surface\); font-weight: bold; font-size: 1\.5rem; color: var\(--text-muted\);">/g, '<div class="card-avatar card-avatar-text">');

// 9. Card Avatar Standard
html = html.replace(/<div style="width: 60px; height: 60px; border-radius: 50%; overflow: hidden; border: 1px solid var\(--border-light\); flex-shrink: 0; background: white;">/g, '<div class="card-avatar">');

// 10. Card img instances
html = html.replace(/<img src="([^"]+)" alt="([^"]+)" style="width: 100%; height: 100%; object-fit: contain;">/g, '<img src="$1" alt="$2">');

// 11. Card tags wrapper
html = html.replace(/<div style="margin-bottom: 0\.25rem;">/g, '<div class="card-tags">');

// 12. Chip secondary
html = html.replace(/<span class="chip" style="background: var\(--bg-main\); color: var\(--text-muted\); margin-left: 0\.25rem;">/g, '<span class="chip chip-secondary">');

// 13. Card Title
html = html.replace(/<h3 style="font-size: 1\.25rem; margin: 0;(?: line-height: 1\.2;)?">/g, '<h3 class="card-title">');

// 14. Instagram link
html = html.replace(/<a href="([^"]+)" target="_blank" onclick="event\.stopPropagation\(\)" style="display: inline-flex; align-items: center; gap: 0\.25rem; font-size: 0\.85rem; color: var\(--text-muted\); text-decoration: none; margin-top: 0\.25rem;">/g, '<a href="$1" target="_blank" onclick="event.stopPropagation()" class="social-link-sm">');

// 15. Card Description
html = html.replace(/<p class="text-muted" style="margin-bottom: var\(--space-4\); flex-grow: 1;">/g, '<p class="text-muted card-description">');

fs.writeFileSync('beneficios/index.html', html);
console.log('beneficios/index.html refactored successfully');
