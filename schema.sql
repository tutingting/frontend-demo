-- ============================================
-- 智能批量下单系统 - Neon PostgreSQL 建表脚本
-- ============================================

CREATE TABLE IF NOT EXISTS parse_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  file_type TEXT NOT NULL,
  rule_data JSONB NOT NULL,
  ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_sessions (
  id TEXT PRIMARY KEY,
  rule_id TEXT REFERENCES parse_rules(id) ON DELETE SET NULL,
  rule_name TEXT DEFAULT '',
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'parsing',
  total_rows INTEGER DEFAULT 0,
  success_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS waybill_records (
  id TEXT PRIMARY KEY,
  session_id TEXT DEFAULT '',
  external_code TEXT,
  store_name TEXT,
  receiver_name TEXT,
  receiver_phone TEXT,
  receiver_address TEXT,
  sku_code TEXT NOT NULL,
  sku_name TEXT NOT NULL,
  sku_quantity NUMERIC NOT NULL,
  sku_spec TEXT,
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waybill_external_code ON waybill_records(external_code);
CREATE INDEX IF NOT EXISTS idx_waybill_receiver_name ON waybill_records(receiver_name);
CREATE INDEX IF NOT EXISTS idx_waybill_store_name ON waybill_records(store_name);
CREATE INDEX IF NOT EXISTS idx_waybill_created_at ON waybill_records(created_at);
