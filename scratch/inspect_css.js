async function run() {
  const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/FBFDD3009D8DB09DF712B2597620B8BF');
  ws.onopen = () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          (() => {
            const iframe = document.getElementById('invoice-preview-iframe');
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            const style = Array.from(doc.querySelectorAll('style')).map(s => s.textContent).join('\\n');
            const lines = style.split('\\n');
            const matched = [];
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].includes('dhanteras') || lines[i].includes('flash-themes')) {
                matched.push(lines.slice(Math.max(0, i - 10), Math.min(lines.length, i + 15)).join('\\n'));
              }
            }
            return matched;
          })()
        `,
        returnByValue: true
      }
    }));
  };
  ws.onmessage = (msg) => {
    const res = JSON.parse(msg.data);
    console.log(res.result.result.value[0]);
    process.exit(0);
  };
}

run();
