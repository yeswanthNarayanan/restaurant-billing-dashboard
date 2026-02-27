-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bills table
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  items_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced BOOLEAN DEFAULT false,
  synced_at TIMESTAMP WITH TIME ZONE
);

-- Create bill_items table (line items for each bill)
CREATE TABLE IF NOT EXISTS bill_items (
  id TEXT PRIMARY KEY,
  bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  menu_item_id TEXT NOT NULL REFERENCES menu_items(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales_data table for daily/hourly tracking
CREATE TABLE IF NOT EXISTS sales_data (
  id TEXT PRIMARY KEY,
  bill_id TEXT NOT NULL REFERENCES bills(id),
  total DECIMAL(10, 2) NOT NULL,
  hour INTEGER NOT NULL, -- 0-23
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at);
CREATE INDEX IF NOT EXISTS idx_bills_synced ON bills(synced);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_menu ON bill_items(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales_data(date);
CREATE INDEX IF NOT EXISTS idx_sales_hour ON sales_data(hour);
CREATE INDEX IF NOT EXISTS idx_menu_enabled ON menu_items(enabled);
CREATE INDEX IF NOT EXISTS idx_menu_category ON menu_items(category);

-- Insert sample menu items (use MD5 hashes for consistent IDs)
INSERT INTO menu_items (id, name, category, price, enabled) VALUES
  ('item_biryani', 'Biryani', 'Rice', 250.00, true),
  ('item_butter_chicken', 'Butter Chicken', 'Curries', 320.00, true),
  ('item_paneer_tikka', 'Paneer Tikka', 'Appetizers', 280.00, true),
  ('item_naan', 'Naan', 'Breads', 50.00, true),
  ('item_samosa', 'Samosa', 'Appetizers', 40.00, true),
  ('item_dosa', 'Dosa', 'South Indian', 120.00, true),
  ('item_idli', 'Idli', 'South Indian', 80.00, true),
  ('item_lassi', 'Lassi', 'Beverages', 60.00, true),
  ('item_chai', 'Chai', 'Beverages', 30.00, true),
  ('item_gulab_jamun', 'Gulab Jamun', 'Desserts', 100.00, true)
ON CONFLICT (id) DO NOTHING;
