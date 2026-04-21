import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Delivery, ProductionStatus, Client } from '../types';
import { 
  DndContext, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent,
  closestCorners
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy, 
  useSortable 
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
  Maximize2
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
  const [selectedTask, setSelectedTask] = useState<Delivery | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

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

  useEffect(() => {
    fetchTasks();
  }, [currentUserId, userRole]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as ProductionStatus;

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, production_status: newStatus } : t));

    try {
      const { error } = await supabase
        .from('deliveries')
        .update({ production_status: newStatus })
        .eq('id', taskId);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating production status:', err);
      fetchTasks(); // Rollback
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-app-foreground">Fluxo de Produção</h2>
          <p className="text-sm text-gray-500">Acompanhe e gerencie as demandas de criação.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-[600px]">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          {COLUMNS.map(column => (
            <div key={column.id} className="flex flex-col gap-4">
              <div className={cn(
                "bg-app-card border-t-4 p-4 rounded-xl shadow-sm border-app flex items-center justify-between",
                column.color
              )}>
                <h3 className="font-bold text-app-foreground text-sm flex items-center gap-2">
                  {column.title}
                  <span className="bg-gray-100 dark:bg-white/10 text-gray-400 text-[10px] px-2 py-0.5 rounded-full">
                    {tasks.filter(t => (t.production_status || 'ideacao') === column.id).length}
                  </span>
                </h3>
              </div>

              <div 
                id={column.id}
                className="flex-1 space-y-4 rounded-xl min-h-[100px]"
              >
                {tasks
                  .filter(t => (t.production_status || 'ideacao') === column.id)
                  .map(task => (
                    <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                  ))}
              </div>
            </div>
          ))}
        </DndContext>
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-app-card w-full max-w-2xl rounded-3xl p-8 shadow-2xl relative border border-app transition-colors animate-in zoom-in-95">
            <button 
              onClick={() => setSelectedTask(null)}
              className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-400 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-[#FF6321]/10 flex items-center justify-center">
                <Maximize2 className="w-6 h-6 text-[#FF6321]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    ID #{selectedTask.id.slice(0, 8)}
                  </span>
                  <span className="text-[10px] bg-[#FF6321]/10 text-[#FF6321] px-2 py-0.5 rounded-full font-bold uppercase">
                    {selectedTask.production_status || 'Ideação'}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-app-foreground">Detalhes da Demanda</h3>
                <p className="text-sm text-[#FF6321] font-medium">{selectedTask.client?.company_name}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Brieffing / Orientação
                  </h4>
                  <p className="text-app-foreground leading-relaxed text-sm whitespace-pre-wrap bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-app">
                    {selectedTask.briefing || 'Nenhuma orientação detalhada.'}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <GripVertical className="w-3.5 h-3.5" />
                    Descrição Original
                  </h4>
                  <p className="text-gray-500 text-sm italic">"{selectedTask.description}"</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-app">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                      <CalendarIcon className="w-3 h-3" />
                      Postagem
                    </h4>
                    <p className="text-app-foreground font-bold text-sm">
                      {format(parseISO(selectedTask.delivery_date), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30">
                    <h4 className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      Prazo Produção
                    </h4>
                    <p className="text-orange-600 dark:text-orange-400 font-bold text-sm">
                      {selectedTask.deadline ? format(parseISO(selectedTask.deadline), 'dd/MM/yyyy') : 'Não definido'}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-app">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <User className="w-3 h-3" />
                    Responsável
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#FF6321] flex items-center justify-center text-[10px] text-white font-bold uppercase">
                      {userRole === 'designer' ? 'Você' : 'Staff'}
                    </div>
                    <span className="text-sm font-medium text-app-foreground">Design & Content</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                onClick={() => setSelectedTask(null)}
                className="px-6 py-3 bg-[#FF6321] text-white font-bold rounded-xl hover:bg-[#e5591e] transition-all"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TaskCardProps {
  key?: React.Key;
  task: Delivery;
  onClick: () => void;
}

function TaskCard({ task, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-app-card p-4 rounded-xl border border-app shadow-sm hover:shadow-md transition-all group relative cursor-pointer",
        isDragging && "z-50 ring-2 ring-[#FF6321]"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] text-[#FF6321] font-bold uppercase tracking-widest bg-[#FF6321]/5 px-2 py-0.5 rounded-full border border-[#FF6321]/10">
          {task.client?.company_name}
        </span>
        <div {...attributes} {...listeners} className="p-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      </div>
      
      <p className="text-xs font-medium text-app-foreground mb-4 line-clamp-2 leading-relaxed">
        {task.description}
      </p>

      <div className="flex items-center justify-between pt-3 border-t border-app">
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
