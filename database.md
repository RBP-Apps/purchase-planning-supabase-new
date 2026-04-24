<!-- Indent -->

CREATE TABLE indent (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  planning_number TEXT,
  serial_no INTEGER,
  date DATE,
  requester_name TEXT,
  project_name TEXT,
  firm_name TEXT,
  vendor_name TEXT,
  item_type TEXT,
  packing_detail TEXT,
  item_name TEXT,
  uom TEXT,
  qty NUMERIC,
  qty_per_set NUMERIC,
  total_qty NUMERIC,
  remarks TEXT,
  state TEXT,
  department TEXT,
  planned_1 DATE,
  actual DATE,
  delay_1 INTEGER,
  status TEXT,
  planned_2 DATE,
  actual_2 DATE,
  time_delay_2 INTEGER,
  po_copy TEXT,
  po_no TEXT,
  db TEXT
);



CREATE OR REPLACE FUNCTION indent_auto_logic()
RETURNS TRIGGER AS $$
BEGIN

  -- timestamp auto
  IF NEW.timestamp IS NULL THEN
     NEW.timestamp = NOW();
  END IF;

  -- planned 1
  IF NEW.planned_1 IS NULL THEN
     NEW.planned_1 = (NEW.timestamp + INTERVAL '1 day')::DATE;
  END IF;

  -- delay 1
  IF NEW.actual IS NOT NULL THEN
     NEW.delay_1 = NEW.actual - NEW.planned_1;
  END IF;

  -- planned 2
  IF NEW.actual IS NOT NULL AND NEW.planned_2 IS NULL THEN
     NEW.planned_2 = (NEW.actual + INTERVAL '1 day')::DATE;
  END IF;

  -- delay 2
  IF NEW.actual_2 IS NOT NULL THEN
     NEW.time_delay_2 = NEW.actual_2 - NEW.planned_2;
  END IF;

  RETURN NEW;

END;
$$ LANGUAGE plpgsql;



DROP TRIGGER IF EXISTS indent_auto_trigger ON indent;

CREATE TRIGGER indent_auto_trigger
BEFORE INSERT OR UPDATE
ON indent
FOR EACH ROW
EXECUTE FUNCTION indent_auto_logic();



% po 
CREATE TABLE po (
  id BIGSERIAL PRIMARY KEY,

  timestamp TIMESTAMP DEFAULT NOW(),

  planning_no TEXT,
  serial_no INTEGER,

  po_no TEXT,
  po_date DATE,
  quotation_no TEXT,

  vendor_name TEXT,
  item_name TEXT,

  qty NUMERIC,
  rate NUMERIC,
  gst_percent NUMERIC,
  discount NUMERIC,

  grand_total NUMERIC,

  po_copy TEXT,

  project TEXT,
  firm_name TEXT,

  status TEXT,
  remarks TEXT,

  po_signature_image TEXT,

  receiving_qty NUMERIC,
  balance NUMERIC,

  receiving_status TEXT,

  planned DATE,
  actual DATE,
  delay INTEGER,

  planned_payment DATE,
  actual_payment DATE,
  payment_delay INTEGER,

  bill_type TEXT,

  payment_mode TEXT,

  amount NUMERIC,
  reason TEXT,
  ref_no TEXT,

  payment_status TEXT,

  pending_amount NUMERIC,
  deduction NUMERIC,

  total_payment NUMERIC
);

CREATE OR REPLACE FUNCTION po_auto_logic()
RETURNS TRIGGER AS $$
BEGIN

  IF NEW.timestamp IS NULL THEN
    NEW.timestamp = NOW();
  END IF;

  -- ✅ Planned delivery same as sheet
  IF NEW.planned IS NULL AND NEW.po_date IS NOT NULL THEN
    NEW.planned = NEW.po_date + INTERVAL '1 day';
  END IF;

  -- grand total
  IF NEW.qty IS NOT NULL AND NEW.rate IS NOT NULL THEN
    NEW.grand_total = NEW.qty * NEW.rate;
  END IF;

  IF NEW.gst_percent IS NOT NULL THEN
    NEW.grand_total = NEW.grand_total + (NEW.grand_total * NEW.gst_percent / 100);
  END IF;

  IF NEW.discount IS NOT NULL THEN
    NEW.grand_total = NEW.grand_total - NEW.discount;
  END IF;

  -- balance qty
  IF NEW.qty IS NOT NULL AND NEW.receiving_qty IS NOT NULL THEN
    NEW.balance = NEW.qty - NEW.receiving_qty;
  END IF;

  -- delay
  IF NEW.actual IS NOT NULL AND NEW.planned IS NOT NULL THEN
    NEW.delay = NEW.actual - NEW.planned;
  END IF;

  RETURN NEW;

END;
$$ LANGUAGE plpgsql;



CREATE TRIGGER po_auto_trigger
BEFORE INSERT OR UPDATE
ON po
FOR EACH ROW
EXECUTE FUNCTION po_auto_logic();



create table public.vendor_details_master (
  id bigserial not null,
  po_item_type text null,
  vendor_name text null,
  address text null,
  gstin text null,
  contact_person text null,
  email_address text null,
  mobile text null,
  associated_modules text null,
  created_at timestamp without time zone null default now(),
  constraint vendor_details_master_pkey primary key (id)
) TABLESPACE pg_default;




create table public.project_master (
  id bigserial not null,
  project_name text null,
  department_name text null,
  letter_to text null,
  mail_address text null,
  behalf_of text null,
  seal_sign text null,
  created_at timestamp without time zone null default now(),
  state text null,
  constraint project_master_pkey primary key (id)
) TABLESPACE pg_default;




create table public.product_master (
  id bigserial not null,
  item_type text null,
  product_name text null,
  uom text null,
  pump_type text null,
  required_qty numeric null,
  created_at timestamp without time zone null default now(),
  constraint product_master_pkey primary key (id)
) TABLESPACE pg_default;





CREATE TABLE vendors (
  id BIGSERIAL PRIMARY KEY,
  serial_number INTEGER,
  vendor_name TEXT,
  total_qty NUMERIC,
  total_po_qty NUMERIC,
  total_received_qty NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE payment_history (

  id BIGSERIAL PRIMARY KEY,

  timestamp TIMESTAMP DEFAULT NOW(),

  planning_no TEXT,
  serial_no INTEGER,

  payment_mode TEXT,

  amount NUMERIC,

  reason TEXT,

  ref_no TEXT,

  deduction NUMERIC,

  vendor_name TEXT,

  bill_no TEXT,

  total_payment NUMERIC

);


create table public.firm_master (
  id bigserial not null,
  firm_name text null,
  billing_address_phone text null,
  gstin text null,
  pan_no text null,
  destination_address text null,
  created_at timestamp without time zone null default now(),
  constraint firm_master_pkey primary key (id)
) TABLESPACE pg_default;


create table public.po_masters (
  id serial not null,
  item_type character varying(100) null,
  terms_and_conditions text null,
  constraint po_masters_pkey primary key (id)
) TABLESPACE pg_default;