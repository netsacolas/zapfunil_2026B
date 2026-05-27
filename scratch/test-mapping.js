const apiKey = '52c9d4d5cd513754c859548f10cab5bdabd2190c92aa9bdbbd8291473de0df43';
const wahaUrl = 'https://waha.kasaweb.online';
const sessionName = 'marioalex-b70ae279-bbac-4959-be5c-ab725effa1be';

async function testMapping() {
  try {
    const res = await fetch(`http://localhost:3000/api/waha-proxy/api/${sessionName}/chats/overview?limit=40`, {
      headers: {
        'x-waha-url': wahaUrl,
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    const overviewData = await res.json();
    console.log("Fetched overview items:", overviewData.length);

    const profilePictures = {};
    const contactsMap = {};
    const conversations = []; // Mock existing conversations in store

    const mappedConversations = overviewData
      .filter((c) => c.id && c.id !== 'status@broadcast')
      .map((c) => {
        try {
          const chatId = c.id;
          const phone = chatId.split('@')[0];

          let name = c.name;
          if (!name) {
            name = contactsMap[chatId] || phone;
          }
          if (name && name.startsWith('*\n')) {
            name = name.replace('*\n', '');
          }

          let messages = [];
          let lastMsg = null;
          if (c.lastMessage) {
            const msgText = c.lastMessage.text || '';
            let msgType = 'TEXT';
            if (msgText.startsWith('📷') || msgText.includes('Imagem') || msgText.toLowerCase().includes('photo')) {
              msgType = 'IMAGE';
            } else if (msgText.startsWith('🎵') || msgText.includes('Áudio') || msgText.toLowerCase().includes('voice') || msgText.toLowerCase().includes('audio') || msgText.toLowerCase().includes('ptt')) {
              msgType = 'AUDIO';
            }

            lastMsg = {
              id: c.lastMessage.id,
              content: msgText,
              timestamp: new Date(c.lastMessage.timestamp * 1000).toISOString(),
              isFromMe: c.lastMessage.fromMe,
              type: msgType
            };
          }

          const existingConv = conversations.find(conv => conv.id === chatId);
          if (existingConv && existingConv.messages.length > 0) {
            const msgMap = new Map();
            for (const m of existingConv.messages) {
              msgMap.set(m.id, m);
            }
            if (lastMsg) {
              msgMap.set(lastMsg.id, lastMsg);
            }
            messages = Array.from(msgMap.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          } else if (lastMsg) {
            messages = [lastMsg];
          }

          const lastActivity = lastMsg
            ? new Date(lastMsg.timestamp).getTime()
            : (c.conversationTimestamp ? c.conversationTimestamp * 1000 : 0);

          const isArchived = c.archive || c.archived || c._chat?.archive || c._chat?.archived || false;

          return {
            id: chatId,
            contact: {
              id: chatId,
              name: name,
              phone: phone,
              status: 'Lead',
            },
            unreadCount: c._chat?.unreadCount || c.unreadCount || c._chat?.unreadMentionCount || 0,
            messages: messages,
            lastActivity: lastActivity,
            isArchived: isArchived,
            hasLoadedHistory: existingConv ? existingConv.hasLoadedHistory : false
          };
        } catch (itemErr) {
          console.error(`Error mapping chat item with ID ${c.id}:`, itemErr.message);
          throw itemErr; // rethrow to see if it halts the mapping
        }
      });

    console.log("Successfully mapped conversations count:", mappedConversations.length);
    console.log("Sample mapped conversation:", JSON.stringify(mappedConversations[0], null, 2));

  } catch (err) {
    console.error("Mapping script failed:", err.message, err.stack);
  }
}

testMapping();
