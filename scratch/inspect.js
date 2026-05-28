const WAHA_URL = 'https://waha.kasaweb.online';
const API_KEY = '52c9d4d5cd513754c859548f10cab5bdabd2190c92aa9bdbbd8291473de0df43';
const SESSION = 'marioalex-b70ae279-bbac-4959-be5c-ab725effa1be';
const MSG_ID = 'false_120363144491206272@g.us_2A481A4C5BAEC1605F9D_216170116415725@lid';

async function main() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  const urls = [
    `${WAHA_URL}/api/${SESSION}/messages/${encodeURIComponent(MSG_ID)}/download`,
    `${WAHA_URL}/api/${SESSION}/messages/${encodeURIComponent(MSG_ID)}/download/file`,
    `${WAHA_URL}/api/${SESSION}/messages/${encodeURIComponent(MSG_ID)}/file`
  ];
  
  for (const url of urls) {
    try {
      console.log(`Testing: ${url}`);
      const res = await fetch(url, {
        headers: { 'X-Api-Key': API_KEY }
      });
      console.log(`Status: ${res.status} (${res.statusText})`);
      if (res.ok) {
        console.log(`SUCCESS! Got ${res.headers.get('content-type')} (${res.headers.get('content-length')} bytes)`);
        return;
      } else {
        const text = await res.text();
        console.log(`Error body (first 100 chars): ${text.slice(0, 100)}`);
      }
    } catch (e) {
      console.log(`Failed for ${url}:`, e.message);
    }
  }
}

main();
