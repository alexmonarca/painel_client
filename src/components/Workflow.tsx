import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Delivery, ProductionStatus, Client } from '../types';
import { 
  DndContext, 
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor, 
  useSensors, 
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  pointerWithin,
  useDroppable
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy, 
  useSortable,
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Clock, 
  CheckCircle2, 
  MessageSquare, 
  Calendar as CalendarIcon, 
  User,
  GripVertical,
  Maximize2,
  Trash2,
  Save,
  UserPlus,
  AlertCircle,
  ChevronRight,
  XCircle,
  Layout
} from 'lucide-react';
import { cn } from '../lib/utils';

interface WorkflowProps {
  currentUserId: string | null;
  userRole: string;
}

const COLUMNS: { id: ProductionStatus; title: string; color: string }[] = [
  { id: 'ideacao', title: 'Ideação', color: 'border-t-blue-500' },
  { id: 'producao', title: 'Em Produção', color: 'border-t-orange-500' },
  { id: 'revisao', title: 'Revisão Interna', color: 'border-t-purple-500' },
  { id: 'finalizado', title: 'Finalizado', color: 'border-t-green-500' },
];

export function Workflow({ currentUserId, userRole }: WorkflowProps) {
  const [tasks, setTasks] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [designers, setDesigners] = useState<{ id: string, full_name: string }[]>([]);
  const [selectedTask, setSelectedTask] = useState<Delivery | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTask, setActiveTask] = useState<Delivery | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  const fetchTasks = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('deliveries')
        .select('*, client:clients!deliveries_client_id_fkey(*)')
        .order('delivery_date', { ascending: true });

      if (userRole === 'designer') {
        query = query.eq('assigned_to', currentUserId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching overflow tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDesigners = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .or('role.eq.designer,role.eq.admin,role.eq.staff');
      if (error) throw error;
      setDesigners(data || []);
    } catch (err) {
      console.error('Error fetching designers:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
    if (userRole !== 'designer') {
      fetchDesigners();
    }
  }, [currentUserId, userRole]);

  const handleUpdateTask = async (updates: Partial<Delivery>) => {
    if (!selectedTask) return;
    setSaveLoading(true);
    try {
      const { error } = await supabase
        .from('deliveries')
        .update(updates)
        .eq('id', selectedTask.id);
      
      if (error) throw error;
      
      // Update local state
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, ...updates } : t));
      setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      console.error('Error updating task:', err);
      alert('Erro ao atualizar demanda.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    try {
      const { error } = await supabase
        .from('deliveries')
        .delete()
        .eq('id', selectedTask.id);
      
      if (error) throw error;
      
      setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
      setSelectedTask(null);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Error deleting task:', err);
      alert('Erro ao excluir demanda.');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    const task = tasks.find(t => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      console.log('Drag over nothing');
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    console.log('Dragging over:', overId, over.data.current);

    if (activeId === overId) return;

    let overStatus: ProductionStatus | null = null;
    const overData = over.data.current;

    if (overData?.type === 'column') {
      overStatus = overData.status;
    } else if (overData?.type === 'task') {
      overStatus = overData.status;
    }

    if (!overStatus) return;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    const currentStatus = activeTask.production_status || 'ideacao';

    if (currentStatus !== overStatus) {
      console.log(`Switching status: ${currentStatus} -> ${overStatus}`);
      setTasks(prev => prev.map(t => 
        t.id === activeId ? { ...t, production_status: overStatus as ProductionStatus } : t
      ));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    setActiveId(null);
    const { active, over } = event;
    
    console.log('Drag end over:', over?.id);

    if (!over) {
      console.log('Dropped outside');
      fetchTasks(); // Restore position
      return;
    }

    const activeId = active.id as string;
    const droppedTask = tasks.find(t => t.id === activeId);
    
    if (droppedTask) {
      const finalStatus = droppedTask.production_status || 'ideacao';
      console.log('Finalizing save to:', finalStatus);
      try {
        const { error } = await supabase
          .from('deliveries')
          .update({ production_status: finalStatus })
          .eq('id', activeId);
          
        if (error) throw error;
        console.log('Saved successfully');
      } catch (err) {
        console.error('Save failed:', err);
        fetchTasks();
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-app-foreground text-app font-sans">Fluxo de Produção</h2>
          <p className="text-sm text-gray-400 font-sans">Acompanhe e gerencie as demandas de criação.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-[700px]">
        <DndContext 
          sensors={sensors} 
          collisionDetection={pointerWithin} 
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {COLUMNS.map(column => {
            const columnTasks = tasks.filter(t => (t.production_status || 'ideacao') === column.id);
            return (
              <div key={column.id} className="flex flex-col gap-4 h-full">
                <div className={cn(
                  "bg-app-card border-t-4 p-4 rounded-xl shadow-sm border-app flex items-center justify-between pointer-events-none transition-colors",
                  column.color
                )}>
                  <h3 className="font-bold text-app-foreground text-xs flex items-center gap-2 uppercase tracking-widest font-sans">
                    {column.title}
                    <span className="bg-gray-100 dark:bg-white/10 text-gray-400 text-[10px] px-2 py-0.5 rounded-full">
                      {columnTasks.length}
                    </span>
                  </h3>
                </div>

                <DroppableColumn 
                  id={column.id} 
                  tasks={columnTasks} 
                  onTaskClick={setSelectedTask} 
                />
              </div>
            );
          })}
          
          <DragOverlay AdjustLayout={true}>
            {activeTask ? (
              <div className="w-[280px] cursor-grabbing active:cursor-grabbing scale-105 rotate-1">
                <TaskCard task={activeTask} onClick={() => {}} isOverlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-app-card w-full max-w-3xl rounded-[32px] p-8 shadow-2xl relative border border-app transition-all animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button 
              onClick={() => setSelectedTask(null)}
              className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-400 transition-all z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-[#FF6321]/10 flex items-center justify-center">
                <Layout className="w-7 h-7 text-[#FF6321]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Protocolo #{selectedTask.id.slice(0, 8)}
                  </span>
                  <div className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                    selectedTask.production_status === 'finalizado' ? "bg-green-500/10 text-green-500" : "bg-[#FF6321]/10 text-[#FF6321]"
                  )}>
                    {COLUMNS.find(c => c.id === (selectedTask.production_status || 'ideacao'))?.title}
                  </div>
                </div>
                <h3 className="text-2xl font-black text-app-foreground tracking-tight">Gerenciar Demanda</h3>
                <p className="text-sm text-[#FF6321] font-bold">{selectedTask.client?.company_name}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              {/* Left Column: Briefing */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Briefing & Orientações
                  </label>
                  {userRole !== 'designer' ? (
                    <textarea 
                      className="w-full min-h-[250px] p-5 rounded-3xl bg-gray-50 dark:bg-white/5 border border-app focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none text-app-foreground text-sm leading-relaxed transition-all resize-none"
                      value={selectedTask.briefing || ''}
                      onChange={(e) => setSelectedTask({...selectedTask, briefing: e.target.value})}
                      placeholder="Adicione orientações detalhadas aqui..."
                    />
                  ) : (
                    <div className="w-full min-h-[200px] p-5 rounded-3xl bg-gray-50 dark:bg-white/5 border border-app text-app-foreground text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedTask.briefing || 'Sem orientações adicionais.'}
                    </div>
                  )}
                  <div className="mt-4 p-4 bg-gray-100/50 dark:bg-white/5 rounded-2xl border border-dotted border-app">
                    <h5 className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-tight">Descrição Inicial</h5>
                    <p className="text-xs italic text-gray-500">"{selectedTask.description}"</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Controls */}
              <div className="lg:col-span-5 space-y-6">
                {/* Deadline & Designer */}
                {userRole !== 'designer' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Data Limite de Produção</label>
                      <input 
                        type="date"
                        className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-app outline-none focus:border-[#FF6321] text-sm text-app-foreground transition-all"
                        value={selectedTask.deadline ? selectedTask.deadline.split('T')[0] : ''}
                        onChange={(e) => handleUpdateTask({ deadline: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Responsável pela Criação</label>
                      <select 
                        className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-app outline-none focus:border-[#FF6321] text-sm text-app-foreground transition-all"
                        value={selectedTask.assigned_to || ''}
                        onChange={(e) => handleUpdateTask({ assigned_to: e.target.value })}
                      >
                        <option value="">Aguardando Atribuição</option>
                        {designers.map(d => (
                          <option key={d.id} value={d.id}>{d.full_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Status Movement */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Mover para Etapa</label>
                  <div className="grid grid-cols-2 gap-2">
                    {COLUMNS.map(col => (
                      <button
                        key={col.id}
                        disabled={selectedTask.production_status === col.id}
                        onClick={() => handleUpdateTask({ production_status: col.id })}
                        className={cn(
                          "p-3 rounded-2xl text-[10px] font-bold uppercase transition-all flex items-center justify-between border",
                          selectedTask.production_status === col.id 
                            ? "bg-gray-100 dark:bg-white/5 text-gray-400 border-transparent" 
                            : "bg-white dark:bg-white/5 border-app hover:border-[#FF6321] hover:text-[#FF6321]"
                        )}
                      >
                        {col.title}
                        {selectedTask.production_status === col.id ? <CheckCircle2 className="w-3 h-3" /> : <ChevronRight className="w-3 h-3 opacity-30" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Info Only for Designer */}
                {userRole === 'designer' && (
                  <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-2xl border border-orange-100 dark:border-orange-900/30">
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase">Prazo de Entrega</span>
                    </div>
                    <p className="text-sm font-bold text-app-foreground">
                      {selectedTask.deadline 
                        ? format(parseISO(selectedTask.deadline), "dd 'de' MMMM", { locale: ptBR })
                        : 'Não definido'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="mt-10 pt-6 border-t border-app flex items-center justify-between">
              <div>
                {selectedTask.production_status === 'finalizado' && userRole !== 'designer' && (
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 px-6 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl font-bold text-sm transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir Ideia
                  </button>
                )}
              </div>
              <div className="flex gap-4">
                {userRole !== 'designer' && (
                  <button 
                    onClick={() => handleUpdateTask({ briefing: selectedTask.briefing })}
                    disabled={saveLoading}
                    className="flex items-center gap-2 px-8 py-4 bg-[#FF6321] text-white font-bold rounded-3xl hover:bg-[#e5591e] transition-all shadow-lg shadow-[#FF6321]/20 disabled:opacity-50"
                  >
                    {saveLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar Briefing
                  </button>
                )}
                <button 
                  onClick={() => setSelectedTask(null)}
                  className="px-8 py-4 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 font-bold rounded-3xl hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Overlay */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-app-card w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-app text-center animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h4 className="text-xl font-black text-app-foreground mb-2">Excluir Demanda?</h4>
            <p className="text-sm text-gray-400 mb-8">Deseja realmente apagar esta ideia? Esta ação não pode ser desfeita.</p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-4 bg-gray-100 dark:bg-white/5 text-gray-400 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDeleteTask}
                className="px-6 py-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface DroppableColumnProps {
  id: string;
  tasks: Delivery[];
  onTaskClick: (task: Delivery) => void;
}

function DroppableColumn({ id, tasks, onTaskClick }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ 
    id,
    data: {
      type: 'column',
      status: id
    }
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex-1 flex flex-col gap-4 rounded-2xl min-h-[550px] transition-all p-3 border-2",
        "bg-gray-50/50 dark:bg-white/5 border-dashed border-gray-200 dark:border-white/10",
        isOver && "bg-[#FF6321]/10 border-[#FF6321] border-solid scale-[1.01] shadow-lg ring-4 ring-[#FF6321]/10"
      )}
    >
      <SortableContext id={id} items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-4">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
          
          {/* Drop Zone Placeholder */}
          {tasks.length === 0 && !isOver && (
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-gray-200 dark:border-white/5 rounded-2xl opacity-40">
              <div className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-white/20 mb-2 flex items-center justify-center">
                <span className="text-gray-400 text-lg">+</span>
              </div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Solte aqui</p>
            </div>
          )}

          {isOver && (
            <div className="h-24 bg-[#FF6321]/20 border-2 border-dashed border-[#FF6321] rounded-2xl animate-pulse flex items-center justify-center">
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#FF6321]">Pronto para soltar</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

interface TaskCardProps {
  key?: React.Key;
  task: Delivery;
  onClick: () => void;
  isOverlay?: boolean;
}

function TaskCard({ task, onClick, isOverlay }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: task.id, 
    disabled: isOverlay,
    data: {
      type: 'task',
      status: task.production_status || 'ideacao'
    }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging && !isOverlay ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-app-card p-4 rounded-xl border border-app shadow-sm hover:shadow-md transition-all group relative cursor-grab active:cursor-grabbing",
        isDragging && !isOverlay && "opacity-0", // Hide original when dragging (Sortable behavior)
        isOverlay && "shadow-2xl ring-2 ring-[#FF6321] z-[100] opacity-100 scale-105"
      )}
      onClick={(e) => {
        // Prevents onClick from firing after a drag
        if (isDragging) return;
        onClick();
      }}
    >
      <div className="flex items-center justify-between mb-3 pointer-events-none">
        <span className="text-[9px] text-[#FF6321] font-bold uppercase tracking-widest bg-[#FF6321]/5 px-2 py-0.5 rounded-full border border-[#FF6321]/10">
          {task.client?.company_name}
        </span>
        <div className="p-1 text-gray-300 group-hover:text-[#FF6321] transition-colors">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      </div>
      
      <p className="text-xs font-medium text-app-foreground mb-4 line-clamp-2 leading-relaxed pointer-events-none">
        {task.description}
      </p>

      <div className="flex items-center justify-between pt-3 border-t border-app pointer-events-none">
        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
          <CalendarIcon className="w-3 h-3" />
          {format(parseISO(task.delivery_date), 'dd MMM', { locale: ptBR })}
        </div>
        
        {task.deadline && (
          <div className="flex items-center gap-1 text-[10px] text-orange-500 font-bold">
            <Clock className="w-3 h-3" />
            {format(parseISO(task.deadline), 'dd/MM')}
          </div>
        )}
      </div>
    </div>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
