const routes = [
  "/",
  "/intro",
  "/login",
  "/sales/invoices",
  "/sales/pos",
  "/purchases",
  "/accounting/ledgers",
  "/gst",
  "/reports"
];

async function checkRoutes() {
  console.log("Checking all critical routes...");
  for (const r of routes) {
    try {
      const res = await fetch(`http://localhost:3000${r}`);
      console.log(`${r.padEnd(25)} -> Status: ${res.status}`);
    } catch (err) {
      console.error(`${r.padEnd(25)} -> Error: ${err.message}`);
    }
  }
}

checkRoutes();
