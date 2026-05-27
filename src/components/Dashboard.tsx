import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Client, Delivery, DeliveryStatus, Invoice, UserRole, ProductionStatus } from '../types';
import { Metrics } from './Metrics';
import { DeliveryTable } from './DeliveryTable';
import { LogOut, Calendar, FileText, ChevronLeft, ChevronRight, Loader2, LayoutDashboard, CreditCard, Plus, Edit2, Trash2, X, Moon, Sun, MessageSquare, Sparkles, AlertCircle, Menu, ClipboardList, Send, UserCheck, Download, Printer, Grid, Database, AlertTriangle, ArrowLeft } from 'lucide-react';
import { format, subMonths, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Account } from './Account';
import { ReviewBlock } from './ReviewBlock';
import { ChatAgent } from './ChatAgent';
import { Footer } from './Footer';
import { cn } from '../lib/utils';
import { Workflow } from './Workflow';
import { CalendarGrid } from './CalendarGrid';
import { jsPDF } from 'jspdf';
import { domToCanvas } from 'modern-screenshot';

export function Dashboard() {
  const [client, setClient] = useState<Client | null>(null);
  const [currentUser, setCurrentUser] = useState<Client | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [designers, setDesigners] = useState<Client[]>([]);

  const [isOverdue, setIsOverdue] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'calendar' | 'account' | 'workflow' | 'setup'>('calendar');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const logoLight = "https://i.ibb.co/20yqdzqd/logo-agenciamonarca-2026.png";
  const logoDark = "https://i.ibb.co/DP8ZWgBT/logo-agenciamonarca-2026-bg-black.png";

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<any>(null);

  // Modal states for Admin
  const [isEditing, setIsEditing] = useState<Delivery | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [modalTab, setModalTab] = useState<'details' | 'production'>('details');
  const [formData, setFormData] = useState({
    description: '',
    status: 'ideia apresentada' as DeliveryStatus,
    delivery_date: format(new Date(), 'yyyy-MM-dd'),
    delivery_link: '',
    production_status: 'ideacao' as ProductionStatus,
    assigned_to: '',
    briefing: '',
    deadline: ''
  });

  useEffect(() => {
    // No longer forcing designers away from calendar
  }, [currentUser, activeTab]);

  useEffect(() => {
    if (isEditing || isAdding) {
      setModalTab('details');
    }
    if (isEditing) {
      setFormData({
        description: isEditing.description,
        status: isEditing.status,
        delivery_date: isEditing.delivery_date,
        delivery_link: isEditing.delivery_link || '',
        production_status: isEditing.production_status || 'ideacao',
        assigned_to: isEditing.assigned_to || '',
        briefing: isEditing.briefing || '',
        deadline: isEditing.deadline || ''
      });
    } else {
      setFormData({
        description: '',
        status: 'ideia apresentada',
        delivery_date: format(new Date(), 'yyyy-MM-dd'),
        delivery_link: '',
        production_status: 'ideacao',
        assigned_to: '',
        briefing: '',
        deadline: ''
      });
    }
  }, [isEditing, isAdding]);

  const [isAddingClient, setIsAddingClient] = useState(false);
  const [clientFormData, setClientFormData] = useState({
    email: '',
    password: '',
    company_name: '',
    total_deliveries_contracted: 10,
    monthly_value: 0,
    due_day: 10,
    role: 'user' as UserRole
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const calendarRef = useRef<HTMLDivElement>(null);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [calendarViewMode, setCalendarViewMode] = useState<'list' | 'grid'>('grid');

  const handleExportPDF = async () => {
    if (!pdfTemplateRef.current) return;
    setExporting(true);
    
    try {
      // Small delay to ensure any layout shifts settle if needed
      await new Promise(resolve => setTimeout(resolve, 150));

      const canvas = await domToCanvas(pdfTemplateRef.current, {
        scale: 2.5, // Outstanding crisp quality for tables and small fonts
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();

      let heightLeft = imgHeight;
      let position = 0;

      // Slice pages beautifully if the table overflows a single screen height
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      const fileName = `Relatorio_Editorial_${client?.company_name || 'Agencia'}_${format(currentMonth, 'MMMM_yyyy', { locale: ptBR })}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Erro ao gerar relatório PDF.');
    } finally {
      setExporting(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: clientFormData.email,
        password: clientFormData.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erro ao criar usuário no Auth');

      // 2. Create client profile in 'clients' table
      const { error: clientError } = await supabase
        .from('clients')
        .insert([{
          id: authData.user.id,
          company_name: clientFormData.company_name,
          total_deliveries_contracted: clientFormData.total_deliveries_contracted,
          monthly_value: clientFormData.monthly_value,
          due_day: clientFormData.due_day,
          role: clientFormData.role
        }]);

      if (clientError) throw clientError;

      alert('Usuário criado com sucesso!');
      setIsAddingClient(false);
      setClientFormData({
        email: '',
        password: '',
        company_name: '',
        total_deliveries_contracted: 10,
        monthly_value: 0,
        due_day: 10,
        role: 'user'
      });
      fetchData();
    } catch (err: any) {
      console.error('Error creating client:', err);
      alert('Erro ao criar cliente: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    // Clean up empty strings for database compatibility (UUID and Dates must be null if empty)
    const dataToSave = {
      ...formData,
      assigned_to: formData.assigned_to || null,
      deadline: formData.deadline || null,
      briefing: formData.briefing || null,
      delivery_link: formData.delivery_link || null
    };

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('deliveries')
          .update(dataToSave)
          .eq('id', isEditing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('deliveries')
          .insert([{ ...dataToSave, client_id: client.id }]);
        if (error) throw error;
      }

      setIsEditing(null);
      setIsAdding(false);
      fetchData();
    } catch (err: any) {
      console.error('Error saving delivery:', err);
      
      // Specific check for the constraint error the user reported
      if (err.message?.includes('violates check constraint "deliveries_status_check"')) {
        const sqlFix = `ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_status_check;
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_status_check 
CHECK (status IN ('ideia apresentada', 'arquivo entregue', 'aprovado', 'finalizado', 'recusado', 'ñ fez - atrasado'));`;
        
        console.log('SQL FIX:', sqlFix);
        alert('ERRO DE BANCO: O status "ideia apresentada" não é aceito pelo seu Supabase.\n\nSOLUÇÃO: No painel lateral, clique em "Configurações do Sistema" e execute o SQL de atualização no seu editor do Supabase.');
      } else if (err.message?.includes('violates check constraint "deliveries_production_status_check"')) {
        alert('ERRO DE BANCO: A tabela "deliveries" não aceita o status de produção "' + formData.production_status + '". \n\nPara corrigir, execute o script SQL de CONFIGURAÇÃO COMPLETA no Supabase.');
      } else {
        alert('Erro ao salvar entrega: ' + (err.message || 'Verifique sua conexão.'));
      }
    }
  };

  const handleDeleteDelivery = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta entrega?')) return;
    try {
      const { error } = await supabase
        .from('deliveries')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Error deleting delivery:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setFetchError(null);
    setDeliveries([]); // Clear old deliveries while loading new ones
    setClient(null); // Clear old client context while loading new one
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Handle SQL generation safety
      const sqlId = user.id;

      // 1. Fetch the logged-in user's profile to check role
      let { data: currentUserProfile, error: profileError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching current user profile:', profileError);
        setFetchError(profileError);
      }

      // Check for Master Admin by email if profile is missing
      const adminEmails = ['AlexxBelmonte@gmail.com', 'noreply@monarcahub.com'];
      const isMasterAdmin = adminEmails.includes(user.email || '');

      // AUTO-PROVISIONING for master admin if profile missing
      if (!currentUserProfile && isMasterAdmin) {
        console.log('Master admin detected, auto-provisioning...');
        const { data: newAdmin, error: adminErr } = await supabase
          .from('clients')
          .insert([{
            id: user.id,
            company_name: 'Admin Monarca',
            total_deliveries_contracted: 99,
            monthly_value: 0,
            due_day: 10,
            role: 'admin'
          }])
          .select()
          .single();
        
        if (!adminErr && newAdmin) {
          currentUserProfile = newAdmin;
        }
      }

      setCurrentUser(currentUserProfile);

      // AUTO-UPGRADE: Ensure master admins always have the right role
      if (currentUserProfile && currentUserProfile.role !== 'admin') {
        const adminEmails = ['AlexxBelmonte@gmail.com', 'noreply@monarcahub.com'];
        if (adminEmails.includes(user.email || '')) {
          await supabase.from('clients').update({ role: 'admin' }).eq('id', user.id);
          currentUserProfile.role = 'admin';
        }
      }
      
      // AUTO-PROVISIONING
      if (!currentUserProfile && user.id) {
        const { data: profileFallback } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        const companyName = profileFallback?.company_name || profileFallback?.full_name || user.email?.split('@')[0] || 'Novo Cliente';
        const adminEmails = ['AlexxBelmonte@gmail.com', 'noreply@monarcahub.com'];
        const isAdmin = adminEmails.includes(user.email || '') || profileFallback?.role === 'admin';

        const { data: newProfile, error: provisionError } = await supabase
          .from('clients')
          .insert([{
            id: user.id,
            company_name: companyName,
            total_deliveries_contracted: 99,
            monthly_value: 0,
            due_day: 10,
            role: isAdmin ? 'admin' : 'user'
          }])
          .select()
          .single();

        if (!provisionError && newProfile) {
          setCurrentUser(newProfile);
          setClient(newProfile);
          fetchData(); 
          return;
        }
      }

      const isAdminUser = currentUserProfile?.role === 'admin';

      // 2. If staff, fetch all relevant data for selectors
      if (isAdminUser || currentUserProfile?.role === 'designer') {
        const [clientsRes, staffRes] = await Promise.all([
          supabase.from('clients').select('*').neq('role', 'designer').order('company_name', { ascending: true }),
          supabase.from('clients').select('*').in('role', ['admin', 'designer']).order('company_name', { ascending: true })
        ]);
        
        setAllClients(clientsRes.data || []);
        setDesigners(staffRes.data || []);
      }

      // 3. Determine target client
      // Designer fallback to null (general view)
      // Admin fallback to null (needs selection)
      // Standard user fallback to their own ID
      let targetClientId = selectedClientId;
      if (!targetClientId) {
        if (currentUserProfile?.role === 'user') {
          targetClientId = user.id;
        }
      }

      // Fetch target client profile
      if (targetClientId) {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', targetClientId)
          .single();

        if (clientError) {
          setFetchError(clientError);
          setClient(null);
        } else {
          setClient(clientData);
        }
      } else {
        // No specific client selected (Designer "General View" or Admin "No Selection")
        setClient(currentUserProfile?.role === 'designer' ? currentUserProfile : null);
      }

      // Fetch deliveries for current month
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

      let query = supabase
        .from('deliveries')
        .select('*')
        .gte('delivery_date', start)
        .lte('delivery_date', end)
        .order('delivery_date', { ascending: true });

      if (currentUserProfile?.role === 'designer' && !selectedClientId) {
        query = query.eq('assigned_to', user.id);
      } else if (targetClientId) {
        query = query.eq('client_id', targetClientId);
      } else if (isAdminUser) {
        // Admin viewing global? Or nothing?
        // Let's hide deliveries if no client is selected for admin to avoid confusion
        if (!selectedClientId) {
          setDeliveries([]);
          setInvoices([]);
          return;
        }
      }

      const { data: deliveryData, error: deliveryError } = await query;
      if (deliveryError) throw deliveryError;
      setDeliveries(deliveryData || []);

      // AUTO-DELAY LOGIC: Check for overdue approved deliveries
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const overdueDeliveries = (deliveryData || []).filter(d => 
        d.status === 'aprovado' && 
        d.delivery_date < todayStr
      );

      if (overdueDeliveries.length > 0) {
        const idsToUpdate = overdueDeliveries.map(d => d.id);
        const { error: updateErr } = await supabase
          .from('deliveries')
          .update({ status: 'ñ fez - atrasado' })
          .in('id', idsToUpdate);
        
        if (!updateErr) {
          // Sync local deliveryData for immediate display
          deliveryData?.forEach(d => {
            if (idsToUpdate.includes(d.id)) {
              d.status = 'ñ fez - atrasado' as DeliveryStatus;
            }
          });
          console.log(`Auto-updated ${idsToUpdate.length} overdue deliveries to 'atrasado'.`);
        }
      }

      // Fetch invoices
      if (targetClientId) {
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select('*')
          .eq('client_id', targetClientId)
          .order('due_date', { ascending: false });

        if (invoiceError) throw invoiceError;
        setInvoices(invoiceData || []);

        const today = format(new Date(), 'yyyy-MM-dd');
        const hasOverdue = (invoiceData || []).some(inv => 
          inv.status !== 'pago' && inv.due_date < today
        );
        setIsOverdue(hasOverdue);
      } else {
        setInvoices([]);
        setIsOverdue(false);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentMonth, selectedClientId]);

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({ status: 'aprovado' })
        .eq('id', id);

      if (error) throw error;
      
      // Refresh data
      setDeliveries(prev => prev.map(d => d.id === id ? { ...d, status: 'aprovado' } : d));
    } catch (err) {
      console.error('Error approving delivery:', err);
      alert('Erro ao aprovar entrega. Tente novamente.');
    }
  };

  const handleReorder = async (activeId: string, overId: string) => {
    const activeDelivery = deliveries.find(d => d.id === activeId);
    const overDelivery = deliveries.find(d => d.id === overId);

    if (!activeDelivery || !overDelivery) return;

    // Swap dates
    const activeDate = activeDelivery.delivery_date;
    const overDate = overDelivery.delivery_date;

    try {
      // Optimistic update
      setDeliveries(prev => {
        const newDeliveries = [...prev];
        const activeIndex = newDeliveries.findIndex(d => d.id === activeId);
        const overIndex = newDeliveries.findIndex(d => d.id === overId);
        
        newDeliveries[activeIndex] = { ...activeDelivery, delivery_date: overDate };
        newDeliveries[overIndex] = { ...overDelivery, delivery_date: activeDate };
        
        return newDeliveries.sort((a, b) => new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime());
      });

      // Update in Supabase
      const { error: error1 } = await supabase
        .from('deliveries')
        .update({ delivery_date: overDate })
        .eq('id', activeId);

      const { error: error2 } = await supabase
        .from('deliveries')
        .update({ delivery_date: activeDate })
        .eq('id', overId);

      if (error1 || error2) throw error1 || error2;

    } catch (err) {
      console.error('Error reordering deliveries:', err);
      fetchData(); // Revert on error
      alert('Erro ao reordenar entregas. Tente novamente.');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.clear(); // Clear any cached state
      window.location.reload(); // Hard reload to clear React state
    } catch (err) {
      console.error('Error logging out:', err);
      // Force reload anyway
      window.location.href = '/'; 
    }
  };

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF6321]" />
          <p className="text-xs text-gray-400 font-medium animate-pulse">Sincronizando com Monarca Hub...</p>
        </div>
      </div>
    );
  }

  // If we have a user logged in but no profile in 'clients' table
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] p-4">
        <div className="max-w-2xl w-full bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Configuração Necessária</h2>
          <p className="text-gray-600 mb-6 font-medium">
            Seu usuário foi autenticado, mas seu perfil de acesso não foi encontrado ou ainda não foi liberado.
          </p>
          
          <div className="bg-blue-50 p-6 rounded-2xl mb-6 border border-blue-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <UserCheck className="w-16 h-16 text-blue-900" />
            </div>
            <p className="text-[10px] font-bold text-blue-800 uppercase tracking-widest mb-2">Instruções para Liberação</p>
            <p className="text-sm text-blue-900/80 mb-4 leading-relaxed">
              O administrador do sistema precisa vincular seu ID de autenticação ao banco de dados Monarca.
            </p>
            <div className="flex flex-col gap-1">
              <p className="text-[9px] font-bold text-blue-400 uppercase">Seu ID Único de Acesso:</p>
              <div className="flex items-center gap-2">
                <code className="text-sm text-blue-600 font-mono bg-white/80 px-3 py-2 rounded-xl block flex-1 border border-blue-200/50 shadow-inner">
                  {currentUserId || 'Carregando ID...'}
                </code>
                <button 
                  onClick={() => {
                    if (currentUserId) {
                      navigator.clipboard.writeText(currentUserId);
                      alert('ID copiado!');
                    }
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                >
                  Copiar
                </button>
              </div>
            </div>
          </div>

          {fetchError && (
            <div className="bg-red-50 p-4 rounded-2xl mb-6 border border-red-100">
              <p className="text-xs font-bold text-red-800 uppercase tracking-wider mb-1">Erro do Supabase:</p>
              <code className="text-xs text-red-600 break-all font-mono block mt-1">
                {fetchError.message} (Código: {fetchError.code})
              </code>
              {fetchError.code === 'PGRST205' && (
                <div className="mt-3 p-3 bg-white/50 rounded-xl border border-red-200">
                  <p className="text-[11px] text-red-700 font-bold">
                    ⚠️ A tabela 'clients' não existe no seu banco de dados!
                  </p>
                  <p className="text-[10px] text-red-600 mt-1">
                    Isso acontece se o script SQL falhou ou não foi executado no schema correto.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="bg-gray-50 border-2 border-[#FF6321]/20 p-6 rounded-[32px] space-y-4 text-sm relative z-[60] shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-[#FF6321]" />
              <p className="font-black text-gray-900 uppercase tracking-tight">Comando de Liberação (SQL):</p>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              <strong>IMPORTANTE:</strong> Para corrigir o erro de status e liberar seu acesso, copie o código abaixo e cole no seu <a href="https://supabase.com/dashboard/project/_/sql" target="_blank" className="text-[#FF6321] font-bold underline">SQL Editor do Supabase</a>. Depois clique em "Run".
            </p>
            
            <div className="space-y-3">
              {currentUserId ? (
                <>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Para Administrador (Setup Completo):</p>
                    <pre className="bg-gray-900 text-green-400 p-4 rounded-xl text-[10px] border border-gray-800 overflow-x-auto font-mono">
{`-- SQL DE CONFIGURAÇÃO COMPLETA
-- 1. Tabelas Base (Garante que existam)
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY,
    company_name TEXT NOT NULL,
    total_deliveries_contracted INTEGER DEFAULT 10,
    monthly_value DECIMAL DEFAULT 0,
    due_day INTEGER DEFAULT 10,
    role TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id),
    delivery_date DATE NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'ideia apresentada',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    delivery_link TEXT,
    production_status TEXT DEFAULT 'ideacao',
    assigned_to UUID,
    briefing TEXT,
    deadline DATE
);

-- 2. Correção de Constraints (Resolve o erro "violated by some row")
-- Primeiro removemos as restrições problemáticas
ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_status_check;
ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_production_status_check;

-- Agora limpamos qualquer dado incompatível que travaria a nova regra
UPDATE public.deliveries 
SET status = 'ideia apresentada' 
WHERE status IS NULL OR status NOT IN ('ideia apresentada', 'arquivo entregue', 'aprovado', 'finalizado', 'recusado', 'ñ fez - atrasado', 'cancelado', 'em análise');

UPDATE public.deliveries 
SET production_status = 'ideacao' 
WHERE production_status IS NULL OR production_status NOT IN ('ideacao', 'producao', 'revisao', 'finalizado', 'pausado');

-- Adicionamos novamente as restrições com suporte aos novos status
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_status_check 
CHECK (status IN ('ideia apresentada', 'arquivo entregue', 'aprovado', 'finalizado', 'recusado', 'ñ fez - atrasado', 'cancelado', 'em análise'));

ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_production_status_check 
CHECK (production_status IN ('ideacao', 'producao', 'revisao', 'finalizado', 'pausado'));

-- 3. Liberação de Acesso (RLS)
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries DISABLE ROW LEVEL SECURITY;

-- 4. Criar seu Perfil Admin
INSERT INTO public.clients (id, company_name, total_deliveries_contracted, role) 
VALUES ('${currentUserId}', 'Admin Monarca', 99, 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';`}
                    </pre>
                  </div>
                  
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Para Designer (Equipe):</p>
                    <pre className="bg-gray-900 text-blue-400 p-4 rounded-xl text-[10px] border border-gray-800 overflow-x-auto font-mono">
{`-- SQL PARA DESIGNER
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries DISABLE ROW LEVEL SECURITY;
INSERT INTO public.clients (id, company_name, total_deliveries_contracted, role) 
VALUES ('${currentUserId}', 'Designer Equipe', 15, 'designer')
ON CONFLICT (id) DO UPDATE SET role = 'designer';`}
                    </pre>
                  </div>
                </>
              ) : (
                <div className="bg-white p-6 rounded-xl border border-gray-200 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Identificando seu ID de acesso...</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-8 relative z-[60]">
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-[#FF6321] text-white font-bold rounded-2xl hover:bg-[#e5591e] shadow-lg shadow-[#FF6321]/20 transition-all active:scale-[0.98]"
            >
              Já executei o SQL, Entrar Agora
            </button>
            <button 
              onClick={handleLogout}
              className="w-full py-3 text-gray-400 text-sm font-bold hover:text-red-500 transition-all"
            >
              Sair e trocar de conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleUpdateClient = async (updatedData: Partial<Client>) => {
    if (!client) return;
    try {
      const { error } = await supabase
        .from('clients')
        .update(updatedData)
        .eq('id', client.id);
      if (error) throw error;
      setClient({ ...client, ...updatedData });
    } catch (err) {
      console.error('Error updating client:', err);
      alert('Erro ao atualizar dados do cliente.');
    }
  };

  const isActualAdmin = currentUser?.role === 'admin';
  const isActualStaff = isActualAdmin || currentUser?.role === 'designer';
  const showOverdueWarning = isOverdue && !isActualStaff;

  return (
    <div className="min-h-screen bg-app-background text-app-foreground pb-24 md:pb-12 transition-colors duration-300">
      {/* Overdue Warning / Block */}
      {showOverdueWarning && activeTab !== 'account' && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#151619] p-8 rounded-3xl border border-red-500/30 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-app-foreground mb-3">Acesso Limitado</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              Identificamos uma pendência financeira em sua conta. Para continuar utilizando o painel, por favor regularize seu pagamento.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setActiveTab('account')}
                className="w-full py-4 bg-[#FF6321] text-white font-bold rounded-2xl hover:bg-[#e5591e] shadow-lg shadow-[#FF6321]/20 transition-all"
              >
                Ir para Pagamento
              </button>
              <button 
                onClick={handleLogout}
                className="w-full py-3 text-gray-400 text-sm font-medium hover:text-gray-600 transition-all"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-app-card border-b border-app sticky top-0 z-20 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-6">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-[#FF6321] transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-2">
              <img 
                src={isDarkMode ? logoDark : logoLight} 
                alt="Agência Monarca" 
                className="h-8 md:h-10 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
              {isActualAdmin && (
                <span className="text-[10px] bg-gray-900 text-white dark:bg-white dark:text-black px-2 py-0.5 rounded-full uppercase tracking-widest ml-2 hidden xs:inline-block">Admin</span>
              )}
            </div>

            {isActualStaff && allClients.length > 0 && (
              <div className="hidden lg:flex items-center gap-2 ml-4 bg-gray-50 dark:bg-white/5 p-1 rounded-xl border border-app">
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest ml-2">Visualizando:</span>
                <select 
                  value={selectedClientId || ''}
                  onChange={(e) => setSelectedClientId(e.target.value || null)}
                  className="bg-transparent border-none text-xs font-bold text-app-foreground outline-none focus:ring-0 cursor-pointer pr-8"
                >
                  {currentUser?.role === 'designer' ? (
                    <option value="">Minhas Demandas (Geral)</option>
                  ) : (
                    <option value="">Selecione um Cliente...</option>
                  )}
                  {allClients.map(c => (
                    <option key={c.id} value={c.id} className="bg-app-card text-app-foreground">
                      {c.company_name} {c.id === currentUserId ? '(Você)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
              <nav className="hidden md:flex items-center gap-1 bg-gray-50 dark:bg-white/5 p-1 rounded-xl">
                <button 
                  onClick={() => setActiveTab('calendar')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                    activeTab === 'calendar' ? "bg-white dark:bg-white/10 text-[#FF6321] shadow-sm" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  )}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Calendário
                </button>
                {isActualStaff && (
                  <button 
                    onClick={() => setActiveTab('workflow')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                      activeTab === 'workflow' ? "bg-white dark:bg-white/10 text-[#FF6321] shadow-sm" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    )}
                  >
                    <ClipboardList className="w-4 h-4" />
                    Produção
                  </button>
                )}
                <button 
                  onClick={() => setActiveTab('account')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                    activeTab === 'account' ? "bg-white dark:bg-white/10 text-[#FF6321] shadow-sm" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  )}
                >
                  <CreditCard className="w-4 h-4" />
                  Minha Conta
                </button>
              </nav>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleDarkMode}
              className="p-2.5 text-gray-400 hover:text-[#FF6321] dark:hover:text-[#FF6321] transition-colors bg-gray-50 dark:bg-white/5 rounded-xl border border-app"
              title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-app-foreground">{client?.company_name || currentUser?.company_name || 'Agência'}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Gestão Ativa</p>
            </div>
            <div className="h-8 w-[1px] border-l border-app"></div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {activeTab === 'setup' ? (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-white/5 p-8 md:p-12 rounded-[40px] border border-app shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-[24px] bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <Database className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-app-foreground">Setup do Sistema</h1>
                  <p className="text-gray-500">Execute os comandos abaixo no SQL Editor do Supabase para corrigir erros de status e permissões.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-6 rounded-3xl">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-amber-800 dark:text-amber-400">Instruções Importantes</p>
                      <ul className="text-xs text-amber-700/80 dark:text-amber-400/60 mt-2 space-y-1 list-disc ml-4">
                        <li>Acesse o <a href="https://supabase.com/dashboard/project/_/sql" target="_blank" className="underline font-bold">SQL Editor do seu projeto Supabase</a>.</li>
                        <li>Cole o código abaixo e clique em "Run".</li>
                        <li>Isso corrigirá o erro de status <strong>"ideia apresentada"</strong> que você está enfrentando.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="relative group">
                  <pre className="bg-gray-900 text-green-400 p-8 rounded-[32px] font-mono text-[11px] overflow-x-auto border border-gray-800 shadow-2xl leading-relaxed">
{`-- SQL DE CONFIGURAÇÃO COMPLETA (CORREÇÃO DE STATUS)
-- 1. Tabelas Base
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY,
    company_name TEXT NOT NULL,
    total_deliveries_contracted INTEGER DEFAULT 10,
    monthly_value DECIMAL DEFAULT 0,
    due_day INTEGER DEFAULT 10,
    role TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id),
    delivery_date DATE NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'ideia apresentada',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    delivery_link TEXT,
    production_status TEXT DEFAULT 'ideacao',
    assigned_to UUID,
    briefing TEXT,
    deadline DATE
);

-- 2. CORREÇÃO DE CONSTRAINTS (Resolve o erro "violated by some row")
-- Primeiro removemos as restrições para poder limpar os dados
ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_status_check;
ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_production_status_check;

-- LIMPEZA: Forçamos todos os status que não estão na lista a voltarem para o padrão
-- Isso evita o erro de "violated by some row"
UPDATE public.deliveries 
SET status = 'ideia apresentada' 
WHERE status IS NULL OR status NOT IN ('ideia apresentada', 'arquivo entregue', 'aprovado', 'finalizado', 'recusado', 'ñ fez - atrasado', 'cancelado', 'em análise');

UPDATE public.deliveries 
SET production_status = 'ideacao' 
WHERE production_status IS NULL OR production_status NOT IN ('ideacao', 'producao', 'revisao', 'finalizado', 'pausado');

-- Agora que os dados estão limpos, aplicamos as novas travas com segurança
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_status_check 
CHECK (status IN ('ideia apresentada', 'arquivo entregue', 'aprovado', 'finalizado', 'recusado', 'ñ fez - atrasado', 'cancelado', 'em análise'));

ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_production_status_check 
CHECK (production_status IN ('ideacao', 'producao', 'revisao', 'finalizado', 'pausado'));

-- 3. Liberação de Acesso
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries DISABLE ROW LEVEL SECURITY;

-- 4. Garantir Perfil Admin (Substitua se necessário)
-- INSERT INTO public.clients (id, company_name, role) VALUES ('${currentUserId}', 'Admin Monarca', 'admin') ON CONFLICT (id) DO UPDATE SET role = 'admin';`}
                  </pre>
                  <button 
                    onClick={() => {
                      const text = document.querySelector('pre')?.innerText || '';
                      navigator.clipboard.writeText(text);
                      alert('SQL copiado! Agora cole no SQL Editor do Supabase.');
                    }}
                    className="absolute top-4 right-4 bg-white/10 hover:bg-[#FF6321] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all backdrop-blur-md border border-white/10"
                  >
                    Copiar Código
                  </button>
                </div>

                <div className="flex justify-center pt-4">
                  <button 
                    onClick={() => setActiveTab('calendar')}
                    className="flex items-center gap-2 text-gray-400 hover:text-[#FF6321] font-bold text-sm transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao Calendário
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'workflow' ? (
          <div className="space-y-8">
                {currentUser?.role === 'designer' && (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-8">
                    {/* Welcome Section for Designer */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                      <div>
                        <h1 className="text-3xl font-extrabold text-app-foreground mb-2">
                          Olá, {currentUser?.company_name || 'Designer'}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">
                          {selectedClientId ? `Visualizando fluxo para: ${client?.company_name}` : 'Acompanhe aqui o fluxo de produção e suas demandas atribuídas.'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setIsAdding(true)}
                          className="bg-gray-900 dark:bg-[#FF6321] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-800 dark:hover:bg-[#e5591e] transition-all shadow-lg shadow-gray-900/10"
                        >
                          <Plus className="w-5 h-5" />
                          Nova Entrega
                        </button>
                      </div>
                    </div>

                    <ReviewBlock />
                    
                    <Metrics 
                      deliveries={deliveries} 
                      totalContracted={client?.total_deliveries_contracted || currentUser.total_deliveries_contracted || 0}
                      isStaffView={true}
                    />
                  </div>
                )}
            <Workflow currentUserId={currentUserId} userRole={currentUser?.role || 'user'} clientId={selectedClientId} />
          </div>
        ) : activeTab === 'calendar' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            {client ? (
              <div ref={calendarRef} className={cn("space-y-8 pb-4", exporting && "p-8 rounded-3xl")}>
                {/* Welcome Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-extrabold text-app-foreground mb-2">
                      {isActualAdmin ? 'Painel de Gestão' : `Olá, ${client?.company_name}`}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                      {isActualAdmin 
                        ? `Gerenciando: ${client?.company_name}` 
                        : 'Acompanhe aqui o andamento das suas entregas e o calendário editorial.'}
                    </p>
                  </div>

                  {isActualAdmin && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsAddingClient(true)}
                        className="bg-white dark:bg-white/10 text-gray-900 dark:text-white px-4 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-white/20 transition-all border border-app shadow-sm"
                      >
                        <Plus className="w-5 h-5 text-[#FF6321]" />
                        Novo Cliente
                      </button>
                      <button 
                        onClick={() => setIsAdding(true)}
                        className="bg-gray-900 dark:bg-[#FF6321] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-800 dark:hover:bg-[#e5591e] transition-all shadow-lg shadow-gray-900/10"
                      >
                        <Plus className="w-5 h-5" />
                        Nova Entrega
                      </button>
                    </div>
                  )}
                </div>

                {/* Review Block */}
                {!isActualAdmin && <ReviewBlock />}

                {/* Metrics */}
                <Metrics 
                  deliveries={deliveries} 
                  totalContracted={client?.total_deliveries_contracted || 0} 
                />

                {/* Calendar Section */}
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[#FF6321]" />
                      <h2 className="text-xl font-bold text-app-foreground">Calendário Editorial</h2>
                    </div>
                    
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      {/* View Toggle */}
                      <div className="flex p-1 bg-gray-100 dark:bg-white/5 rounded-xl border border-app">
                        <button 
                          onClick={() => setCalendarViewMode('list')}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            calendarViewMode === 'list' ? "bg-white dark:bg-[#FF6321] text-[#FF6321] dark:text-white shadow-sm" : "text-gray-400 hover:text-gray-600"
                          )}
                        >
                          <ClipboardList className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setCalendarViewMode('grid')}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            calendarViewMode === 'grid' ? "bg-white dark:bg-[#FF6321] text-[#FF6321] dark:text-white shadow-sm" : "text-gray-400 hover:text-gray-600"
                          )}
                        >
                          <Grid className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex-1 sm:flex-none flex items-center justify-between gap-4 bg-app-card px-4 py-2 rounded-2xl border border-app shadow-sm">
                        <button 
                          onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5 text-gray-400" />
                        </button>
                        <span className="text-sm font-bold text-app-foreground min-w-[120px] text-center capitalize">
                          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                        </span>
                        <button 
                          onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {calendarViewMode === 'grid' ? (
                    <CalendarGrid 
                      deliveries={deliveries}
                      currentMonth={currentMonth}
                      isAdmin={isActualAdmin}
                      onEdit={(d) => setIsEditing(d)}
                    />
                  ) : (
                    <DeliveryTable 
                      deliveries={deliveries} 
                      onApprove={handleApprove} 
                      isAdmin={isActualAdmin}
                      onEdit={(d) => setIsEditing(d)}
                      onReorder={handleReorder}
                    />
                  )}
                </div>

                {isActualAdmin && (
                  <button 
                    onClick={handleExportPDF}
                    disabled={exporting}
                    className="w-full py-5 bg-white dark:bg-white/5 border-2 border-app hover:border-[#FF6321] text-gray-600 dark:text-gray-300 hover:text-[#FF6321] font-black rounded-[32px] transition-all flex items-center justify-center gap-3 group shadow-sm active:scale-[0.98] disabled:opacity-50"
                  >
                    {exporting ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                        <span className="uppercase tracking-widest text-xs">Gerar Relatório em PDF</span>
                        <div className="h-4 w-[1px] bg-gray-200 dark:bg-white/10 mx-2" />
                        <Printer className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
                      </>
                    )}
                  </button>
                )}

                {/* Feedback Section */}
                {deliveries.length > 0 && (
                  <div className="bg-app-card p-8 rounded-3xl border border-app shadow-sm transition-colors">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#FF6321]/10 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-[#FF6321]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-app-foreground">Feedback do Calendário</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">O que achou das ideias deste mês? Peça ajustes ao nosso Estrategista IA.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsChatOpen(true)}
                      className="w-full py-4 bg-gray-50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 rounded-2xl text-gray-500 dark:text-gray-400 font-medium hover:border-[#FF6321] hover:text-[#FF6321] transition-all flex items-center justify-center gap-2 group"
                    >
                      <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Enviar feedback ou pedir alterações
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="w-24 h-24 rounded-[40px] bg-gray-50 dark:bg-white/5 border-2 border-app flex items-center justify-center mb-8 relative">
                  <LayoutDashboard className="w-10 h-10 text-gray-300" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#FF6321] rounded-full flex items-center justify-center shadow-lg shadow-[#FF6321]/20">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-app-foreground mb-3">Bem-vindo, Administrador</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-8">
                  Selecione um cliente no menu superior para visualizar e gerenciar o calendário editorial.
                </p>
                {allClients.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl mx-auto">
                    {allClients.slice(0, 6).map(c => (
                      <button 
                        key={c.id}
                        onClick={() => setSelectedClientId(c.id)}
                        className="p-4 bg-app-card border border-app rounded-2xl hover:border-[#FF6321] hover:shadow-md transition-all text-xs font-bold text-app-foreground truncate"
                      >
                        {c.company_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <Account 
            client={client} 
            isAdmin={isActualAdmin} 
            onUpdateClient={handleUpdateClient} 
            invoices={invoices}
            isOverdue={isOverdue}
          />
        )}
      </main>

      {/* Floating Chat Button */}
      {activeTab !== 'workflow' && (
        <button 
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-24 md:bottom-6 right-6 px-6 h-16 bg-[#FF6321] text-white rounded-full shadow-2xl shadow-[#FF6321]/40 flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all z-40 group"
        >
          <MessageSquare className="w-7 h-7 group-hover:rotate-12 transition-transform" />
          <span className="font-bold text-sm tracking-wide">Suporte 24h</span>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-[#0a0a0a] rounded-full" />
        </button>
      )}

      {/* AI Chat Agent */}
      {client && (
        <ChatAgent 
          client={client} 
          deliveries={deliveries}
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
          onUpdate={fetchData}
        />
      )}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-app-card border-r border-app p-6 animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between mb-8">
              <img 
                src={isDarkMode ? logoDark : logoLight} 
                alt="Agência Monarca" 
                className="h-8 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="space-y-2">
              <button 
                onClick={() => { setActiveTab('calendar'); setIsMobileMenuOpen(false); }}
                className={cn(
                  "w-full px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3",
                  activeTab === 'calendar' ? "bg-[#FF6321]/10 text-[#FF6321]" : "text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                )}
              >
                <LayoutDashboard className="w-5 h-5" />
                Calendário Editorial
              </button>
              {isActualStaff && (
                <button 
                  onClick={() => { setActiveTab('workflow'); setIsMobileMenuOpen(false); }}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3",
                    activeTab === 'workflow' ? "bg-[#FF6321]/10 text-[#FF6321]" : "text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                  )}
                >
                  <ClipboardList className="w-5 h-5" />
                  Fluxo de Produção
                </button>
              )}
               <button 
                onClick={() => { setActiveTab('account'); setIsMobileMenuOpen(false); }}
                className={cn(
                  "w-full px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3",
                  activeTab === 'account' ? "bg-[#FF6321]/10 text-[#FF6321]" : "text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                )}
              >
                <CreditCard className="w-5 h-5" />
                Minha Conta / Financeiro
              </button>
            </nav>

            <div className="absolute bottom-6 left-6 right-6 pt-6 border-t border-app">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-[#FF6321]/10 flex items-center justify-center text-[#FF6321] font-bold">
                    {client?.company_name?.charAt(0) || currentUser?.company_name?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-app-foreground">{client?.company_name || currentUser?.company_name || 'Agência'}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                      {client ? 'Cliente Ativo' : 'Seu Perfil'}
                    </p>
                  </div>
                </div>
              <button 
                onClick={handleLogout}
                className="w-full py-3 bg-red-500/10 text-red-500 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sair do Painel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-app-card border-t border-app z-[55] px-6 py-3 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-colors duration-300">
        <button 
          onClick={() => setActiveTab('calendar')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'calendar' ? "text-[#FF6321]" : "text-gray-400"
          )}
        >
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Calendário</span>
        </button>
        {isActualStaff && (
          <button 
            onClick={() => setActiveTab('workflow')}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              activeTab === 'workflow' ? "text-[#FF6321]" : "text-gray-400"
            )}
          >
            <ClipboardList className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Produção</span>
          </button>
        )}
        <button 
          onClick={() => setActiveTab('account')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'account' ? "text-[#FF6321]" : "text-gray-400"
          )}
        >
          <CreditCard className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Minha Conta</span>
        </button>
      </div>

      {/* Modal Novo Cliente */}
      {isAddingClient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-app-card w-full max-w-lg rounded-[32px] p-8 shadow-2xl border border-app relative animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setIsAddingClient(false)}
              className="absolute right-6 top-6 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-[#FF6321]/10 flex items-center justify-center">
                <Plus className="w-6 h-6 text-[#FF6321]" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-app-foreground">Novo Cliente</h3>
                <p className="text-sm text-gray-400">Cadastre um novo cliente no painel.</p>
              </div>
            </div>
            
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Tipo de Usuário</label>
                  <select 
                    value={clientFormData.role}
                    onChange={(e) => setClientFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all font-bold text-app-foreground"
                  >
                    <option value="user">Cliente (Acesso ao Calendário)</option>
                    <option value="designer">Designer / Social Media (Gestor)</option>
                    <option value="admin">Administrador Master</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Nome / Empresa</label>
                  <input 
                    type="text"
                    required
                    value={clientFormData.company_name}
                    onChange={(e) => setClientFormData(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder="Ex: Monarca Hub / João Silva"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all font-medium text-app-foreground"
                  />
                </div>
              </div>

              {clientFormData.role === 'user' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Entregas/Mês</label>
                    <input 
                      type="number"
                      required
                      value={clientFormData.total_deliveries_contracted}
                      onChange={(e) => setClientFormData(prev => ({ ...prev, total_deliveries_contracted: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all font-medium text-app-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Valor Mensal</label>
                    <input 
                      type="number"
                      required
                      value={clientFormData.monthly_value}
                      onChange={(e) => setClientFormData(prev => ({ ...prev, monthly_value: parseFloat(e.target.value) }))}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all font-medium text-app-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Dia Vencimento</label>
                    <input 
                      type="number"
                      required
                      min="1"
                      max="31"
                      value={clientFormData.due_day}
                      onChange={(e) => setClientFormData(prev => ({ ...prev, due_day: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all font-medium text-app-foreground"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">E-mail de Acesso</label>
                  <input 
                    type="email"
                    required
                    value={clientFormData.email}
                    onChange={(e) => setClientFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="cliente@email.com"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all font-medium text-app-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Senha Provisória</label>
                  <input 
                    type="password"
                    required
                    value={clientFormData.password}
                    onChange={(e) => setClientFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all font-medium text-app-foreground"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#FF6321] text-white font-bold rounded-2xl hover:bg-[#e5591e] shadow-lg shadow-[#FF6321]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Edit Modal */}
      {(isEditing || isAdding) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-app-card w-full max-w-2xl rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200 relative border border-app transition-colors max-h-[95vh] overflow-y-auto">
            <button 
              onClick={() => { setIsEditing(null); setIsAdding(false); }}
              className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-400 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-[#FF6321]/10 flex items-center justify-center shrink-0">
                {isEditing ? <Edit2 className="w-6 h-6 text-[#FF6321]" /> : <Plus className="w-6 h-6 text-[#FF6321]" />}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-app-foreground">
                  {isEditing ? 'Editar Entrega' : 'Nova Entrega'}
                </h3>
                <p className="text-sm text-gray-400">Gerencie os detalhes e o fluxo de produção da demanda.</p>
              </div>
            </div>

            {/* Tabs Header */}
            {isActualAdmin && (
              <div className="flex p-1 bg-gray-100 dark:bg-white/5 rounded-2xl mb-8">
                <button
                  type="button"
                  onClick={() => setModalTab('details')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                    modalTab === 'details' ? "bg-white dark:bg-[#FF6321] text-[#FF6321] dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                >
                  <FileText className="w-4 h-4" />
                  Detalhes da Entrega
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('production')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                    modalTab === 'production' ? "bg-white dark:bg-[#FF6321] text-[#FF6321] dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                >
                  <ClipboardList className="w-4 h-4" />
                  Fluxo de Produção
                </button>
              </div>
            )}
            
            <form onSubmit={handleSaveDelivery} className="space-y-6">
              {modalTab === 'details' || !isActualAdmin ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Data da Entrega</label>
                      <input 
                        type="date"
                        required
                        value={formData.delivery_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all font-medium text-app-foreground"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Status Atual</label>
                      <select 
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as DeliveryStatus }))}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all font-bold text-app-foreground"
                      >
                        <option value="ideia apresentada">Ideia Apresentada</option>
                        <option value="arquivo entregue">Arquivo Entregue</option>
                        <option value="aprovado">Aprovado</option>
                        <option value="finalizado">Finalizado</option>
                        <option value="recusado">Recusado</option>
                        <option value="ñ fez - atrasado">Atrasado</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Ideia / Descrição</label>
                    <textarea 
                      required
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Ex: Postagem sobre o novo serviço..."
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all font-medium resize-none text-app-foreground"
                    />
                  </div>

                  {formData.status === 'finalizado' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Link da Entrega / Postagem</label>
                      <input 
                        type="url"
                        value={formData.delivery_link}
                        onChange={(e) => setFormData(prev => ({ ...prev, delivery_link: e.target.value }))}
                        placeholder="https://..."
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all font-medium text-app-foreground"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Responsável</label>
                      <select 
                        value={formData.assigned_to}
                        onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all font-bold text-app-foreground"
                      >
                        <option value="">Selecione um Designer</option>
                        {designers.map(d => (
                          <option key={d.id} value={d.id}>{d.company_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Prazo do Designer</label>
                      <input 
                        type="date"
                        value={formData.deadline}
                        onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all font-medium text-app-foreground"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Lapidar Ideia (Briefing / Orientação)</label>
                    <textarea 
                      rows={5}
                      value={formData.briefing}
                      onChange={(e) => setFormData(prev => ({ ...prev, briefing: e.target.value }))}
                      placeholder="Orientações específicas para o designer..."
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all font-medium resize-none text-app-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Status da Produção</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <select 
                        value={formData.production_status}
                        onChange={(e) => setFormData(prev => ({ ...prev, production_status: e.target.value as ProductionStatus }))}
                        className="flex-1 px-4 py-3 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all font-bold text-app-foreground"
                      >
                        <option value="ideacao">Ideação (Aguardando)</option>
                        <option value="producao">Em Produção</option>
                        <option value="revisao">Revisão Interna</option>
                        <option value="finalizado">Concluído (Pronto p/ Entrega)</option>
                      </select>
                      {formData.production_status === 'ideacao' && formData.assigned_to && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, production_status: 'producao' }))}
                          className="px-6 py-3 bg-[#FF6321]/10 text-[#FF6321] rounded-2xl hover:bg-[#FF6321]/20 transition-all font-bold text-sm flex items-center justify-center gap-2"
                        >
                          <Send className="w-4 h-4" />
                          Enviar p/ Produção
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-6 border-t border-app">
                {isEditing && (
                  <button 
                    type="button"
                    onClick={() => {
                      handleDeleteDelivery(isEditing.id);
                      setIsEditing(null);
                    }}
                    className="p-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                    title="Excluir entrega"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-[#FF6321] text-white font-bold rounded-2xl hover:bg-[#e5591e] shadow-lg shadow-[#FF6321]/20 transition-all active:scale-[0.98]"
                >
                  {isEditing ? 'Salvar Alterações' : 'Criar Entrega'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXCLUSIVE COMPACT PDF TEMPLATE (Hidden off-screen, calibrated for standard A4 Portrait) */}
      <div 
        ref={pdfTemplateRef}
        className="absolute top-0 left-[-9999px] bg-white text-slate-900 w-[794px] p-8 font-sans flex flex-col justify-between"
        style={{ colorScheme: 'light' }}
      >
        <div>
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-[#FF6321] pb-6 mb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-[#FF6321]" />
                <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">
                  Agência Monarca
                </h1>
              </div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Relatório Editorial & Cronograma</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-black tracking-widest text-[#FF6321] bg-[#FF6321]/10 px-3 py-1 rounded-full">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <p className="text-[10px] text-slate-400 mt-1">
                Exportado: {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>

          {/* Metadata & Quick Metrics Dashboard */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl mb-6 border border-slate-100">
            <div className="space-y-2 flex flex-col justify-center">
              <div className="text-xs text-slate-600">
                <span className="text-slate-400 font-medium font-mono uppercase text-[9px]">Cliente:</span>{' '}
                <strong className="text-slate-800 text-sm font-bold block">{client?.company_name || 'Geral'}</strong>
              </div>
              <div className="text-xs text-slate-600">
                <span className="text-slate-400 font-medium font-mono uppercase text-[9px]">Contrato Ativo:</span>{' '}
                <strong className="text-slate-700 font-bold block">
                  {client?.total_deliveries_contracted || 0} posts contratados
                </strong>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2 rounded-xl border border-slate-200/60 shadow-sm flex flex-col justify-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Planejados</span>
                <strong className="text-sm font-black text-slate-800">{deliveries.length}</strong>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200/60 shadow-sm flex flex-col justify-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Aprovados</span>
                <strong className="text-sm font-black text-emerald-600">
                  {deliveries.filter(d => d.status === 'aprovado' || d.status === 'finalizado').length}
                </strong>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200/60 shadow-sm flex flex-col justify-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Em Prod</span>
                <strong className="text-sm font-black text-indigo-600">
                  {deliveries.filter(d => d.production_status === 'producao' || d.production_status === 'revisao').length}
                </strong>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-800 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                  <th className="py-2.5 px-4 w-[90px]">Data</th>
                  <th className="py-2.5 px-4">Planejamento do Post / Briefing</th>
                  <th className="py-2.5 px-4 w-[110px] text-center">Fase de Prod</th>
                  <th className="py-2.5 px-4 w-[120px] text-center">Status Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {deliveries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 font-medium">
                      Nenhum post agendado para este período.
                    </td>
                  </tr>
                ) : (
                  deliveries
                    .slice()
                    .sort((a, b) => a.delivery_date.localeCompare(b.delivery_date))
                    .map((d, idx) => {
                      const dateObj = new Date(d.delivery_date + 'T12:00:00');
                      const formattedDay = format(dateObj, "dd'/'MM", { locale: ptBR });
                      const formattedWeekday = format(dateObj, "EEE", { locale: ptBR }).replace('.', '');

                      // Status badge styling matching exact standard layout
                      let statusStyle = "bg-orange-50 text-orange-700 border border-orange-200/50";
                      if (d.status === 'aprovado' || d.status === 'finalizado') {
                        statusStyle = "bg-emerald-50 text-emerald-700 border border-emerald-200/50";
                      } else if (d.status === 'arquivo entregue') {
                        statusStyle = "bg-blue-50 text-blue-700 border border-blue-200/50";
                      } else if (d.status === 'ñ fez - atrasado' || d.status === 'recusado') {
                        statusStyle = "bg-rose-50 text-rose-700 border border-rose-200/50";
                      }

                      // Production status labeling
                      let prodLabel = "Ideação";
                      let prodStyle = "bg-slate-100/80 text-slate-600 border border-slate-200/30";
                      if (d.production_status === 'producao') {
                        prodLabel = "Criação";
                        prodStyle = "bg-indigo-50 text-indigo-600 border border-indigo-100/40";
                      } else if (d.production_status === 'revisao') {
                        prodLabel = "Revisão";
                        prodStyle = "bg-amber-50 text-amber-700 border border-amber-150";
                      } else if (d.production_status === 'finalizado') {
                        prodLabel = "Finalizado";
                        prodStyle = "bg-emerald-50 text-emerald-700 border border-emerald-100";
                      }

                      return (
                        <tr key={d.id || idx} className="hover:bg-slate-50/30">
                          <td className="py-2 px-4 font-mono font-bold text-slate-700">
                            <div className="text-slate-900">{formattedDay}</div>
                            <div className="text-[9px] uppercase tracking-wide text-slate-400 font-sans font-normal">
                              {formattedWeekday}
                            </div>
                          </td>
                          <td className="py-2 px-4 space-y-0.5 max-w-[320px]">
                            <div className="font-bold text-slate-800 leading-tight">{d.description}</div>
                            {d.briefing && (
                              <p className="text-[10px] text-slate-500 leading-tight line-clamp-2 italic">
                                "{d.briefing}"
                              </p>
                            )}
                          </td>
                          <td className="py-2 px-4 text-center">
                            <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${prodStyle}`}>
                              {prodLabel}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-center">
                            <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${statusStyle}`}>
                              {d.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Document Footer */}
        <div className="border-t border-slate-100 pt-5 mt-10 flex justify-between items-center text-[9px] text-slate-400">
          <div>
            <span>Este cronograma é regulado pela Plataforma de Gestão Monarca.</span>
          </div>
          <div className="font-mono">
            <span>monarca.cc • Relatório Editorial</span>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
