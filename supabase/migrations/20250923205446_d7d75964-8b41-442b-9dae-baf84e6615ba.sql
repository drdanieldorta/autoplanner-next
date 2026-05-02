-- Update RLS policies for propostas to allow all authenticated users to view all proposals
DROP POLICY IF EXISTS "Users can view their own propostas" ON public.propostas;
CREATE POLICY "Authenticated users can view all propostas" 
ON public.propostas 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Update RLS policies for protocols to allow all authenticated users to view all protocols
DROP POLICY IF EXISTS "Users can view own protocols" ON public.protocols;
CREATE POLICY "Authenticated users can view all protocols" 
ON public.protocols 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Update RLS policies for protocol_items to allow all authenticated users to view all protocol items
DROP POLICY IF EXISTS "Users can view items of own protocols" ON public.protocol_items;
CREATE POLICY "Authenticated users can view all protocol items" 
ON public.protocol_items 
FOR SELECT 
USING (auth.role() = 'authenticated');