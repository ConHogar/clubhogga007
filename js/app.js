// js/app.js - Global interactions

document.addEventListener('DOMContentLoaded', () => {
  // Mobile Menu Toggle
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');

  if(menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      // In a real scenario we'd use a class toggle, but simple inline style for MVP
      if(navLinks.style.display === 'flex') {
        navLinks.style.display = 'none';
      } else {
        navLinks.style.display = 'flex';
        navLinks.style.flexDirection = 'column';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '100%';
        navLinks.style.left = '0';
        navLinks.style.right = '0';
        navLinks.style.background = 'rgba(255,255,255,0.98)';
        navLinks.style.padding = '1rem';
        navLinks.style.borderBottom = '1px solid #E2E8F0';
        navLinks.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
        navLinks.style.alignItems = 'flex-start';
      }
    });

    // Handle resize to fix inline styles
    window.addEventListener('resize', () => {
      if(window.innerWidth > 768) {
        navLinks.style.display = 'flex';
        navLinks.style.flexDirection = 'row';
        navLinks.style.position = 'static';
        navLinks.style.background = 'transparent';
        navLinks.style.padding = '0';
        navLinks.style.borderBottom = 'none';
        navLinks.style.boxShadow = 'none';
      } else {
        navLinks.style.display = 'none'; // reset to hidden on resize down
      }
    });
  }

  // ==== SMART SNACKBAR CTA ====
  // Aparece a los 10 segundos. Si el usuario lo cierra, no lo volvemos a molestar.
  if (!document.getElementById('smart-snackbar') && !sessionStorage.getItem('hogga_snackbar_dismissed')) {
    setTimeout(() => {
      const snackbar = document.createElement('div');
      snackbar.id = 'smart-snackbar';
      snackbar.innerHTML = `
        <button id="close-snackbar" aria-label="Cerrar promoción" style="position:absolute; top:0.5rem; right:0.5rem; background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--border-strong); line-height:1;">&times;</button>
        <div style="display:flex; align-items:center; gap:1rem;">
          <div style="font-size:2.5rem; flex-shrink:0;">🎁</div>
          <div>
            <strong style="display:block; color:var(--text-main); font-size:1.05rem; margin-bottom:0.25rem;">Precio Lanzamiento Activo</strong>
            <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:0.75rem; line-height:1.4;">Asegura tu membresía por solo <b>$3.490/mes</b> antes de que se acaben los últimos 27 cupos.</p>
            <a href="/hazte-socio/" class="btn btn-primary" style="padding:0.4rem 1rem; font-size:0.9rem; width:100%; display:block;">Asegurar mi cupo</a>
          </div>
        </div>
      `;

      const style = document.createElement('style');
      style.innerHTML = `
        #smart-snackbar {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: var(--bg-surface);
          border: 1px solid var(--border-light);
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
          border-radius: var(--radius-md);
          padding: 1.25rem;
          width: calc(100% - 40px);
          max-width: 360px;
          z-index: 9999;
          transform: translateY(120%);
          opacity: 0;
          transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease;
        }
        #smart-snackbar.show {
          transform: translateY(0);
          opacity: 1;
        }
        @media (max-width: 768px) {
          #smart-snackbar {
            bottom: 15px;
            right: 20px; 
          }
        }
      `;
      
      document.head.appendChild(style);
      document.body.appendChild(snackbar);

      // Trigger animation
      requestAnimationFrame(() => {
        setTimeout(() => snackbar.classList.add('show'), 100);
      });

      // Close logic (saves in session)
      document.getElementById('close-snackbar').addEventListener('click', () => {
        snackbar.classList.remove('show');
        sessionStorage.setItem('hogga_snackbar_dismissed', 'true');
        setTimeout(() => snackbar.remove(), 500); 
      });

    }, 10000); // 10 segundos
  }

});
