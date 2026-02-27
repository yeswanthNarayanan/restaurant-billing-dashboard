-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bills table
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_date DATE DEFAULT CURRENT_DATE,
  bill_time TIME DEFAULT CURRENT_TIME,
  grand_total DECIMAL(10, 2) NOT NULL,
  items_count INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'completed', -- 'draft', 'completed', 'synced'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_synced BOOLEAN DEFAULT false,
  sync_at TIMESTAMP WITH TIME ZONE
);

-- Create bill_items table (line items for each bill)
CREATE TABLE IF NOT EXISTS bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  line_total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales_data table for daily/hourly tracking
CREATE TABLE IF NOT EXISTS sales_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date DATE NOT NULL,
  sale_hour INTEGER NOT NULL, -- 0-23
  menu_item_id UUID REFERENCES menu_items(id),
  quantity_sold INTEGER DEFAULT 0,
  revenue DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sale_date, sale_hour, menu_item_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_bills_synced ON bills(is_synced);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales_data(sale_date);
CREATE INDEX IF NOT EXISTS idx_menu_available ON menu_items(is_available);

-- Insert sample menu items
INSERT INTO menu_items (name, category, price, is_available) VALUES
  ('Biryani', 'Rice', 250.00, true),
  ('Butter Chicken', 'Curries', 320.00, true),
  ('Paneer Tikka', 'Appetizers', 280.00, true),
  ('Naan', 'Breads', 50.00, true),
  ('Samosa', 'Appetizers', 40.00, true),
  ('Dosa', 'South Indian', 120.00, true),
  ('Idli', 'South Indian', 80.00, true),
  ('Lassi', 'Beverages', 60.00, true),
  ('Chai', 'Beverages', 30.00, true),
  ('Gulab Jamun', 'Desserts', 100.00, true)
ON CONFLICT DO NOTHING;
