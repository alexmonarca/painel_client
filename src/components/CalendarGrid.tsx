import React from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  addDays,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Delivery } from '../types';
import { cn } from '../lib/utils';
import { Clock, CheckCircle2, AlertCircle, XCircle, CheckCircle } from 'lucide-react';

interface CalendarGridProps {
  deliveries: Delivery[];
  currentMonth: Date;
  onEdit?: (delivery: Delivery) => void;
  isAdmin?: boolean;
}

const statusColorMap: Record<string, string> = {
  'ideia apresentada': 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800/50',
  'arquivo entregue': 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800/50',
  'aprovado': 'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800/50',
  'finalizado': 'bg-gray-50 text-gray-600 border-gray-100 dark:bg-white/5 dark:text-gray-400 dark:border-white/10',
  'recusado': 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800/50',
  'ñ fez - atrasado': 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800/50',
};

export function CalendarGrid({ deliveries, currentMonth, onEdit, isAdmin }: CalendarGridProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  return (
    <div className="bg-app-card rounded-3xl border border-app shadow-sm overflow-hidden transition-colors">
      {/* Week Day Headers */}
      <div className="grid grid-cols-7 border-b border-app bg-gray-50/50 dark:bg-white/5">
        {weekDays.map(day => (
          <div key={day} className="px-4 py-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 auto-rows-fr">
        {days.map((day, idx) => {
          const dayDeliveries = deliveries.filter(d => isSameDay(parseISO(d.delivery_date), day));
          const isCurrentMonth = isSameMonth(day, monthStart);

          return (
            <div 
              key={day.toString()} 
              className={cn(
                "min-h-[140px] p-2 border-r border-b border-app last:border-r-0 transition-colors",
                !isCurrentMonth && "bg-gray-50/10 dark:bg-gray-900/5 opacity-40",
                isCurrentMonth && "bg-transparent"
              )}
            >
              <div className="flex justify-between items-center mb-3 px-1">
                <span className={cn(
                  "text-xs font-bold",
                  isCurrentMonth ? "text-app-foreground" : "text-gray-400"
                )}>
                  {format(day, 'd')}
                </span>
                {isSameDay(day, new Date()) && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF6321]" title="Hoje" />
                )}
              </div>

              <div className="space-y-1.5">
                {dayDeliveries.map(delivery => (
                  <button
                    key={delivery.id}
                    onClick={() => onEdit?.(delivery)}
                    className={cn(
                      "w-full text-[10px] p-2 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.98] border shadow-sm group",
                      statusColorMap[delivery.status] || statusColorMap['ideia apresentada']
                    )}
                  >
                    <p className="font-bold line-clamp-2 leading-snug group-hover:underline">
                      {delivery.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
