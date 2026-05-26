import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Search, Filter, X, Loader2 } from 'lucide-react';
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
  const { conversations, activeConversationId, setActiveConversation, customFields, wahaSessionStatus, loadChats, profilePictures, fetchProfilePicture, isLoadingChats, loadMessages } = useAppStore();
  const hoverTimeoutRef = useRef<Record<string, any>>({});

  useEffect(() => {
    if (wahaSessionStatus === 'CONNECTED') {
      loadChats();
      const interval = setInterval(() => {
        loadChats();
      }, 30000); // 30s fallback polling
      return () => clearInterval(interval);
    }
  }, [wahaSessionStatus, loadChats]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilterField, setSelectedFilterField] = useState('');
  const [selectedFilterValue, setSelectedFilterValue] = useState('');

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      // 1. Text Search
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        conv.contact.name.toLowerCase().includes(searchLower) ||
        conv.contact.phone.includes(searchLower) ||
        conv.messages[conv.messages.length - 1]?.content.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;

      // 2. Custom Field Filter
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
  }, [conversations, searchTerm, selectedFilterField, selectedFilterValue]);

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
        <div className="flex-1 overflow-y-auto border-t border-stone-100">
          {filteredConversations.map((conv) => {
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
                  "flex items-center p-4 cursor-pointer border-b border-stone-100 transition-colors",
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
                      "text-xs truncate",
                      isActive ? "font-medium text-stone-800" : "text-stone-500"
                    )}>
                      {lastMsg?.type === 'AUDIO' ? '🎵 Áudio' : lastMsg?.content}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-[10px] text-white flex-shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
