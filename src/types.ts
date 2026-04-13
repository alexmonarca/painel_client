export type DeliveryStatus = 'entregue' | 'aprovado' | 'finalizado' | 'recusado' | 'ñ fez - atrasado';
export type UserRole = 'user' | 'admin';

export interface Client {
  id: string;
  company_name: string;
  role: UserRole;
  budget_details: {
    plan?: string;
    value?: string;
    description?: string;
  };
  total_deliveries_contracted: number;
  monthly_value: number;
  payment_link?: string;
  due_day: number;
}

export interface Delivery {
  id: string;
  client_id: string;
  delivery_date: string;
  description: string;
  status: DeliveryStatus;
  delivery_link?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: 'pago' | 'pendente' | 'atrasado';
  created_at: string;
}
