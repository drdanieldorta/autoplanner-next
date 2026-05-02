-- 1) Add ownership column to protocols
ALTER TABLE public.protocols
ADD COLUMN IF NOT EXISTS user_id uuid;

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_protocols_user_id ON public.protocols(user_id);

-- 2) Set user_id automatically on insert
CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS set_protocols_user_id ON public.protocols;
CREATE TRIGGER set_protocols_user_id
BEFORE INSERT ON public.protocols
FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

-- 3) Strengthen relational integrity (items -> protocols)
DO $$ BEGIN
  ALTER TABLE public.protocol_items
  ADD CONSTRAINT protocol_items_protocol_id_fkey
  FOREIGN KEY (protocol_id) REFERENCES public.protocols(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4) Replace permissive policies with ownership-based policies
-- Drop previous broad policies
DROP POLICY IF EXISTS "Authenticated users can view protocols" ON public.protocols;
DROP POLICY IF EXISTS "Authenticated users can create protocols" ON public.protocols;
DROP POLICY IF EXISTS "Authenticated users can update protocols" ON public.protocols;
DROP POLICY IF EXISTS "Authenticated users can delete protocols" ON public.protocols;

DROP POLICY IF EXISTS "Authenticated users can view protocol items" ON public.protocol_items;
DROP POLICY IF EXISTS "Authenticated users can create protocol items" ON public.protocol_items;
DROP POLICY IF EXISTS "Authenticated users can update protocol items" ON public.protocol_items;
DROP POLICY IF EXISTS "Authenticated users can delete protocol items" ON public.protocol_items;

-- Ownership policies for protocols
CREATE POLICY "Users can view own protocols"
ON public.protocols
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own protocols"
ON public.protocols
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own protocols"
ON public.protocols
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own protocols"
ON public.protocols
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Item policies derived from parent protocol ownership
CREATE POLICY "Users can view items of own protocols"
ON public.protocol_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.protocols p
    WHERE p.id = protocol_items.protocol_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert items into own protocols"
ON public.protocol_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.protocols p
    WHERE p.id = protocol_items.protocol_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update items of own protocols"
ON public.protocol_items
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.protocols p
    WHERE p.id = protocol_items.protocol_id
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.protocols p
    WHERE p.id = protocol_items.protocol_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete items of own protocols"
ON public.protocol_items
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.protocols p
    WHERE p.id = protocol_items.protocol_id
      AND p.user_id = auth.uid()
  )
);
