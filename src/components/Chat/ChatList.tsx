import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Search, Filter, X, Loader2, Archive, ArchiveRestore, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

// WhatsApp-style avatar colors (same palette WhatsApp Web uses for default avatars)
const AVATAR_COLORS = [
  '#00A884', '#02BEB2', '#00C6E2', '#009DE2', '#007BFC',
  '#5B6DEE', '#7C6BEE', '#B56AE0', '#D4619E', '#EF5350',
  '#FF7043', '#FF9800', '#FFC107', '#AEEA00', '#66BB6A',
];

const getAvatarColor = (name: string): string => {
  let hash = 0;
  const str = name || 'U';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitials = (name: string): string => {
  if (!name) return 'U';
  return name.split(' ').filter(Boolean).map(n => n.charAt(0).toUpperCase()).join('').substring(0, 2);
};

const ChatAvatar = ({ chatId, name, isActive }: { chatId: string; name: string; isActive: boolean }) => {
  const fetchProfilePicture = useAppStore(state => state.fetchProfilePicture);
  const profilePicture = useAppStore(state => state.profilePictures[chatId]);
  const wahaSessionStatus = useAppStore(state => state.wahaSessionStatus);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (wahaSessionStatus === 'CONNECTED' && chatId) {
      fetchProfilePicture(chatId);
    }
  }, [chatId, wahaSessionStatus, fetchProfilePicture]);

  useEffect(() => {
    setHasError(false);
  }, [profilePicture]);

  if (profilePicture && profilePicture !== 'FAILED' && !hasError) {
    return (
      <img 
        src={profilePicture} 
        alt={name} 
        className="w-12 h-12 rounded-full mr-3 flex-shrink-0 object-cover border border-stone-100 shadow-sm"
        onError={() => setHasError(true)}
      />
    );
  }

  const bgColor = getAvatarColor(name);

  return (
    <div 
      className="w-12 h-12 rounded-full mr-3 flex-shrink-0 flex items-center justify-center font-bold text-sm text-white shadow-sm"
      style={{ backgroundColor: bgColor }}
    >
      {getInitials(name)}
    </div>
  );
};

