async function testLanding() {
  const introRes = await fetch("http://localhost:3000/intro");
  console.log("/intro HTTP status:", introRes.status);
  const introHtml = await introRes.text();
  console.log("/intro HTML length:", introHtml.length);

  const res = await fetch("http://localhost:3000/");
  console.log("Root HTTP status:", res.status);
  const html = introHtml; // Check server-rendered intro HTML

  const sections = [
    "sales-billing",
    "purchases-inventory",
    "accounting-ledgers",
    "gst-statutory",
    "reports-analytics",
    "specialized-modules",
    "how-it-works",
    "business-types",
    "faq"
  ];

  console.log("\n--- Section IDs Check ---");
  for (const s of sections) {
    const hasId = html.includes(`id="${s}"`);
    console.log(`id="${s}": ${hasId ? "✅ FOUND" : "❌ MISSING"}`);
  }

  console.log("\n--- Feature Verifications ---");
  console.log("Tax Invoicing:", html.includes("Tax Invoicing") ? "✅" : "❌");
  console.log("POS Counter Billing:", html.includes("POS Counter") ? "✅" : "❌");
  console.log("Gemini AI Bill Scanner:", html.includes("Gemini") ? "✅" : "❌");
  console.log("GSTR-1 & GSTR-3B:", html.includes("GSTR-1") ? "✅" : "❌");
  console.log("Gujarati Language Toggle:", html.includes("ગુજરાતી") ? "✅" : "❌");
  console.log("Paneliya Technology:", html.includes("Paneliya Technology") ? "✅" : "❌");
  console.log("Vyapar / Indian MSME context:", html.includes("₹") ? "✅" : "❌");

  // Check login page
  const loginRes = await fetch("http://localhost:3000/login");
  const loginHtml = await loginRes.text();
  console.log("\n--- Login & Registration Check ---");
  console.log("Login HTTP status:", loginRes.status);
  console.log("Has Sign In tab:", loginHtml.includes("Sign In") ? "✅" : "❌");
  console.log("Has Create Account tab:", loginHtml.includes("Create Account") ? "✅" : "❌");
  console.log("No demo credentials exposed:", !loginHtml.includes("9876543210") ? "✅ (Clean)" : "⚠️ Exposing demo creds");

  // Check metadata
  console.log("\n--- Metadata Check ---");
  console.log("Has Title tag:", html.includes("<title>") ? "✅" : "❌");
  console.log("Has Meta Description:", html.includes("name=\"description\"") ? "✅" : "❌");
  console.log("Has Open Graph:", html.includes("property=\"og:title\"") ? "✅" : "❌");
}

testLanding().catch(console.error);
