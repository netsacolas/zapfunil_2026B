import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { MoreVertical, Paperclip, Smile, Mic, Send, Bot, CalendarClock, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { io } from "socket.io-client";

// WhatsApp-style avatar colors
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

const ChatHeaderAvatar = ({ chatId, name }: { chatId: string; name: string }) => {
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
        className="w-10 h-10 rounded-full mr-3 flex-shrink-0 object-cover border border-stone-100 shadow-sm"
        onError={() => setHasError(true)}
      />
    );
  }

  const bgColor = getAvatarColor(name);

  return (
    <div 
      className="w-10 h-10 rounded-full mr-3 flex-shrink-0 flex items-center justify-center font-bold text-white text-sm shadow-sm"
      style={{ backgroundColor: bgColor }}
    >
      {getInitials(name)}
    </div>
  );
};

export default function ChatHistory() {
  const { conversations, activeConversationId, sendMessage, addScheduledMessage, wahaSessionStatus, loadMessages, profilePictures, fetchProfilePicture, loadingChatId } = useAppStore();
  const [inputText, setInputText] = useState('');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleType, setScheduleType] = useState<'TEXT' | 'IMAGE' | 'VIDEO' | 'PDF' | 'AUDIO' | 'POLL' | 'CHOICE'>('TEXT');
  const [scheduleMediaUrl, setScheduleMediaUrl] = useState('');
  const [scheduleRecurrence, setScheduleRecurrence] = useState<'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'>('NONE');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const conversation = conversations.find(c => c.id === activeConversationId);
  const messages = conversation?.messages || [];
  const isLoading = loadingChatId === activeConversationId;

  // For real-time sync with backend
  useEffect(() => {
    if (wahaSessionStatus === 'CONNECTED' && activeConversationId) {
      loadMessages(activeConversationId);
      fetchProfilePicture(activeConversationId);
    }
  }, [wahaSessionStatus, activeConversationId, loadMessages, fetchProfilePicture]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!conversation) return null;

  if (isLoading && !conversation.hasLoadedHistory) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#efeae2] relative" style={{ backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-light_04fcacde539c58cca6745483d4858c52.png")', opacity: 0.9 }}>
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-xl flex flex-col items-center gap-3 border border-stone-200">
          <Loader2 className="animate-spin text-orange-500" size={32} />
          <span className="text-sm font-semibold text-stone-600">Carregando conversa...</span>
        </div>
      </div>
    );
  }

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(conversation.id, inputText.trim());
    setInputText('');
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !scheduleDate || !scheduleTime) return;

    addScheduledMessage({
      contactId: conversation.contact.id,
      type: scheduleType,
      content: inputText.trim(),
      mediaUrl: scheduleMediaUrl,
      date: scheduleDate,
      time: scheduleTime,
      recurrence: scheduleRecurrence
    });

    setInputText('');
    setScheduleDate('');
    setScheduleTime('');
    setScheduleType('TEXT');
    setScheduleMediaUrl('');
    setScheduleRecurrence('NONE');
    setIsScheduleModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#efeae2] relative" style={{ backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-light_04fcacde539c58cca6745483d4858c52.png")', opacity: 0.9 }}>
      {/* Header */}
      <header className="h-16 bg-white border-b px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center">
          <ChatHeaderAvatar chatId={conversation.id} name={conversation.contact.name} />
          <div>
            <h2 className="text-sm font-bold text-stone-900">{conversation.contact.name}</h2>
            {isLoading ? (
              <p className="text-[10px] text-stone-400 font-medium flex items-center gap-1">
                <Loader2 className="animate-spin text-stone-400" size={10} />
                Sincronizando...
              </p>
            ) : (
              <p className="text-[10px] text-orange-600 font-medium uppercase tracking-tighter">Online</p>
            )}
          </div>
        </div>
        <div className="flex space-x-4 text-stone-500">
          <Bot className="cursor-pointer hover:text-stone-800 transition-colors" size={20} title="IA Comercial" />
          <MoreVertical className="cursor-pointer hover:text-stone-800 transition-colors" size={20} />
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 p-6 space-y-4 flex flex-col overflow-y-auto">
        <div className="self-center py-1 px-3 bg-white/70 rounded-lg text-[11px] text-stone-500 uppercase tracking-widest shadow-sm">Hoje</div>
        {messages.map((msg, idx) => {
          return (
            <div key={msg.id} className={cn("max-w-md shadow-sm border p-3 text-stone-900", msg.isFromMe ? "self-end bg-[#F4F2EC] border-stone-200 rounded-tl-xl rounded-b-xl" : "self-start bg-white border-stone-200 rounded-tr-xl rounded-b-xl")}>
              {msg.type === 'AUDIO' ? (
                <div className="flex flex-col w-[260px]">
                  <div className="flex items-center space-x-2 p-2 rounded border bg-white border-stone-100 shadow-sm">
                    <button className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0", msg.isFromMe ? "bg-stone-800" : "bg-orange-500")}>
                      <Mic size={16}/>
                    </button>
                    <div className="flex-1 h-1 rounded-full relative overflow-hidden bg-stone-200">
                      <div className={cn("absolute left-0 top-0 h-full w-1/3", msg.isFromMe ? "bg-stone-800" : "bg-orange-500")}></div>
                    </div>
                    <span className="text-[10px] text-stone-500">0:14</span>
                  </div>
                  {msg.audioTranscription && (
                    <div className="mt-2 p-2 rounded border bg-white border-stone-200 shadow-sm">
                      <p className="text-[11px] font-bold uppercase tracking-tight mb-1 flex items-center text-stone-700">
                        <Bot size={12} className="mr-1" />
                        Transcrição IA
                      </p>
                      <p className="text-[12px] italic leading-tight text-stone-700">"{msg.audioTranscription}"</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
              <p className="text-[10px] text-stone-400 text-right mt-1">
                {format(new Date(msg.timestamp), 'HH:mm')} {msg.isFromMe && '✓✓'}
              </p>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <footer className="bg-white p-4 flex items-center space-x-3 shrink-0">
        <button className="text-stone-500 hover:text-stone-800 transition">
          <Smile size={24} />
        </button>
        <button className="text-stone-500 hover:text-stone-800 transition">
          <Paperclip size={24} />
        </button>
        <div className="flex-1">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Digite uma mensagem" 
            className="w-full bg-stone-100 border-none rounded-lg py-3 px-4 text-sm focus:ring-0 focus:outline-none text-stone-900"
          />
        </div>
        {inputText.trim() ? (
          <button onClick={handleSend} className="text-stone-500 hover:text-stone-800 transition">
            <Send size={24} />
          </button>
        ) : (
          <button className="text-stone-500 hover:text-stone-800 transition">
            <Mic size={24} />
          </button>
        )}
        <button 
          onClick={() => setIsScheduleModalOpen(true)} 
          className="text-stone-500 hover:text-stone-800 transition"
          title="Agendar Mensagem"
        >
          <CalendarClock size={24} />
        </button>
      </footer>

      {isScheduleModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-stone-100 bg-stone-50">
              <h3 className="font-bold text-stone-800 flex items-center gap-2">
                <CalendarClock size={18} className="text-orange-500" />
                Agendar Mensagem
              </h3>
              <button 
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 transition"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleScheduleSubmit} className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Usar Modelo Pronto (Opcional)</label>
                <select 
                  className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg py-2 px-3 outline-none focus:ring-1 focus:ring-orange-500 text-stone-800 cursor-pointer"
                  onChange={e => {
                    const tplId = e.target.value;
                    if (!tplId) return;
                    const tpl = useAppStore.getState().templates.find(t => t.id === tplId);
                    if (tpl) {
                      setScheduleType(tpl.type as any);
                      setInputText(tpl.content);
                      setScheduleMediaUrl(tpl.mediaUrl || '');
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">-- Selecione um modelo --</option>
                  {useAppStore.getState().templates.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Tipo de Mensagem</label>
                <select 
                  className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg py-2 px-3 outline-none focus:ring-1 focus:ring-orange-500 text-stone-800"
                  value={scheduleType}
                  onChange={e => setScheduleType(e.target.value as any)}
                >
                  <option value="TEXT">Texto</option>
                  <option value="IMAGE">Imagem</option>
                  <option value="VIDEO">Vídeo</option>
                  <option value="PDF">Documento PDF</option>
                  <option value="AUDIO">Áudio (Gravado)</option>
                  <option value="POLL">Enquete</option>
                  <option value="CHOICE">Lista de Escolha</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Conteúdo</label>
                <textarea 
                  className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg py-2 px-3 h-20 outline-none focus:ring-1 focus:ring-orange-500 resize-none text-stone-800"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={scheduleType === 'POLL' ? "Pergunta da enquete..." : "Digite a mensagem para agendar..."}
                  required
                />
              </div>

              {['IMAGE', 'VIDEO', 'PDF', 'AUDIO'].includes(scheduleType) && (
                <div className="space-y-3 p-3 bg-stone-100 rounded-lg border border-stone-200">
                  <label className="block text-xs font-bold text-stone-600 uppercase">Origem da Mídia</label>
                  
                  <div className="flex gap-2">
                    <button type="button" className="flex-1 py-1.5 px-2 bg-white border border-stone-200 rounded text-xs font-bold text-stone-700 hover:bg-stone-50" onClick={() => {
                        const fileInput = document.createElement('input');
                        fileInput.type = 'file';
                        fileInput.accept = scheduleType === 'IMAGE' ? 'image/*' : scheduleType === 'VIDEO' ? 'video/*' : scheduleType === 'AUDIO' ? 'audio/*' : '.pdf';
                        fileInput.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            setScheduleMediaUrl(URL.createObjectURL(file));
                          }
                        };
                        fileInput.click();
                    }}>
                      Fazer Upload
                    </button>
                    <button type="button" className="flex-1 py-1.5 px-2 bg-white border border-stone-200 rounded text-xs font-bold text-stone-700 hover:bg-stone-50" onClick={() => {
                      const url = prompt("Digite a URL da mídia:");
                      if (url) setScheduleMediaUrl(url);
                    }}>
                      Inserir Link
                    </button>
                  </div>

                  <select 
                    className="w-full text-sm bg-white border border-stone-200 rounded-md py-2 px-3 outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                    onChange={e => {
                      const url = e.target.value;
                      if (url) setScheduleMediaUrl(url);
                      e.target.value = '';
                    }}
                  >
                    <option value="">Ou selecione da Galeria...</option>
                    {useAppStore.getState().templates.filter(t => t.type === scheduleType && t.mediaUrl).map(t => (
                      <option key={t.id} value={t.mediaUrl}>{t.title}</option>
                    ))}
                  </select>

                  {scheduleMediaUrl && (
                     <div className="mt-2 text-[10px] text-stone-500 truncate bg-white p-1 rounded border border-stone-100">
                       <span className="font-bold text-orange-600">Mídia Selecionada:</span> {scheduleMediaUrl}
                     </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Data</label>
                  <input 
                    type="date"
                    className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg py-2 px-3 outline-none focus:ring-1 focus:ring-orange-500 text-stone-800"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Hora</label>
                  <input 
                    type="time"
                    className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg py-2 px-3 outline-none focus:ring-1 focus:ring-orange-500 text-stone-800"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Recorrência</label>
                <select 
                  className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg py-2 px-3 outline-none focus:ring-1 focus:ring-orange-500 text-stone-800"
                  value={scheduleRecurrence}
                  onChange={e => setScheduleRecurrence(e.target.value as any)}
                >
                  <option value="NONE">Única vez</option>
                  <option value="DAILY">Diariamente</option>
                  <option value="WEEKLY">Semanalmente</option>
                  <option value="MONTHLY">Mensalmente</option>
                </select>
              </div>

              <button 
                type="submit"
                className="w-full py-2 bg-stone-800 hover:bg-stone-900 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition mt-2"
              >
                Confirmar Agendamento
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
