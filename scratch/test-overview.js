const apiKey = '52c9d4d5cd513754c859548f10cab5bdabd2190c92aa9bdbbd8291473de0df43';
const wahaUrl = 'https://waha.kasaweb.online';
const sessionName = 'marioalex-b70ae279-bbac-4959-be5c-ab725effa1be';

async function testOverview() {
  try {
    console.log("Fetching chats overview...");
    const res = await fetch(`${wahaUrl}/api/${sessionName}/chats/overview?limit=40`, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Overview count:", data.length);
    console.log("Overview samples:", JSON.stringify(data.slice(0, 3), null, 2));
  } catch (err) {
    console.error("Error connecting to WAHA:", err.message);
  }
}

testOverview();
