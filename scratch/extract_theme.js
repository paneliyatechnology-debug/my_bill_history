async function run() {
  const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/FBFDD3009D8DB09DF712B2597620B8BF');
  ws.onopen = () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          (() => {
            const list = [];
            document.querySelectorAll('*').forEach(el => {
              const bg = window.getComputedStyle(el).backgroundImage;
              if (bg && bg !== 'none' && el.clientWidth > 200) {
                list.push({ tag: el.tagName, className: el.className, bg, w: el.clientWidth, h: el.clientHeight, style: el.getAttribute('style') });
              }
              if (el.tagName === 'IMG' && el.clientWidth > 200) {
                list.push({ tag: 'IMG', className: el.className, src: el.src, w: el.clientWidth, h: el.clientHeight });
              }
            });
            return list;
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
