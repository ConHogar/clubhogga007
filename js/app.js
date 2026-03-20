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
        navLinks.style.alignItems = 'center';
      } else {
        navLinks.style.display = 'none'; // reset to hidden on resize down
      }
    });
  }

  // Inject Mobile Sticky CTA
  if (!document.getElementById('mobile-sticky-cta')) {
    const cta = document.createElement('div');
    cta.id = 'mobile-sticky-cta';
    cta.className = 'mobile-sticky-cta';
    cta.innerHTML = '<a href="/hazte-socio/" style="display:block; text-decoration:none; color:white; font-weight:700; font-size:1.125rem;">✨ Únete Hoy y Ahorra Mensualmente</a>';
    document.body.appendChild(cta);

    const style = document.createElement('style');
    style.innerHTML = `
      .mobile-sticky-cta {
        display: none;
        position: fixed;
        bottom: 0; left: 0; right: 0;
        background: var(--accent);
        padding: 1rem;
        text-align: center;
        z-index: 100;
        box-shadow: 0 -4px 12px rgba(0,0,0,0.15);
      }
      @media (max-width: 768px) {
        .mobile-sticky-cta { display: block; }
        body { padding-bottom: 64px; }
      }
    `;
    document.head.appendChild(style);
  }
});
