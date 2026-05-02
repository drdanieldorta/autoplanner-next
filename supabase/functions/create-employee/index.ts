// Supabase Edge Function: create-employee
// - Invites a new user by email (service role)
// - Updates profile with company_id
// - Assigns default role (company_user) and optional company_admin

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";

    const body = await req.json().catch(() => ({}));
    const { company_id, name, email, cpf, role, isAdmin } = body as {
      company_id?: string;
      name?: string;
      email?: string;
      cpf?: string;
      role?: string;
      isAdmin?: boolean;
    };

    if (!company_id || !email || !name) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: company_id, name, email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const supabaseAuth = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get caller user
    const {
      data: { user },
      error: getUserError,
    } = await supabaseAuth.auth.getUser();
    if (getUserError || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Authorization: must be company admin of the target company (or super admin)
    const { data: isAdminResp, error: adminErr } = await supabaseAuth.rpc("is_company_admin", {
      _user_id: user.id,
      _company_id: company_id,
    });

    if (adminErr || !isAdminResp) {
      return new Response(JSON.stringify({ error: "Sem permissão para adicionar funcionário nesta empresa" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Invite user by email with company_id in metadata (helps DB trigger populate profiles)
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { name, display_name: name, company_id },
    });

    let targetUserId: string | null = null;

    if (inviteError) {
      const msg = inviteError.message || '';

      // Try to create the user directly with metadata (avoids invite DB constraint issues)
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: { name, display_name: name, company_id },
      });

      if (createErr && !(created as any)?.user?.id) {
        // If user already exists or other error, try to find by email via listUsers
        let foundUserId: string | null = null;
        try {
          // Iterate pages to find by email (small bounds to avoid long loops)
          const perPage = 200;
          for (let page = 1; page <= 5; page++) {
            const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
            if (listErr) break;
            const match = listData?.users?.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase());
            if (match) {
              foundUserId = match.id;
              break;
            }
            if (!listData || (listData.users?.length ?? 0) < perPage) {
              // No more pages
              break;
            }
          }
        } catch (_) {
          // ignore
        }

        if (!foundUserId) {
          return new Response(
            JSON.stringify({ error: msg || createErr.message || 'Falha ao criar/obter usuário' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
        targetUserId = foundUserId;
      } else {
        targetUserId = created!.user!.id;
      }
    } else {
      if (!inviteData?.user) {
        return new Response(JSON.stringify({ error: 'Falha ao convidar usuário' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      targetUserId = inviteData.user.id;
    }

    // Upsert profile to ensure it exists with correct company_id
    await supabaseAdmin
      .from('profiles')
      .upsert({ 
        user_id: targetUserId,
        company_id, 
        name, 
        display_name: name, 
        email,
        cpf: cpf || null,
        role,
        status: 'approved' // New employees are automatically approved
      }, {
        onConflict: 'user_id'
      });

    // Ensure roles exist
    const ensureRole = async (role: string) => {
      const { data: existing } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', targetUserId!)
        .eq('role', role as any)
        .eq('company_id', company_id)
        .maybeSingle();
      if (!existing) {
        await supabaseAdmin.from('user_roles').insert({ user_id: targetUserId!, role, company_id });
      }
    };

    await ensureRole('company_user');
    if (isAdmin) {
      await ensureRole('company_admin');
    }

    return new Response(
      JSON.stringify({ success: true, user_id: targetUserId }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Erro interno";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
