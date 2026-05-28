const apiKey = '52c9d4d5cd513754c859548f10cab5bdabd2190c92aa9bdbbd8291473de0df43';
const wahaUrl = 'https://waha.kasaweb.online';
const sessionName = 'marioalex-b70ae279-bbac-4959-be5c-ab725effa1be';

async function testOffset(offset) {
  try {
    console.log(`Fetching chats/overview with limit=50, offset=${offset}...`);
    const startTime = Date.now();
    const res = await fetch(`${wahaUrl}/api/${sessionName}/chats/overview?limit=50&offset=${offset}`, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Offset: ${offset} | Status: ${res.status} | Time: ${duration}s`);
    if (res.ok) {
      const data = await res.json();
      console.log(`Returned count: ${data.length}`);
    } else {
      console.log(`Failed. Body:`, await res.text());
    }
  } catch (err) {
    console.error(`Error for offset ${offset}:`, err.message);
  }
}

async function run() {
  await testOffset(50);
  await testOffset(100);
  await testOffset(200);
}

run();
