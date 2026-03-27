import React, { useState } from 'react';
import { Client, Invoice } from '../types';
import { CreditCard, ExternalLink, Calendar as CalendarIcon, DollarSign, Settings, CheckCircle, Save, Edit3, X, AlertCircle, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AccountProps {
  client: Client;
  isAdmin?: boolean;
  onUpdateClient?: (data: Partial<Client>) => Promise<void>;
  invoices: Invoice[];
  isOverdue: boolean;
}

export function Account({ client, isAdmin, onUpdateClient, invoices, isOverdue }: AccountProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    company_name: client.company_name,
    monthly_value: client.monthly_value || 0,
    due_day: client.due_day || 10,
    payment_link: client.payment_link || '',
    total_deliveries_contracted: client.total_deliveries_contracted || 0,
    plan: client.budget_details.plan || '',
    description: client.budget_details.description || ''
  });

  const handleSave = async () => {
    if (!onUpdateClient) return;
    
    const updatedClient = {
      company_name: formData.company_name,
      monthly_value: formData.monthly_value,
      due_day: formData.due_day,
      payment_link: formData.payment_link,
      total_deliveries_contracted: formData.total_deliveries_contracted,
      budget_details: {
        ...client.budget_details,
        plan: formData.plan,
        description: formData.description
      }
    };

    await onUpdateClient(updatedClient);
    setIsEditing(false);
  };

  const formattedValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(client.monthly_value || 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {isAdmin && (
        <div className="flex justify-end">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-lg",
              isEditing ? "bg-gray-100 text-gray-600" : "bg-gray-900 text-white hover:bg-gray-800 shadow-gray-900/10"
            )}
          >
            {isEditing ? (
              <>
                <X className="w-5 h-5" />
                Cancelar Edição
              </>
            ) : (
              <>
                <Edit3 className="w-5 h-5" />
                Editar Detalhes do Cliente
              </>
            )}
          </button>
        </div>
      )}

      {isEditing ? (
        <div className="bg-app-card p-8 rounded-3xl border border-app shadow-sm space-y-8 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#FF6321]/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-[#FF6321]" />
            </div>
            <h3 className="text-xl font-bold text-app-foreground">Configurações da Conta</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Nome da Empresa</label>
              <input 
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all font-medium text-app-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Valor Mensal (R$)</label>
              <input 
                type="number"
                value={formData.monthly_value}
                onChange={(e) => setFormData(prev => ({ ...prev, monthly_value: Number(e.target.value) }))}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all font-medium text-app-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Dia do Vencimento</label>
              <input 
                type="number"
                min="1"
                max="31"
                value={formData.due_day}
                onChange={(e) => setFormData(prev => ({ ...prev, due_day: Number(e.target.value) }))}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all font-medium text-app-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Link de Pagamento</label>
              <input 
                type="url"
                value={formData.payment_link}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_link: e.target.value }))}
                placeholder="https://pag.ae/..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all font-medium text-app-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Entregas Contratadas</label>
              <input 
                type="number"
                value={formData.total_deliveries_contracted}
                onChange={(e) => setFormData(prev => ({ ...prev, total_deliveries_contracted: Number(e.target.value) }))}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all font-medium text-app-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Nome do Plano</label>
              <input 
                type="text"
                value={formData.plan}
                onChange={(e) => setFormData(prev => ({ ...prev, plan: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all font-medium text-app-foreground"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Descrição do Escopo</label>
              <textarea 
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all font-medium resize-none text-app-foreground"
              />
            </div>
          </div>

          <button 
            onClick={handleSave}
            className="w-full py-4 bg-[#FF6321] text-white font-bold rounded-2xl hover:bg-[#e5591e] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#FF6321]/20"
          >
            <Save className="w-5 h-5" />
            Salvar Alterações do Cliente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Billing Summary */}
          <div className="bg-app-card p-8 rounded-3xl border border-app shadow-sm transition-colors">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#FF6321]/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#FF6321]" />
              </div>
              <h3 className="text-lg font-bold text-app-foreground">Resumo Financeiro</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Investimento Mensal</p>
                <p className="text-3xl font-extrabold text-app-foreground">{formattedValue}</p>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl">
                <CalendarIcon className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">Vencimento</p>
                  <p className="text-sm font-bold text-app-foreground opacity-80">Todo dia {client.due_day || 10}</p>
                </div>
              </div>

              {client.payment_link && (
                <a 
                  href={client.payment_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 bg-[#FF6321] text-white font-bold rounded-2xl hover:bg-[#e5591e] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#FF6321]/20"
                >
                  <CreditCard className="w-5 h-5" />
                  Efetuar Pagamento
                  <ExternalLink className="w-4 h-4 opacity-50" />
                </a>
              )}

              <p className="text-[10px] text-gray-400 text-center italic">
                * Sujeito a possíveis taxas de processamento do gateway de pagamento.
              </p>
            </div>
          </div>

          {/* Plan Details */}
          <div className="bg-[#151619] text-white p-8 rounded-3xl shadow-xl border border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-[#FF6321]" />
              </div>
              <h3 className="text-lg font-bold">Detalhes do Plano</h3>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-[10px] font-bold uppercase text-white/40 mb-1">Plano Atual</p>
                <p className="text-lg font-bold text-[#FF6321]">{client.budget_details.plan || 'Personalizado'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-[10px] font-bold uppercase text-white/40 mb-1">Escopo do Projeto</p>
                <p className="text-sm text-white/70 leading-relaxed">
                  {client.budget_details.description || 'Gestão completa de redes sociais, incluindo design gráfico e edição de vídeos curtos.'}
                </p>
              </div>

              <div className="pt-4">
                <p className="text-[10px] text-white/30 italic">
                  Para alterações no plano ou upgrade, entre em contato com seu gestor.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History / Invoices */}
      {!isEditing && (
        <div className="bg-app-card p-8 rounded-3xl border border-app shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-app-foreground">Histórico de Faturas</h3>
            {isOverdue && (
              <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-full border border-red-500/20 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Pagamento Pendente
              </span>
            )}
          </div>
          
          <div className="space-y-4">
            {invoices.length > 0 ? (
              invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-colors border border-transparent hover:border-app">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      invoice.status === 'pago' ? "bg-green-50 dark:bg-green-900/20" : "bg-yellow-50 dark:bg-yellow-900/20"
                    )}>
                      {invoice.status === 'pago' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-app-foreground">{invoice.invoice_number}</p>
                      <p className="text-xs text-gray-400">
                        {invoice.status === 'pago' 
                          ? `Pago em ${invoice.payment_date ? format(new Date(invoice.payment_date), 'dd/MM/yyyy') : 'N/A'}`
                          : `Vencimento em ${format(new Date(invoice.due_date), 'dd/MM/yyyy')}`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-app-foreground">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.amount)}
                    </p>
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-wider",
                      invoice.status === 'pago' ? "text-green-500" : "text-yellow-500"
                    )}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">Nenhuma fatura encontrada.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
