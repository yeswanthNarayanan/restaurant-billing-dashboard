import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  enabled: boolean;
  created_at: string;
};

export type Bill = {
  id: string;
  total: number;
  items_count: number;
  created_at: string;
  synced: boolean;
  synced_at?: string;
};

export type BillItem = {
  id: string;
  bill_id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
};

export type SalesData = {
  id: string;
  bill_id: string;
  total: number;
  hour: number;
  date: string;
  created_at: string;
};
