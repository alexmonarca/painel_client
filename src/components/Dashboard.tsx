import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Client, Delivery, DeliveryStatus, Invoice, UserRole, ProductionStatus } from '../types';
import { Metrics } from './Metrics';
import { DeliveryTable } from './DeliveryTable';
import { LogOut, Calendar, FileText, ChevronLeft, ChevronRight, Loader2, LayoutDashboard, CreditCard, Plus, Edit2, Trash2, X, Moon, Sun, MessageSquare, Sparkles, AlertCircle, Menu, ClipboardList, Send, UserCheck, Download, Printer } from 'lucide-react';
import { format, subMonths, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Account } from './Account';
import { ReviewBlock } from './ReviewBlock';
import { ChatAgent } from './ChatAgent';
import { Footer } from './Footer';
import { cn } from '../lib/utils';
import { Workflow } from './Workflow';
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
  const [activeTab, setActiveTab] = useState<'calendar' | 'account' | 'workflow'>('calendar');
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
  const [formData, setFormData] = useState({
    description: '',
    status: 'entregue' as DeliveryStatus,
    delivery_date: format(new Date(), 'yyyy-MM-dd'),
    delivery_link: '',
    production_status: 'ideacao' as ProductionStatus,
    assigned_to: '',
    briefing: '',
    deadline: ''
  });

  useEffect(() => {
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
        status: 'entregue',
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
  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!calendarRef.current) return;
    setExporting(true);
    
    try {
      // Small delay to ensure any layout shifts settle if needed
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await domToCanvas(calendarRef.current, {
        scale: 2, // Better quality
        backgroundColor: isDarkMode ? '#0a0a0a' : '#f5f5f5',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);

      // Add Styled Export Header
      const headerHeight = 45;
      pdf.setFillColor(isDarkMode ? 13 : 250, isDarkMode ? 14 : 250, isDarkMode ? 18 : 250);
      pdf.rect(0, 0, pageWidth, headerHeight, 'F');
      
      // Title Section
      pdf.setTextColor(isDarkMode ? 255 : 26, isDarkMode ? 255 : 26, isDarkMode ? 255 : 26);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.text('Relatório de Calendário Editorial', margin, 18);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(16);
      pdf.text(`Cliente: ${client?.company_name}`, margin, 28);
      
      // Export Metadata
      pdf.setFontSize(11);
      pdf.setTextColor(120, 120, 120);
      const exportDate = format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
      pdf.text(`Data de Exportação: ${exportDate}`, margin, 38);

      // Subtle Divider
      pdf.setDrawColor(isDarkMode ? 40 : 230, isDarkMode ? 40 : 230, isDarkMode ? 40 : 230);
      pdf.line(margin, 42, pageWidth - margin, 42);

      // Add the content image
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * contentWidth) / imgProps.width;
      
      // If content is very long, it might overflow the first page. 
      // For dashboard reports, we'll place it on the first page started from below header.
      pdf.addImage(imgData, 'PNG', margin, headerHeight + 5, contentWidth, imgHeight);
      
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
    } catch (err) {
      console.error('Error saving delivery:', err);
      alert('Erro ao salvar entrega.');
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // 1. Fetch the logged-in user's profile to check role
      console.log('Fetching profile for UID:', user.id);
      const { data: currentUserProfile, error: profileError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching current user profile:', profileError);
      } else {
        console.log('Profile found:', currentUserProfile);
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
      
      // AUTO-PROVISIONING: If user exists in Auth but not in Clients
      if (!currentUserProfile && user.id) {
        console.log('User not found in clients table, attempting auto-provisioning...');
        
        // Try fallback to 'profiles' table if it exists
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
          console.log('Auto-provisioned user in clients table');
          setCurrentUser(newProfile);
          setClient(newProfile);
          // Re-trigger fetch to get all data now that we have a client record
          fetchData(); 
          return;
        } else {
          console.error('Failed to auto-provision user:', provisionError);
        }
      }

      const isAdminUser = currentUserProfile?.role === 'admin';

      // 2. If admin, fetch all clients and staff for the selector
      if (isAdminUser || currentUserProfile?.role === 'designer') {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('*')
          .neq('role', 'designer')
          .order('company_name', { ascending: true });
        setAllClients(clientsData || []);

        const { data: staffData } = await supabase
          .from('clients')
          .select('*')
          .in('role', ['admin', 'designer'])
          .order('company_name', { ascending: true });
        setDesigners(staffData || []);
      }

      // 3. Determine which client to fetch data for
      // If admin has selected a client, use that. Otherwise use the logged-in user's ID.
      const targetClientId = selectedClientId || user.id;

      // Fetch target client profile
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', targetClientId)
        .single();

      if (clientError) {
        setFetchError(clientError);
        console.error('Erro ao buscar perfil do cliente alvo:', clientError);
      }
      setClient(clientData);

      // Fetch deliveries for current month for the target client
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

      const { data: deliveryData, error: deliveryError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('client_id', targetClientId)
        .gte('delivery_date', start)
        .lte('delivery_date', end)
        .order('delivery_date', { ascending: true });

      if (deliveryError) throw deliveryError;
      setDeliveries(deliveryData || []);

      // Fetch invoices
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', targetClientId)
        .order('due_date', { ascending: false });

      if (invoiceError) throw invoiceError;
      setInvoices(invoiceData || []);

      // Check for overdue (if any pending invoice has due_date < today)
      const today = format(new Date(), 'yyyy-MM-dd');
      const hasOverdue = (invoiceData || []).some(inv => 
        inv.status !== 'pago' && inv.due_date < today
      );
      setIsOverdue(hasOverdue);
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

  if (loading && !client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF6321]" />
          <p className="text-xs text-gray-400 font-medium animate-pulse">Sincronizando com Monarca Hub...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] p-4">
        <div className="max-w-2xl w-full bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Configuração Necessária</h2>
          <p className="text-gray-600 mb-6">
            Seu usuário foi autenticado, mas não encontramos um perfil de cliente vinculado ao seu ID no banco de dados.
          </p>
          
          <div className="bg-blue-50 p-4 rounded-2xl mb-4 border border-blue-100">
            <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Seu ID Atual (UID):</p>
            <code className="text-sm text-blue-600 break-all font-mono bg-white/50 px-2 py-1 rounded block mt-1">
              {currentUserId}
            </code>
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

          <div className="bg-gray-50 p-6 rounded-2xl space-y-4 text-sm relative z-[60]">
            <p className="font-semibold text-gray-700">Comando de Reinstalação (SQL):</p>
            <p className="text-xs text-gray-500">
              Seu perfil não foi encontrado automaticamente. Por favor, execute o comando abaixo no Editor SQL do seu Supabase para garantir que seu usuário tenha acesso administrativo:
            </p>
            <pre className="bg-white p-3 rounded-lg text-[10px] border border-gray-200 overflow-x-auto text-gray-700 font-mono">
              {`-- 1. Garante que seu usuário seja Admin Master
INSERT INTO public.clients (id, company_name, total_deliveries_contracted, role) 
VALUES ('${currentUserId}', 'Admin Monarca', 99, 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';`}
            </pre>
          </div>
          <div className="flex flex-col gap-2 mt-8 relative z-[60]">
            <button 
              onClick={() => fetchData()}
              className="w-full py-4 bg-[#FF6321] text-white font-bold rounded-2xl hover:bg-[#e5591e] shadow-lg shadow-[#FF6321]/20 transition-all active:scale-[0.98]"
            >
              Tentar Novamente
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

            {isActualAdmin && allClients.length > 0 && (
              <div className="hidden lg:flex items-center gap-2 ml-4 bg-gray-50 dark:bg-white/5 p-1 rounded-xl border border-app">
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest ml-2">Visualizando:</span>
                <select 
                  value={selectedClientId || currentUserId || ''}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-app-foreground outline-none focus:ring-0 cursor-pointer pr-8"
                >
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
              <p className="text-xs font-bold text-app-foreground">{client.company_name}</p>
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
        {activeTab === 'workflow' ? (
          <Workflow currentUserId={currentUserId} userRole={currentUser?.role || 'user'} />
        ) : activeTab === 'calendar' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div ref={calendarRef} className={cn("space-y-8 pb-4", exporting && "p-8 rounded-3xl")}>
              {/* Welcome Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-app-foreground mb-2">
                  {isActualAdmin ? 'Painel de Gestão' : `Olá, ${client.company_name}`}
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                  {isActualAdmin 
                    ? `Gerenciando: ${client.company_name}` 
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
              totalContracted={client.total_deliveries_contracted || 0} 
            />

            {/* Calendar Section */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#FF6321]" />
                  <h2 className="text-xl font-bold text-app-foreground">Calendário Editorial</h2>
                </div>
                
                <div className="flex items-center gap-4 bg-app-card px-4 py-2 rounded-2xl border border-app shadow-sm">
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

              <DeliveryTable 
                deliveries={deliveries} 
                onApprove={handleApprove} 
                isAdmin={isActualAdmin}
                onEdit={(d) => setIsEditing(d)}
                onReorder={handleReorder}
              />
            </div>
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
                  {client.company_name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-app-foreground">{client.company_name}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Cliente Ativo</p>
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
          <div className="bg-app-card w-full max-w-lg rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200 relative border border-app transition-colors">
            <button 
              onClick={() => { setIsEditing(null); setIsAdding(false); }}
              className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-400 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-[#FF6321]/10 flex items-center justify-center">
                {isEditing ? <Edit2 className="w-6 h-6 text-[#FF6321]" /> : <Plus className="w-6 h-6 text-[#FF6321]" />}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-app-foreground">
                  {isEditing ? 'Editar Entrega' : 'Nova Entrega'}
                </h3>
                <p className="text-sm text-gray-400">Preencha os detalhes da demanda abaixo.</p>
              </div>
            </div>
            
            <form onSubmit={handleSaveDelivery} className="space-y-6">
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

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Status Atual</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as DeliveryStatus }))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all font-bold text-app-foreground"
                >
                  <option value="entregue">Entregue</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="finalizado">Finalizado</option>
                  <option value="recusado">Recusado</option>
                  <option value="ñ fez - atrasado">Atrasado</option>
                </select>
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

              {isActualAdmin && (
                <div className="border-t border-app pt-6 mt-6 space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#FF6321]/10 flex items-center justify-center">
                      <ClipboardList className="w-4 h-4 text-[#FF6321]" />
                    </div>
                    <h4 className="text-sm font-bold text-app-foreground uppercase tracking-widest">Fluxo de Produção</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      rows={3}
                      value={formData.briefing}
                      onChange={(e) => setFormData(prev => ({ ...prev, briefing: e.target.value }))}
                      placeholder="Orientações específicas para o designer..."
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all font-medium resize-none text-app-foreground"
                    />
                  </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Status da Produção</label>
                      <div className="flex gap-2">
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
                            className="px-4 bg-[#FF6321]/10 text-[#FF6321] rounded-2xl hover:bg-[#FF6321]/20 transition-all font-bold text-xs flex items-center gap-2 whitespace-nowrap"
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
      <Footer />
    </div>
  );
}
