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
            const imgs = Array.from(doc.querySelectorAll('img')).map(i => i.src);
            const styleTags = Array.from(doc.querySelectorAll('style')).map(s => s.textContent).join('\\n');
            const bgUrlsInStyle = styleTags.match(/url\\([^)]+\\)/g) || [];
            return { imgs, bgUrlsInStyle };
          })()
        `,
        returnByValue: true
      }
    }));
  };
  ws.onmessage = (msg) => {
    const res = JSON.parse(msg.data);
    console.log(JSON.stringify(res.result.result.value, null, 2));
    process.exit(0);
  };
}

run();
