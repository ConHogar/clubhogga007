document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('signup-form');
  const btn = document.getElementById('submit-btn');
  const errorDiv = document.getElementById('form-error');
  const successDiv = document.getElementById('form-success');

  if(form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const rut = document.getElementById('rut').value.trim();
      if(rut.length < 8) {
        showError('Por favor ingresa un RUT válido.');
        return;
      }
      
      const terms = document.getElementById('terms').checked;
      const privacy = document.getElementById('privacy').checked;
      if(!terms || !privacy) {
        showError('Debes aceptar los términos y políticas para continuar.');
        return;
      }

      const originalBtnText = btn.innerText;
      btn.innerText = 'Redirigiendo al pago seguro...';
      btn.disabled = true;
      errorDiv.style.display = 'none';

      try {
        const payload = {
          full_name: document.getElementById('full_name').value.trim(),
          rut: rut,
          email: document.getElementById('email').value.trim(),
          phone: normalizePhone(document.getElementById('phone').value.trim()),
          city_slug: document.getElementById('city_slug').value,
          marketing_opt_in: document.getElementById('marketing').checked,
          'cf-turnstile-response': document.querySelector('[name="cf-turnstile-response"]')?.value || ''
        };

        const response = await fetch('/api/create-member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if(!response.ok) {
          showError(data.error || 'Ocurrió un error al procesar la solicitud.');
          btn.innerText = originalBtnText;
          btn.disabled = false;
          return;
        }

        // Reemplazar contenido con spinner suave
        form.innerHTML = `
          <div style="text-align: center; padding: 2rem 0;">
            <div style="margin: 0 auto 1.5rem; border: 4px solid var(--border-light); border-top: 4px solid var(--primary); border-radius: 50%; width: 50px; height: 50px; animation: spin 0.8s linear infinite;"></div>
            <h3 style="color: var(--text-main); margin-bottom: 0.5rem;">Suscripción lista para activar</h3>
            <p class="text-muted">Abriendo entorno seguro de MercadoPago...</p>
          </div>
          <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        `;
        successDiv.style.display = 'none';
        
        // Redirigir la ventana del usuario a MercadoPago
        if(data.payment_url) {
          setTimeout(() => {
            window.location.href = data.payment_url;
          }, 2500); // 2.5 segundos para que alcancen a leer el mensaje
        }
        
      } catch (err) {
        console.error(err);
        showError('Ocurrió un error de conexión al generar tu orden. Intenta nuevamente.');
        btn.innerText = originalBtnText;
        btn.disabled = false;
      }
    });
  }

  function showError(msg) {
    errorDiv.innerText = msg;
    errorDiv.style.display = 'block';
  }

  function normalizePhone(phoneStr) {
    if (!phoneStr) return ''; // Phone is optional
    
    // Remove spaces, dashes, and everything except digits and plus sign
    let clean = phoneStr.replace(/[^\d+]/g, '');
    
    // Remove leading '+' for easier length checking
    if (clean.startsWith('+')) {
      clean = clean.substring(1);
    }
    
    // Handle different Chilean number lengths
    if (clean.length === 8) {
      // User entered 12345678 -> +56912345678
      return '+569' + clean;
    } else if (clean.length === 9 && clean.startsWith('9')) {
      // User entered 912345678 -> +56912345678
      return '+56' + clean;
    } else if (clean.length === 11 && clean.startsWith('56')) {
      // User entered 56912345678 -> +56912345678
      return '+' + clean;
    }
    
    // If it's a foreign number or weird format, just make sure it has a plus sign
    return phoneStr.startsWith('+') ? phoneStr.replace(/[^\d+]/g, '') : '+' + clean;
  }
});