export default function ChatList() {
  const { 
    conversations, 
    activeConversationId, 
    setActiveConversation, 
    customFields, 
    wahaSessionStatus, 
    loadChats, 
    profilePictures, 
    fetchProfilePicture, 
    isLoadingChats, 
    loadMessages, 
    archiveConversation, 
    unarchiveConversation,
    contactsMap,
    isLoadingMoreChats,
    hasMoreChats,
    loadMoreChats
  } = useAppStore();
  const hoverTimeoutRef = useRef<Record<string, any>>({});
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');

  useEffect(() => {
    if (wahaSessionStatus === 'CONNECTED') {
      loadChats();
      const interval = setInterval(() => {
        loadChats();
      }, 30000); // 30s fallback polling
      return () => clearInterval(interval);
    }
  }, [wahaSessionStatus, loadChats]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
      if (!isLoadingMoreChats && hasMoreChats && wahaSessionStatus === 'CONNECTED') {
        loadMoreChats();
      }
    }
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilterField, setSelectedFilterField] = useState('');
  const [selectedFilterValue, setSelectedFilterValue] = useState('');

  const archivedCount = useMemo(() => {
    return conversations.filter(c => c.isArchived).length;
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const matches = conversations.filter(conv => {
      // 1. Archive check
      const isConvArchived = !!conv.isArchived;
      if (viewMode === 'active' && isConvArchived) return false;
      if (viewMode === 'archived' && !isConvArchived) return false;

      // 2. Text Search
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        conv.contact.name.toLowerCase().includes(searchLower) ||
        conv.contact.phone.includes(searchLower) ||
        conv.messages[conv.messages.length - 1]?.content.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;

      // 3. Custom Field Filter
      if (selectedFilterField && selectedFilterValue) {
        if (selectedFilterField === 'status') {
          return conv.contact.status === selectedFilterValue;
        } else {
          const val = conv.contact.customFields?.[selectedFilterField];
          return val === selectedFilterValue;
        }
      }

      return true;
    });

    // 4. Contact Map Search fallback (find matching contacts who don't have a loaded conversation)
    const searchTrimmed = searchTerm.trim().toLowerCase();
    if (searchTrimmed && viewMode === 'active') {
      const conversationIds = new Set(conversations.map(c => c.id));
      const conversationPhones = new Set(conversations.map(c => c.contact.phone));
      const matchedContacts: typeof conversations = [];

      for (const [key, value] of Object.entries(contactsMap)) {
        const contactId = key;
        const name = value;
        const phone = contactId.split('@')[0];

        // Skip if they already have an active conversation
        if (conversationIds.has(contactId) || conversationPhones.has(phone)) {
          continue;
        }

        const matchesSearch = name.toLowerCase().includes(searchTrimmed) || phone.includes(searchTrimmed);
        if (matchesSearch) {
          matchedContacts.push({
            id: contactId,
            contact: {
              id: contactId,
              name: name,
              phone: phone,
              status: 'Lead',
            },
            unreadCount: 0,
            messages: [],
            lastActivity: 0,
            isArchived: false,
            hasLoadedHistory: false
          });
        }

        // Limit matching contacts from memory to avoid heavy rendering
        if (matchedContacts.length >= 30) {
          break;
        }
      }

      return [...matches, ...matchedContacts];
    }

    return matches;
  }, [conversations, searchTerm, selectedFilterField, selectedFilterValue, viewMode, contactsMap]);

  // Pre-fetch search results in background as soon as they appear in search
  useEffect(() => {
    if (searchTerm.trim() !== '') {
      const toPrefetch = filteredConversations.slice(0, 3);
      toPrefetch.forEach(conv => {
        if (conv.messages.length <= 5) {
          loadMessages(conv.id);
        }
      });
    }
  }, [filteredConversations, searchTerm, loadMessages]);

  const activeCustomFieldDefinition = customFields.find(f => f.id === selectedFilterField);

  return (
    <div className="flex flex-col h-full bg-white relative">
      <header className="p-4 flex flex-col space-y-4 relative z-20 bg-white">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Conversas</h1>
          <div className="flex space-x-2 items-center">
            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-[10px] font-bold rounded uppercase tracking-wider border border-orange-200">Conectado</span>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={cn("p-1.5 rounded-lg transition-colors border", showFilters || selectedFilterField ? "bg-stone-800 text-white border-stone-800" : "bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200")}
            >
              <Filter size={14} />
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-stone-400" size={16} />
          <input 
            type="text" 
            placeholder="Pesquisar conversa..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-stone-100 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 text-stone-800"
          />
        </div>
        
        {/* Dynamic Filters UI */}
        {showFilters && (
          <div className="absolute top-[100%] left-0 right-0 bg-white border-b border-stone-100 p-4 shadow-xl shadow-stone-200/50 flex flex-col gap-3">
            <div>
               <label className="text-xs font-bold text-stone-500 uppercase">Filtrar por campo</label>
               <select 
                 className="mt-1 w-full text-sm bg-stone-50 border border-stone-200 rounded-md py-1.5 px-2 outline-none focus:ring-1 focus:ring-orange-500"
                 value={selectedFilterField}
                 onChange={(e) => {
                   setSelectedFilterField(e.target.value);
                   setSelectedFilterValue(''); // reset value on field change
                 }}
               >
                 <option value="">Nenhum filtro...</option>
                 <option value="status">Status do Lead</option>
                 {customFields.map(cf => (
                   <option key={cf.id} value={cf.id}>{cf.name}</option>
                 ))}
               </select>
            </div>
            
            {selectedFilterField && (
               <div>
                 <label className="text-xs font-bold text-stone-500 uppercase">Valor</label>
                 {selectedFilterField === 'status' ? (
                   <select 
                     className="mt-1 w-full text-sm bg-stone-50 border border-stone-200 rounded-md py-1.5 px-2 outline-none focus:ring-1 focus:ring-orange-500"
                     value={selectedFilterValue}
                     onChange={(e) => setSelectedFilterValue(e.target.value)}
                   >
                     <option value="">Selecionar status...</option>
                     <option value="Lead">Lead</option>
                     <option value="Frio">Frio</option>
                     <option value="Morno">Morno</option>
                     <option value="Quente">Quente</option>
                     <option value="Fechado">Fechado</option>
                   </select>
                 ) : activeCustomFieldDefinition?.type === 'select' ? (
                   <select 
                     className="mt-1 w-full text-sm bg-stone-50 border border-stone-200 rounded-md py-1.5 px-2 outline-none focus:ring-1 focus:ring-orange-500"
                     value={selectedFilterValue}
                     onChange={(e) => setSelectedFilterValue(e.target.value)}
                   >
                     <option value="">Qualquer opção...</option>
                     {activeCustomFieldDefinition.options?.map(o => (
                       <option key={o} value={o}>{o}</option>
                     ))}
                   </select>
                 ) : (
                    <input 
                      type="text" 
                      className="mt-1 w-full text-sm bg-stone-50 border border-stone-200 rounded-md py-1.5 px-2 outline-none focus:ring-1 focus:ring-orange-500"
                      placeholder="Valor exato..."
                      value={selectedFilterValue}
                      onChange={(e) => setSelectedFilterValue(e.target.value)}
                    />
                 )}
               </div>
            )}
            
            {selectedFilterField && (
               <button 
                 onClick={() => { setSelectedFilterField(''); setSelectedFilterValue(''); }}
                 className="self-end text-xs text-red-500 font-medium flex items-center hover:bg-red-50 px-2 py-1 rounded"
               >
                 <X size={12} className="mr-1" /> Limpar filtros
               </button>
            )}
          </div>
        )}

      </header>

      {isLoadingChats && wahaSessionStatus === 'CONNECTED' ? (
        <div className="flex-1 flex flex-col items-center justify-center text-stone-500 gap-3">
          <Loader2 className="animate-spin text-orange-500" size={32} />
          <span className="text-sm font-medium">Carregando conversas...</span>
        </div>
      ) : (
        <div 
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto border-t border-stone-100 flex flex-col"
        >
          {/* Aba de arquivados no topo da lista se houver arquivadas */}
          {viewMode === 'active' && archivedCount > 0 && (
            <button 
              onClick={() => setViewMode('archived')}
              className="w-full flex items-center justify-between p-4 border-b border-stone-100 hover:bg-stone-50 transition text-stone-600 font-semibold text-sm cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Archive size={18} className="text-orange-500" />
                <span>Conversas Arquivadas</span>
              </div>
              <span className="bg-orange-100 text-orange-700 font-bold px-2 py-0.5 text-[11px] rounded-full">
                {archivedCount}
              </span>
            </button>
          )}

          {/* Botão de voltar ao visualizar arquivadas */}
          {viewMode === 'archived' && (
            <button 
              onClick={() => setViewMode('active')}
              className="w-full flex items-center gap-3 p-4 border-b border-stone-100 bg-stone-50 hover:bg-stone-100 transition text-stone-700 font-bold text-sm cursor-pointer"
            >
              <ArrowLeft size={18} className="text-orange-500" />
              <span>Voltar para Conversas Ativas</span>
            </button>
          )}

          {filteredConversations.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-stone-400 p-8 text-center">
              <Archive size={36} className="text-stone-300 mb-2" />
              <p className="text-xs font-semibold">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const lastMsg = conv.messages[conv.messages.length - 1];
              return (
                <div 
                  key={conv.id}
                  onClick={() => {
                    if (hoverTimeoutRef.current[conv.id]) {
                      clearTimeout(hoverTimeoutRef.current[conv.id]);
                      delete hoverTimeoutRef.current[conv.id];
                    }
                    setActiveConversation(conv.id);
                  }}
                  onMouseEnter={() => {
                    if (conv.messages.length <= 5) {
                      hoverTimeoutRef.current[conv.id] = setTimeout(() => {
                        loadMessages(conv.id);
                      }, 150);
                    }
                  }}
                  onMouseLeave={() => {
                    if (hoverTimeoutRef.current[conv.id]) {
                      clearTimeout(hoverTimeoutRef.current[conv.id]);
                      delete hoverTimeoutRef.current[conv.id];
                    }
                  }}
                  className={cn(
                    "flex items-center p-4 cursor-pointer border-b border-stone-100 transition-colors relative group",
                    isActive ? "bg-stone-100" : "hover:bg-stone-50"
                  )}
                >
                  <ChatAvatar chatId={conv.id} name={conv.contact.name} isActive={isActive} />
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-semibold text-stone-900 truncate pr-2">{conv.contact.name}</h3>
                      {lastMsg && (
                        <span className={cn(
                          "text-[10px] flex-shrink-0 whitespace-nowrap",
                          isActive ? "text-orange-600 font-bold uppercase tracking-wider" : "text-stone-400"
                        )}>
                          {isActive ? 'AGORA' : format(new Date(lastMsg.timestamp), 'HH:mm')}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <p className={cn(
                        "text-xs truncate flex items-center gap-1",
                        isActive ? "font-medium text-stone-800" : "text-stone-500"
                      )}>
                        {lastMsg?.type === 'AUDIO' ? (
                          <><span>🎵</span> Áudio</>
                        ) : lastMsg?.type === 'IMAGE' ? (
                          <><span>📷</span> {lastMsg?.content && lastMsg?.content !== '📷 Imagem' ? lastMsg.content : 'Imagem'}</>
                        ) : (
                          lastMsg?.content
                        )}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-[10px] text-white flex-shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botões de Ações Rápidas em Hover */}
                  <div className="absolute right-4 bottom-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-white border border-stone-200 rounded-lg p-0.5 shadow-md z-10">
                    {conv.isArchived ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          unarchiveConversation(conv.id);
                        }}
                        className="p-1 text-stone-500 hover:text-orange-600 rounded transition-colors cursor-pointer"
                        title="Desarquivar Conversa"
                      >
                        <ArchiveRestore size={15} />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          archiveConversation(conv.id);
                        }}
                        className="p-1 text-stone-500 hover:text-orange-600 rounded transition-colors cursor-pointer"
                        title="Arquivar Conversa"
                      >
                        <Archive size={15} />
                      </button>
                    )}
                  </div>

                </div>
              )
            })
          )}
          {isLoadingMoreChats && (
            <div className="flex items-center justify-center p-3 text-stone-500 gap-2 border-t border-stone-55 bg-stone-50/50">
              <Loader2 className="animate-spin text-orange-500" size={16} />
              <span className="text-xs font-medium text-stone-500">Carregando mais...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
