import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Plus, Trash2, FileText, Send } from 'lucide-react';
import { MessageTemplate } from '../../types';

export default function TemplatesView() {
  const { templates, addTemplate, removeTemplate } = useAppStore();
  
  const [form, setForm] = useState<Partial<MessageTemplate>>({
    type: 'TEXT',
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) return;

    addTemplate({
      title: form.title,
      type: form.type as any,
      content: form.content,
      mediaUrl: form.mediaUrl,
    });
    setForm({ type: 'TEXT', content: '', title: '', mediaUrl: '' });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-stone-50 h-full p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Respostas Rápidas / Modelos</h1>
          <p className="text-stone-500 mt-1">Crie modelos de mensagens para enviar rapidamente durante os atendimentos.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          <div className="flex items-center gap-3 text-stone-800 mb-6">
            <FileText size={20} className="text-stone-800" />
            <h2 className="text-lg font-bold">Modelos Cadastrados</h2>
          </div>
          
          <form onSubmit={handleAdd} className="flex flex-col gap-4 mb-8 bg-stone-50 p-4 rounded-xl border border-stone-100">
            <h3 className="text-sm font-semibold text-stone-700">Criar Novo Modelo</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                 <input 
                   type="text" 
                   placeholder="Título do modelo (ex: Boas vindas)"
                   className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                   value={form.title || ''}
                   onChange={e => setForm({...form, title: e.target.value})}
                   required
                 />
              </div>
              <div className="w-48">
                 <select 
                   className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm outline-none focus:border-orange-500"
                   value={form.type}
                   onChange={e => setForm({...form, type: e.target.value as any})}
                 >
                   <option value="TEXT">Texto</option>
                   <option value="IMAGE">Imagem</option>
                   <option value="VIDEO">Vídeo</option>
                   <option value="PDF">Documento PDF</option>
                   <option value="AUDIO">Áudio (Gravado)</option>
                 </select>
              </div>
            </div>
            
            <textarea 
              className="w-full text-sm bg-white border border-stone-200 rounded-lg py-2 px-3 h-20 outline-none focus:ring-1 focus:ring-orange-500 resize-none"
              value={form.content || ''}
              onChange={e => setForm({...form, content: e.target.value})}
              required
              placeholder="Conteúdo da mensagem..."
            />

            {['IMAGE', 'VIDEO', 'PDF', 'AUDIO'].includes(form.type || '') && (
              <input 
                type="url"
                className="w-full text-sm bg-white border border-stone-200 rounded-lg py-2 px-3 outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="URL da Mídia (https://...)"
                value={form.mediaUrl || ''}
                onChange={e => setForm({...form, mediaUrl: e.target.value})}
                required
              />
            )}
            
            <button 
              type="submit"
              className="self-start px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition"
            >
              <Plus size={16} /> Salvar Modelo
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.length === 0 ? (
              <p className="text-sm text-stone-400 italic col-span-2">Nenhum modelo cadastrado.</p>
            ) : (
              templates.map(tpl => (
                <div key={tpl.id} className="flex flex-col p-4 bg-white border border-stone-200 rounded-xl hover:border-stone-300 transition">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex flex-col">
                      <span className="font-bold text-stone-900 text-sm flex items-center gap-2">
                         {tpl.title}
                      </span>
                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider bg-stone-100 self-start px-2 py-0.5 mt-1 rounded">
                        {tpl.type}
                      </span>
                    </div>
                    <button 
                      onClick={() => removeTemplate(tpl.id)}
                      className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-md transition"
                      title="Remover modelo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-stone-600 line-clamp-3 bg-stone-50 p-2 rounded border border-stone-100 flex-1">
                    {tpl.content}
                  </p>
                  
                  {tpl.mediaUrl && (
                     <div className="mt-2 text-[10px] text-stone-800 truncate bg-stone-100 p-1.5 rounded flex items-center border border-stone-200">
                        🔗 {tpl.mediaUrl}
                     </div>
                  )}

                  <button className="mt-3 w-full py-1.5 bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold rounded flex items-center justify-center gap-2 transition">
                     <Send size={12} /> Testar Envio (Agendar)
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
