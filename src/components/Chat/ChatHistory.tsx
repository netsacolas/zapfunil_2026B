import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { MoreVertical, Paperclip, Smile, Mic, Send, Bot, CalendarClock, X, Loader2, Play, Pause, Archive, ArchiveRestore, Trash2, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { io } from "socket.io-client";

import { ChatAvatar } from './ChatAvatar';

const AudioMessagePlayer = ({ audioUrl, isFromMe }: { audioUrl?: string; isFromMe: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fallback para áudio de teste público caso a URL venha vazia (como nos dados mockados)
  const finalUrl = audioUrl || 'https://www.w3schools.com/html/horse.mp3';

  // Forçar recarregamento do player de áudio quando a URL mudar
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [finalUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("Error playing audio:", e));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center space-x-3 p-2 rounded-lg border bg-white border-stone-100 shadow-sm w-[260px] text-stone-900">
      <audio 
        ref={audioRef}
        src={finalUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />
      <button 
        onClick={togglePlay}
        disabled={!finalUrl}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0 transition-colors shadow-sm cursor-pointer", 
          isFromMe ? "bg-[#00A884] hover:bg-[#009675]" : "bg-orange-500 hover:bg-orange-600"
        )}
      >
        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} className="ml-0.5" fill="currentColor" />}
      </button>
      <div className="flex-1 flex flex-col justify-center min-w-0">
        <div 
          className="h-1 rounded-full relative overflow-hidden bg-stone-200 cursor-pointer"
          onClick={(e) => {
            if (!audioRef.current || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            audioRef.current.currentTime = percentage * duration;
          }}
        >
          <div 
            className={cn("absolute left-0 top-0 h-full transition-[width] duration-75", isFromMe ? "bg-[#00A884]" : "bg-orange-500")}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center mt-1 text-[10px] text-stone-500">
          <span>{formatTime(currentTime)}</span>
          <span>{duration ? formatTime(duration) : '--:--'}</span>
        </div>
      </div>
    </div>
  );
};

