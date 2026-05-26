import { create } from 'zustand';
import { Conversation, FunnelStage, Message, CustomFieldDefinition, ScheduledMessage, MessageTemplate, User } from '../types';
import { supabase } from '../lib/supabase';

let wahaSocket: WebSocket | null = null;
const activeAbortControllers = new Map<string, AbortController>();

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (name: string, email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  
  conversations: Conversation[];
  activeConversationId: string | null;
  funnelStages: FunnelStage[];
  customFields: CustomFieldDefinition[];
  scheduledMessages: ScheduledMessage[];
  templates: MessageTemplate[];
  setActiveConversation: (id: string | null) => void;
  sendMessage: (conversationId: string, content: string) => void;
  loadChats: () => Promise<void>;
  loadMessages: (chatId: string, isPriority?: boolean) => Promise<void>;
  profilePictures: Record<string, string>;
  fetchProfilePicture: (chatId: string) => Promise<void>;
  contactsMap: Record<string, string>;
  isContactsLoaded: boolean;
  loadContacts: () => Promise<void>;
  isLoadingChats: boolean;
  isChatsInitialLoaded: boolean;
  loadingChatId: string | null;
  profilePicsQueue: string[];
  isProcessingQueue: boolean;
  processProfilePicsQueue: () => Promise<void>;
  moveContact: (contactId: string, fromStageId: string, toStageId: string, sourceIndex: number, destIndex: number) => void;
  addToKanban: (contactId: string) => void;
  removeFromKanban: (contactId: string) => void;
  loadCustomFields: () => Promise<void>;
  addCustomField: (field: Omit<CustomFieldDefinition, 'id'>) => Promise<void>;
  removeCustomField: (id: string) => Promise<void>;
  reorderCustomFields: (customFields: CustomFieldDefinition[]) => Promise<void>;
  updateContactCustomField: (contactId: string, fieldId: string, value: string) => void;
  addScheduledMessage: (msg: Omit<ScheduledMessage, 'id' | 'status'>) => void;
  removeScheduledMessage: (id: string) => void;
  addTemplate: (tpl: Omit<MessageTemplate, 'id'>) => void;
  removeTemplate: (id: string) => void;

  // WAHA Integration
  wahaUrl: string;
  wahaApiKey: string;
  wahaSessionStatus: 'DISCONNECTED' | 'STARTING' | 'SCAN_QR_CODE' | 'CONNECTED' | 'FAILED';
  wahaQrCode: string | null;
  setWahaUrl: (url: string) => void;
  setWahaApiKey: (apiKey: string) => void;
  checkWahaStatus: () => Promise<void>;
  startWahaSession: () => Promise<void>;
  stopWahaSession: () => Promise<void>;
  initWebSocket: () => void;
}

const mockCustomFields: CustomFieldDefinition[] = [
  { id: 'cf_1', name: 'Segmento', type: 'select', options: ['Varejo', 'Indústria', 'Serviços', 'Tecnologia'] },
  { id: 'cf_2', name: 'CNPJ', type: 'text' },
];

const mockConversations: Conversation[] = [
  {
    id: 'conv_1',
    contact: { id: 'c1', name: 'João Silva', phone: '+55 11 99999-9999', company: 'Gráfica Express', status: 'Morno', funnelStageId: 'stage_1', customFields: { 'cf_1': 'Indústria' } },
    unreadCount: 2,
    messages: [
      { id: 'm1', content: 'Olá, gostaria de um orçamento para 1000 flyers.', timestamp: new Date(Date.now() - 3600000).toISOString(), isFromMe: false, type: 'TEXT' },
      { id: 'm2', content: 'Claro, me conte mais sobre o material.', timestamp: new Date(Date.now() - 3500000).toISOString(), isFromMe: true, type: 'TEXT' },
      { id: 'm3', content: 'Pode ser em papel couchê 90g.', timestamp: new Date(Date.now() - 3400000).toISOString(), isFromMe: false, type: 'TEXT' },
    ],
  },
  {
    id: 'conv_2',
    contact: { id: 'c2', name: 'Maria Souza', phone: '+55 11 98888-8888', company: 'Consultoria RH', status: 'Quente', funnelStageId: 'stage_2' },
    unreadCount: 0,
    messages: [
      { id: 'm4', content: 'Áudio enviado', timestamp: new Date(Date.now() - 86400000).toISOString(), isFromMe: false, type: 'AUDIO', audioTranscription: 'Oi, a gente pode fechar o contrato hoje mesmo, manda o link por favor.' },
      { id: 'm5', content: 'Perfeito Maria, enviando agora!', timestamp: new Date(Date.now() - 86300000).toISOString(), isFromMe: true, type: 'TEXT' },
    ],
  },
  {
    id: 'conv_3',
    contact: { id: 'c3', name: 'Lucas Mendes', phone: '+55 11 97777-7777', status: 'Lead' },
    unreadCount: 1,
    messages: [
      { id: 'm6', content: 'Boa tarde, como funciona o serviço?', timestamp: new Date(Date.now() - 10000).toISOString(), isFromMe: false, type: 'TEXT' },
    ],
  },
];

