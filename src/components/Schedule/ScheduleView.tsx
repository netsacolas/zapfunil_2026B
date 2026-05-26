import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { CalendarClock, Plus, Trash2, Clock, CalendarDays, CheckCircle2 } from 'lucide-react';
import { ScheduledMessage } from '../../types';
import { format } from 'date-fns';
import { pbkdf2 } from 'crypto';

export default function ScheduleView() {
  const { scheduledMessages, conversations, addScheduledMessage, removeScheduledMessage } = useAppStore();
  
  const [form, setForm] = useState<Partial<ScheduledMessage>>({
    type: 'TEXT',
    recurrence: 'NONE',
  });

  const uniqueContacts = Array.from(new Set(conversations.map(c => c.contact)));

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contactId || !form.date || !form.time || !form.content) return;

    addScheduledMessage({
      contactId: form.contactId,
      type: form.type as any,
      content: form.content,
      mediaUrl: form.mediaUrl,
      date: form.date,
      time: form.time,
      recurrence: form.recurrence as any,
    });
    setForm({ type: 'TEXT', recurrence: 'NONE', content: '' });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-stone-50 h-full p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Agendamento de Mensagens</h1>
          <p className="text-stone-500 mt-1">Programe disparos de texto, imagens, enquetes e menus de escolha.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulário - 1/3 */}
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-stone-100 p-6 flex flex-col h-fit">
            <h2 className="text-lg font-bold text-stone-800 mb-6 flex items-center gap-2">
              <Plus size={20} className="text-stone-800" /> 
              Novo Agendamento
            </h2>
            
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Usar Modelo Pronto (Opcional)</label>
                <select 
                  className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg py-2 px-3 outline-none focus:ring-1 focus:ring-orange-500"
                  onChange={e => {
                    const tplId = e.target.value;
                    if (!tplId) return;
                    const tpl = useAppStore.getState().templates.find(t => t.id === tplId);
                    if (tpl) {
                      setForm(prev => ({
                        ...prev,
                        type: tpl.type,
                        content: tpl.content,
                        mediaUrl: tpl.mediaUrl || ''
                      }));
                      // Reset the select after loading to allow re-loading if they change it
                      e.target.value = "";
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
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Contato</label>
                <select 
                  className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg py-2 px-3 outline-none focus:ring-1 focus:ring-orange-500"
                  value={form.contactId || ''}
                  onChange={e => setForm({...form, contactId: e.target.value})}
                  required
                >
                  <option value="">Selecione...</option>
                  {uniqueContacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Data</label>
                  <input 
                    type="date"
                    className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg py-2 px-3 outline-none focus:ring-1 focus:ring-orange-500"
                    value={form.date || ''}
                    onChange={e => setForm({...form, date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Hora</label>
                  <input 
                    type="time"
                    className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg py-2 px-3 outline-none focus:ring-1 focus:ring-orange-500"
                    value={form.time || ''}
                    onChange={e => setForm({...form, time: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Tipo de Mensagem</label>
                <select 
                  className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg py-2 px-3 outline-none focus:ring-1 focus:ring-orange-500"
                  value={form.type}
                  onChange={e => setForm({...form, type: e.target.value as any})}
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
                  className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg py-2 px-3 h-24 outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                  value={form.content || ''}
                  onChange={e => setForm({...form, content: e.target.value})}
                  required
                  placeholder={form.type === 'POLL' ? "Pergunta da enquete..." : "Mensagem..."}
                />
              </div>

              {['IMAGE', 'VIDEO', 'PDF', 'AUDIO'].includes(form.type || '') && (
                <div className="space-y-3 p-3 bg-stone-100 rounded-lg border border-stone-200">
                  <label className="block text-xs font-bold text-stone-600 uppercase">Origem da Mídia</label>
                  
                  <div className="flex gap-2">
                    <button type="button" className="flex-1 py-1.5 px-2 bg-white border border-stone-200 rounded text-xs font-bold text-stone-700 hover:bg-stone-50" onClick={() => {
                        const fileInput = document.createElement('input');
                        fileInput.type = 'file';
                        fileInput.accept = form.type === 'IMAGE' ? 'image/*' : form.type === 'VIDEO' ? 'video/*' : form.type === 'AUDIO' ? 'audio/*' : '.pdf';
                        fileInput.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            setForm(prev => ({ ...prev, mediaUrl: URL.createObjectURL(file) }));
                          }
                        };
                        fileInput.click();
                    }}>
                      Fazer Upload
                    </button>
                    <button type="button" className="flex-1 py-1.5 px-2 bg-white border border-stone-200 rounded text-xs font-bold text-stone-700 hover:bg-stone-50" onClick={() => {
                      const url = prompt("Digite a URL da mídia:");
                      if (url) setForm(prev => ({ ...prev, mediaUrl: url }));
                    }}>
                      Inserir Link
                    </button>
                  </div>

                  <select 
                    className="w-full text-sm bg-white border border-stone-200 rounded-md py-2 px-3 outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                    onChange={e => {
                      const url = e.target.value;
                      if (url) setForm(prev => ({ ...prev, mediaUrl: url }));
                      e.target.value = '';
                    }}
                  >
                    <option value="">Ou selecione da Galeria...</option>
                    {useAppStore.getState().templates.filter(t => t.type === form.type && t.mediaUrl).map(t => (
                      <option key={t.id} value={t.mediaUrl}>{t.title}</option>
                    ))}
                  </select>

                  {form.mediaUrl && (
                     <div className="mt-2 text-[10px] text-stone-500 truncate bg-white p-1 rounded border border-stone-100">
                       <span className="font-bold text-orange-600">Mídia Selecionada:</span> {form.mediaUrl}
                     </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Recorrência</label>
                <select 
                  className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg py-2 px-3 outline-none focus:ring-1 focus:ring-orange-500"
                  value={form.recurrence}
                  onChange={e => setForm({...form, recurrence: e.target.value as any})}
                >
                  <option value="NONE">Única vez</option>
                  <option value="DAILY">Diariamente</option>
                  <option value="WEEKLY">Semanalmente</option>
                  <option value="MONTHLY">Mensalmente</option>
                </select>
              </div>

              <button 
                type="submit"
                className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition"
              >
                <CalendarClock size={16} /> Agendar Mensagem
              </button>
            </form>
          </div>

          {/* Lista Analítica - 2/3 */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-stone-100 flex flex-col h-fit">
             <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                  <CalendarDays size={20} className="text-stone-500" /> Agenda
                </h2>
                <span className="bg-stone-100 text-stone-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                  {scheduledMessages.length} Agendamentos
                </span>
             </div>
             
             <div className="p-0 overflow-y-auto max-h-[600px] flex flex-col divide-y divide-stone-100">
                {scheduledMessages.length === 0 ? (
                  <div className="p-8 text-center text-stone-400">Nenhuma mensagem agendada.</div>
                ) : (
                  scheduledMessages.map(msg => {
                    const contactInfo = uniqueContacts.find(c => c.id === msg.contactId);
                    return (
                      <div key={msg.id} className="p-6 flex items-start justify-between hover:bg-stone-50 transition">
                         <div className="flex gap-4">
                           <div className="flex flex-col items-center bg-stone-100 rounded-lg grow-0 px-4 py-2 border border-stone-200">
                             <span className="text-sm font-bold text-stone-700">{msg.date.substring(8, 10)}</span>
                             <span className="text-[10px] font-bold text-stone-400 uppercase">{msg.date.substring(5, 7)}</span>
                           </div>
                           <div className="flex flex-col">
                             <div className="flex items-center gap-2 mb-1">
                               <h4 className="font-bold text-stone-900 text-sm">{contactInfo?.name || 'Desconhecido'}</h4>
                               <span className="px-2 py-0.5 bg-stone-100 text-stone-700 text-[10px] font-bold rounded uppercase">
                                 {msg.type}
                               </span>
                               {msg.recurrence !== 'NONE' && (
                                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded uppercase">
                                    {msg.recurrence}
                                  </span>
                               )}
                             </div>
                             <p className="text-xs text-stone-600 line-clamp-2 max-w-lg mb-2">
                               {msg.content}
                             </p>
                             <div className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase">
                               <Clock size={12} className="text-stone-400" /> {msg.time} • 
                               {msg.status === 'PENDING' ? (
                                  <span className="text-orange-500">Pendente</span>
                               ) : msg.status === 'SENT' ? (
                                  <span className="text-orange-500 flex items-center gap-1"><CheckCircle2 size={12}/> Enviado</span>
                               ) : (
                                  <span className="text-red-500">Falha</span>
                               )}
                             </div>
                           </div>
                         </div>
                         
                         <button 
                           onClick={() => removeScheduledMessage(msg.id)}
                           className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-md transition self-start"
                           title="Cancelar Agendamento"
                         >
                           <Trash2 size={16} />
                         </button>
                      </div>
                    );
                  })
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
