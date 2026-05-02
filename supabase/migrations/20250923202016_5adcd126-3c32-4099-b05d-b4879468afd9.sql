-- First, let's approve the two users mentioned
UPDATE public.profiles 
SET status = 'approved', 
    approved_at = now(),
    approved_by = (SELECT user_id FROM public.profiles WHERE email = 'lucasluan.contato@gmail.com' LIMIT 1)
WHERE email IN ('lucasluan.contato@gmail.com', 'dr.danieldsantiago@gmail.com');

-- Make sure both users have admin role
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::user_role 
FROM public.profiles 
WHERE email IN ('lucasluan.contato@gmail.com', 'dr.danieldsantiago@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;