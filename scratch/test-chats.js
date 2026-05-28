const apiKey = '52c9d4d5cd513754c859548f10cab5bdabd2190c92aa9bdbbd8291473de0df43';
const wahaUrl = 'https://waha.kasaweb.online';
const sessionName = 'marioalex-b70ae279-bbac-4959-be5c-ab725effa1be';

async function testChats() {
  try {
    console.log("Fetching all chats...");
    const res = await fetch(`${wahaUrl}/api/${sessionName}/chats?limit=1000`, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Total chats in WhatsApp account:", data.length);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testChats();
