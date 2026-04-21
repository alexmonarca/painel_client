-- 1. Adiciona colunas de produção na tabela de entregas
ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS production_status TEXT DEFAULT 'ideacao',
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.clients(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS briefing TEXT,
ADD COLUMN IF NOT EXISTS deadline DATE;

-- 2. Garante que os índices existam para performance no fluxo
CREATE INDEX IF NOT EXISTS idx_deliveries_production_status ON public.deliveries(production_status);
CREATE INDEX IF NOT EXISTS idx_deliveries_assigned_to ON public.deliveries(assigned_to);
