import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useAppStore } from '../../store/useAppStore';
import { ChatAvatar } from '../Chat/ChatAvatar';

export default function KanbanView() {
  const { funnelStages, conversations, moveContact } = useAppStore();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    moveContact(
      result.draggableId,
      result.source.droppableId,
      result.destination.droppableId,
      result.source.index,
      result.destination.index
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-white h-full overflow-hidden">
      <div className="p-6 border-b border-stone-100 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Funil de Vendas</h1>
          <p className="text-stone-500 mt-1">Gerencie seus leads e oportunidades em tempo real.</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-x-auto p-6 bg-stone-50/50">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-6 h-full items-start">
            {funnelStages.map((stage) => (
              <div key={stage.id} className="w-80 flex-shrink-0 flex flex-col bg-stone-100 rounded-xl max-h-full border border-stone-200/60">
                <div className="p-4 flex items-center justify-between border-b border-stone-200">
                  <h3 className="font-semibold text-stone-800">{stage.name}</h3>
                  <span className="bg-stone-200 text-stone-600 text-xs font-semibold px-2 py-1 rounded-full">
                    {stage.contactIds.length}
                  </span>
                </div>
                
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-3 flex-1 overflow-y-auto flex flex-col gap-3 min-h-[150px] transition-colors ${
                        snapshot.isDraggingOver ? 'bg-stone-200/50' : ''
                      }`}
                    >
                      {stage.contactIds.map((contactId, index) => {
                        const conversation = conversations.find(c => c.contact.id === contactId);
                        if (!conversation) return null;
                        const { contact } = conversation;
                        return (
                          // @ts-ignore: React 18 types issue with hello-pangea
                          <Draggable key={contact.id} draggableId={contact.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-white p-4 rounded-xl shadow-sm border ${
                                  snapshot.isDragging ? 'border-orange-400 shadow-md rotate-2' : 'border-stone-200'
                                }`}
                              >
                                <div className="flex items-center gap-3 mb-3">
                                   <ChatAvatar chatId={contact.id} name={contact.name} size="sm" autoFetch={true} />
                                   <div>
                                      <h4 className="font-medium text-stone-900 text-sm leading-tight">{contact.name}</h4>
                                      <p className="text-xs text-stone-500">{contact.company || 'Sem empresa'}</p>
                                   </div>
                                </div>
                                <div className="flex justify-between items-center mt-4">
                                  <span className="inline-flex mt-1 items-center rounded-md bg-amber-50 px-2 py-1 text-[10px] uppercase font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                    {contact.status}
                                  </span>
                                  <span className="text-xs text-stone-400">Há 2 dias</span>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        )
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}
