-- Create ENUMs if they don't exist
DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('income', 'expense');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_category AS ENUM ('monthly_fee', 'game_fee', 'field_rental', 'equipment', 'prize', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('cash', 'pix', 'credit_card', 'debit_card', 'transfer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Financial Transactions Table
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type transaction_type NOT NULL,
  category transaction_category NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  status transaction_status NOT NULL DEFAULT 'completed',
  payment_method payment_method DEFAULT 'pix',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_member_id ON financial_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category ON financial_transactions(category);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_financial_transactions_updated_at ON financial_transactions;
CREATE TRIGGER update_financial_transactions_updated_at BEFORE UPDATE ON financial_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only Admins can view/manage financials
CREATE POLICY "Admins can view financial transactions" ON financial_transactions
  FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert financial transactions" ON financial_transactions
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update financial transactions" ON financial_transactions
  FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete financial transactions" ON financial_transactions
  FOR DELETE
  USING (is_admin());

-- Comments
COMMENT ON TABLE financial_transactions IS 'Registros financeiros de receitas e despesas';
