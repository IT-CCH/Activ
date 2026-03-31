-- ============================================================
-- Expense Budgets Table
-- Run this in Supabase SQL Editor to enable the budget feature
-- ============================================================

CREATE TABLE IF NOT EXISTS public.expense_budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  care_home_id UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,
  monthly_budget DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(care_home_id)
);

-- Enable RLS
ALTER TABLE public.expense_budgets ENABLE ROW LEVEL SECURITY;

-- Everyone can view budgets
CREATE POLICY "Anyone can view expense budgets"
  ON public.expense_budgets
  FOR SELECT
  USING (true);

-- Admins can insert/update/delete budgets
CREATE POLICY "Admins can manage expense budgets"
  ON public.expense_budgets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'org_admin', 'admin', 'care_home_manager')
    )
  );

-- Grant access to authenticated users
GRANT SELECT ON public.expense_budgets TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.expense_budgets TO authenticated;
