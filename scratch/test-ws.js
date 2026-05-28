import WebSocket from 'ws';

const apiKey = '52c9d4d5cd513754c859548f10cab5bdabd2190c92aa9bdbbd8291473de0df43';
const wahaUrl = 'https://waha.kasaweb.online';

function testWS() {
  let wsUrl = wahaUrl.replace(/^http/, 'ws');
  wsUrl = wsUrl.replace(/\/$/, '') + '/ws';
  if (apiKey) {
    wsUrl += `?x-api-key=${apiKey}`;
  }

  console.log("Connecting to WebSocket:", wsUrl);
  const ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    console.log("WebSocket connected successfully!");
    setTimeout(() => {
      console.log("Closing WebSocket after 5s...");
      ws.close();
    }, 5000);
  });

  ws.on('message', (data) => {
    console.log("Received message:", data.toString());
  });

  ws.on('close', (code, reason) => {
    console.log("WebSocket closed. Code:", code, "Reason:", reason.toString() || "None");
  });

  ws.on('error', (err) => {
    console.error("WebSocket error:", err.message);
  });
}

testWS();
