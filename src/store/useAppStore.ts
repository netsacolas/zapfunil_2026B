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
  fetchProfilePicture: (chatId: string, force?: boolean) => Promise<void>;
  customAvatars: Record<string, string>;
  setCustomAvatar: (contactId: string, base64Data: string) => void;
  contactsMap: Record<string, string>;
  isContactsLoaded: boolean;
  isSyncingContacts: boolean;
  loadContacts: () => Promise<void>;
  syncContacts: () => Promise<void>;
  isLoadingChats: boolean;
  isLoadingMoreChats: boolean;
  hasMoreChats: boolean;
  isChatsInitialLoaded: boolean;
  loadingChatId: string | null;
  loadMoreChats: () => Promise<void>;
  profilePicsQueue: string[];
  isProcessingQueue: boolean;
  processProfilePicsQueue: (force?: boolean) => Promise<void>;
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
  updateContactName: (contactId: string, newName: string) => Promise<boolean>;

  archiveConversation: (id: string) => Promise<void>;
  unarchiveConversation: (id: string) => Promise<void>;
  clearConversationMessages: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  sendImageMessage: (conversationId: string, base64Data: string, mimeType: string, filename: string, caption?: string) => Promise<void>;
  sendVoiceMessage: (conversationId: string, base64Data: string, mimeType: string) => Promise<void>;
  sendFileMessage: (conversationId: string, base64Data: string, mimeType: string, filename: string) => Promise<void>;

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

export const isLikePhoneNumber = (name: any): boolean => {
  if (!name || typeof name !== 'string') return false;
  if (name.includes('@s.whatsapp.net') || name.includes('@c.us')) return true;
  const cleaned = name.replace(/[\s\-\(\)\+]/g, '');
  return /^\d{8,15}$/.test(cleaned);
};

export const formatPhoneNumber = (phone: any): string => {
  if (!phone || typeof phone !== 'string') return '';
  let cleaned = phone.split('@')[0];
  cleaned = cleaned.replace(/\D/g, '');
  if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
    cleaned = cleaned.substring(2);
  }
  if (cleaned.length === 11) {
    return `${cleaned.substring(0, 2)} ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
  } else if (cleaned.length === 10) {
    return `${cleaned.substring(0, 2)} ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  }
  return phone;
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

