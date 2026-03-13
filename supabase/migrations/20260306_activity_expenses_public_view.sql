-- ============================================================
-- Migration: Public view + receipt_url for activity_expenses
-- Purpose: Allow the Supabase JS client to CRUD activity_expenses
--          without custom schema config, plus add receipt_url column.
-- Run this in Supabase SQL Editor.
-- ============================================================

BEGIN;

-- 1) Add receipt_url column (nullable, for optional receipt image/PDF)
ALTER TABLE activities.activity_expenses
  ADD COLUMN IF NOT EXISTS receipt_url text;

-- 2) Add vendor column if missing
ALTER TABLE activities.activity_expenses
  ADD COLUMN IF NOT EXISTS vendor character varying;

-- 3) Create public view
CREATE OR REPLACE VIEW public.activity_expenses AS
SELECT * FROM activities.activity_expenses;

-- 4) INSTEAD OF INSERT
CREATE OR REPLACE FUNCTION public.activity_expenses_instead_of_insert()
RETURNS TRIGGER AS $$
DECLARE
  inserted_row activities.activity_expenses%ROWTYPE;
BEGIN
  INSERT INTO activities.activity_expenses (
    care_home_id,
    activity_id,
    session_id,
    description,
    expense_category,
    amount,
    currency,
    expense_date,
    payment_method,
    approval_status,
    submitted_by,
    notes,
    receipt_stored,
    receipt_url,
    vendor
  ) VALUES (
    NEW.care_home_id,
    NEW.activity_id,
    NEW.session_id,
    NEW.description,
    NEW.expense_category,
    NEW.amount,
    COALESCE(NEW.currency, 'GBP'),
    NEW.expense_date,
    NEW.payment_method,
    COALESCE(NEW.approval_status, 'approved'),
    NEW.submitted_by,
    NEW.notes,
    COALESCE(NEW.receipt_stored, false),
    NEW.receipt_url,
    NEW.vendor
  )
  RETURNING * INTO inserted_row;

  NEW.id         := inserted_row.id;
  NEW.created_at := inserted_row.created_at;
  NEW.updated_at := inserted_row.updated_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5) INSTEAD OF UPDATE
CREATE OR REPLACE FUNCTION public.activity_expenses_instead_of_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE activities.activity_expenses SET
    care_home_id     = NEW.care_home_id,
    activity_id      = NEW.activity_id,
    session_id       = NEW.session_id,
    description      = NEW.description,
    expense_category = NEW.expense_category,
    amount           = NEW.amount,
    currency         = NEW.currency,
    expense_date     = NEW.expense_date,
    payment_method   = NEW.payment_method,
    approval_status  = NEW.approval_status,
    submitted_by     = NEW.submitted_by,
    approved_by      = NEW.approved_by,
    approval_date    = NEW.approval_date,
    notes            = NEW.notes,
    receipt_stored   = NEW.receipt_stored,
    receipt_url      = NEW.receipt_url,
    vendor           = NEW.vendor,
    updated_at       = now()
  WHERE id = OLD.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6) INSTEAD OF DELETE
CREATE OR REPLACE FUNCTION public.activity_expenses_instead_of_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM activities.activity_expenses WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7) Attach triggers
DROP TRIGGER IF EXISTS activity_expenses_insert_trigger ON public.activity_expenses;
DROP TRIGGER IF EXISTS activity_expenses_update_trigger ON public.activity_expenses;
DROP TRIGGER IF EXISTS activity_expenses_delete_trigger ON public.activity_expenses;

CREATE TRIGGER activity_expenses_insert_trigger
  INSTEAD OF INSERT ON public.activity_expenses
  FOR EACH ROW EXECUTE FUNCTION public.activity_expenses_instead_of_insert();

CREATE TRIGGER activity_expenses_update_trigger
  INSTEAD OF UPDATE ON public.activity_expenses
  FOR EACH ROW EXECUTE FUNCTION public.activity_expenses_instead_of_update();

CREATE TRIGGER activity_expenses_delete_trigger
  INSTEAD OF DELETE ON public.activity_expenses
  FOR EACH ROW EXECUTE FUNCTION public.activity_expenses_instead_of_delete();

-- 8) Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_expenses TO authenticated;
GRANT SELECT ON public.activity_expenses TO anon;

-- 9) Create storage bucket for expense receipts (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-receipts', 'expense-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- 10) Storage policies for expense-receipts bucket
CREATE POLICY "Allow uploads to expense-receipts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'expense-receipts');

CREATE POLICY "Allow public read of expense-receipts" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'expense-receipts');

CREATE POLICY "Allow delete of expense-receipts" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'expense-receipts');

COMMIT;

-- ============================================================
-- After running:
-- 1) Refresh ActivityPlanner – Expenses page should work with DB
-- 2) Storage bucket 'expense-receipts' is ready for receipt uploads
-- ============================================================
