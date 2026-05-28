const apiKey = '52c9d4d5cd513754c859548f10cab5bdabd2190c92aa9bdbbd8291473de0df43';
const wahaUrl = 'https://waha.kasaweb.online';
const sessionName = 'marioalex-b70ae279-bbac-4959-be5c-ab725effa1be';

async function checkContacts() {
  try {
    console.log("Fetching contacts...");
    const res = await fetch(`${wahaUrl}/api/contacts/all?session=${sessionName}`, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Total contacts fetched:", data.length);
    
    // Print first 10 contacts with details
    console.log("Sample contacts (first 10):", JSON.stringify(data.slice(0, 10), null, 2));

    // Filter contacts that might have picture properties
    const contactsWithPics = data.filter(c => c.picture || c.avatar || c.profilePictureURL);
    console.log("Contacts with picture/avatar property in DTO:", contactsWithPics.length);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

checkContacts();
