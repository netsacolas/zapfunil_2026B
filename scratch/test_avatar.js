// Test: check if WAHA swagger reveals alternative endpoints for profile pictures
const WAHA_URL = 'https://waha.kasaweb.online';
const API_KEY = '52c9d4d5cd513754c859548f10cab5bdabd2190c92aa9bdbbd8291473de0df43';
const SESSION = 'marioalex-b70ae279-bbac-4959-be5c-ab725effa1be';
const headers = { 'X-Api-Key': API_KEY };

// iris vivo contact
const IRIS_ID = '5521997174110';

async function main() {
  // Test 1: Try /api/{session}/contacts/profile-picture (session-scoped endpoint)
  const endpoints = [
    `/api/contacts/profile-picture?contactId=${IRIS_ID}@c.us&session=${SESSION}`,
    `/api/${SESSION}/contacts/profile-picture?contactId=${IRIS_ID}@c.us`,
    `/api/contacts/profile-picture?contactId=${IRIS_ID}&session=${SESSION}`,
    `/api/contacts/profile-picture?contactId=${IRIS_ID}@c.us&session=${SESSION}&refresh=true`,
  ];

  for (const ep of endpoints) {
    const url = `${WAHA_URL}${ep}`;
    console.log(`\nTesting: ${ep}`);
    try {
      const res = await fetch(url, { headers });
      console.log(`  Status: ${res.status}`);
      const text = await res.text();
      console.log(`  Body: ${text.substring(0, 200)}`);
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }

  // Test 2: Check swagger for available endpoints
  console.log('\n\n=== Checking Swagger ===');
  try {
    const swRes = await fetch(`${WAHA_URL}/swagger-json`, { headers });
    if (swRes.ok) {
      const swagger = await swRes.json();
      const paths = Object.keys(swagger.paths || {});
      const contactPaths = paths.filter(p => p.includes('contact') || p.includes('picture') || p.includes('avatar') || p.includes('photo'));
      console.log('Relevant endpoints:');
      for (const p of contactPaths) {
        const methods = Object.keys(swagger.paths[p]);
        console.log(`  ${methods.map(m => m.toUpperCase()).join(',')} ${p}`);
      }
    } else {
      console.log(`Swagger status: ${swRes.status}`);
    }
  } catch (e) {
    console.log(`Swagger error: ${e.message}`);
  }

  // Test 3: Check contacts/check-exists endpoint to validate the contact
  console.log('\n\n=== Checking contact existence ===');
  try {
    const checkRes = await fetch(`${WAHA_URL}/api/contacts/check-exists?phone=${IRIS_ID}&session=${SESSION}`, { headers });
    console.log(`Status: ${checkRes.status}`);
    const data = await checkRes.text();
    console.log(`Body: ${data}`);
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }
}

main();
