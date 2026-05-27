const apiKey = '52c9d4d5cd513754c859548f10cab5bdabd2190c92aa9bdbbd8291473de0df43';
const wahaUrl = 'https://waha.kasaweb.online';
const sessionName = 'marioalex-b70ae279-bbac-4959-be5c-ab725effa1be';

async function testTimes() {
  try {
    console.log("=== WAHA Latency & Performance Test ===");
    
    // Test 1: GET /api/sessions
    console.log("\n1. Testing GET /api/sessions...");
    let start = Date.now();
    let res = await fetch(`${wahaUrl}/api/sessions`, {
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' }
    });
    let end = Date.now();
    console.log(`Status: ${res.status}, Time: ${end - start}ms`);
    
    // Test 2: GET chats/overview
    console.log("\n2. Testing GET chats/overview...");
    start = Date.now();
    res = await fetch(`${wahaUrl}/api/${sessionName}/chats/overview?limit=40`, {
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' }
    });
    end = Date.now();
    console.log(`Status: ${res.status}, Time: ${end - start}ms`);
    let overview = [];
    if (res.ok) {
      overview = await res.json();
      console.log(`Loaded ${overview.length} chats in overview`);
    }

    if (overview.length > 0) {
      const targetChat = overview[0].id;
      
      // Test 3: GET messages with downloadMedia=true
      console.log(`\n3. Testing GET messages for chat ${targetChat} WITH downloadMedia=true...`);
      start = Date.now();
      res = await fetch(`${wahaUrl}/api/${sessionName}/chats/${targetChat}/messages?limit=30&downloadMedia=true`, {
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' }
      });
      end = Date.now();
      console.log(`Status: ${res.status}, Time: ${end - start}ms`);
      
      // Test 4: GET messages WITHOUT downloadMedia
      console.log(`\n4. Testing GET messages for chat ${targetChat} WITHOUT downloadMedia...`);
      start = Date.now();
      res = await fetch(`${wahaUrl}/api/${sessionName}/chats/${targetChat}/messages?limit=30`, {
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' }
      });
      end = Date.now();
      console.log(`Status: ${res.status}, Time: ${end - start}ms`);
    }

    // Test 5: GET contacts/all
    console.log("\n5. Testing GET contacts/all (this might take a long time)...");
    start = Date.now();
    res = await fetch(`${wahaUrl}/api/contacts/all?session=${sessionName}`, {
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' }
    });
    end = Date.now();
    console.log(`Status: ${res.status}, Time: ${end - start}ms`);
    if (res.ok) {
      const contacts = await res.json();
      console.log(`Loaded ${contacts.length} contacts`);
    }

  } catch (err) {
    console.error("Error executing latency test:", err);
  }
}

testTimes();
