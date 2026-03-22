const fs = require('fs');

// 1. EXTRAER LA LLAVE DE RESEND DIRECTAMENTE DESDE TU .ENV
const envFile = fs.readFileSync('.env', 'utf-8');
const resendKeyLine = envFile.split('\n').find(line => line.startsWith('RESEND_API_KEY='));
const RESEND_API_KEY = resendKeyLine ? resendKeyLine.split('=')[1].trim().replace(/^"|"/g, '').replace(/^'|'/g, '') : null;

// =========================================================================
// ⚠️ 2. PON TU CORREO AQUÍ ⚠️
// Debe ser EXACTAMENTE el correo con el que te creaste la cuenta en Resend.com
const MI_CORREO_DE_RESEND = "conciergehogar@gmail.com";
// =========================================================================

if (!RESEND_API_KEY || !RESEND_API_KEY.startsWith('re_')) {
  console.log('❌ Error: No se encontró RESEND_API_KEY correcta en el archivo .env');
  process.exit(1);
}
if (MI_CORREO_DE_RESEND.includes("TU_CORREO_AQUI")) {
  console.log('❌ Error: Por favor edita este archivo y pon tu correo real en la línea 9.');
  process.exit(1);
}

const emailHtml = `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
    <h2 style="color: #ea580c;">¡Bienvenido/a a Club Hogga! 🎉</h2>
    <p>Hola, tu suscripción ha sido confirmada exitosamente y ya eres oficialmente parte del club.</p>
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <strong>¿Cómo cobro mis beneficios?</strong><br>
      Es súper simple: visita cualquier comercio asociado, menciona que eres del Club Hogga y dicta tu RUT al momento de pagar. El comercio validará tu RUT en su sistema para aplicar el descuento en el acto.
    </div>
    <p>Explora todos los beneficios activos de tu ciudad aquí: <br>
    <a href="https://clubhogga.cl/beneficios/" style="color: #ea580c; font-weight: bold; text-decoration:none;">Directorio de Beneficios &rarr;</a></p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="font-size: 12px; color: #9ca3af;">Si tienes alguna duda con tu membresía, puedes responder directamente a este correo.</p>
  </div>
`;

console.log('Enviando correo de prueba oficial a:', MI_CORREO_DE_RESEND, '...');

fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + RESEND_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'Club Hogga <club@hogga.cl>',
    to: [MI_CORREO_DE_RESEND],
    subject: '¡Tu membresía Club Hogga está activa! 🎉 (TEST OFICIAL)',
    html: emailHtml
  })
})
  .then(res => res.json())
  .then(data => {
    if (data.id) {
      console.log('✅ ¡ÉXITO! Correo despachado. Revisa tu bandeja de entrada o Spam.');
      console.log('ID de Resend:', data.id);
    } else {
      console.log('⚠️ Error de Resend:', data);
    }
  })
  .catch(err => console.error('❌ Error de conexión:', err));