export default function ChatHistory() {
  const { conversations, activeConversationId, sendMessage, addScheduledMessage, wahaSessionStatus, loadMessages, profilePictures, fetchProfilePicture, loadingChatId, archiveConversation, unarchiveConversation, clearConversationMessages, deleteConversation, sendImageMessage, sendVoiceMessage, sendFileMessage } = useAppStore();
  const [inputText, setInputText] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleType, setScheduleType] = useState<'TEXT' | 'IMAGE' | 'VIDEO' | 'PDF' | 'AUDIO' | 'POLL' | 'CHOICE'>('TEXT');
  const [scheduleMediaUrl, setScheduleMediaUrl] = useState('');
  const [scheduleRecurrence, setScheduleRecurrence] = useState<'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'>('NONE');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // File upload state & ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<{ base64: string; mime: string; name: string; url: string } | null>(null);
  const [imageCaption, setImageCaption] = useState('');

  // Audio recording state & refs
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Emoji picker state
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [activeEmojiTab, setActiveEmojiTab] = useState<'smileys' | 'gestures' | 'symbols'>('smileys');
  
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

  // Cleanup recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // File sending handlers
  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.split(',')[1];
      const mimeType = file.type;

      if (mimeType.startsWith('image/')) {
        setImagePreview({
          base64: base64Data,
          mime: mimeType,
          name: file.name,
          url: dataUrl
        });
      } else {
        await sendFileMessage(conversation.id, base64Data, mimeType, file.name);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const handleSendImagePreview = async () => {
    if (!imagePreview) return;
    await sendImageMessage(conversation.id, imagePreview.base64, imagePreview.mime, imagePreview.name, imageCaption.trim());
    setImagePreview(null);
    setImageCaption('');
  };

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      let options = { mimeType: 'audio/webm;codecs=opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'audio/ogg;codecs=opus' };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'audio/mp4' };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: '' };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/ogg' });
        stream.getTracks().forEach(track => track.stop());

        if (audioChunksRef.current.length > 0) {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = (reader.result as string).split(',')[1];
            await sendVoiceMessage(conversation.id, base64, audioBlob.type);
          };
          reader.readAsDataURL(audioBlob);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Failed to start audio recording:", err);
      alert("Não foi possível acessar o microfone. Por favor, verifique as permissões do navegador.");
    }
  };

  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    clearInterval(recordingTimerRef.current);
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    clearInterval(recordingTimerRef.current);
    audioChunksRef.current = [];
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Emoji picker handler
  const handleEmojiSelect = (emoji: string) => {
    setInputText(prev => prev + emoji);
  };

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
          <ChatAvatar chatId={conversation.id} name={conversation.contact.name} size="md" autoFetch={true} />
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
        <div className="flex space-x-4 text-stone-500 relative">
          <Bot className="cursor-pointer hover:text-stone-800 transition-colors" size={20} title="IA Comercial" />
          <div className="relative">
            <MoreVertical 
              className="cursor-pointer hover:text-stone-800 transition-colors" 
              size={20} 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            />
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsMenuOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-48 bg-white border border-stone-200 rounded-xl shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {conversation.isArchived ? (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        unarchiveConversation(conversation.id);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-orange-600 transition flex items-center gap-2 cursor-pointer"
                    >
                      <ArchiveRestore size={14} />
                      Desarquivar Conversa
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        archiveConversation(conversation.id);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-orange-600 transition flex items-center gap-2 cursor-pointer"
                    >
                      <Archive size={14} />
                      Arquivar Conversa
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      fetchProfilePicture(conversation.id, true);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-orange-600 transition flex items-center gap-2 cursor-pointer"
                  >
                    <Smile size={14} />
                    Atualizar Avatar
                  </button>
                  
                  <button
                    onClick={() => {
                      if (confirm("Tem certeza de que deseja limpar todas as mensagens desta conversa? Isso não pode ser desfeito.")) {
                        setIsMenuOpen(false);
                        clearConversationMessages(conversation.id);
                      }
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-orange-600 transition flex items-center gap-2 cursor-pointer"
                  >
                    <X size={14} className="rotate-45" />
                    Limpar Mensagens
                  </button>

                  <hr className="border-stone-100 my-1" />

                  <button
                    onClick={() => {
                      if (confirm("Tem certeza de que deseja excluir esta conversa por completo?")) {
                        setIsMenuOpen(false);
                        deleteConversation(conversation.id);
                      }
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition flex items-center gap-2 cursor-pointer"
                  >
                    <X size={14} className="text-red-500" />
                    Excluir Conversa
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 p-6 space-y-4 flex flex-col overflow-y-auto">
        <div className="self-center py-1 px-3 bg-white/70 rounded-lg text-[11px] text-stone-500 uppercase tracking-widest shadow-sm">Hoje</div>
        {messages.map((msg, idx) => {
          const isImage = msg.type === 'IMAGE';
          const imageUrl = msg.mediaUrl || msg.content;
          const hasCaption = msg.content && msg.content !== imageUrl;

          return (
            <div 
              key={msg.id} 
              className={cn(
                "flex items-end gap-2 max-w-[85%] sm:max-w-md", 
                msg.isFromMe ? "self-end justify-end" : "self-start justify-start"
              )}
            >
              {!msg.isFromMe && (
                <ChatAvatar 
                  chatId={msg.senderId || conversation.id} 
                  name={msg.senderName || conversation.contact.name} 
                  size="xs" 
                  autoFetch={true}
                />
              )}
              <div className={cn(
                "relative shadow-sm border text-stone-900", 
                isImage ? "p-1" : "p-3",
                msg.isFromMe ? "bg-[#d9fdd3] border-[#d9fdd3] rounded-tl-xl rounded-b-xl" : "bg-white border-white rounded-tr-xl rounded-b-xl"
              )}>
                {!msg.isFromMe && msg.senderName && (
                  <p className="text-[10px] font-bold text-orange-600 mb-1">{msg.senderName}</p>
                )}
              {msg.type === 'AUDIO' ? (
                <div className="flex flex-col w-[260px]">
                  <AudioMessagePlayer audioUrl={msg.mediaUrl} isFromMe={msg.isFromMe} />
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
              ) : isImage ? (
                <div className="flex flex-col relative group">
                  <img 
                    src={imageUrl} 
                    alt="Imagem da conversa" 
                    className="max-w-full sm:max-w-[320px] rounded-lg cursor-pointer object-cover shadow-sm"
                    style={{ maxHeight: '320px' }}
                    onClick={() => setSelectedImage(imageUrl)}
                  />
                  {hasCaption && (
                    <p className="text-sm mt-1 px-1 pb-3">{msg.content}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
              
              <div className={cn(
                "text-[10.5px] font-medium flex items-center gap-1", 
                isImage && !hasCaption ? "absolute bottom-2 right-2 text-white bg-black/40 px-1.5 py-0.5 rounded-full backdrop-blur-sm z-10" : "justify-end mt-0.5 pr-1 text-stone-500"
              )}>
                {format(new Date(msg.timestamp), 'HH:mm')} 
                {msg.isFromMe && <span className={isImage && !hasCaption ? "text-white" : "text-blue-500"}>✓✓</span>}
              </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <button 
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/50 p-2 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
          <img 
            src={selectedImage} 
            alt="Imagem ampliada" 
            className="max-w-full max-h-[90vh] object-contain rounded-md"
          />
        </div>
      )}

      {/* Hidden File Input for Media Uploads */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*,application/pdf,video/*,audio/*"
        className="hidden" 
      />

      {/* Image Preview Modal for Captioning */}
      {imagePreview && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-stone-100 bg-stone-50">
              <h3 className="font-bold text-stone-800 flex items-center gap-2">
                <Paperclip size={18} className="text-orange-500" />
                Enviar Imagem
              </h3>
              <button 
                onClick={() => { setImagePreview(null); setImageCaption(''); }}
                className="text-stone-400 hover:text-stone-600 transition p-1 rounded-full hover:bg-stone-100 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 bg-stone-50 flex items-center justify-center min-h-[200px] max-h-[30vh] overflow-hidden border-b border-stone-100">
              <img 
                src={imagePreview.url} 
                alt="Prévia" 
                className="max-h-[28vh] max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>

            <div className="p-4 space-y-4">
              <input 
                type="text" 
                placeholder="Adicione uma legenda..."
                value={imageCaption}
                onChange={e => setImageCaption(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendImagePreview()}
                className="w-full bg-stone-100 border border-stone-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 text-stone-900"
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setImagePreview(null); setImageCaption(''); }}
                  className="px-4 py-2 border border-stone-200 hover:bg-stone-50 text-stone-600 text-sm font-semibold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendImagePreview}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition shadow-md cursor-pointer"
                >
                  <Send size={14} />
                  Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <footer className="bg-white p-4 flex items-center space-x-3 shrink-0 relative">
        {/* Emoji Selector Popover */}
        <div className="relative">
          <button 
            onClick={() => setIsEmojiOpen(!isEmojiOpen)}
            className={cn(
              "p-1 rounded-full transition-colors cursor-pointer text-stone-500 hover:text-stone-800 flex items-center justify-center", 
              isEmojiOpen && "text-orange-500"
            )}
          >
            <Smile size={24} />
          </button>
          {isEmojiOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsEmojiOpen(false)}></div>
              <div className="absolute bottom-[100%] left-0 mb-3 w-[290px] bg-white border border-stone-200 rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="flex border-b border-stone-100 bg-stone-50 text-xs font-semibold text-stone-500">
                  <button 
                    type="button" 
                    onClick={() => setActiveEmojiTab('smileys')}
                    className={cn("flex-1 py-2 text-center border-b-2 cursor-pointer transition", activeEmojiTab === 'smileys' ? "border-orange-500 text-orange-600 font-bold" : "border-transparent hover:text-stone-800")}
                  >
                    😄 Carinhas
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setActiveEmojiTab('gestures')}
                    className={cn("flex-1 py-2 text-center border-b-2 cursor-pointer transition", activeEmojiTab === 'gestures' ? "border-orange-500 text-orange-600 font-bold" : "border-transparent hover:text-stone-800")}
                  >
                    👍 Gestos
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setActiveEmojiTab('symbols')}
                    className={cn("flex-1 py-2 text-center border-b-2 cursor-pointer transition", activeEmojiTab === 'symbols' ? "border-orange-500 text-orange-600 font-bold" : "border-transparent hover:text-stone-800")}
                  >
                    ❤️ Símbolos
                  </button>
                </div>
                <div className="p-3 max-h-[180px] overflow-y-auto grid grid-cols-7 gap-2 bg-white">
                  {activeEmojiTab === 'smileys' && 
                    ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😋', '😛', '😜', '🤪', '😎', '🥳', '😏', '😒', '😔', '🥺', '😢', '😭', '😤', '😡', '🤯', '🥵', '🥶', '😱', '🤔', '🫣', '🤫', '😐', '😑', '😬', '🫠', '😴', '🤢', '🤧', '😷', '🤒', '🤕'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleEmojiSelect(emoji)}
                        className="text-xl hover:bg-stone-100 p-1 rounded transition text-center cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))
                  }
                  {activeEmojiTab === 'gestures' && 
                    ['👋', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '👍', '👎', '✊', '👊', '👏', '🙌', '👐', '🤝', '🙏', '✍️', '💪', '🧠', '👀', '👄', '💋'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleEmojiSelect(emoji)}
                        className="text-xl hover:bg-stone-100 p-1 rounded transition text-center cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))
                  }
                  {activeEmojiTab === 'symbols' && 
                    ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🕎', '☯️', '☦️', '🛐', '⚠️', '⚡', '🔥', '💥', '✨', '🎈', '🎉', '🎊'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleEmojiSelect(emoji)}
                        className="text-xl hover:bg-stone-100 p-1 rounded transition text-center cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))
                  }
                </div>
              </div>
            </>
          )}
        </div>

        <button 
          onClick={handleFileClick} 
          className="text-stone-500 hover:text-stone-800 transition flex items-center justify-center p-1 rounded-full cursor-pointer"
          title="Enviar arquivo ou imagem"
        >
          <Paperclip size={24} />
        </button>

        {isRecording ? (
          // Audio Recording Active Panel
          <div className="flex-1 flex items-center bg-stone-100 rounded-xl px-4 py-2.5 justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              <span className="text-sm font-semibold text-stone-600">Gravando Áudio: {formatRecordingTime(recordingSeconds)}</span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={cancelRecording}
                className="text-red-500 hover:text-red-700 transition p-1 hover:bg-stone-200 rounded-full cursor-pointer"
                title="Cancelar Gravação"
              >
                <Trash2 size={18} />
              </button>
              <button 
                onClick={stopAndSendRecording}
                className="text-emerald-600 hover:text-emerald-800 transition p-1 hover:bg-stone-200 rounded-full cursor-pointer"
                title="Enviar Áudio"
              >
                <Check size={18} className="stroke-[3px]" />
              </button>
            </div>
          </div>
        ) : (
          // Regular Chat Text Input
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
        )}

        {!isRecording && (
          inputText.trim() ? (
            <button onClick={handleSend} className="text-stone-500 hover:text-stone-800 transition p-1 rounded-full cursor-pointer">
              <Send size={24} />
            </button>
          ) : (
            <button 
              onClick={startRecording} 
              className="text-stone-500 hover:text-stone-800 transition p-1 rounded-full cursor-pointer"
              title="Gravar Mensagem de Voz"
            >
              <Mic size={24} />
            </button>
          )
        )}

        <button 
          onClick={() => setIsScheduleModalOpen(true)} 
          className="text-stone-500 hover:text-stone-800 transition p-1 rounded-full cursor-pointer"
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