const wahaMsgToMessage = (msg: any, wahaUrl?: string, apiKey?: string, sessionName?: string): Message => {
  let msgType: Message['type'] = 'TEXT';
  let content = msg.body || '';
  let mediaUrl: string | undefined = undefined;
  
  // Extract sender details
  const senderId = msg.participant || msg.from || '';
  let senderName = msg._data?.pushName || msg.pushName || '';
  if (senderName && isLikePhoneNumber(senderName)) {
    senderName = formatPhoneNumber(senderName);
  }
  
  // 1. Classification based on WAHA message type
  const wahaType = (msg.type || '').toLowerCase();
  if (wahaType === 'image') {
    msgType = 'IMAGE';
    content = msg.body || '📷 Imagem';
  } else if (wahaType === 'audio' || wahaType === 'voice' || wahaType === 'ptt') {
    msgType = 'AUDIO';
    content = msg.body || '🎵 Áudio';
  }
  
  // 2. Determine if message should have media
  const hasMediaFile = msg.hasMedia || wahaType === 'image' || wahaType === 'audio' || wahaType === 'voice' || wahaType === 'ptt';
  
  if (hasMediaFile) {
    let mime = msg.media?.mimetype || '';
    if (!mime) {
      if (wahaType === 'image') mime = 'image/jpeg';
      else if (wahaType === 'audio' || wahaType === 'voice' || wahaType === 'ptt') mime = 'audio/ogg';
    }

    if (msgType === 'TEXT') {
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
    
    // 3. Construct media URL
    // We prioritize the direct URL from WAHA. If it's not present (e.g. WebSocket updates or expired files),
    // we use the official message-based file download endpoint which forces WAHA to fetch it on the fly.
    const fileSource = msg.media?.url || (msg.media?.filename ? `/api/files/${msg.media.filename}` : '');
    if (wahaUrl) {
      const wahaUrlParam = `wahaUrl=${encodeURIComponent(wahaUrl)}`;
      const apiKeyParam = apiKey ? `&apiKey=${encodeURIComponent(apiKey)}` : '';
      const mimeParam = mime ? `&mimeType=${encodeURIComponent(mime)}` : '';

      if (fileSource) {
        try {
          const urlString = fileSource;
          if (urlString.startsWith('http')) {
            const urlObj = new URL(urlString);
            mediaUrl = `/api/waha-proxy${urlObj.pathname}?${wahaUrlParam}${apiKeyParam}${mimeParam}`;
          } else {
            const cleanPath = urlString.startsWith('/') ? urlString : `/${urlString}`;
            mediaUrl = `/api/waha-proxy${cleanPath}?${wahaUrlParam}${apiKeyParam}${mimeParam}`;
          }
        } catch (e) {
          console.error("Failed to parse media URL:", e);
        }
      } else if (sessionName) {
        // Fallback for real-time WebSocket events or expired files: dynamic download by message ID
        mediaUrl = `/api/waha-proxy/api/${sessionName}/messages/${msg.id}/download/file?${wahaUrlParam}${apiKeyParam}${mimeParam}`;
      }
    }
  }
  
  return {
    id: msg.id,
    content: content,
    timestamp: new Date(msg.timestamp * 1000).toISOString(),
    isFromMe: msg.fromMe,
    type: msgType,
    mediaUrl: mediaUrl,
    senderId: senderId,
    senderName: senderName
  };
};

const initialProfilePictures = (() => {
  try {
    const cached = localStorage.getItem('zapfunil_profile_pictures');
    return cached ? JSON.parse(cached) : {};
  } catch (e) {
    console.error("Failed to parse cached profile pictures:", e);
    return {};
  }
})();

const saveProfilePictures = (pictures: Record<string, string>) => {
  try {
    localStorage.setItem('zapfunil_profile_pictures', JSON.stringify(pictures));
  } catch (e) {
    console.error("Failed to save profile pictures to localStorage:", e);
  }
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
      isSyncingContacts: false,
      profilePictures: {},
      profilePicsQueue: [],
      isProcessingQueue: false
    });
  },
  setCustomAvatar: (contactId, base64Data) => {
    const customAvatars = { ...get().customAvatars, [contactId]: base64Data };
    const profilePictures = { ...get().profilePictures, [contactId]: base64Data };
    set({ customAvatars, profilePictures });
    try {
      localStorage.setItem('zapfunil_custom_avatars', JSON.stringify(customAvatars));
      localStorage.setItem('zapfunil_profile_pictures', JSON.stringify(profilePictures));
    } catch (e) {
      console.error("Failed to save custom avatar:", e);
    }
  },

  conversations: (() => {
    try {
      const cached = localStorage.getItem('zapfunil_conversations_cache');
      const parsed = cached ? JSON.parse(cached) : null;
      return parsed && parsed.length > 0 ? parsed : mockConversations;
    } catch (e) {
      return mockConversations;
    }
  })(),
  activeConversationId: null,
  funnelStages: mockStages,
  customFields: [],
  profilePictures: initialProfilePictures,
  customAvatars: (() => {
    try {
      const cached = localStorage.getItem('zapfunil_custom_avatars');
      return cached ? JSON.parse(cached) : {};
    } catch (e) {
      return {};
    }
  })(),
  contactsMap: (() => {
    try {
      const cached = localStorage.getItem('waha_contacts_map');
      const parsed = cached ? JSON.parse(cached) : null;
      return parsed && typeof parsed === 'object' ? parsed : {};
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
  isSyncingContacts: false,
  isLoadingChats: false,
  isLoadingMoreChats: false,
  hasMoreChats: true,
  isChatsInitialLoaded: false,
  loadingChatId: null,
  profilePicsQueue: [],
  isProcessingQueue: false,
  scheduledMessages: mockScheduledMessages,
  templates: mockTemplates,
  setActiveConversation: (id) => {
    set({ activeConversationId: id });
    if (id) {
      // Limpar o contador de não lidas localmente de forma otimista
      set((state) => ({
        conversations: state.conversations.map(c => 
          c.id === id ? { ...c, unreadCount: 0 } : c
        )
      }));

      if (get().wahaSessionStatus === 'CONNECTED') {
        get().loadMessages(id, true);
        
        // Notificar o WAHA para marcar a conversa como lida (envia o check azul)
        const user = get().user;
        if (user) {
          const sessionName = getWahaSessionName(user);
          fetch(`/api/waha-proxy/api/${sessionName}/chats/${id}/read`, {
            method: 'POST',
            headers: getWahaHeaders(get)
          }).catch(err => console.error("Failed to mark chat as read in WAHA:", err));
        }
      }
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
      // Fetch chats overview (which includes recent chat list and the last message details in a single query)
      const res = await fetch(`/api/waha-proxy/api/${sessionName}/chats/overview?limit=25`, {
        headers: getWahaHeaders(get)
      });

      if (!res.ok) throw new Error("Failed to fetch chats overview");
      const overviewData = await res.json();

      const contactsMap = get().contactsMap;
      const profilePictures = { ...get().profilePictures };
      let profilePicsUpdated = false;

      const mappedConversations: Conversation[] = overviewData
        .filter((c: any) => c.id && c.id !== 'status@broadcast')
        .map((c: any) => {
          const chatId = c.id;
          const phone = chatId.split('@')[0];

          // Extract profile picture if available in overview DTO to avoid loading queue
          if (c.picture && c.picture !== 'FAILED' && !profilePictures[chatId]) {
            profilePictures[chatId] = c.picture.startsWith('http')
              ? `/api/avatar-proxy?url=${encodeURIComponent(c.picture)}`
              : c.picture;
            profilePicsUpdated = true;
          }

          // Resolve contact name from overview or cache
          let name = c.name;
          if (!name || isLikePhoneNumber(name)) {
            name = contactsMap[chatId] || contactsMap[phone + '@s.whatsapp.net'] || contactsMap[phone + '@c.us'] || name || phone;
          }
          if (name && name.startsWith('*\n')) {
            name = name.replace('*\n', '');
          }
          // Format phone number if the name is just a raw number JID/phone
          if (name && isLikePhoneNumber(name)) {
            name = formatPhoneNumber(name);
          }

          // Process last message if it exists
          let messages: Message[] = [];
          let lastMsg: Message | null = null;
          if (c.lastMessage) {
            const msgText = c.lastMessage.text || c.lastMessage.body || '';
            let msgType: Message['type'] = 'TEXT';
            if (msgText.startsWith('📷') || msgText.includes('Imagem') || msgText.toLowerCase().includes('photo')) {
              msgType = 'IMAGE';
            } else if (msgText.startsWith('🎵') || msgText.includes('Áudio') || msgText.toLowerCase().includes('voice') || msgText.toLowerCase().includes('audio') || msgText.toLowerCase().includes('ptt')) {
              msgType = 'AUDIO';
            }

            const timestamp = c.lastMessage.timestamp
              ? new Date(c.lastMessage.timestamp * 1000).toISOString()
              : new Date().toISOString();

            lastMsg = {
              id: c.lastMessage.id || Math.random().toString(36).substring(7),
              content: msgText,
              timestamp: timestamp,
              isFromMe: !!c.lastMessage.fromMe,
              type: msgType
            };
          }

          // Merge last message with existing historical messages
          const existingConv = get().conversations.find(conv => conv.id === chatId);
          if (existingConv && existingConv.messages.length > 0) {
            const msgMap = new Map<string, Message>();
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

          // Get archive status (supported by WAHA engine DTOs)
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
        });

      if (profilePicsUpdated) {
        set({ profilePictures });
        saveProfilePictures(profilePictures);
      }

      set({ 
        conversations: mappedConversations,
        hasMoreChats: overviewData.length === 25
      });

      // Pre-fetch messages for top 5 chats in background (lazy load)
      const topChats = mappedConversations.slice(0, 5);
      for (const chat of topChats) {
        if (chat.messages.length <= 1) {
          get().loadMessages(chat.id);
        }
      }

      // Non-blocking trigger: load contacts in background after 15 seconds to avoid initial overload
      if (!get().isContactsLoaded && !get().isSyncingContacts) {
        setTimeout(() => {
          if (!get().isContactsLoaded && !get().isSyncingContacts && get().wahaSessionStatus === 'CONNECTED') {
            get().loadContacts();
          }
        }, 15000);
      }
    } catch (err) {
      console.error("Failed to load WAHA chats overview:", err);
    } finally {
      set({ isLoadingChats: false, isChatsInitialLoaded: true });
    }
  },
  loadMoreChats: async () => {
    if (get().isLoadingMoreChats || !get().hasMoreChats) return;
    const user = get().user;
    if (!user) return;
    const sessionName = getWahaSessionName(user);

    set({ isLoadingMoreChats: true });

    try {
      const currentCount = get().conversations.length;
      const res = await fetch(`/api/waha-proxy/api/${sessionName}/chats/overview?limit=25&offset=${currentCount}`, {
        headers: getWahaHeaders(get)
      });

      if (!res.ok) throw new Error("Failed to fetch more chats overview");
      const overviewData = await res.json();

      if (overviewData.length === 0) {
        set({ hasMoreChats: false });
        return;
      }

      const contactsMap = get().contactsMap;
      const profilePictures = { ...get().profilePictures };
      let profilePicsUpdated = false;

      const newConversations: Conversation[] = overviewData
        .filter((c: any) => c.id && c.id !== 'status@broadcast')
        .map((c: any) => {
          const chatId = c.id;
          const phone = chatId.split('@')[0];

          // Extract profile picture if available in overview DTO
          if (c.picture && c.picture !== 'FAILED' && !profilePictures[chatId]) {
            profilePictures[chatId] = c.picture.startsWith('http')
              ? `/api/avatar-proxy?url=${encodeURIComponent(c.picture)}`
              : c.picture;
            profilePicsUpdated = true;
          }

          // Resolve contact name from overview or cache
          let name = c.name;
          if (!name || isLikePhoneNumber(name)) {
            name = contactsMap[chatId] || contactsMap[phone + '@s.whatsapp.net'] || contactsMap[phone + '@c.us'] || name || phone;
          }
          if (name && name.startsWith('*\n')) {
            name = name.replace('*\n', '');
          }
          // Format phone number if the name is just a raw number JID/phone
          if (name && isLikePhoneNumber(name)) {
            name = formatPhoneNumber(name);
          }

          // Process last message if it exists
          let messages: Message[] = [];
          let lastMsg: Message | null = null;
          if (c.lastMessage) {
            const msgText = c.lastMessage.text || c.lastMessage.body || '';
            let msgType: Message['type'] = 'TEXT';
            if (msgText.startsWith('📷') || msgText.includes('Imagem') || msgText.toLowerCase().includes('photo')) {
              msgType = 'IMAGE';
            } else if (msgText.startsWith('🎵') || msgText.includes('Áudio') || msgText.toLowerCase().includes('voice') || msgText.toLowerCase().includes('audio') || msgText.toLowerCase().includes('ptt')) {
              msgType = 'AUDIO';
            }

            const timestamp = c.lastMessage.timestamp
              ? new Date(c.lastMessage.timestamp * 1000).toISOString()
              : new Date().toISOString();

            lastMsg = {
              id: c.lastMessage.id || Math.random().toString(36).substring(7),
              content: msgText,
              timestamp: timestamp,
              isFromMe: !!c.lastMessage.fromMe,
              type: msgType
            };
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
            hasLoadedHistory: false
          };
        });

      if (profilePicsUpdated) {
        set({ profilePictures });
        saveProfilePictures(profilePictures);
      }

      // Merge new conversations with existing ones (avoiding duplicates)
      set((state) => {
        const mergedMap = new Map<string, Conversation>();
        state.conversations.forEach(c => mergedMap.set(c.id, c));
        newConversations.forEach(c => {
          if (!mergedMap.has(c.id)) {
            mergedMap.set(c.id, c);
          }
        });

        const mergedList = Array.from(mergedMap.values());
        
        // Sort: most recent activity at the top
        mergedList.sort((a, b) => {
          const timeA = a.lastActivity || 0;
          const timeB = b.lastActivity || 0;
          return timeB - timeA;
        });

        return {
          conversations: mergedList,
          hasMoreChats: overviewData.length === 25
        };
      });
    } catch (err) {
      console.error("Failed to load more chats:", err);
    } finally {
      set({ isLoadingMoreChats: false });
    }
  },
  loadContacts: async () => {
    if (get().isSyncingContacts) return;
    const user = get().user;
    if (!user) return;
    const sessionName = getWahaSessionName(user);

    set({ isSyncingContacts: true });

    try {
      const contactsRes = await fetch(`/api/waha-proxy/api/contacts/all?session=${sessionName}`, {
        headers: getWahaHeaders(get)
      });
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        
        // Chunk processing to avoid blocking UI main thread
        const contactsMap: Record<string, string> = { ...get().contactsMap };
        const chunkSize = 500;
        let index = 0;

        const processChunk = () => {
          const end = Math.min(index + chunkSize, contactsData.length);
          for (let i = index; i < end; i++) {
            const c = contactsData[i];
            const nameVal = c.verifiedName || c.name;
            if (nameVal && !isLikePhoneNumber(nameVal)) {
              if (c.id) contactsMap[c.id] = nameVal;
              if (c.phoneNumber) contactsMap[c.phoneNumber] = nameVal;
            }
          }
          
          index = end;
          if (index < contactsData.length) {
            setTimeout(processChunk, 10);
          } else {
            // Done processing all contacts
            try {
              localStorage.setItem('waha_contacts_map', JSON.stringify(contactsMap));
            } catch (e) {
              console.error("[Storage] Failed to save contacts map to localStorage:", e);
            }
            
            set({ contactsMap, isContactsLoaded: true, isSyncingContacts: false });
            
            // Update names of currently loaded conversations in-place
            set((state) => ({
              conversations: state.conversations.map(c => {
                const phone = c.id.split('@')[0];
                let name = contactsMap[c.id] || contactsMap[phone + '@s.whatsapp.net'] || contactsMap[phone + '@c.us'] || c.contact.name;
                if (name && isLikePhoneNumber(name)) {
                  name = formatPhoneNumber(name);
                }
                return {
                  ...c,
                  contact: { ...c.contact, name }
                };
              })
            }));
          }
        };

        processChunk();
      } else {
        set({ isSyncingContacts: false });
      }
    } catch (err) {
      console.error("Failed to load contacts:", err);
      set({ isSyncingContacts: false });
    }
  },
  syncContacts: async () => {
    set({ isContactsLoaded: false });
    await get().loadContacts();
  },
  updateContactName: async (contactId, newName) => {
    const user = get().user;
    if (!user) return false;
    const sessionName = getWahaSessionName(user);

    const parts = newName.trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    try {
      const res = await fetch(`/api/waha-proxy/api/${sessionName}/contacts/${contactId}`, {
        method: 'PUT',
        headers: getWahaHeaders(get),
        body: JSON.stringify({ firstName, lastName })
      });

      if (res.ok) {
        // Update in conversations list
        set((state) => ({
          conversations: state.conversations.map(c => {
            if (c.contact.id === contactId || c.id === contactId) {
              return {
                ...c,
                contact: { ...c.contact, name: newName }
              };
            }
            return c;
          })
        }));

        // Update in contactsMap cache
        set((state) => {
          const updatedContactsMap = { ...state.contactsMap };
          updatedContactsMap[contactId] = newName;
          
          try {
            localStorage.setItem('waha_contacts_map', JSON.stringify(updatedContactsMap));
          } catch (e) {
            console.error("[Storage] Failed to save updated contacts map to localStorage:", e);
          }
          
          return { contactsMap: updatedContactsMap };
        });

        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to update contact name on WhatsApp:", err);
      return false;
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
      const res = await fetch(`/api/waha-proxy/api/${sessionName}/chats/${chatId}/messages?limit=30&downloadMedia=false`, {
        headers: getWahaHeaders(get),
        signal: controller.signal
      });
      if (!res.ok) throw new Error("Failed to fetch messages for chat");
      
      const wahaMsgs = await res.json();
      const messages = wahaMsgs
        .map(msg => wahaMsgToMessage(msg, get().wahaUrl, get().wahaApiKey, sessionName))
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
  fetchProfilePicture: async (chatId, force = false) => {
    if (!force && get().profilePictures[chatId] && get().profilePictures[chatId] !== 'FAILED') return;
    if (get().profilePicsQueue.includes(chatId)) return;

    set((state) => ({
      profilePicsQueue: [...state.profilePicsQueue, chatId]
    }));

    get().processProfilePicsQueue(force);
  },
  processProfilePicsQueue: async (force = false) => {
    if (get().isProcessingQueue) return;
    set({ isProcessingQueue: true });

    while (get().profilePicsQueue.length > 0) {
      const chatId = get().profilePicsQueue[0];
      
      set((state) => ({
        profilePicsQueue: state.profilePicsQueue.slice(1)
      }));

      if (force || !get().profilePictures[chatId] || get().profilePictures[chatId] === 'FAILED') {
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
              const refreshParam = force ? '&refresh=true' : '';
              const res = await fetch(`/api/waha-proxy/api/contacts/profile-picture?contactId=${contactId}&session=${sessionName}${refreshParam}`, {
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

          let finalAvatarUrl = avatarUrl;
          if (avatarUrl && avatarUrl.startsWith('http')) {
            finalAvatarUrl = `/api/avatar-proxy?url=${encodeURIComponent(avatarUrl)}`;
          }

          const updatedPics = {
            ...get().profilePictures,
            [chatId]: finalAvatarUrl || 'FAILED'
          };
          set({ profilePictures: updatedPics });
          saveProfilePictures(updatedPics);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 800));
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

  archiveConversation: async (id) => {
    const user = get().user;
    if (!user) return;
    const sessionName = getWahaSessionName(user);

    // Optimistically update local state to archive chat
    set((state) => ({
      conversations: state.conversations.map(c => 
        c.id === id ? { ...c, isArchived: true } : c
      ),
      activeConversationId: state.activeConversationId === id ? null : state.activeConversationId
    }));

    try {
      const escapedId = encodeURIComponent(id);
      const res = await fetch(`/api/waha-proxy/api/${sessionName}/chats/${escapedId}/archive`, {
        method: 'POST',
        headers: getWahaHeaders(get)
      });
      if (!res.ok) throw new Error("Failed to archive chat on WAHA");
    } catch (err) {
      console.error("Failed to archive conversation:", err);
    }
  },

  unarchiveConversation: async (id) => {
    const user = get().user;
    if (!user) return;
    const sessionName = getWahaSessionName(user);

    // Optimistically update local state to unarchive chat
    set((state) => ({
      conversations: state.conversations.map(c => 
        c.id === id ? { ...c, isArchived: false } : c
      )
    }));

    try {
      const escapedId = encodeURIComponent(id);
      const res = await fetch(`/api/waha-proxy/api/${sessionName}/chats/${escapedId}/unarchive`, {
        method: 'POST',
        headers: getWahaHeaders(get)
      });
      if (!res.ok) throw new Error("Failed to unarchive chat on WAHA");
    } catch (err) {
      console.error("Failed to unarchive conversation:", err);
    }
  },

  clearConversationMessages: async (id) => {
    const user = get().user;
    if (!user) return;
    const sessionName = getWahaSessionName(user);

    // Optimistically clear local messages
    set((state) => ({
      conversations: state.conversations.map(c => 
        c.id === id ? { ...c, messages: [] } : c
      )
    }));

    try {
      const escapedId = encodeURIComponent(id);
      const res = await fetch(`/api/waha-proxy/api/${sessionName}/chats/${escapedId}/messages`, {
        method: 'DELETE',
        headers: getWahaHeaders(get)
      });
      if (!res.ok) throw new Error("Failed to clear chat messages on WAHA");
    } catch (err) {
      console.error("Failed to clear chat messages:", err);
    }
  },

  deleteConversation: async (id) => {
    const user = get().user;
    if (!user) return;
    const sessionName = getWahaSessionName(user);

    // Optimistically remove conversation from state
    set((state) => ({
      conversations: state.conversations.filter(c => c.id !== id),
      activeConversationId: state.activeConversationId === id ? null : state.activeConversationId
    }));

    try {
      const escapedId = encodeURIComponent(id);
      const res = await fetch(`/api/waha-proxy/api/${sessionName}/chats/${escapedId}`, {
        method: 'DELETE',
        headers: getWahaHeaders(get)
      });
      if (!res.ok) throw new Error("Failed to delete chat on WAHA");
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  },

  sendImageMessage: async (conversationId, base64Data, mimeType, filename, caption) => {
    const user = get().user;
    if (!user) return;
    const sessionName = getWahaSessionName(user);

    // Create optimistic message
    const optimisticMsg: Message = {
      id: 'opt_' + Math.random().toString(36).substring(7),
      content: caption || '📷 Imagem',
      timestamp: new Date().toISOString(),
      isFromMe: true,
      type: 'IMAGE',
      mediaUrl: `data:${mimeType};base64,${base64Data}`
    };

    // Optimistically update UI
    set((state) => ({
      conversations: state.conversations.map(c => 
        c.id === conversationId 
          ? { ...c, messages: [...c.messages, optimisticMsg] } 
          : c
      )
    }));

    try {
      const res = await fetch(`/api/waha-proxy/api/sendImage`, {
        method: 'POST',
        headers: getWahaHeaders(get),
        body: JSON.stringify({
          session: sessionName,
          chatId: conversationId,
          file: {
            mimetype: mimeType,
            data: base64Data,
            filename: filename
          },
          caption: caption || ""
        })
      });

      if (!res.ok) throw new Error("Failed to send image message on WAHA");

      // Reload messages for the active conversation
      await get().loadMessages(conversationId);
    } catch (err) {
      console.error("Failed to send image message:", err);
    }
  },

  sendVoiceMessage: async (conversationId, base64Data, mimeType) => {
    const user = get().user;
    if (!user) return;
    const sessionName = getWahaSessionName(user);

    // Create optimistic message
    const optimisticMsg: Message = {
      id: 'opt_' + Math.random().toString(36).substring(7),
      content: '🎵 Áudio',
      timestamp: new Date().toISOString(),
      isFromMe: true,
      type: 'AUDIO',
      mediaUrl: `data:${mimeType};base64,${base64Data}`
    };

    // Optimistically update UI
    set((state) => ({
      conversations: state.conversations.map(c => 
        c.id === conversationId 
          ? { ...c, messages: [...c.messages, optimisticMsg] } 
          : c
      )
    }));

    try {
      const res = await fetch(`/api/waha-proxy/api/sendVoice`, {
        method: 'POST',
        headers: getWahaHeaders(get),
        body: JSON.stringify({
          session: sessionName,
          chatId: conversationId,
          file: {
            mimetype: mimeType,
            data: base64Data,
            filename: "voice.ogg"
          }
        })
      });

      if (!res.ok) throw new Error("Failed to send voice message on WAHA");

      // Reload messages for the active conversation
      await get().loadMessages(conversationId);
    } catch (err) {
      console.error("Failed to send voice message:", err);
    }
  },

  sendFileMessage: async (conversationId, base64Data, mimeType, filename) => {
    const user = get().user;
    if (!user) return;
    const sessionName = getWahaSessionName(user);

    // Create optimistic message
    const optimisticMsg: Message = {
      id: 'opt_' + Math.random().toString(36).substring(7),
      content: `📁 ${filename}`,
      timestamp: new Date().toISOString(),
      isFromMe: true,
      type: 'TEXT'
    };

    // Optimistically update UI
    set((state) => ({
      conversations: state.conversations.map(c => 
        c.id === conversationId 
          ? { ...c, messages: [...c.messages, optimisticMsg] } 
          : c
      )
    }));

    try {
      const res = await fetch(`/api/waha-proxy/api/sendFile`, {
        method: 'POST',
        headers: getWahaHeaders(get),
        body: JSON.stringify({
          session: sessionName,
          chatId: conversationId,
          file: {
            mimetype: mimeType,
            data: base64Data,
            filename: filename
          }
        })
      });

      if (!res.ok) throw new Error("Failed to send file message on WAHA");

      // Reload messages for the active conversation
      await get().loadMessages(conversationId);
    } catch (err) {
      console.error("Failed to send file message:", err);
    }
  },

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

          const msg = wahaMsgToMessage(msgPayload, get().wahaUrl, get().wahaApiKey, sessionName);
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
      // Limitar o cache para salvar apenas as últimas 15 mensagens de cada conversa.
      // Isso evita estouro de cota (QuotaExceededError) no localStorage (limite de 5MB).
      const cacheFriendly = state.conversations.map(c => ({
        ...c,
        messages: c.messages.slice(-15)
      }));
      localStorage.setItem('zapfunil_conversations_cache', JSON.stringify(cacheFriendly));
    } catch (e) {
      console.error("[Store Cache] Failed to save conversations to cache:", e);
    }
  }
});
