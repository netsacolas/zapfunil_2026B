const apiKey = '52c9d4d5cd513754c859548f10cab5bdabd2190c92aa9bdbbd8291473de0df43';
const wahaUrl = 'https://waha.kasaweb.online';
const sessionName = 'marioalex-b70ae279-bbac-4959-be5c-ab725effa1be';
const headers = { 'X-Api-Key': apiKey };

async function checkVisibleAvatars() {
  try {
    console.log("Fetching chats overview...");
    const overviewRes = await fetch(`${wahaUrl}/api/${sessionName}/chats/overview?limit=25`, { headers });
    if (!overviewRes.ok) throw new Error("Failed to fetch overview");
    const overviewData = await overviewRes.json();
    
    console.log(`\nAnalyzing ${overviewData.length} active chats:`);
    for (const chat of overviewData) {
      if (chat.id === 'status@broadcast') continue;
      
      const hasOverviewPic = !!chat.picture && chat.picture !== 'FAILED';
      console.log(`- Chat: "${chat.name || chat.id}" (${chat.id})`);
      console.log(`  Overview picture: ${hasOverviewPic ? 'Available (URL)' : 'None (null)'}`);
      
      // Let's call the profile-picture endpoint to see if it can be fetched dynamically
      const isGroup = chat.id.endsWith('@g.us');
      let ep = '';
      if (isGroup) {
        ep = `/api/${sessionName}/groups/${chat.id}/picture`;
      } else {
        const contactId = chat.id.replace('@s.whatsapp.net', '@c.us');
        ep = `/api/contacts/profile-picture?contactId=${contactId}&session=${sessionName}`;
      }
      
      try {
        const picRes = await fetch(`${wahaUrl}${ep}`, { headers });
        if (picRes.ok) {
          const picData = await picRes.json();
          const picUrl = isGroup ? picData.url : picData.profilePictureURL;
          console.log(`  Dynamic fetch: ${picUrl ? 'Success' : 'None (null)'}`);
        } else {
          console.log(`  Dynamic fetch failed: Status ${picRes.status}`);
        }
      } catch (err) {
        console.log(`  Dynamic fetch error: ${err.message}`);
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

checkVisibleAvatars();
