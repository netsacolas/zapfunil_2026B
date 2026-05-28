const WAHA_URL = 'https://waha.kasaweb.online';
const API_KEY = '52c9d4d5cd513754c859548f10cab5bdabd2190c92aa9bdbbd8291473de0df43';
const SESSION = 'marioalex-b70ae279-bbac-4959-be5c-ab725effa1be';

async function main() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  // Pegar lista de chats para testar com um real
  const chatsRes = await fetch(
    `${WAHA_URL}/api/${SESSION}/chats/overview?limit=10`,
    { headers: { 'X-Api-Key': API_KEY } }
  );
  const chats = await chatsRes.json();
  const chatId = chats[0]?.id;
  if (!chatId) { console.log("No chats found"); return; }
  console.log("Testing chat:", chatId);

  // Teste 1: Sem offset
  const r1 = await fetch(
    `${WAHA_URL}/api/${SESSION}/chats/${encodeURIComponent(chatId)}/messages?limit=5&downloadMedia=false`,
    { headers: { 'X-Api-Key': API_KEY } }
  );
  const msgs1 = await r1.json();
  console.log("\n--- Batch 1 (no offset) ---");
  msgs1.forEach(m => console.log(`  [${m.id}] ts=${m.timestamp} type=${m.type}`));
  
  const oldestTs = msgs1[0]?.timestamp;
  const oldest5 = msgs1.length >= 5 ? msgs1[4] : msgs1[msgs1.length-1];

  // Teste 2: Com before (timestamp Unix)
  if (oldestTs) {
    const r2 = await fetch(
      `${WAHA_URL}/api/${SESSION}/chats/${encodeURIComponent(chatId)}/messages?limit=5&downloadMedia=false&before=${oldestTs}`,
      { headers: { 'X-Api-Key': API_KEY } }
    );
    const msgs2 = await r2.json();
    console.log(`\n--- Batch 2 (before timestamp=${oldestTs}) ---`);
    msgs2.forEach(m => console.log(`  [${m.id}] ts=${m.timestamp} type=${m.type}`));
    
    const isSame = msgs2.some(m => msgs1.some(m1 => m1.id === m.id));
    console.log("Duplicates with batch 1?", isSame);
  }

  // Teste 3: Com offset=5
  const r3 = await fetch(
    `${WAHA_URL}/api/${SESSION}/chats/${encodeURIComponent(chatId)}/messages?limit=5&downloadMedia=false&offset=5`,
    { headers: { 'X-Api-Key': API_KEY } }
  );
  const msgs3 = await r3.json();
  console.log(`\n--- Batch 3 (offset=5) ---`);
  msgs3.forEach(m => console.log(`  [${m.id}] ts=${m.timestamp} type=${m.type}`));
  
  const isSame3 = msgs3.some(m => msgs1.some(m1 => m1.id === m.id));
  console.log("Duplicates with batch 1?", isSame3);
  
  // Teste 4: Com offset=10
  const r4 = await fetch(
    `${WAHA_URL}/api/${SESSION}/chats/${encodeURIComponent(chatId)}/messages?limit=5&downloadMedia=false&offset=10`,
    { headers: { 'X-Api-Key': API_KEY } }
  );
  const msgs4 = await r4.json();
  console.log(`\n--- Batch 4 (offset=10) ---`);
  msgs4.forEach(m => console.log(`  [${m.id}] ts=${m.timestamp} type=${m.type}`));
  
  const allSame = [...msgs1, ...msgs3, ...msgs4];
  const uniqueIds = new Set(allSame.map(m => m.id));
  console.log(`\nTotal unique messages across batches: ${uniqueIds.size} (expected 15)`);
}

main();
