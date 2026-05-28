const apiKey = '52c9d4d5cd513754c859548f10cab5bdabd2190c92aa9bdbbd8291473de0df43';
const wahaUrl = 'https://waha.kasaweb.online';
const sessionName = 'marioalex-b70ae279-bbac-4959-be5c-ab725effa1be';
const headers = { 'X-Api-Key': apiKey };

async function testLidAvatar() {
  const tests = [
    // Perplexity
    `/api/contacts/profile-picture?contactId=18334363285@c.us&session=${sessionName}`,
    `/api/contacts/profile-picture?contactId=4639202218226@lid&session=${sessionName}`,
    // Iris
    `/api/contacts/profile-picture?contactId=5521997174110@c.us&session=${sessionName}`,
    `/api/contacts/profile-picture?contactId=91963957190663@lid&session=${sessionName}`,
  ];

  for (const ep of tests) {
    const url = `${wahaUrl}${ep}`;
    console.log(`\nTesting: ${ep}`);
    try {
      const res = await fetch(url, { headers });
      console.log(`  Status: ${res.status}`);
      const data = await res.json();
      console.log(`  Body:`, JSON.stringify(data));
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
}

testLidAvatar();
