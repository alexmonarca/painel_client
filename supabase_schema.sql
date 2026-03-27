-- 1. Garante o schema public
SET search_path TO public;

-- 2. Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY,
  company_name TEXT NOT NULL,
  budget_details JSONB DEFAULT '{}'::jsonb,
  total_deliveries_contracted INTEGER DEFAULT 0,
  monthly_value DECIMAL(10,2) DEFAULT 0,
  payment_link TEXT,
  due_day INTEGER DEFAULT 10,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Tabela de Entregas (Calendário)
CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'entregue',
  delivery_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4. Tabela de Histórico de Chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' ou 'model'
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5. Desativa RLS para teste (Opcional - Recomendado configurar políticas depois)
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;

-- 6. Exemplo de inserção para o seu usuário (Admin)
-- Substitua o ID abaixo pelo seu UID do Supabase se necessário
-- INSERT INTO public.clients (id, company_name, total_deliveries_contracted, role) 
-- VALUES ('SEU_UID_AQUI', 'Agência Monarca Admin', 30, 'admin')
-- ON CONFLICT (id) DO NOTHING;
