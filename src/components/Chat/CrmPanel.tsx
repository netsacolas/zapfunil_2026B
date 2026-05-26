import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Briefcase, MapPin, Tag, Edit3, X, AlignLeft, KanbanSquare } from 'lucide-react';

export default function CrmPanel() {
  const { conversations, activeConversationId, setActiveConversation, customFields, updateContactCustomField, addToKanban, removeFromKanban } = useAppStore();
  const conversation = conversations.find(c => c.id === activeConversationId);

  if (!conversation) return null;
  const { contact } = conversation;
  
  const isInKanban = !!contact.funnelStageId;

  return (
    <aside className="flex flex-col h-full bg-white relative">
      <header className="p-4 flex items-center justify-between">
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Ficha do Lead</h3>
        <button onClick={() => setActiveConversation(null)} className="text-stone-400 hover:bg-stone-100 rounded p-1">
          <X size={16} />
        </button>
      </header>

      <div className="px-4 pb-4 flex flex-col items-center border-b border-stone-100">
        <div className="w-16 h-16 rounded-full bg-stone-800 flex items-center justify-center text-xl font-bold text-white mb-3 shadow-sm">
          {contact.name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2)}
        </div>
        <h3 className="text-sm font-bold text-stone-900">{contact.name}</h3>
        <p className="text-xs text-stone-500 mt-1">{contact.phone}</p>
        
        <div className="w-full mt-4 flex gap-2">
            <button className="flex-1 bg-stone-50 border border-stone-200 text-stone-700 py-1.5 rounded-md font-medium text-xs flex items-center justify-center gap-1 hover:bg-stone-100 transition">
              <Edit3 size={14} /> Editar
            </button>
            <button className="flex-1 bg-orange-50 text-orange-700 border border-orange-200 py-1.5 rounded-md font-medium text-xs hover:bg-orange-100 transition">
              Ver Histórico
            </button>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        
        {/* Toggle Oportunidade Comercial */}
        <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KanbanSquare size={16} className={isInKanban ? "text-orange-500" : "text-stone-400"} />
              <div>
                <p className="text-xs font-bold text-stone-800 leading-none mb-1">Oportunidade Comercial</p>
                <p className="text-[10px] text-stone-500 leading-none">Incluir no painel Kanban</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={isInKanban}
                onChange={(e) => {
                  if (e.target.checked) {
                    addToKanban(contact.id);
                  } else {
                    removeFromKanban(contact.id);
                  }
                }}
              />
              <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-[10px] text-stone-400 font-bold uppercase mb-1">Status do Lead</label>
          <div className="flex items-center px-2 py-1.5 bg-orange-100 text-orange-700 rounded-md text-xs font-bold border border-orange-200">
            <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
            {contact.status}
          </div>
        </div>

        <div>
           <label className="block text-[10px] text-stone-400 font-bold uppercase mb-1">Empresa</label>
           <div className="flex items-center px-2 py-1.5 bg-stone-50 text-stone-700 rounded-md text-xs font-semibold border border-stone-200">
             <Briefcase size={14} className="mr-2 text-stone-400" />
             {contact.company || 'Não informada'}
           </div>
        </div>

        {customFields.map(field => (
          <div key={field.id} className="pt-2 border-t border-stone-100">
            <label className="block text-[10px] text-stone-400 font-bold uppercase mb-1 flex items-center">
              <AlignLeft size={10} className="mr-1" /> {field.name}
            </label>
            {field.type === 'select' ? (
              <select 
                className="w-full text-xs font-medium bg-stone-50 border border-stone-200 text-stone-700 rounded-md py-1.5 px-2 outline-none focus:ring-1 focus:ring-orange-500"
                value={contact.customFields?.[field.id] || ''}
                onChange={(e) => updateContactCustomField(contact.id, field.id, e.target.value)}
              >
                <option value="">Selecione...</option>
                {field.options?.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input 
                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                className="w-full text-xs font-medium bg-stone-50 border border-stone-200 text-stone-700 rounded-md py-1.5 px-2 outline-none focus:ring-1 focus:ring-orange-500"
                value={contact.customFields?.[field.id] || ''}
                onChange={(e) => updateContactCustomField(contact.id, field.id, e.target.value)}
                placeholder={`Inserir ${field.name.toLowerCase()}...`}
              />
            )}
          </div>
        ))}

        <div className="pt-4 border-t border-stone-100">
          <label className="block text-[10px] text-stone-400 font-bold uppercase mb-2">Notas Internas</label>
          <textarea 
            className="w-full h-32 text-xs border border-stone-200 rounded-md p-2 bg-stone-50 focus:outline-none focus:ring-1 focus:ring-orange-500 placeholder:text-stone-400 resize-none"
            placeholder="Adicione observações privadas..."
          />
        </div>
      </div>
      
      <div className="mt-auto p-4 bg-stone-900 text-white shadow-[0_-4px_6px_-6px_rgba(0,0,0,0.1)]">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] uppercase font-bold text-stone-400 flex items-center">
            <Tag size={12} className="mr-1"/> IA Insights
          </span>
          <span className="text-[10px] bg-orange-500 px-1 rounded font-bold">PRO</span>
        </div>
        <p className="text-[11px] leading-relaxed opacity-80 italic underline-offset-2 decoration-orange-500">
          "Cliente possui alto potencial. Sugerido enviar material complementar."
        </p>
      </div>
    </aside>
  ); // CrmPanel
}
