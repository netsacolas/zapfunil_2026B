const apiKey = '52c9d4d5cd513754c859548f10cab5bdabd2190c92aa9bdbbd8291473de0df43';
const wahaUrl = 'https://waha.kasaweb.online';
const sessionName = 'marioalex-b70ae279-bbac-4959-be5c-ab725effa1be';

async function checkSort() {
  try {
    console.log("Fetching chats/overview to check sort...");
    const res = await fetch(`${wahaUrl}/api/${sessionName}/chats/overview?limit=20`, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    if (res.ok) {
      const data = await res.json();
      console.log("Native order of first 10 chats from WAHA server:");
      data.slice(0, 10).forEach((c, i) => {
        const lastMsgTime = c.lastMessage ? new Date(c.lastMessage.timestamp * 1000).toISOString() : 'no message';
        const chatTime = c.conversationTimestamp ? new Date(c.conversationTimestamp * 1000).toISOString() : 'no chat time';
        console.log(`[${i}] Chat: ${c.id} | Name: ${c.name} | ChatTime: ${chatTime} | LastMsgTime: ${lastMsgTime}`);
      });
    } else {
      console.log("Failed:", res.status);
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

checkSort();
