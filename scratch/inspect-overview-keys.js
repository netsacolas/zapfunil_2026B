const apiKey = '52c9d4d5cd513754c859548f10cab5bdabd2190c92aa9bdbbd8291473de0df43';
const wahaUrl = 'https://waha.kasaweb.online';
const sessionName = 'marioalex-b70ae279-bbac-4959-be5c-ab725effa1be';

async function inspectKeys() {
  try {
    const res = await fetch(`${wahaUrl}/api/${sessionName}/chats/overview?limit=1`, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    if (res.ok) {
      const data = await res.json();
      console.log("Full JSON structure of a chat from chats/overview:");
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log("Failed:", res.status);
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

inspectKeys();