const mockStages: FunnelStage[] = [
  { id: 'stage_1', name: 'Primeiro Contato', contactIds: ['c1'] },
  { id: 'stage_2', name: 'Negociação', contactIds: ['c2'] },
  { id: 'stage_3', name: 'Fechado', contactIds: [] },
  { id: 'stage_4', name: 'Pós-venda', contactIds: [] },
];

const mockTemplates: MessageTemplate[] = [
  { id: 'tpl_1', title: 'Boas vindas', type: 'TEXT', content: 'Olá! Seja bem-vindo ao ZapFunil CRM. Como podemos ajudar hoje?' },
  { id: 'tpl_2', title: 'Tabela de Preços', type: 'PDF', content: 'Segue em anexo nossa tabela de preços atualizada.' },
  { id: 'tpl_3', title: 'Áudio Inicial', type: 'AUDIO', content: 'Áudio', mediaUrl: 'https://example.com/audio.mp3' },
];

const mockScheduledMessages: ScheduledMessage[] = [
  { id: 'sched_1', contactId: 'c1', type: 'TEXT', content: 'Verificando se conseguiu analisar o orçamento.', date: new Date().toISOString().split('T')[0], time: '14:30', recurrence: 'NONE', status: 'PENDING' },
];

const ensureRolesAndUsersSeeded = async () => {
  try {
    const { data: roles, error: rolesError } = await supabase.from('Role').select('*');
    if (rolesError || !roles || roles.length === 0) return;
    
    const defaultRole = roles[0];
    
    const { count, error: countError } = await supabase
      .from('User')
      .select('*', { count: 'exact', head: true });
      
    if (countError) throw countError;
    
    if (count === 0) {
      const { error: insertUsersErr } = await supabase
        .from('User')
        .insert([
          {
            email: 'admin@zapfunil.com',
            name: 'Mário (Admin)',
            password: '123456',
            roleId: defaultRole.id
          },
          {
            email: 'ana@zapfunil.com',
            name: 'Ana (Atendente)',
            password: '123456',
            roleId: defaultRole.id
          }
        ]);
      if (insertUsersErr) {
        console.warn("Failed to insert mock users (could be RLS on User table):", insertUsersErr);
      } else {
        console.log("Database default users seeded successfully.");
      }
    }
  } catch (err) {
    console.error("Failed to seed database users:", err);
  }
};

let pollingInterval: any = null;

const startPolling = (get: any) => {
  if (pollingInterval) return;
  pollingInterval = setInterval(async () => {
    await get().checkWahaStatus();
    const status = get().wahaSessionStatus;
    if (status === 'CONNECTED' || status === 'FAILED' || status === 'DISCONNECTED') {
      stopPolling();
    }
  }, 3000);
};

const stopPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
};

const getWahaHeaders = (get: any) => {
  const headers: HeadersInit = { 
    'Content-Type': 'application/json',
    'x-waha-url': get().wahaUrl
  };
  const apiKey = get().wahaApiKey;
  if (apiKey) {
    headers['X-Api-Key'] = apiKey;
  }
  return headers;
};

const getWahaSessionName = (user: any) => {
  if (!user) return 'default';
  const name = String(user.name || "user")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
  return `${name}-${user.id}`;
};

