import React, { useState } from 'react';
import { MessageSquare, LayoutDashboard, KanbanSquare, Settings, User, CalendarClock, FileText, CreditCard, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import ChatView from './Chat/ChatView';
import KanbanView from './Kanban/KanbanView';
import DashboardView from './Dashboard/DashboardView';
import SettingsView from './Settings/SettingsView';
import ScheduleView from './Schedule/ScheduleView';
import TemplatesView from './Templates/TemplatesView';
import SubscriptionView from './Subscription/SubscriptionView';
import { useAppStore } from '../store/useAppStore';

type Tab = 'chat' | 'kanban' | 'dashboard' | 'schedule' | 'templates' | 'subscription' | 'settings';

export default function Layout() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const { user, logout, loadCustomFields } = useAppStore();

  React.useEffect(() => {
    loadCustomFields();
  }, [loadCustomFields]);

  const tabs = [
    { id: 'chat', icon: MessageSquare, label: 'Atendimento' },
    { id: 'kanban', icon: KanbanSquare, label: 'CRM / Funil' },
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'schedule', icon: CalendarClock, label: 'Agendamento' },
    { id: 'templates', icon: FileText, label: 'Respostas Rápidas' },
    { id: 'subscription', icon: CreditCard, label: 'Assinatura' },
    { id: 'settings', icon: Settings, label: 'Configurações' },
  ] as const;

  return (
    <div className="flex w-full h-screen overflow-hidden font-sans text-stone-900 bg-[#F4F2EC] select-none">
      {/* Sidebar */}
      <nav className="flex flex-col items-center w-16 md:w-20 bg-[#1E1C1A] py-4 space-y-6 text-stone-400 border-r border-stone-800 shrink-0">
        <div className="w-10 h-10 bg-[#D97757] rounded-xl flex items-center justify-center text-white font-bold mb-4 shadow-lg shadow-orange-500/20">
          ZF
        </div>
        
        <div className="flex flex-col gap-4 flex-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
                className={cn(
                  "p-2 rounded-lg cursor-pointer transition-colors flex items-center justify-center",
                  isActive ? "bg-stone-800 text-white" : "hover:bg-stone-800 text-stone-400"
                )}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </button>
            )
          })}
        </div>

        <div className="mt-auto pb-4 space-y-4 flex flex-col items-center">
          <div className="group relative flex flex-col items-center cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-xs text-white font-bold uppercase ring-2 ring-transparent group-hover:ring-orange-500 transition-all">
              {user?.name?.charAt(0) || 'U'}
            </div>
            
            {/* Tooltip User Info & Logout */}
            <div className="absolute left-full ml-4 bottom-0 bg-stone-800 text-white p-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 flex flex-col gap-2 border border-stone-700 min-w/[140px]">
              <div className="border-b border-stone-700 pb-2 mb-1">
                <p className="font-bold text-sm text-stone-100">{user?.name}</p>
                <p className="text-[10px] text-stone-400 uppercase tracking-widest">{user?.role}</p>
              </div>
              <button 
                onClick={logout}
                className="flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 transition-colors w-full p-1"
              >
                <LogOut size={14} /> Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'chat' && <ChatView />}
        {activeTab === 'kanban' && <KanbanView />}
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'schedule' && <ScheduleView />}
        {activeTab === 'templates' && <TemplatesView />}
        {activeTab === 'subscription' && <SubscriptionView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}
