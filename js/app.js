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

});
