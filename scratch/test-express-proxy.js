const apiKey = '52c9d4d5cd513754c859548f10cab5bdabd2190c92aa9bdbbd8291473de0df43';
const wahaUrl = 'https://waha.kasaweb.online';
const sessionName = 'marioalex-b70ae279-bbac-4959-be5c-ab725effa1be';

async function testExpressProxy() {
  try {
    console.log("Fetching chats overview via local Express proxy...");
    const res = await fetch(`http://localhost:3000/api/waha-proxy/api/${sessionName}/chats/overview?limit=40`, {
      headers: {
        'x-waha-url': wahaUrl,
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    console.log("Status:", res.status);
    console.log("Content-Type:", res.headers.get("content-type"));
    const data = await res.json();
    console.log("Proxy Overview count:", data.length);
    console.log("Proxy Overview sample name:", data[0]?.name);
  } catch (err) {
    console.error("Error connecting to local Express proxy:", err.message);
  }
}

testExpressProxy();
