import React from 'react';
import ChatList from './ChatList';
import ChatHistory from './ChatHistory';
import CrmPanel from './CrmPanel';
import { useAppStore } from '../../store/useAppStore';

export default function ChatView() {
  const { activeConversationId } = useAppStore();

  return (
    <div className="flex w-full h-full">
      {/* Coluna Esquerda - Lista de Conversas */}
      <div className="w-80 border-r border-stone-200 bg-white flex flex-col shrink-0 z-10">
        <ChatList />
      </div>

      {/* Coluna Central - Chat */}
      <div className="flex-1 min-w-0 bg-[#EFEAE2] relative flex">
        {activeConversationId ? (
          <ChatHistory />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-500">
            <div className="w-24 h-24 mb-6 rounded-full bg-orange-100 flex items-center justify-center">
              <span className="text-orange-500 font-bold text-2xl">ZF</span>
            </div>
            <h2 className="text-xl text-stone-800 font-medium">ZapFunil CRM</h2>
            <p className="mt-2 text-sm text-stone-400">Selecione uma conversa para começar o atendimento</p>
          </div>
        )}
      </div>

      {/* Coluna Direita - CRM Ficha */}
      {activeConversationId && (
        <div className="w-96 border-l border-stone-200 bg-white flex flex-col shrink-0 overflow-y-auto">
          <CrmPanel />
        </div>
      )}
    </div>
  );
}
