import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Plus, Trash2, Settings2, Link, Wifi, WifiOff, RefreshCw, GripVertical } from 'lucide-react';
import { CustomFieldDefinition } from '../../types';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

export default function SettingsView() {
  const { 
    customFields, 
    addCustomField, 
    removeCustomField,
    reorderCustomFields,
    wahaSessionStatus,
    wahaQrCode,
    checkWahaStatus,
    startWahaSession,
    stopWahaSession,
    isSyncingContacts,
    syncContacts,
    user
  } = useAppStore();

  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldDefinition['type']>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const getSessionName = () => {
    if (!user) return 'default';
    const name = String(user.name || "user")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
    return `${name}-${user.id}`;
  };

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;

    addCustomField({
      name: newFieldName.trim(),
      type: newFieldType,
      options: newFieldType === 'select' ? newFieldOptions.split(',').map(o => o.trim()).filter(Boolean) : undefined,
    });

    setNewFieldName('');
    setNewFieldType('text');
    setNewFieldOptions('');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await checkWahaStatus();
    setIsRefreshing(false);
  };

  const handleConnect = async () => {
    setActionLoading(true);
    await startWahaSession();
    setActionLoading(false);
  };

  const handleDisconnect = async () => {
    setActionLoading(true);
    await stopWahaSession();
    setActionLoading(false);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(customFields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    reorderCustomFields(items);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-stone-50 h-full p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Configurações</h1>
          <p className="text-stone-500 mt-1">Configure o CRM e detalhes do sistema.</p>
        </div>

        {/* Integração WhatsApp */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 text-stone-800">
              <Link size={20} className="text-stone-800" />
              <h2 className="text-lg font-bold">Integração WhatsApp</h2>
            </div>
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing || !user}
              className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-50 rounded-lg transition disabled:opacity-50 cursor-pointer"
              title="Atualizar status"
            >
              <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
            </button>
          </div>

          {!user ? (
            <div className="p-4 bg-amber-50 text-amber-800 border border-amber-100 rounded-xl text-sm font-medium">
              Por favor, faça login para configurar sua conexão do WhatsApp.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status and Action Card */}
              <div className="border border-stone-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white">
                <div className="space-y-2">
                  <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">Status da Conexão</div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    {wahaSessionStatus === 'CONNECTED' ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200">
                        <Wifi size={14} /> CONECTADO
                      </span>
                    ) : wahaSessionStatus === 'STARTING' ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200 animate-pulse">
                        <RefreshCw size={14} className="animate-spin" /> INICIANDO SESSÃO...
                      </span>
                    ) : wahaSessionStatus === 'SCAN_QR_CODE' ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                        <RefreshCw size={14} className="animate-spin" /> AGUARDANDO QR CODE
                      </span>
                    ) : wahaSessionStatus === 'FAILED' ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-full border border-red-200">
                        <WifiOff size={14} /> FALHA NA CONEXÃO
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-stone-100 text-stone-600 text-xs font-bold rounded-full border border-stone-200">
                        <WifiOff size={14} /> DESCONECTADO
                      </span>
                    )}

                    <span className="text-xs text-stone-400 font-medium">
                      Sessão ID: <code className="bg-stone-50 px-1 py-0.5 rounded border border-stone-200 text-stone-600 font-mono text-[11px]">{getSessionName()}</code>
                    </span>
                  </div>
                  
                  <p className="text-xs text-stone-500">
                    {wahaSessionStatus === 'CONNECTED' 
                      ? "O WhatsApp está pareado e pronto para enviar e receber mensagens." 
                      : wahaSessionStatus === 'SCAN_QR_CODE'
                      ? "Escaneie o QR Code abaixo com o WhatsApp do seu celular."
                      : wahaSessionStatus === 'STARTING'
                      ? "Iniciando a sessão do WhatsApp no servidor. Aguarde..."
                      : "Sessão inativa. Conecte o WhatsApp para habilitar o envio e recebimento de mensagens."}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  {wahaSessionStatus === 'CONNECTED' && (
                    <button
                      onClick={async () => {
                        try {
                          await syncContacts();
                        } catch (e) {
                          console.error("Sync failed", e);
                        }
                      }}
                      disabled={isSyncingContacts}
                      className="px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-sm font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw size={14} className={isSyncingContacts ? "animate-spin" : ""} />
                      {isSyncingContacts ? "Sincronizando..." : "Sincronizar Contatos"}
                    </button>
                  )}
                  {wahaSessionStatus === 'CONNECTED' || wahaSessionStatus === 'SCAN_QR_CODE' ? (
                    <button
                      onClick={handleDisconnect}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-sm font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer"
                    >
                      {actionLoading ? "Desconectando..." : "Desconectar Sessão"}
                    </button>
                  ) : (
                    <button
                      onClick={handleConnect}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg shadow-md shadow-orange-500/20 transition disabled:opacity-50 cursor-pointer"
                    >
                      {actionLoading ? "Conectando..." : "Conectar WhatsApp"}
                    </button>
                  )}
                </div>
              </div>

              {/* QR Code Container */}
              {wahaSessionStatus === 'SCAN_QR_CODE' && wahaQrCode && (
                <div className="flex flex-col items-center justify-center p-6 bg-stone-50 border border-stone-200 rounded-xl space-y-4 max-w-sm mx-auto shadow-sm">
                  <div className="text-center">
                    <h3 className="text-sm font-bold text-stone-700">Aponte o celular</h3>
                    <p className="text-xs text-stone-400 mt-0.5">Vá em Aparelhos conectados {'>'} Conectar aparelho</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-inner flex items-center justify-center">
                    <img 
                      src={wahaQrCode} 
                      alt="WhatsApp QR Code" 
                      className="w-48 h-48"
                      onError={(e) => {
                        console.error("Failed to load QR code image");
                      }}
                    />
                  </div>
                  <button 
                    onClick={handleRefresh}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw size={12} /> Atualizar QR Code
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          <div className="flex items-center gap-3 text-stone-800 mb-6">
            <Settings2 size={20} className="text-stone-800" />
            <h2 className="text-lg font-bold">Campos Personalizados (CRM)</h2>
          </div>
          
          <form onSubmit={handleAddField} className="flex flex-col gap-4 mb-8 bg-stone-50 p-4 rounded-xl border border-stone-100">
            <h3 className="text-sm font-semibold text-stone-700">Criar novo campo</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <input 
                type="text" 
                placeholder="Nome do campo (ex: CNPJ, Segmento)"
                className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                value={newFieldName}
                onChange={e => setNewFieldName(e.target.value)}
                required
              />
              <select 
                className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm outline-none focus:border-orange-500"
                value={newFieldType}
                onChange={e => setNewFieldType(e.target.value as any)}
              >
                <option value="text">Texto</option>
                <option value="number">Número</option>
                <option value="select">Lista de Seleção</option>
                <option value="date">Data</option>
              </select>
            </div>
            {newFieldType === 'select' && (
              <input 
                type="text" 
                placeholder="Opções separadas por vírgula. Ex: Varejo, Indústria, Serviços"
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm outline-none focus:border-orange-500"
                value={newFieldOptions}
                onChange={e => setNewFieldOptions(e.target.value)}
                required
              />
            )}
            <button 
              type="submit"
              className="self-start px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition"
            >
              <Plus size={16} /> Adicionar Campo
            </button>
          </form>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-stone-700 mb-2">Campos Existentes</h3>
            {customFields.length === 0 ? (
              <p className="text-sm text-stone-400 italic">Nenhum campo personalizado cadastrado.</p>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="custom-fields">
                  {(provided) => (
                    <div 
                      {...provided.droppableProps} 
                      ref={provided.innerRef} 
                      className="space-y-2"
                    >
                      {customFields.map((field, index) => (
                        // @ts-ignore: React 18 types issue with hello-pangea
                        <Draggable key={field.id} draggableId={field.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex items-center justify-between p-3 bg-white border rounded-lg transition-all ${
                                snapshot.isDragging 
                                  ? 'border-orange-500 shadow-md bg-stone-50' 
                                  : 'border-stone-200 hover:border-stone-300'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div 
                                  {...provided.dragHandleProps} 
                                  className="text-stone-400 hover:text-stone-600 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-stone-50"
                                >
                                  <GripVertical size={16} />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-stone-800 text-sm">{field.name}</span>
                                  <span className="text-xs text-stone-500">
                                    Tipo: {field.type === 'text' ? 'Texto' : field.type === 'number' ? 'Número' : field.type === 'select' ? 'Lista' : 'Data'}
                                    {field.type === 'select' && ` (${field.options?.join(', ')})`}
                                  </span>
                                </div>
                              </div>
                              <button 
                                onClick={() => removeCustomField(field.id)}
                                className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-md transition cursor-pointer"
                                title="Remover campo"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
