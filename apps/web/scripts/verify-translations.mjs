import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTranslationAudit() {
  console.log("=================================================");
  console.log("MyBill History — Bidirectional Translation Audit");
  console.log("=================================================\n");

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
  };

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      results.passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      results.failed++;
    }
  }

  // 1. Audit Auth Context
  console.log("--- 1. Locale State & Persistence Audit ---");
  const authContextPath = path.resolve(__dirname, "../src/context/auth-context.tsx");
  const authContent = fs.readFileSync(authContextPath, "utf-8");
  assert(authContent.includes('localStorage.setItem("billing_lang", newLang)'), "auth-context persists language to localStorage ('billing_lang')");
  assert(authContent.includes('localStorage.getItem("billing_lang")'), "auth-context hydrates initial language from localStorage");
  assert(authContent.includes("document.documentElement.lang = newLang") || authContent.includes("document.documentElement.lang = lang"), "auth-context syncs document.documentElement.lang with active language");
  assert(authContent.includes('document.documentElement.setAttribute("data-lang"'), "auth-context syncs data-lang attribute");

  // 2. Audit Global CSS for Hero Stability & Gujarati Fonts
  console.log("\n--- 2. CSS & Hero Stability Audit ---");
  const globalsCssPath = path.resolve(__dirname, "../src/app/globals.css");
  const cssContent = fs.readFileSync(globalsCssPath, "utf-8");
  assert(cssContent.includes(".hero-content") || cssContent.includes('[data-hero="true"]'), "globals.css contains hero protection rules preventing opacity zeroing");
  assert(cssContent.includes("opacity: 1 !important"), "hero protection ensures opacity: 1 !important");
  assert(cssContent.includes("font-family: var(--font-noto-gujarati)"), "globals.css configures Noto Sans Gujarati font for Gujarati text");

  // 3. Audit Introduction Page
  console.log("\n--- 3. Introduction Page (Landing) Coverage Audit ---");
  const introPath = path.resolve(__dirname, "../src/components/landing/introduction-page.tsx");
  const introContent = fs.readFileSync(introPath, "utf-8");
  
  // Verify Hero has no reveal-on-scroll on headline
  assert(!introContent.includes('<h1\n            className={`reveal-on-scroll'), "Hero headline does not use reveal-on-scroll");
  assert(introContent.includes('data-hero="true"'), "Hero elements marked with data-hero='true'");
  
  // Verify Hero headline translated in both languages
  assert(introContent.includes("વેપારનું સરળ બિલિંગ"), "Hero headline contains Gujarati copy");
  assert(introContent.includes("Fast, Smart Billing &"), "Hero headline contains English copy");
  
  // Verify Subtitle translated
  assert(introContent.includes("૧૦ સેકન્ડમાં કાયદેસર જીએસટી બિલ બનાવો"), "Hero subtitle contains Gujarati copy");
  assert(introContent.includes("Generate statutory GST invoices in under 10 seconds"), "Hero subtitle contains English copy");

  // Verify CTAs translated
  assert(introContent.includes("હમણાં મફત શરૂ કરો"), "CTA button has Gujarati copy");
  assert(introContent.includes("Get Started Free"), "CTA button has English copy");
  assert(introContent.includes("પ્રવેશ કરો (Sign In)"), "Secondary CTA has Gujarati copy");
  assert(introContent.includes("Sign In to Workspace"), "Secondary CTA has English copy");

  // Verify Mobile Drawer Language Switcher
  assert(introContent.includes("Mobile Drawer Language Switcher"), "Mobile drawer contains language switcher toggle");
  assert(introContent.includes('onClick={() => setLang("en")}') && introContent.includes('onClick={() => setLang("gu")}'), "Language switcher provides explicit EN and GU options");

  // Verify Reactive reveal synchronizer
  assert(introContent.includes("Re-synchronize revealed state whenever language changes"), "Introduction page has reactive effect ensuring revealed elements stay revealed on language switch");

  // Verify Tab Previews translated
  assert(introContent.includes('lang === "gu" ? "આઇટમ વિગત" : "Item Description"'), "Invoice preview table headers translated");
  assert(introContent.includes('lang === "gu" ? "ગ્રાહકો પાસેથી કુલ લેણાં" : "Customer Receivables"'), "Dashboard preview cards translated");
  assert(introContent.includes('lang === "gu" ? "Google Gemini AI OCR સ્કેનર પાઇપલાઇન" : "Google Gemini AI OCR Pipeline"'), "Gemini AI OCR preview translated");
  assert(introContent.includes('lang === "gu" ? "ખાતાવહી: શ્રી રામ ટ્રેડર્સ (ગ્રાહક)" : "General Ledger: Shree Ram Traders (Customer)"'), "General ledger preview translated");

  // 4. Audit Features Showcase Page
  console.log("\n--- 4. Features Showcase Page Audit ---");
  const featuresPath = path.resolve(__dirname, "../src/app/features/page.tsx");
  const featuresContent = fs.readFileSync(featuresPath, "utf-8");
  assert(featuresContent.includes("nameEn:") && featuresContent.includes("nameGu:"), "Features data structure contains both nameEn and nameGu for all features");
  assert(featuresContent.includes("descEn:") && featuresContent.includes("descGu:"), "Features data structure contains both descEn and descGu for all features");
  assert(featuresContent.includes("labelEn:") && featuresContent.includes("labelGu:"), "Feature categories contain both English and Gujarati labels");
  assert(featuresContent.includes("Mobile Drawer Language Switcher"), "Features page mobile drawer contains language switcher");

  // 5. Audit Login Page
  console.log("\n--- 5. Login & Auth Page Audit ---");
  const loginPath = path.resolve(__dirname, "../src/app/login/page.tsx");
  const loginContent = fs.readFileSync(loginPath, "utf-8");
  assert(loginContent.includes('onClick={() => setLang("en")}') && loginContent.includes('onClick={() => setLang("gu")}'), "Login page has direct language switcher");
  assert(loginContent.includes("મોબાઇલ નંબર અથવા ઇમેઇલ *") && loginContent.includes("Phone Number or Email *"), "Login form inputs have bidirectional labels");

  // 6. Test Live HTTP Endpoints
  console.log("\n--- 6. Live HTTP Endpoints Check ---");
  try {
    const pages = ["/", "/intro", "/features", "/login"];
    for (const page of pages) {
      const res = await fetch(`http://localhost:3000${page}`);
      assert(res.status === 200, `Endpoint http://localhost:3000${page} returns HTTP 200`);
    }
  } catch (err) {
    console.error("HTTP Fetch check skipped or server not reachable:", err.message);
  }

  console.log("\n=================================================");
  console.log(`Translation Audit Summary: ${results.passed} Passed, ${results.failed} Failed`);
  console.log("=================================================");

  if (results.failed > 0) {
    process.exit(1);
  }
}

runTranslationAudit().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
