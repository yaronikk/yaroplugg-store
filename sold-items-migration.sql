-- YAROPLUGG STORE: mark products as sold and show them in the public SOLD tab.
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS is_sold boolean NOT NULL DEFAULT false;

-- Existing public policy continues to expose active products. This additional
-- permissive policy exposes only products explicitly marked sold to the public SOLD tab.
DROP POLICY IF EXISTS "products_public_select_sold" ON public.products;
CREATE POLICY "products_public_select_sold"
ON public.products
FOR SELECT
TO anon, authenticated
USING (is_sold = true);
