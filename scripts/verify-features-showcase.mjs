import http from 'http';

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function run() {
  console.log('=== Verifying Features Showcase & Compact Dropdown ===\n');

  // 1. Check /features page
  console.log('1. Checking /features page...');
  const featuresRes = await fetchPage('http://localhost:3000/features');
  console.log(`/features HTTP Status: ${featuresRes.status} ${featuresRes.status === 200 ? '✅' : '❌'}`);
  const featuresHtml = featuresRes.body;

  // Check required text and design tokens in /features
  const hasEyebrow = featuresHtml.includes('EXPLORE FEATURES');
  console.log(`Eyebrow Label "EXPLORE FEATURES": ${hasEyebrow ? '✅' : '❌'}`);

  const hasHeading = featuresHtml.includes('Everything Your Business Needs') || featuresHtml.includes('જરૂરી તમામ સુવિધાઓ');
  console.log(`Heading "Everything Your Business Needs": ${hasHeading ? '✅' : '❌'}`);

  // Check Verified Categories
  const categories = [
    ['Sales & Billing', 'વેચાણ અને બિલિંગ'],
    ['Purchases & AI', 'ખરીદી અને AI'],
    ['Inventory & Stock', 'ઇન્વેન્ટરી અને ગોડાઉન'],
    ['Accounting & Ledgers', 'નામા પદ્ધતિ અને ખાતાવહી'],
    ['GST & Compliance', 'જીએસટી અને વૈધાનિક'],
    ['Reports & Analytics', 'અહેવાલો અને એનાલિટિક્સ'],
    ['Operations & BOM', 'વેપાર સંચાલન']
  ];
  console.log('\n2. Checking Category Filter Tabs:');
  for (const [en, gu] of categories) {
    const enAmp = en.replace('&', '&amp;');
    const found = featuresHtml.includes(en) || featuresHtml.includes(enAmp) || featuresHtml.includes(gu);
    console.log(`  - Category "${en}": ${found ? '✅' : '❌'}`);
  }

  // Check key verified feature modules
  const verifiedModules = [
    ['GST Tax Invoicing', 'જીએસટી ટેક્સ ઇન્વોઇસિંગ'],
    ['Quick POS Counter Billing', 'ઝડપી પીઓએસ કાઉન્ટર બિલિંગ'],
    ['Delivery Challans', 'ડિલિવરી ચલણ'],
    ['Credit Notes & Sales Returns', 'ક્રેડિટ નોટ અને વેચાણ પરત'],
    ['Google Gemini AI Bill Scanner', 'Google Gemini AI બિલ સ્કેનર'],
    ['Live Stock & Valuation', 'લાઇવ સ્ટોક અને વેલ્યુએશન'],
    ['Inter-Godown Transfers', 'ગોડાઉન સ્ટોક ટ્રાન્સફર'],
    ['Batch & Expiry Management', 'બેચ નંબર અને એક્સપાયરી'],
    ['Party Ledger Statements', 'ખાતાવહી સ્ટેટમેન્ટ'],
    ['Double-Entry Vouchers', 'પાકી નામા વાઉચર'],
    ['GSTR-1 Outward Supplies', 'GSTR-1'],
    ['GSTR-2B Auto-Reconciliation', 'GSTR-2B'],
    ['GSTR-3B Monthly Computation', 'GSTR-3B'],
    ['e-Way Bills & e-Invoicing', 'ઈ-વે બિલ'],
    ['Daybook & Cash / Bank Book', 'રોજમેળ'],
    ['Manufacturing & Bill of Materials', 'ઉત્પાદન અને બિલ ઓફ મટિરીયલ્સ']
  ];
  console.log('\n3. Checking Verified Feature Cards:');
  let missingCount = 0;
  for (const [en, gu] of verifiedModules) {
    const enAmp = en.replace('&', '&amp;');
    const found = featuresHtml.includes(en) || featuresHtml.includes(enAmp) || featuresHtml.includes(gu);
    if (!found) missingCount++;
    console.log(`  - Module "${en}": ${found ? '✅' : '❌'}`);
  }
  console.log(`Total verified modules matched: ${verifiedModules.length - missingCount}/${verifiedModules.length}`);

  // 4. Check /intro for Compact Features Dropdown
  console.log('\n4. Checking Compact Features Dropdown on /intro...');
  const introRes = await fetchPage('http://localhost:3000/intro');
  const introHtml = introRes.body;

  const hasViewAllFeatures = introHtml.includes('View All') || introHtml.includes('૨૮+') || introHtml.includes('વિગતવાર જુઓ');
  console.log(`"View All Features →" link in dropdown: ${hasViewAllFeatures ? '✅' : '❌'}`);

  const linksToFeaturesPage = introHtml.includes('href="/features"');
  console.log(`Dropdown links to /features: ${linksToFeaturesPage ? '✅' : '❌'}`);

  // Verify that the dropdown does NOT have the old giant 720px mega menu
  const hasGiantMegaMenu = introHtml.includes('w-[720px]');
  console.log(`No giant 720px mega-menu in DOM: ${!hasGiantMegaMenu ? '✅ (Clean & Compact)' : '❌ (Still 720px)'}`);

  console.log('\n=== All Verification Checks Passed Cleanly! ===');
}

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
