document.addEventListener('DOMContentLoaded', () => {
  // 1. Obtener Token de la URL (?k=)
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('k');

  if(!token) {
    document.getElementById('no-token-alert').style.display = 'block';
    document.getElementById('validate-btn').disabled = true;
    return;
  }

  // Cargar info del comercio (logo y nombre)
  fetch(`/api/get-partner-info?k=${token}`)
    .then(r => r.json())
    .then(data => {
      if (data.status === 'success' && data.partner) {
        const logosContainer = document.getElementById('logos-container');
        const titleSpan = document.getElementById('partner-panel-title');
        
        if (data.partner.logo_url) {
          // Agregar separador
          const divider = document.createElement('div');
          divider.style.width = '1px';
          divider.style.height = '32px';
          divider.style.backgroundColor = 'var(--border-strong)';
          logosContainer.appendChild(divider);

          // Agregar logo del partner
          const partnerLogo = document.createElement('img');
          partnerLogo.src = data.partner.logo_url;
          partnerLogo.alt = data.partner.business_name || 'Logo Comercio';
          partnerLogo.style.height = '32px';
          partnerLogo.style.objectFit = 'contain';
          logosContainer.appendChild(partnerLogo);
        }

        if (data.partner.business_name) {
             titleSpan.innerText = `Panel de Validación: ${data.partner.business_name}`;
        }
      }
    })
    .catch(err => console.error("No se pudo cargar la info del comercio", err));

  const validateForm = document.getElementById('validate-form');
  const validateBtn = document.getElementById('validate-btn');
  const errorMsg = document.getElementById('error-msg');
  const resultBox = document.getElementById('result-box');
  const statusBadge = document.getElementById('status-badge');
  const memberName = document.getElementById('member-name');
  
  const useBenefitContainer = document.getElementById('use-benefit-container');
  const benefitSelect = document.getElementById('benefit-select');
  const registerBtn = document.getElementById('register-use-btn');
  const useSuccessMsg = document.getElementById('use-success-msg');

  let currentMemberId = null;
  let currentPartnerId = null;

  validateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.style.display = 'none';
    resultBox.style.display = 'none';
    useBenefitContainer.style.display = 'none';
    useSuccessMsg.style.display = 'none';
    
    const rut = document.getElementById('rut-input').value.trim();
    if(!rut) return;

    validateBtn.disabled = true;
    validateBtn.innerText = 'Buscando...';

    try {
      const resp = await fetch('/api/validate-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validation_token: token, rut: rut })
      });

      const data = await resp.json();

      if(resp.status === 401) {
        errorMsg.innerText = data.error || 'Autenticación fallida con tu token.';
        errorMsg.style.display = 'block';
        return;
      }

      resultBox.style.display = 'block';

      if(data.status === 'not_found' || resp.status === 404) {
        statusBadge.className = 'status-badge status-notfound';
        statusBadge.innerText = 'Socio no encontrado';
        memberName.innerText = rut;
      } else if(data.status === 'inactive') {
        statusBadge.className = 'status-badge status-inactive';
        statusBadge.innerText = 'Socio Inactivo';
        memberName.innerText = `RUT: ${rut}`;
      } else if (data.status === 'active') {
        statusBadge.className = 'status-badge status-active';
        statusBadge.innerText = 'Socio Activo';
        memberName.innerText = data.member.full_name;
        
        currentMemberId = data.member.id;
        currentPartnerId = data.partner_id;

        // Populate benefits
        benefitSelect.innerHTML = '';
        if(data.benefits && data.benefits.length > 0) {
          data.benefits.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.innerText = b.title;
            benefitSelect.appendChild(opt);
          });
          useBenefitContainer.style.display = 'block';
        } else {
          benefitSelect.innerHTML = '<option disabled>No tienes beneficios activos</option>';
        }
      } else {
        errorMsg.innerText = data.error || 'Error de búsqueda.';
        errorMsg.style.display = 'block';
        resultBox.style.display = 'none';
      }

    } catch(err) {
      errorMsg.innerText = 'Error de conexión con el servidor.';
      errorMsg.style.display = 'block';
    } finally {
      validateBtn.disabled = false;
      validateBtn.innerText = 'Buscar y Validar';
    }
  });


  // Registrar Uso
  registerBtn.addEventListener('click', async () => {
    if(!currentMemberId || !currentPartnerId || !benefitSelect.value) return;

    registerBtn.disabled = true;
    registerBtn.innerText = 'Registrando...';

    try {
      const resp = await fetch('/api/register-use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          validation_token: token,
          member_id: currentMemberId,
          partner_id: currentPartnerId,
          benefit_id: benefitSelect.value
        })
      });

      const data = await resp.json();

      if(!resp.ok) {
        alert('Error: ' + (data.error || 'No se pudo registrar.'));
      } else {
        useSuccessMsg.style.display = 'block';
        registerBtn.style.display = 'none'; // Ocultar boton para no spamearlo
      }
    } catch(err) {
      alert('Falla de red al intentar conectar.');
    } finally {
      registerBtn.innerText = 'Registrar Uso';
      registerBtn.disabled = false;
    }
  });

});
