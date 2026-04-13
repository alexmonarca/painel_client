import React from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit2, CheckCircle2, Clock, AlertCircle, XCircle, CheckCircle, GripVertical } from 'lucide-react';
import { Delivery, DeliveryStatus } from '../types';
import { cn } from '../lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DeliveryTableProps {
  deliveries: Delivery[];
  onApprove: (id: string) => void;
  isAdmin?: boolean;
  onEdit?: (delivery: Delivery) => void;
  onReorder?: (activeId: string, overId: string) => void;
}

const statusConfig: Record<DeliveryStatus, { label: string; color: string; icon: any }> = {
  entregue: { label: 'Entregue', color: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30', icon: Clock },
  aprovado: { label: 'Aprovado', color: 'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30', icon: CheckCircle2 },
  finalizado: { label: 'Finalizado', color: 'bg-gray-50 text-gray-600 border-gray-100 dark:bg-white/5 dark:text-gray-400 dark:border-white/10', icon: CheckCircle },
  recusado: { label: 'Recusado', color: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30', icon: XCircle },
  'ñ fez - atrasado': { label: 'Atrasado', color: 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/30', icon: AlertCircle },
};

interface SortableRowProps {
  delivery: Delivery;
  isAdmin?: boolean;
  onApprove: (id: string) => void;
  onEdit?: (delivery: Delivery) => void;
}

const SortableRow: React.FC<SortableRowProps> = ({ delivery, isAdmin, onApprove, onEdit }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: delivery.id, disabled: !isAdmin });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    position: isDragging ? 'relative' as const : 'static' as const,
  };

  const config = statusConfig[delivery.status];
  const StatusIcon = config.icon;

  return (
    <tr 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "group hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors",
        isDragging && "bg-white dark:bg-gray-800 shadow-2xl opacity-80"
      )}
    >
      <td className="px-6 py-5 align-top">
        <div className="flex items-center gap-3">
          {isAdmin && (
            <div 
              {...attributes} 
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 text-gray-300 hover:text-[#FF6321] transition-colors"
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-lg font-bold text-app-foreground">
              {format(parseISO(delivery.delivery_date), 'dd')}
            </span>
            <span className="text-xs text-gray-400 capitalize">
              {format(parseISO(delivery.delivery_date), 'MMM', { locale: ptBR })}
            </span>
          </div>
        </div>
      </td>
      <td className="px-6 py-5 align-top">
        <p className="text-app-foreground leading-relaxed whitespace-pre-wrap opacity-90">
          {delivery.description}
        </p>
      </td>
      <td className="px-6 py-5 align-top">
        <div className="flex flex-col gap-2">
          <div className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border",
            config.color
          )}>
            <StatusIcon className="w-3.5 h-3.5" />
            {config.label}
          </div>
          
          {delivery.status === 'entregue' && !isAdmin && (
            <button
              onClick={() => onApprove(delivery.id)}
              className="text-[10px] font-bold uppercase tracking-wider text-[#FF6321] hover:underline text-left ml-1"
            >
              Clique para Aprovar
            </button>
          )}

          {delivery.status === 'finalizado' && delivery.delivery_link && (
            <a
              href={delivery.delivery_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-bold uppercase tracking-wider text-[#FF6321] hover:underline text-left ml-1"
            >
              Acessar
            </a>
          )}
        </div>
      </td>
      {isAdmin && (
        <td className="px-6 py-5 align-top text-center">
          <button
            onClick={() => onEdit?.(delivery)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-400 hover:text-[#FF6321] transition-all"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </td>
      )}
    </tr>
  );
}

export function DeliveryTable({ deliveries, onApprove, isAdmin, onEdit, onReorder }: DeliveryTableProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      onReorder?.(active.id as string, over.id as string);
    }
  };

  return (
    <div className="bg-app-card rounded-3xl border border-app shadow-sm overflow-hidden transition-colors">
      <div className="overflow-x-auto">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-app">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400 w-40">Dia</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Ideia / Descrição</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400 w-48">Status</th>
                {isAdmin && <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400 w-20 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-app">
              {deliveries.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} className="px-6 py-12 text-center text-gray-400 italic">
                    Nenhuma entrega registrada para este período.
                  </td>
                </tr>
              ) : (
                <SortableContext 
                  items={deliveries.map(d => d.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {deliveries.map((delivery) => (
                    <SortableRow 
                      key={delivery.id} 
                      delivery={delivery} 
                      isAdmin={isAdmin}
                      onApprove={onApprove}
                      onEdit={onEdit}
                    />
                  ))}
                </SortableContext>
              )}
            </tbody>
          </table>
        </DndContext>
      </div>
    </div>
  );
}
