-- Remove existing overly permissive policies
DROP POLICY IF EXISTS "Service role has full access" ON public.protocols;
DROP POLICY IF EXISTS "Service role has full access" ON public.protocol_items;

-- Create secure RLS policies for protocols table
CREATE POLICY "Authenticated users can view protocols"
  ON public.protocols
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create protocols"
  ON public.protocols
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update protocols"
  ON public.protocols
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete protocols"
  ON public.protocols
  FOR DELETE
  TO authenticated
  USING (true);

-- Create secure RLS policies for protocol_items table
CREATE POLICY "Authenticated users can view protocol items"
  ON public.protocol_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create protocol items"
  ON public.protocol_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update protocol items"
  ON public.protocol_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete protocol items"
  ON public.protocol_items
  FOR DELETE
  TO authenticated
  USING (true);