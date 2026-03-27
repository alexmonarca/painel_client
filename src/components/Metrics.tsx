import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Delivery } from '../types';

interface MetricsProps {
  deliveries: Delivery[];
  totalContracted: number;
}

export function Metrics({ deliveries, totalContracted }: MetricsProps) {
  const completed = deliveries.filter(d => d.status === 'aprovado' || d.status === 'finalizado').length;
  const percentage = totalContracted > 0 ? Math.round((completed / totalContracted) * 100) : 0;

  const data = [
    { name: 'Concluído', value: completed },
    { name: 'Restante', value: Math.max(0, totalContracted - completed) },
  ];

  const COLORS = ['#FF6321', '#E5E5E5'];
  const DARK_COLORS = ['#FF6321', '#333333'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Progress Card */}
      <div className="bg-app-card p-6 rounded-3xl border border-app shadow-sm flex items-center gap-6 transition-colors">
        <div className="w-24 h-24 relative flex items-center justify-center">
          <PieChart width={96} height={96}>
            <Pie
              data={data}
              innerRadius={30}
              outerRadius={45}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={document.documentElement.classList.contains('dark') ? DARK_COLORS[index % DARK_COLORS.length] : COLORS[index % COLORS.length]} 
                />
              ))}
            </Pie>
          </PieChart>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-sm font-bold text-app-foreground">{percentage}%</span>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Progresso Mensal</p>
          <h3 className="text-2xl font-bold text-app-foreground">{completed} / {totalContracted}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Entregas realizadas</p>
        </div>
      </div>

      {/* Stats Card 1 */}
      <div className="bg-app-card p-6 rounded-3xl border border-app shadow-sm transition-colors">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Status das Demandas</p>
        <div className="space-y-2 mt-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">Aguardando Aprovação</span>
            <span className="font-semibold text-app-foreground">
              {deliveries.filter(d => d.status === 'entregue').length}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">Atrasadas / Não Feitas</span>
            <span className="font-semibold text-red-500">
              {deliveries.filter(d => d.status === 'ñ fez - atrasado').length}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Card 2 */}
      <div className="bg-app-card p-6 rounded-3xl border border-app shadow-sm transition-colors">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Resumo do Contrato</p>
        <div className="mt-3">
          <div className="text-2xl font-bold text-app-foreground">Ativo</div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sua marca está operando em capacidade total.</p>
        </div>
      </div>
    </div>
  );
}
