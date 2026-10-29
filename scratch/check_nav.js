async function run() {
  const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/FBFDD3009D8DB09DF712B2597620B8BF');
  ws.onopen = () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          (() => {
            // Click Navaratri card
            const navCard = Array.from(document.querySelectorAll('.theme-store-card, [class*="card"]')).find(c => c.textContent.includes('Navaratri'));
            if (navCard) navCard.click();
            setTimeout(() => {
              const iframe = document.getElementById('invoice-preview-iframe');
              const doc = iframe.contentDocument || iframe.contentWindow.document;
              const style = Array.from(doc.querySelectorAll('style')).map(s => s.textContent).join('\\n');
              const lines = style.split('\\n');
              const matched = lines.filter(l => l.includes('background-image') || l.includes('opacity'));
              console.log(matched);
            }, 500);
            return 'clicked';
          })()
        `,
        returnByValue: true
      }
    }));
  };
  ws.onmessage = (msg) => {
    const res = JSON.parse(msg.data);
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  };
}

run();