const wahaMsgToMessage = (msg: any, wahaUrl?: string, apiKey?: string): Message => {
  let msgType: Message['type'] = 'TEXT';
  let content = msg.body || '';
  let mediaUrl: string | undefined = undefined;
  
  if (msg.hasMedia) {
    const mime = msg.media?.mimetype || '';
    if (msg.media?.url && wahaUrl) {
      try {
        const urlString = msg.media.url;
        const wahaUrlParam = `wahaUrl=${encodeURIComponent(wahaUrl)}`;
        const apiKeyParam = apiKey ? `&apiKey=${encodeURIComponent(apiKey)}` : '';
        
        if (urlString.startsWith('http')) {
          const urlObj = new URL(urlString);
          mediaUrl = `/api/waha-proxy${urlObj.pathname}?${wahaUrlParam}${apiKeyParam}`;
        } else {
          const cleanPath = urlString.startsWith('/') ? urlString : `/${urlString}`;
          mediaUrl = `/api/waha-proxy${cleanPath}?${wahaUrlParam}${apiKeyParam}`;
        }
      } catch (e) {
        console.error("Failed to parse media URL:", e);
      }
    }

    if (mime.startsWith('audio')) {
      msgType = 'AUDIO';
      content = msg.body || '🎵 Áudio';
    } else if (mime.startsWith('image')) {
      msgType = 'IMAGE';
      content = msg.body || '📷 Imagem';
    } else {
      content = msg.body || '📁 Arquivo';
    }
  }
  
  return {
    id: msg.id,
    content: content,
    timestamp: new Date(msg.timestamp * 1000).toISOString(),
    isFromMe: msg.fromMe,
    type: msgType,
    mediaUrl: mediaUrl
  };
};

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  login: async (email, pass) => {
    try {
      await ensureRolesAndUsersSeeded();
      const { data: u, error } = await supabase
        .from('User')
        .select('*, role:Role(*)')
        .eq('email', email.toLowerCase())
        .maybeSingle();
        
      if (error) throw error;
      
      if (u && u.password === pass) {
        const userObj: User = {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role?.name || 'ADMIN'
        };
        
        set({ user: userObj, isAuthenticated: true });
        await get().loadCustomFields();
        await get().checkWahaStatus();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Login error:", err);
      return false;
    }
  },
  register: async (name, email, pass) => {
    try {
      await ensureRolesAndUsersSeeded();
      const { data: existing, error: checkErr } = await supabase
        .from('User')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();
        
      if (checkErr) throw checkErr;
      if (existing) {
        throw new Error('E-mail já cadastrado.');
      }
      
      const { data: roles, error: rolesErr } = await supabase.from('Role').select('*');
      if (rolesErr) throw rolesErr;
      
      const defaultRole = roles && roles.length > 0 ? roles[0] : null;
      if (!defaultRole) {
        throw new Error('Nenhuma função (Role) cadastrada no banco de dados. Por favor, execute o script de migração (supabase_migration.sql) ou insira uma role no SQL Editor do Supabase.');
      }
      
      const { data: newUser, error: insertErr } = await supabase
        .from('User')
        .insert([
          {
            name,
            email: email.toLowerCase(),
            password: pass,
            roleId: defaultRole.id
          }
        ])
        .select('*, role:Role(*)')
        .single();
        
      if (insertErr) throw insertErr;
      
      if (newUser) {
        const userObj: User = {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role?.name || 'ADMIN'
        };
        
        set({ user: userObj, isAuthenticated: true });
        await get().loadCustomFields();
        return true;
      }
      return false;
    } catch (err: any) {
      console.error("Register error:", err);
      throw new Error(err.message || 'Ocorreu um erro ao criar a conta.');
    }
  },
  logout: () => {
    stopPolling();
    const qrCode = get().wahaQrCode;
    if (qrCode && qrCode.startsWith('blob:')) {
      URL.revokeObjectURL(qrCode);
    }
    if (wahaSocket) {
      try { wahaSocket.close(); } catch (e) {}
      wahaSocket = null;
    }
    set({ 
      user: null, 
      isAuthenticated: false, 
      wahaSessionStatus: 'DISCONNECTED', 
      wahaQrCode: null,
      contactsMap: {},
      isContactsLoaded: false,
      profilePictures: {},
      profilePicsQueue: [],
      isProcessingQueue: false
    });
  },

  conversations: (() => {
    try {
      const cached = localStorage.getItem('zapfunil_conversations_cache');
      return cached ? JSON.parse(cached) : mockConversations;
    } catch (e) {
      return mockConversations;
    }
  })(),
  activeConversationId: null,
  funnelStages: mockStages,
  customFields: [],
  profilePictures: {},
  contactsMap: (() => {
    try {
      const cached = localStorage.getItem('waha_contacts_map');
      return cached ? JSON.parse(cached) : {};
    } catch (e) {
      return {};
    }
  })(),
  isContactsLoaded: (() => {
    try {
      return !!localStorage.getItem('waha_contacts_map');
    } catch (e) {
      return false;
    }
  })(),
  isLoadingChats: false,
  isChatsInitialLoaded: false,
  loadingChatId: null,
  profilePicsQueue: [],
  isProcessingQueue: false,
  scheduledMessages: mockScheduledMessages,
  templates: mockTemplates,
  setActiveConversation: (id) => {
    set({ activeConversationId: id });
    if (id && get().wahaSessionStatus === 'CONNECTED') {
      get().loadMessages(id, true);
    }
  },
  sendMessage: async (conversationId, content) => {
    const isWaha = get().wahaSessionStatus === 'CONNECTED';
    
    // Create optimistic message
    const optimisticMsg: Message = {
      id: 'opt_' + Math.random().toString(36).substring(7),
      content,
      timestamp: new Date().toISOString(),
      isFromMe: true,
      type: 'TEXT'
    };

    // Optimistically update UI
    set((state) => ({
      conversations: state.conversations.map(c => 
        c.id === conversationId 
          ? { ...c, messages: [...c.messages, optimisticMsg], unreadCount: 0 } 
          : c
      )
    }));

    if (isWaha) {
      const user = get().user;
      if (!user) return;
      const sessionName = getWahaSessionName(user);

      try {
        const res = await fetch(`/api/waha-proxy/api/sendText`, {
          method: 'POST',
          headers: getWahaHeaders(get),
          body: JSON.stringify({
            chatId: conversationId,
            text: content,
            session: sessionName
          })
        });

        if (!res.ok) {
          throw new Error("Failed to send WAHA message");
        }

        // Fetch official messages to replace optimistic one and sync up
        await get().loadMessages(conversationId);
      } catch (err) {
        console.error("Failed to send WAHA message:", err);
      }
    }
  },
  loadChats: async () => {
    const user = get().user;
    if (!user) return;
    const sessionName = getWahaSessionName(user);

    const isFirstLoad = !get().isChatsInitialLoaded;
    if (isFirstLoad) {
      set({ isLoadingChats: true });
    }

    try {
      // Fetch chats and messages in parallel
      const [chatsRes, msgsRes] = await Promise.all([
        fetch(`/api/waha-proxy/api/${sessionName}/chats`, {
          headers: getWahaHeaders(get)
        }),
        fetch(`/api/waha-proxy/api/${sessionName}/chats/all/messages?limit=50&downloadMedia=true`, {
          headers: getWahaHeaders(get)
        })
      ]);

      if (!chatsRes.ok) throw new Error("Failed to fetch chats");
      const chatsData = await chatsRes.json();

      let globalMsgs: any[] = [];
      if (msgsRes.ok) {
        globalMsgs = await msgsRes.json();
      }

      // Group recent messages by chat ID
      const msgsByChat: Record<string, any[]> = {};
      for (const m of globalMsgs) {
        const cId = m._data?.key?.remoteJid || (m.fromMe ? m.to : m.from);
        if (cId) {
          if (!msgsByChat[cId]) msgsByChat[cId] = [];
          msgsByChat[cId].push(m);
        }
      }

      const contactsMap = get().contactsMap;

      // 3. Map to Conversation structure
      const mappedConversations: Conversation[] = chatsData
        .filter((c: any) => c.id && c.id !== 'status@broadcast')
        .map((c: any) => {
          const chatId = c.id;
          const phone = chatId.split('@')[0];
          
          // Resolve name from c.name or from the contacts address book map
          let name = c.name;
          if (!name) {
            name = contactsMap[chatId] || contactsMap[phone + '@s.whatsapp.net'] || contactsMap[phone + '@c.us'] || phone;
          }

          // Clean up formatting/name if it starts with strange chars
          if (name && name.startsWith('*\n')) {
            name = name.replace('*\n', '');
          }

          // Find messages for this chat in the global list, convert them
          const wahaMsgs = msgsByChat[chatId] || [];
          const newMessages = wahaMsgs.map(msg => wahaMsgToMessage(msg, get().wahaUrl, get().wahaApiKey));
          
          // Preserve existing loaded messages for this chat to avoid dropping history
          const existingConv = get().conversations.find(c => c.id === chatId);
          const msgMap = new Map<string, Message>();
          if (existingConv) {
            for (const m of existingConv.messages) {
              msgMap.set(m.id, m);
            }
          }
          for (const m of newMessages) {
            msgMap.set(m.id, m);
          }
          
          const messages = Array.from(msgMap.values())
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

          const lastMsg = messages[messages.length - 1];
          const lastActivity = lastMsg 
            ? new Date(lastMsg.timestamp).getTime() 
            : (c.conversationTimestamp ? c.conversationTimestamp * 1000 : 0);

          return {
            id: chatId,
            contact: {
              id: chatId,
              name: name,
              phone: phone,
              status: 'Lead', // Default status
            },
            unreadCount: c.unreadCount || c.unreadMentionCount || 0,
            messages: messages,
            lastActivity: lastActivity
          };
        });

      // 4. Sort conversations: most recent activity at the top
      mappedConversations.sort((a, b) => {
        const timeA = a.lastActivity || 0;
        const timeB = b.lastActivity || 0;
        return timeB - timeA;
      });

      set({ conversations: mappedConversations });

      // Pre-fetch messages for top 5 chats in background to make selecting them instant
      const topChats = mappedConversations.slice(0, 5);
      for (const chat of topChats) {
        if (chat.messages.length <= 5) {
          get().loadMessages(chat.id);
        }
      }

      // Non-blocking trigger: load contacts in background if they haven't been loaded yet
      if (!get().isContactsLoaded) {
        get().loadContacts();
      }
    } catch (err) {
      console.error("Failed to load WAHA chats:", err);
    } finally {
      set({ isLoadingChats: false, isChatsInitialLoaded: true });
    }
  },
  loadContacts: async () => {
    const user = get().user;
    if (!user) return;
    const sessionName = getWahaSessionName(user);

    try {
      const contactsRes = await fetch(`/api/waha-proxy/api/contacts/all?session=${sessionName}`, {
        headers: getWahaHeaders(get)
      });
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        const contactsMap: Record<string, string> = {};
        for (const c of contactsData) {
          const nameVal = c.verifiedName || c.name;
          if (nameVal) {
            if (c.id) contactsMap[c.id] = nameVal;
            if (c.phoneNumber) contactsMap[c.phoneNumber] = nameVal;
          }
        }
        
        try {
          localStorage.setItem('waha_contacts_map', JSON.stringify(contactsMap));
        } catch (e) {}

        set({ contactsMap, isContactsLoaded: true });
        
        // Update names of currently loaded conversations in-place to avoid heavy loadChats reload
        set((state) => ({
          conversations: state.conversations.map(c => {
            const phone = c.id.split('@')[0];
            const name = contactsMap[c.id] || contactsMap[phone + '@s.whatsapp.net'] || contactsMap[phone + '@c.us'] || c.contact.name;
            return {
              ...c,
              contact: { ...c.contact, name }
            };
          })
        }));
      }
    } catch (err) {
      console.error("Failed to load contacts:", err);
    }
  },
  loadMessages: async (chatId, isPriority = false) => {
    const user = get().user;
    if (!user) return;
    const sessionName = getWahaSessionName(user);

    // If this is a user-initiated priority request, cancel all other active background loads
    if (isPriority) {
      for (const [id, controller] of activeAbortControllers.entries()) {
        if (id !== chatId) {
          console.log(`[Abort] Cancelling background load for ${id} to prioritize clicked chat.`);
          controller.abort();
          activeAbortControllers.delete(id);
        }
      }
    }

    // Cancel any previous pending load for the SAME contact
    if (activeAbortControllers.has(chatId)) {
      activeAbortControllers.get(chatId)?.abort();
    }

    const controller = new AbortController();
    activeAbortControllers.set(chatId, controller);

    // Set loading state
    set({ loadingChatId: chatId });

    try {
      const res = await fetch(`/api/waha-proxy/api/${sessionName}/chats/${chatId}/messages?limit=30&downloadMedia=true`, {
        headers: getWahaHeaders(get),
        signal: controller.signal
      });
      if (!res.ok) throw new Error("Failed to fetch messages for chat");
      
      const wahaMsgs = await res.json();
      const messages = wahaMsgs
        .map(msg => wahaMsgToMessage(msg, get().wahaUrl, get().wahaApiKey))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Update messages in the specific conversation in state
      set((state) => ({
        conversations: state.conversations.map(c => 
          c.id === chatId ? { ...c, messages, hasLoadedHistory: true } : c
        )
      }));
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log(`[Abort] Load messages for ${chatId} was cancelled.`);
      } else {
        console.error(`Failed to load messages for chat ${chatId}:`, err);
      }
    } finally {
      if (activeAbortControllers.get(chatId) === controller) {
        activeAbortControllers.delete(chatId);
      }
      if (get().loadingChatId === chatId) {
        set({ loadingChatId: null });
      }
    }
  },
  fetchProfilePicture: async (chatId) => {
    if (get().profilePictures[chatId]) return;
    if (get().profilePicsQueue.includes(chatId)) return;

    set((state) => ({
      profilePicsQueue: [...state.profilePicsQueue, chatId]
    }));

    get().processProfilePicsQueue();
  },
  processProfilePicsQueue: async () => {
    if (get().isProcessingQueue) return;
    set({ isProcessingQueue: true });

    while (get().profilePicsQueue.length > 0) {
      const chatId = get().profilePicsQueue[0];
      
      set((state) => ({
        profilePicsQueue: state.profilePicsQueue.slice(1)
      }));

      if (!get().profilePictures[chatId]) {
        const user = get().user;
        if (user) {
          const sessionName = getWahaSessionName(user);
          let avatarUrl = '';
          try {
            const isGroup = chatId.endsWith('@g.us');
            if (isGroup) {
              const res = await fetch(`/api/waha-proxy/api/${sessionName}/groups/${chatId}/picture`, {
                headers: getWahaHeaders(get)
              });
              if (res.ok) {
                const data = await res.json();
                if (data.url) {
                  avatarUrl = data.url;
                }
              }
            } else {
              const contactId = chatId.replace('@s.whatsapp.net', '@c.us');
              const res = await fetch(`/api/waha-proxy/api/contacts/profile-picture?contactId=${contactId}&session=${sessionName}`, {
                headers: getWahaHeaders(get)
              });
              if (res.ok) {
                const data = await res.json();
                if (data.profilePictureURL) {
                  avatarUrl = data.profilePictureURL;
                }
              }
            }
          } catch (e) {
            console.error(`[Avatar] Failed to fetch avatar for ${chatId}:`, e);
          }

          set((state) => ({
            profilePictures: {
              ...state.profilePictures,
              [chatId]: avatarUrl || 'FAILED'
            }
          }));
        }
      }

      await new Promise(resolve => setTimeout(resolve, 50));
    }

    set({ isProcessingQueue: false });
  },
  moveContact: (contactId, fromStageId, toStageId, sourceIndex, destIndex) => set((state) => {
    const newStages = [...state.funnelStages];
    
    const sourceStage = newStages.find(s => s.id === fromStageId);
    const destStage = newStages.find(s => s.id === toStageId);
    
    if (!sourceStage || !destStage) return state;

    sourceStage.contactIds.splice(sourceIndex, 1);
    destStage.contactIds.splice(destIndex, 0, contactId);

    // Update the contact's funnelStageId inside conversations (dirty, but works for mock)
    const newConversations = state.conversations.map(c => {
      if (c.contact.id === contactId) {
        return { ...c, contact: { ...c.contact, funnelStageId: toStageId }};
      }
      return c;
    });

    return { funnelStages: newStages, conversations: newConversations };
  }),
  addToKanban: (contactId) => set((state) => {
    // Adiciona ao primeiro estágio (stage_1)
    const firstStageId = state.funnelStages[0]?.id;
    if (!firstStageId) return state;

    const newStages = state.funnelStages.map(stage => {
      if (stage.id === firstStageId) {
         if (!stage.contactIds.includes(contactId)) {
           return { ...stage, contactIds: [...stage.contactIds, contactId] };
         }
      }
      return stage;
    });

    const newConversations = state.conversations.map(c => {
      if (c.contact.id === contactId) {
        return { ...c, contact: { ...c.contact, funnelStageId: firstStageId }};
      }
      return c;
    });

    return { funnelStages: newStages, conversations: newConversations };
  }),
  removeFromKanban: (contactId) => set((state) => {
    const newStages = state.funnelStages.map(stage => ({
      ...stage,
      contactIds: stage.contactIds.filter(id => id !== contactId)
    }));

    const newConversations = state.conversations.map(c => {
      if (c.contact.id === contactId) {
        return { ...c, contact: { ...c.contact, funnelStageId: undefined }};
      }
      return c;
    });

    return { funnelStages: newStages, conversations: newConversations };
  }),
  loadCustomFields: async () => {
    try {
      let { data, error } = await supabase
        .from('CustomField')
        .select('*');
      
      if (error) throw error;

      // If database is empty, seed initial custom fields
      if (!data || data.length === 0) {
        const defaultFields = [
          { name: 'Segmento', type: 'select', options: ['Varejo', 'Indústria', 'Serviços', 'Tecnologia'] },
          { name: 'CNPJ', type: 'text', options: null }
        ];

        const { data: inserted, error: insertError } = await supabase
          .from('CustomField')
          .insert(defaultFields)
          .select();

        if (insertError) {
          console.error("Error seeding default custom fields:", insertError);
        } else if (inserted) {
          data = inserted;
        }
      }

      // Read ordered list from localStorage
      const orderJson = localStorage.getItem('zapfunil_custom_fields_order');
      let orderedIds: string[] = [];
      if (orderJson) {
        try {
          orderedIds = JSON.parse(orderJson);
        } catch (e) {
          console.error("Error parsing custom field order from localStorage:", e);
        }
      }

      const fields: CustomFieldDefinition[] = (data || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        type: f.type as any,
        options: f.options || undefined
      }));

      // Sort fields according to orderedIds. Unordered ones go to the end.
      if (orderedIds.length > 0) {
        fields.sort((a, b) => {
          const indexA = orderedIds.indexOf(a.id);
          const indexB = orderedIds.indexOf(b.id);
          if (indexA === -1 && indexB === -1) return 0;
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
      }

      set({ customFields: fields });
    } catch (err) {
      console.error("Failed to load custom fields:", err);
    }
  },
  addCustomField: async (field) => {
    try {
      const { data, error } = await supabase
        .from('CustomField')
        .insert([{
          name: field.name,
          type: field.type,
          options: field.options || null
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newField: CustomFieldDefinition = {
          id: data.id,
          name: data.name,
          type: data.type as any,
          options: data.options || undefined
        };

        set((state) => {
          const updated = [...state.customFields, newField];
          
          // Update localStorage
          const orderJson = localStorage.getItem('zapfunil_custom_fields_order');
          let orderedIds: string[] = [];
          if (orderJson) {
            try {
              orderedIds = JSON.parse(orderJson);
            } catch (e) {}
          }
          orderedIds.push(newField.id);
          localStorage.setItem('zapfunil_custom_fields_order', JSON.stringify(orderedIds));

          return { customFields: updated };
        });
      }
    } catch (err) {
      console.error("Failed to add custom field:", err);
    }
  },
  removeCustomField: async (id) => {
    try {
      const { error } = await supabase
        .from('CustomField')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => {
        const updated = state.customFields.filter(f => f.id !== id);
        
        // Update localStorage
        const orderJson = localStorage.getItem('zapfunil_custom_fields_order');
        if (orderJson) {
          try {
            const orderedIds: string[] = JSON.parse(orderJson);
            const filteredIds = orderedIds.filter(fId => fId !== id);
            localStorage.setItem('zapfunil_custom_fields_order', JSON.stringify(filteredIds));
          } catch (e) {}
        }
        return { customFields: updated };
      });
    } catch (err) {
      console.error("Failed to remove custom field:", err);
    }
  },
  reorderCustomFields: async (customFields) => {
    const ids = customFields.map(f => f.id);
    localStorage.setItem('zapfunil_custom_fields_order', JSON.stringify(ids));
    set({ customFields });
  },
  updateContactCustomField: (contactId, fieldId, value) => set((state) => ({
    conversations: state.conversations.map(c => {
      if (c.contact.id === contactId) {
        return {
          ...c,
          contact: {
            ...c.contact,
            customFields: {
              ...(c.contact.customFields || {}),
              [fieldId]: value
            }
          }
        };
      }
      return c;
    })
  })),
  addScheduledMessage: (msg) => set((state) => ({
    scheduledMessages: [...state.scheduledMessages, { ...msg, id: Math.random().toString(36).substring(7), status: 'PENDING' }]
  })),
  removeScheduledMessage: (id) => set((state) => ({
    scheduledMessages: state.scheduledMessages.filter(s => s.id !== id)
  })),
  addTemplate: (tpl) => set((state) => ({
    templates: [...state.templates, { ...tpl, id: Math.random().toString(36).substring(7) }]
  })),
  removeTemplate: (id) => set((state) => ({
    templates: state.templates.filter(t => t.id !== id)
  })),

  // WAHA Integration
  wahaUrl: 'https://waha.kasaweb.online',
  wahaApiKey: '52c9d4d5cd513754c859548f10cab5bdabd2190c92aa9bdbbd8291473de0df43',
  wahaSessionStatus: 'DISCONNECTED',
  wahaQrCode: null,

  setWahaUrl: (url) => {
    set({ wahaUrl: url });
  },

  setWahaApiKey: (apiKey) => {
    set({ wahaApiKey: apiKey });
  },

  checkWahaStatus: async () => {
    const user = get().user;
    if (!user) return;
    const sessionName = getWahaSessionName(user);
    try {
      const res = await fetch(`/api/waha-proxy/api/sessions/${sessionName}?_t=${Date.now()}`, {
        headers: getWahaHeaders(get)
      });
      if (!res.ok) {
        if (res.status === 404 || res.status === 422) {
          set({ wahaSessionStatus: 'DISCONNECTED', wahaQrCode: null });
        }
        return;
      }
      const data = await res.json();
      const status = data.status; // e.g. STARTING, SCAN_QR_CODE, WORKING, STOPPED, FAILED
      
      if (status === "FAILED" || status === "STOPPED") {
        console.warn("[WAHA] Sessão falhou ou parou. Excluindo para liberar recursos...");
        try {
          await fetch(`/api/waha-proxy/api/sessions/${sessionName}`, {
            method: "DELETE",
            headers: getWahaHeaders(get)
          });
        } catch (e) {}
        localStorage.removeItem('waha_qr_start_time');
        set({ wahaSessionStatus: 'DISCONNECTED', wahaQrCode: null });
        return;
      }

      if (status === "SCAN_QR_CODE" || status === "STARTING") {
        let startTimeStr = localStorage.getItem('waha_qr_start_time');
        let startTime = startTimeStr ? parseInt(startTimeStr, 10) : null;
        if (!startTime) {
          startTime = Date.now();
          localStorage.setItem('waha_qr_start_time', String(startTime));
        } else if (Date.now() - startTime > 60000) {
          console.warn("[WAHA] Timeout de 1 minuto atingido no QR Code/Iniciação. Excluindo sessão...");
          try {
            await fetch(`/api/waha-proxy/api/sessions/${sessionName}`, {
              method: "DELETE",
              headers: getWahaHeaders(get)
            });
          } catch (e) {}
          localStorage.removeItem('waha_qr_start_time');
          set({ wahaSessionStatus: 'DISCONNECTED', wahaQrCode: null });
          return;
        }
      } else {
        localStorage.removeItem('waha_qr_start_time');
      }

      let mappedStatus: AppState['wahaSessionStatus'] = 'DISCONNECTED';
      if (status === 'STARTING') mappedStatus = 'STARTING';
      else if (status === 'SCAN_QR_CODE') mappedStatus = 'SCAN_QR_CODE';
      else if (status === 'WORKING') mappedStatus = 'CONNECTED';
      else if (status === 'FAILED') mappedStatus = 'FAILED';
      else if (status === 'STOPPED') mappedStatus = 'DISCONNECTED';

      let qrCode = get().wahaQrCode;
      if (status === 'SCAN_QR_CODE') {
        try {
          const qrRes = await fetch(`/api/waha-proxy/api/${sessionName}/auth/qr?format=image&t=${Date.now()}`, {
            headers: getWahaHeaders(get)
          });
          if (qrRes.ok) {
            const blob = await qrRes.blob();
            if (qrCode && qrCode.startsWith('blob:')) {
              URL.revokeObjectURL(qrCode);
            }
            qrCode = URL.createObjectURL(blob);
          }
        } catch (qrErr) {
          console.error("Error fetching WAHA QR:", qrErr);
        }
      } else {
        if (qrCode && qrCode.startsWith('blob:')) {
          URL.revokeObjectURL(qrCode);
        }
        qrCode = null;
      }

      set({ wahaSessionStatus: mappedStatus, wahaQrCode: qrCode });
      
      if (mappedStatus === 'CONNECTED') {
        get().initWebSocket();
      }
      
      // If still starting/scanning, start polling if not already
      if (mappedStatus === 'STARTING' || mappedStatus === 'SCAN_QR_CODE') {
        startPolling(get);
      }
    } catch (error) {
      console.error("Error checking WAHA status:", error);
    }
  },

  startWahaSession: async () => {
    const user = get().user;
    if (!user) return;
    const sessionName = getWahaSessionName(user);
    set({ wahaSessionStatus: 'STARTING', wahaQrCode: null });
    try {
      const configPayload = {
        noweb: {
          store: {
            enabled: true,
            fullSync: true
          }
        }
      };

      await fetch(`/api/waha-proxy/api/sessions/start`, {
        method: 'POST',
        headers: getWahaHeaders(get),
        body: JSON.stringify({
          name: sessionName,
          config: configPayload
        })
      });
      
      // Run status check immediately and start polling
      setTimeout(async () => {
        await get().checkWahaStatus();
      }, 1500);
      startPolling(get);
    } catch (error) {
      console.error("Error starting WAHA session:", error);
      set({ wahaSessionStatus: 'FAILED' });
    }
  },

  stopWahaSession: async () => {
    const user = get().user;
    if (!user) return;
    const sessionName = getWahaSessionName(user);
    stopPolling();
    if (wahaSocket) {
      try { wahaSocket.close(); } catch (e) {}
      wahaSocket = null;
    }
    set({ wahaSessionStatus: 'STARTING' }); // Show state change
    try {
      await fetch(`/api/waha-proxy/api/sessions/${sessionName}`, {
        method: 'DELETE',
        headers: getWahaHeaders(get)
      });
      // Give it a second to stop
      setTimeout(async () => {
        await get().checkWahaStatus();
      }, 1500);
    } catch (error) {
      console.error("Error stopping WAHA session:", error);
      set({ wahaSessionStatus: 'FAILED' });
    }
  },

  initWebSocket: () => {
    if (wahaSocket && (wahaSocket.readyState === WebSocket.OPEN || wahaSocket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (wahaSocket) {
      try { wahaSocket.close(); } catch (e){}
    }
    
    const wahaUrl = get().wahaUrl;
    const wahaApiKey = get().wahaApiKey;
    if (!wahaUrl) return;

    let wsUrl = wahaUrl.replace(/^http/, 'ws');
    wsUrl = wsUrl.replace(/\/$/, '') + '/ws';
    if (wahaApiKey) {
      wsUrl += `?x-api-key=${wahaApiKey}`;
    }

    console.log("[WAHA WebSocket] Connecting to:", wsUrl);
    const ws = new WebSocket(wsUrl);
    wahaSocket = ws;

    ws.onopen = () => {
      console.log("[WAHA WebSocket] Connected successfully.");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'message' || data.event === 'message.any') {
          const msgPayload = data.payload;
          const user = get().user;
          const sessionName = user ? getWahaSessionName(user) : 'default';
          
          if (data.session !== sessionName) return;

          const msg = wahaMsgToMessage(msgPayload);
          const chatId = msgPayload.fromMe ? msgPayload.to : msgPayload.from;
          if (!chatId) return;

          set((state) => {
            const existingConvIndex = state.conversations.findIndex(c => c.id === chatId);

            if (existingConvIndex === -1) {
              setTimeout(() => {
                get().loadChats();
              }, 100);
              return {};
            }

            const existingConv = state.conversations[existingConvIndex];
            
            if (existingConv.messages.some(m => m.id === msg.id)) {
              return {};
            }

            const updatedMessages = [...existingConv.messages, msg].sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );

            const isCurrentChat = state.activeConversationId === chatId;
            const updatedUnreadCount = isCurrentChat 
              ? 0 
              : existingConv.unreadCount + (msg.isFromMe ? 0 : 1);

            const updatedConv = {
              ...existingConv,
              messages: updatedMessages,
              unreadCount: updatedUnreadCount,
              lastActivity: new Date(msg.timestamp).getTime()
            };

            const newConversations = [...state.conversations];
            newConversations[existingConvIndex] = updatedConv;

            newConversations.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0));

            return { conversations: newConversations };
          });
        }
      } catch (err) {
        console.error("[WAHA WebSocket] Failed to parse message:", err);
      }
    };

    ws.onclose = () => {
      console.log("[WAHA WebSocket] Connection closed. Reconnecting in 5s...");
      setTimeout(() => {
        if (get().wahaSessionStatus === 'CONNECTED') {
          get().initWebSocket();
        }
      }, 5000);
    };

    ws.onerror = (err) => {
      console.error("[WAHA WebSocket] Error:", err);
    };
  }
}));

// Automatically persist conversations to localStorage whenever they change
let lastConversations: any = null;
useAppStore.subscribe((state) => {
  if (state.conversations !== lastConversations) {
    lastConversations = state.conversations;
    try {
      localStorage.setItem('zapfunil_conversations_cache', JSON.stringify(state.conversations));
    } catch (e) {
      console.error("[Store Cache] Failed to save conversations to cache:", e);
    }
  }
});
