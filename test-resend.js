const fs = require('fs');

// 1. EXTRAER LA LLAVE DE RESEND DIRECTAMENTE DESDE TU .ENV
const envFile = fs.readFileSync('.env', 'utf-8');
const resendKeyLine = envFile.split('\n').find(line => line.startsWith('RESEND_API_KEY='));
const RESEND_API_KEY = resendKeyLine ? resendKeyLine.split('=')[1].trim().replace(/^"|"/g, '').replace(/^'|'/g, '') : null;

// =========================================================================
// ⚠️ 2. PON TU CORREO AQUÍ ⚠️
// Debe ser EXACTAMENTE el correo con el que te creaste la cuenta en Resend.com
const MI_CORREO_DE_RESEND = "herigan@gmail.com";
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
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <!-- Header -->
    <div style="background-color: #f8fafc; padding: 30px 20px; text-align: center; border-bottom: 1px solid #e2e8f0;">
      <img src="https://club.hogga.cl/images/club.png" alt="Club Hogga Logo" style="height: 48px; margin-bottom: 0;">
    </div>
    <!-- Body -->
    <div style="padding: 30px 24px;">
      <h2 style="color: #0a2e46; font-size: 22px; margin-top: 0; margin-bottom: 16px;">¡Bienvenido/a al Club! 🎉</h2>
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hola! Ya estás dentro 🙌 ahora eres parte del Club Hogga.</p>
      
       <div style="background-color: #f0fdfa; padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #108f8e;">
         <h3 style="color: #0a2e46; font-size: 16px; margin-top: 0; margin-bottom: 8px;">¿Cómo cobro mis beneficios?</h3>
         <p style="font-size: 15px; line-height: 1.5; margin: 0; color: #0f766e;">
           Es súper simple: vas al local, dices que eres socio y dictas tu RUT.<br>
           En segundos te validan y listo — descuento aplicado.
         </p>
       </div>
 
       <p style="font-size: 15px; text-align: center; margin-top: 16px;">
         Empieza a usar tus beneficios desde hoy y sácale el máximo al Club.
       </p>
 
       <div style="text-align: center; margin-top: 24px; margin-bottom: 16px;">
         <a href="https://club.hogga.cl/beneficios/" style="background-color: #108f8e; color: #ffffff; padding: 14px 28px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 16px;">Usar mis beneficios</a>
       </div>
    </div>
    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="font-size: 13px; color: #64748b; margin: 0;">Si tienes alguna duda, responde a este correo o escríbenos a club@hogga.cl.</p>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 12px;">© 2026 Club Hogga. Todos los derechos reservados.</p>
    </div>
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
