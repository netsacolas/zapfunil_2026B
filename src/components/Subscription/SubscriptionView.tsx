import React, { useState } from 'react';
import { CreditCard, Wallet, CheckCircle2, Receipt, ShieldCheck, Zap, Star } from 'lucide-react';

const invoices = [
  { id: 'FAT-2026-05', date: '05/05/2026', amount: 'R$ 97,00', status: 'Pago', method: 'Cartão de Crédito **** 1234' },
  { id: 'FAT-2026-04', date: '05/04/2026', amount: 'R$ 97,00', status: 'Pago', method: 'Cartão de Crédito **** 1234' },
  { id: 'FAT-2026-03', date: '05/03/2026', amount: 'R$ 97,00', status: 'Pago', method: 'Cartão de Crédito **** 1234' },
];

export default function SubscriptionView() {
  const [currentPlan, setCurrentPlan] = useState('PRO');

  return (
    <div className="flex-1 overflow-y-auto bg-stone-50 h-full p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Assinatura e Pagamentos</h1>
          <p className="text-stone-500 mt-1">Gerencie seu plano, faturas e métodos de pagamento.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Coluna Esquerda - Plano Atual e Pagamento */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* Resumo do Plano */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10 text-orange-500">
                 <ShieldCheck size={100} />
              </div>
              <h2 className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-4">Seu Plano Atual</h2>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl font-black text-stone-900">PRO</span>
                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full border border-orange-200 flex items-center">
                  <CheckCircle2 size={12} className="mr-1" /> ATIVO
                </span>
              </div>
              <p className="text-stone-600 mb-6 font-medium">R$ 97,00 <span className="text-stone-400 text-sm font-normal">/ mês</span></p>
              
              <div className="space-y-3 mb-6">
                 <div className="flex items-center gap-2 text-sm text-stone-600">
                    <CheckCircle2 size={16} className="text-orange-500" /> WhatsApp Ilimitado
                 </div>
                 <div className="flex items-center gap-2 text-sm text-stone-600">
                    <CheckCircle2 size={16} className="text-orange-500" /> CRM Completo
                 </div>
                 <div className="flex items-center gap-2 text-sm text-stone-600">
                    <CheckCircle2 size={16} className="text-orange-500" /> Automação de Agendamentos
                 </div>
                 <div className="flex items-center gap-2 text-sm text-stone-600">
                    <CheckCircle2 size={16} className="text-orange-500" /> IA Insights
                 </div>
              </div>

              <div className="pt-4 border-t border-stone-100">
                <p className="text-xs text-stone-500 mb-1">Próxima cobrança</p>
                <p className="text-sm font-semibold text-stone-900">05 de Junho de 2026</p>
              </div>
            </div>

            {/* Método de Pagamento */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
                  <Wallet size={16} /> Pagamento Principal
                </h2>
                <button className="text-xs font-bold text-stone-700 hover:text-stone-700">Editar</button>
              </div>
              
              <div className="flex items-center gap-4 p-4 border border-stone-200 rounded-xl bg-stone-50">
                 <div className="w-12 h-8 bg-stone-800 rounded flex items-center justify-center shadow-inner">
                    <CreditCard size={20} className="text-white" />
                 </div>
                 <div className="flex-1">
                    <p className="text-sm font-bold text-stone-800">•••• •••• •••• 1234</p>
                    <p className="text-xs text-stone-500 mt-0.5">Expira em 12/28</p>
                 </div>
              </div>
            </div>
            
          </div>

          {/* Coluna Direita - Upgrade e Histórico */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Upgrade Planos */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
               <h2 className="text-lg font-bold text-stone-900 mb-1">Fazer Upgrade</h2>
               <p className="text-sm text-stone-500 mb-6">Aumente o limite de disparos e adicione mais atendentes.</p>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {/* Current Plan Card (Reference) */}
                 <div className="border border-stone-200 rounded-xl p-5 relative bg-stone-50 opacity-70">
                    <div className="absolute top-0 right-0 bg-stone-200 text-stone-600 font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl text-[10px] uppercase">
                       Plano Atual
                    </div>
                    <h3 className="text-lg font-bold text-stone-900 mb-1">Pró</h3>
                    <p className="text-2xl font-black text-stone-900 mb-4">R$ 97<span className="text-sm font-normal text-stone-500">/mês</span></p>
                    <p className="text-sm text-stone-600 mb-4">Volume médio de contatos, até 3 atendentes.</p>
                    <button className="w-full py-2 bg-stone-200 text-stone-600 rounded-lg text-sm font-bold cursor-default">Plano Atual</button>
                 </div>

                 {/* Upgrade Plan Card */}
                 <div className="border border-orange-500 rounded-xl p-5 relative shadow-lg shadow-orange-500/10">
                    <div className="absolute top-0 right-0 bg-stone-800 text-white font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl text-[10px] uppercase tracking-wider flex items-center gap-1">
                       <Zap size={12}/> Mais Popular
                    </div>
                    <h3 className="text-lg font-bold text-stone-900 mb-1">Enterprise <Star size={16} className="inline text-stone-800 mb-1" fill="currentColor" /></h3>
                    <p className="text-2xl font-black text-stone-900 mb-4">R$ 297<span className="text-sm font-normal text-stone-500">/mês</span></p>
                    <p className="text-sm text-stone-600 mb-4">Múltiplos números, disparos em massa ilimitados, atendentes ilimitados e API aberta.</p>
                    <button className="w-full py-2 bg-orange-600 hover:bg-orange-700 transition shadow-md shadow-orange-500/30 text-white rounded-lg text-sm font-bold"> Fazer Upgrade</button>
                 </div>
               </div>
            </div>

            {/* Histórico de Faturas */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
               <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                 <h2 className="text-lg font-bold text-stone-900">Histórico de Faturas</h2>
                 <button className="text-sm font-medium text-stone-500 hover:text-stone-800 transition flex items-center gap-2">
                   <Receipt size={16} /> Ver todas
                 </button>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm text-stone-600">
                   <thead className="bg-stone-50 text-xs uppercase font-semibold text-stone-500">
                     <tr>
                       <th className="px-6 py-4">Fatura</th>
                       <th className="px-6 py-4">Data</th>
                       <th className="px-6 py-4">Valor</th>
                       <th className="px-6 py-4">Método</th>
                       <th className="px-6 py-4">Status</th>
                       <th className="px-6 py-4"></th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-stone-100">
                     {invoices.map((inv) => (
                       <tr key={inv.id} className="hover:bg-stone-50/50 transition">
                         <td className="px-6 py-4 font-medium text-stone-900">{inv.id}</td>
                         <td className="px-6 py-4">{inv.date}</td>
                         <td className="px-6 py-4 font-bold">{inv.amount}</td>
                         <td className="px-6 py-4 text-xs">
                           <span className="flex items-center gap-2">
                             <CreditCard size={14} className="text-stone-400" /> {inv.method}
                           </span>
                         </td>
                         <td className="px-6 py-4">
                           <span className="px-2 py-1 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full uppercase">
                             {inv.status}
                           </span>
                         </td>
                         <td className="px-6 py-4 text-right">
                           <button className="font-medium text-stone-700 hover:text-stone-800 text-xs">Baixar PDF</button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
            
          </div>

        </div>
      </div>
    </div>
  );
}
