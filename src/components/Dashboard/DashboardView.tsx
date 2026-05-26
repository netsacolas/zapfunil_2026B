import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, BookOpenCheck, Clock, TrendingUp } from 'lucide-react';

const data = [
  { name: 'Seg', leads: 4, conversas: 24, vendas: 1 },
  { name: 'Ter', leads: 7, conversas: 38, vendas: 2 },
  { name: 'Qua', leads: 5, conversas: 43, vendas: 1 },
  { name: 'Qui', leads: 12, conversas: 55, vendas: 4 },
  { name: 'Sex', leads: 9, conversas: 40, vendas: 3 },
  { name: 'Sab', leads: 3, conversas: 15, vendas: 0 },
  { name: 'Dom', leads: 2, conversas: 10, vendas: 1 },
];

export default function DashboardView() {
  return (
    <div className="flex-1 overflow-y-auto bg-stone-50 h-full">
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Dashboard Analítico</h1>
          <p className="text-stone-500 mt-1">Acompanhe as métricas do seu WhatsApp comercial em tempo real.</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex flex-col">
            <div className="flex items-center gap-3 text-stone-500 mb-4">
              <Users size={20} className="text-stone-800" />
              <span className="font-medium">Novos Leads</span>
            </div>
            <p className="text-4xl font-semibold text-stone-900 tracking-tight">42</p>
            <p className="text-sm text-orange-500 font-medium mt-2 flex items-center gap-1">
              <TrendingUp size={16} /> +12% esta semana
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex flex-col">
            <div className="flex items-center gap-3 text-stone-500 mb-4">
              <BookOpenCheck size={20} className="text-orange-500" />
              <span className="font-medium">Conversões</span>
            </div>
            <p className="text-4xl font-semibold text-stone-900 tracking-tight">12</p>
            <p className="text-sm text-orange-500 font-medium mt-2 flex items-center gap-1">
              <TrendingUp size={16} /> +4% esta semana
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex flex-col">
            <div className="flex items-center gap-3 text-stone-500 mb-4">
              <Clock size={20} className="text-amber-500" />
              <span className="font-medium">Tempo de Resposta</span>
            </div>
            <p className="text-4xl font-semibold text-stone-900 tracking-tight">4m</p>
            <p className="text-sm text-stone-500 font-medium mt-2">Média da equipe</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex flex-col">
            <div className="flex items-center gap-3 text-stone-500 mb-4">
              <TrendingUp size={20} className="text-purple-500" />
              <span className="font-medium">Mensagens.</span>
            </div>
            <p className="text-4xl font-semibold text-stone-900 tracking-tight">1.2k</p>
            <p className="text-sm text-stone-500 font-medium mt-2">Enviadas hoje</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
            <h3 className="font-semibold text-stone-900 mb-6">Volume de Conversas (Semana)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} className="text-xs" />
                  <YAxis axisLine={false} tickLine={false} className="text-xs" />
                  <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="conversas" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
            <h3 className="font-semibold text-stone-900 mb-6">Novos Leads vs Vendas</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} className="text-xs" />
                  <YAxis axisLine={false} tickLine={false} className="text-xs" />
                  <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="vendas" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
