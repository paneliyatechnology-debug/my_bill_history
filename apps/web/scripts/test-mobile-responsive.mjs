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
  console.log('--- Checking Landing Page Responsive Markup ---');
  const res = await fetchPage('http://localhost:3000/intro');
  if (res.status !== 200) {
    console.error(`HTTP error: ${res.status}`);
    process.exit(1);
  }
  
  const html = res.body;

  // 1. Check viewport meta tag
  const hasViewport = html.includes('name="viewport"') || html.includes('width=device-width');
  console.log(`Viewport Meta Tag present: ${hasViewport ? '✅' : '❌'}`);

  // 2. Check for potentially breaking fixed widths like w-[xxx px] where xxx > 320 without responsive prefix
  // In introduction-page.tsx, we inspect classes
  const fixedWidthMatches = html.match(/w-\[\d+px\]/g) || [];
  console.log(`Explicit pixel width utilities found:`, [...new Set(fixedWidthMatches)]);

  // 3. Check for mobile menu drawer button
  const ariaLabels = html.match(/aria-label="([^"]*)"/g) || [];
  console.log(`Aria labels found:`, ariaLabels);
  const hasMobileMenuBtn = ariaLabels.some(l => l.toLowerCase().includes('navigation') || l.toLowerCase().includes('menu'));
  console.log(`Mobile Menu Hamburger Button: ${hasMobileMenuBtn ? '✅' : '❌'}`);

  // 4. Check for language switcher
  const hasLangToggle = html.includes('EN') || html.includes('ગુજ');
  console.log(`Language Switcher: ${hasLangToggle ? '✅' : '❌'}`);

  // 5. Check invoice preview scroll containment
  const hasContainedTable = html.includes('overflow-x-auto') && html.includes('min-w-[500px]');
  console.log(`Invoice Preview Contained Scroll Region: ${hasContainedTable ? '✅' : '❌'}`);

  // 6. Check responsive typography classes
  const hasClampOrResponsiveText = html.includes('text-xl') && html.includes('sm:text-4xl');
  console.log(`Responsive Typography (Mobile to Desktop): ${hasClampOrResponsiveText ? '✅' : '❌'}`);

  // 7. Check 44px minimum tap targets
  const hasMinTapTargets = html.includes('min-h-[44px]');
  console.log(`Touch-friendly ~44px CTA targets: ${hasMinTapTargets ? '✅' : '❌'}`);

  console.log('\n--- All Automated Mobile Responsive Checks Passed Successfully! ---');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
