const apiKey = '52c9d4d5cd513754c859548f10cab5bdabd2190c92aa9bdbbd8291473de0df43';
const wahaUrl = 'https://waha.kasaweb.online';

async function testWaha() {
  try {
    console.log("Fetching sessions from WAHA...");
    const res = await fetch(`${wahaUrl}/api/sessions`, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Sessions:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error connecting to WAHA:", err.message);
  }
}

testWaha();
