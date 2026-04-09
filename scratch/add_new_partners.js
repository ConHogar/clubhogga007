const fs = require('fs');

// 1. Get credentials from .env
const envFile = fs.readFileSync('.env', 'utf-8');
const lines = envFile.split('\n');

const getEnv = (key) => {
  const line = lines.find(l => l.startsWith(`${key}=`));
  return line ? line.split('=')[1].trim().replace(/^"|"/g, '').replace(/^'|'/g, '') : null;
};

const SUPABASE_URL = getEnv('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabaseHeaders = {
  'apikey': SUPABASE_SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

const newPartners = [
  {
    business_name: 'Pastelería La Valentina',
    slug_city: 'puerto-varas',
    slug_category: 'gastronomia',
    address: 'Imperial 547, Puerto Varas',
    instagram: 'https://www.instagram.com/lavalentinapv/',
    logo_url: '/images/asociados/lavalentina-pv-clubhogga.webp',
    validation_token: 'lavalentina-pv',
    description: 'Pastelería artesanal en el corazón de Puerto Varas.'
  },
  {
    business_name: 'Pan con Chancho',
    slug_city: 'puerto-varas',
    slug_category: 'gastronomia',
    address: 'Tronador 1134, Puerto Varas',
    instagram: 'https://www.instagram.com/panconchancho_sangucheria/',
    logo_url: '/images/asociados/panconchancho-pv-clubhogga.webp',
    validation_token: 'panconchancho-pv',
    description: 'Sanguchería de autor con los mejores sabores locales.'
  },
  {
    business_name: 'Farmacias Puerto Varas',
    slug_city: 'puerto-varas',
    slug_category: 'bienestar',
    address: 'Pío Nono 420, Puerto Varas',
    instagram: 'https://www.instagram.com/farmaciaspuertovaras/',
    logo_url: '/images/asociados/farmacias-pv-clubhogga.webp',
    validation_token: 'farmacias-pv',
    description: 'Tu farmacia local con atención personalizada.'
  },
  {
    business_name: 'LaGrey, café bistró',
    slug_city: 'puerto-varas',
    slug_category: 'gastronomia',
    address: 'Maipo 911, Puerto Varas',
    instagram: 'https://www.instagram.com/lagrey.cl/',
    logo_url: '/images/asociados/lagrey-pv-clubhogga.webp',
    validation_token: 'lagrey-pv',
    description: 'Café bistró con un ambiente acogedor y excelente cocina.'
  },
  {
    business_name: 'Óptica Harter',
    slug_city: 'puerto-varas',
    slug_category: 'bienestar',
    address: 'Pío Nono 410, Puerto Varas',
    instagram: 'https://www.instagram.com/optica_harter/',
    logo_url: '/images/asociados/harter-pv-clubhogga.webp',
    validation_token: 'harter-pv',
    description: 'Especialistas en salud visual y las mejores marcas de lentes.'
  }
];

async function addPartners() {
  console.log('🚀 Starting partner insertion via REST API...');

  try {
    // 1. Get City ID
    const cityRes = await fetch(`${SUPABASE_URL}/rest/v1/cities?slug=eq.puerto-varas&select=id`, {
      headers: supabaseHeaders
    });
    const cities = await cityRes.json();
    const cityId = cities[0]?.id;

    // 2. Get Category IDs
    const catRes = await fetch(`${SUPABASE_URL}/rest/v1/categories?select=id,slug`, {
      headers: supabaseHeaders
    });
    const categories = await catRes.json();
    const catMap = {};
    categories.forEach(c => catMap[c.slug] = c.id);

    if (!cityId) {
       console.error('❌ Could not find city ID for puerto-varas');
       return;
    }

    for (const p of newPartners) {
      console.log(`\n📦 Processing: ${p.business_name}`);
      
      const categoryId = catMap[p.slug_category];
      if (!categoryId) {
        console.error(`  ⚠️ Skipped: Category ${p.slug_category} not found`);
        continue;
      }

      // 3. Insert Partner
      const insertPayload = {
        business_name: p.business_name,
        city_id: cityId,
        category_id: categoryId,
        address: p.address,
        instagram: p.instagram,
        logo_url: p.logo_url,
        validation_token: p.validation_token,
        description: p.description,
        active: true,
        featured: false
      };

      const partnerRes = await fetch(`${SUPABASE_URL}/rest/v1/partners`, {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify(insertPayload)
      });

      if (!partnerRes.ok) {
        const err = await partnerRes.json();
        console.error(`  ❌ Error inserting partner:`, err.message || err);
        continue;
      }

      const createdPartner = await partnerRes.json();
      const partnerId = createdPartner[0].id;
      console.log(`  ✅ Partner inserted with ID: ${partnerId}`);

      // 4. Insert Benefit
      const benefitPayload = {
        partner_id: partnerId,
        title: 'Beneficio por confirmar',
        description: 'Estamos finalizando los detalles para ofrecerte el mejor descuento.',
        active: true
      };

      const benefitRes = await fetch(`${SUPABASE_URL}/rest/v1/benefits`, {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify(benefitPayload)
      });

      if (!benefitRes.ok) {
        const err = await benefitRes.json();
        console.error(`  ❌ Error inserting benefit:`, err.message || err);
      } else {
        console.log(`  ✅ Benefit placeholder added`);
      }
    }

    console.log('\n✨ Finished all operations.');
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

addPartners();
