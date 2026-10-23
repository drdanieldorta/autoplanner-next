export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agenda_equipe: {
        Row: {
          company_id: string
          created_at: string | null
          data_call: string
          duracao_minutos: number | null
          fathom_recording_id: string | null
          host_email: string | null
          host_name: string | null
          id: string
          observacoes: string | null
          resumo_fathom: string | null
          tipo: string
          titulo: string | null
          updated_at: string | null
          zoom_meeting_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          data_call: string
          duracao_minutos?: number | null
          fathom_recording_id?: string | null
          host_email?: string | null
          host_name?: string | null
          id?: string
          observacoes?: string | null
          resumo_fathom?: string | null
          tipo?: string
          titulo?: string | null
          updated_at?: string | null
          zoom_meeting_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          data_call?: string
          duracao_minutos?: number | null
          fathom_recording_id?: string | null
          host_email?: string | null
          host_name?: string | null
          id?: string
          observacoes?: string | null
          resumo_fathom?: string | null
          tipo?: string
          titulo?: string | null
          updated_at?: string | null
          zoom_meeting_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorado_calls_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_equipe_companies: {
        Row: {
          agenda_id: string
          company_id: string
        }
        Insert: {
          agenda_id: string
          company_id: string
        }
        Update: {
          agenda_id?: string
          company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_equipe_companies_agenda_id_fkey"
            columns: ["agenda_id"]
            isOneToOne: false
            referencedRelation: "agenda_equipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_equipe_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      agentes_leads: {
        Row: {
          agent_name: string | null
          ativo: boolean
          authorized_channels: Json
          base_conhecimento: Json | null
          companyId: string | null
          conta_id: string
          created_at: string
          equipes_permitidas: Json
          followup_config: Json | null
          horario: Json | null
          id: string
          intervencao_humana: boolean
          intervencao_humana_regras: Json
          is_signed: boolean
          label: string | null
          prompt: string | null
          repositoriodoc: string | null
          social_proofs: Json
          tags_ignorar: string[]
          tempo_resposta: number | null
          teste_ia: boolean
          transfer_rules: Json
          updated_at: string
          webhook_nome: string | null
          webhook_url: string | null
        }
        Insert: {
          agent_name?: string | null
          ativo?: boolean
          authorized_channels?: Json
          base_conhecimento?: Json | null
          companyId?: string | null
          conta_id: string
          created_at?: string
          equipes_permitidas?: Json
          followup_config?: Json | null
          horario?: Json | null
          id?: string
          intervencao_humana?: boolean
          intervencao_humana_regras?: Json
          is_signed?: boolean
          label?: string | null
          prompt?: string | null
          repositoriodoc?: string | null
          social_proofs?: Json
          tags_ignorar?: string[]
          tempo_resposta?: number | null
          teste_ia?: boolean
          transfer_rules?: Json
          updated_at?: string
          webhook_nome?: string | null
          webhook_url?: string | null
        }
        Update: {
          agent_name?: string | null
          ativo?: boolean
          authorized_channels?: Json
          base_conhecimento?: Json | null
          companyId?: string | null
          conta_id?: string
          created_at?: string
          equipes_permitidas?: Json
          followup_config?: Json | null
          horario?: Json | null
          id?: string
          intervencao_humana?: boolean
          intervencao_humana_regras?: Json
          is_signed?: boolean
          label?: string | null
          prompt?: string | null
          repositoriodoc?: string | null
          social_proofs?: Json
          tags_ignorar?: string[]
          tempo_resposta?: number | null
          teste_ia?: boolean
          transfer_rules?: Json
          updated_at?: string
          webhook_nome?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agentes_leads_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["companyId"]
          },
          {
            foreignKeyName: "agentes_leads_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      agentes_pacientes: {
        Row: {
          agent_name: string | null
          ativo: boolean
          authorized_channels: Json
          base_conhecimento: Json | null
          companyId: string
          conta_id: string
          created_at: string
          equipes_permitidas: Json
          etapa_id: string | null
          etapa_nome: string | null
          horario: Json | null
          id: string
          is_signed: boolean
          painel_id: string | null
          painel_nome: string | null
          prompt: string | null
          repositoriodoc: string | null
          tags_ignorar: string[]
          telefones_avisos: Json
          telefones_relatorios: Json
          tempo_resposta: number | null
          teste_ia: boolean
          transfer_rules: Json
          updated_at: string
          webhook_nome: string | null
          webhook_url: string | null
        }
        Insert: {
          agent_name?: string | null
          ativo?: boolean
          authorized_channels?: Json
          base_conhecimento?: Json | null
          companyId: string
          conta_id: string
          created_at?: string
          equipes_permitidas?: Json
          etapa_id?: string | null
          etapa_nome?: string | null
          horario?: Json | null
          id?: string
          is_signed?: boolean
          painel_id?: string | null
          painel_nome?: string | null
          prompt?: string | null
          repositoriodoc?: string | null
          tags_ignorar?: string[]
          telefones_avisos?: Json
          telefones_relatorios?: Json
          tempo_resposta?: number | null
          teste_ia?: boolean
          transfer_rules?: Json
          updated_at?: string
          webhook_nome?: string | null
          webhook_url?: string | null
        }
        Update: {
          agent_name?: string | null
          ativo?: boolean
          authorized_channels?: Json
          base_conhecimento?: Json | null
          companyId?: string
          conta_id?: string
          created_at?: string
          equipes_permitidas?: Json
          etapa_id?: string | null
          etapa_nome?: string | null
          horario?: Json | null
          id?: string
          is_signed?: boolean
          painel_id?: string | null
          painel_nome?: string | null
          prompt?: string | null
          repositoriodoc?: string | null
          tags_ignorar?: string[]
          telefones_avisos?: Json
          telefones_relatorios?: Json
          tempo_resposta?: number | null
          teste_ia?: boolean
          transfer_rules?: Json
          updated_at?: string
          webhook_nome?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agentes_pacientes_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["companyId"]
          },
          {
            foreignKeyName: "agentes_pacientes_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_user_keys: {
        Row: {
          api_key_encrypted: string
          created_at: string
          key_hint: string | null
          updated_at: string
          user_ref: string
        }
        Insert: {
          api_key_encrypted: string
          created_at?: string
          key_hint?: string | null
          updated_at?: string
          user_ref: string
        }
        Update: {
          api_key_encrypted?: string
          created_at?: string
          key_hint?: string | null
          updated_at?: string
          user_ref?: string
        }
        Relationships: []
      }
      api_credentials: {
        Row: {
          authentique_token: string | null
          company_id: string
          created_at: string
          crm_admin_token: string | null
          crm_token: string | null
          feegow_token: string | null
          id: string
          patient_source: string
          updated_at: string
          user_id: string
          webhook_enabled: boolean | null
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          authentique_token?: string | null
          company_id: string
          created_at?: string
          crm_admin_token?: string | null
          crm_token?: string | null
          feegow_token?: string | null
          id?: string
          patient_source?: string
          updated_at?: string
          user_id: string
          webhook_enabled?: boolean | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          authentique_token?: string | null
          company_id?: string
          created_at?: string
          crm_admin_token?: string | null
          crm_token?: string | null
          feegow_token?: string | null
          id?: string
          patient_source?: string
          updated_at?: string
          user_id?: string
          webhook_enabled?: boolean | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_credentials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chamadas: {
        Row: {
          caller: string | null
          companyid: string | null
          contactid: string | null
          created_at: string
          direction: string | null
          duration: string | null
          id: number
          id_session: string | null
          id_user: string | null
          nome_usuario: string | null
          receiver: string | null
          record_status: string | null
          record_url: string | null
          recording_transcription: string | null
          sessionid: string | null
          status: string | null
          tz: string | null
          userid: string | null
          whatsapp_call_id: string | null
        }
        Insert: {
          caller?: string | null
          companyid?: string | null
          contactid?: string | null
          created_at?: string
          direction?: string | null
          duration?: string | null
          id?: number
          id_session?: string | null
          id_user?: string | null
          nome_usuario?: string | null
          receiver?: string | null
          record_status?: string | null
          record_url?: string | null
          recording_transcription?: string | null
          sessionid?: string | null
          status?: string | null
          tz?: string | null
          userid?: string | null
          whatsapp_call_id?: string | null
        }
        Update: {
          caller?: string | null
          companyid?: string | null
          contactid?: string | null
          created_at?: string
          direction?: string | null
          duration?: string | null
          id?: number
          id_session?: string | null
          id_user?: string | null
          nome_usuario?: string | null
          receiver?: string | null
          record_status?: string | null
          record_url?: string | null
          recording_transcription?: string | null
          sessionid?: string | null
          status?: string | null
          tz?: string | null
          userid?: string | null
          whatsapp_call_id?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          brand_primary_color: string | null
          brand_secondary_color: string | null
          ceo_cpf: string | null
          ceo_endereco: string | null
          ceo_name: string | null
          cnpj: string | null
          companyId: string | null
          created_at: string
          crm_config: Json | null
          crm_token: string | null
          data_inicio: string | null
          data_nascimento: string | null
          data_saida_crm: string | null
          data_saida_mentorado: string | null
          email: string | null
          endereco: string | null
          especialidade: string | null
          id: string
          infinitecrm: boolean
          infiniteforms: boolean | null
          infiniteplan: boolean | null
          infiniteprompt: boolean | null
          logo_url: string | null
          mentorado: boolean | null
          name: string
          nicho: string | null
          telefone: string | null
          updated_at: string
          wavoip_enabled: boolean | null
          wavoip_token: string | null
        }
        Insert: {
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          ceo_cpf?: string | null
          ceo_endereco?: string | null
          ceo_name?: string | null
          cnpj?: string | null
          companyId?: string | null
          created_at?: string
          crm_config?: Json | null
          crm_token?: string | null
          data_inicio?: string | null
          data_nascimento?: string | null
          data_saida_crm?: string | null
          data_saida_mentorado?: string | null
          email?: string | null
          endereco?: string | null
          especialidade?: string | null
          id?: string
          infinitecrm?: boolean
          infiniteforms?: boolean | null
          infiniteplan?: boolean | null
          infiniteprompt?: boolean | null
          logo_url?: string | null
          mentorado?: boolean | null
          name: string
          nicho?: string | null
          telefone?: string | null
          updated_at?: string
          wavoip_enabled?: boolean | null
          wavoip_token?: string | null
        }
        Update: {
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          ceo_cpf?: string | null
          ceo_endereco?: string | null
          ceo_name?: string | null
          cnpj?: string | null
          companyId?: string | null
          created_at?: string
          crm_config?: Json | null
          crm_token?: string | null
          data_inicio?: string | null
          data_nascimento?: string | null
          data_saida_crm?: string | null
          data_saida_mentorado?: string | null
          email?: string | null
          endereco?: string | null
          especialidade?: string | null
          id?: string
          infinitecrm?: boolean
          infiniteforms?: boolean | null
          infiniteplan?: boolean | null
          infiniteprompt?: boolean | null
          logo_url?: string | null
          mentorado?: boolean | null
          name?: string
          nicho?: string | null
          telefone?: string | null
          updated_at?: string
          wavoip_enabled?: boolean | null
          wavoip_token?: string | null
        }
        Relationships: []
      }
      company_crm_links: {
        Row: {
          company_id: string
          created_at: string
          crm_company_id: string
          crm_company_name: string
          id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          crm_company_id: string
          crm_company_name: string
          id?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          crm_company_id?: string
          crm_company_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_crm_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_tools: {
        Row: {
          company_id: string
          created_at: string
          enabled: boolean
          id: string
          tool_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          tool_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_tools_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_tools_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          company_id: string
          content: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_reports: {
        Row: {
          company_id: string
          generated_at: string
          id: string
          report_date: string
          report_text: string
          report_type: string
          stats: Json
        }
        Insert: {
          company_id: string
          generated_at?: string
          id?: string
          report_date: string
          report_text: string
          report_type?: string
          stats: Json
        }
        Update: {
          company_id?: string
          generated_at?: string
          id?: string
          report_date?: string
          report_text?: string
          report_type?: string
          stats?: Json
        }
        Relationships: []
      }
      crm_ads_campanhas_dia: {
        Row: {
          cambio: number | null
          campanha_id: string
          campanha_nome: string | null
          cliques: number
          company_id: string
          conta_id: string
          custo: number
          custo_original: number | null
          data: string
          impressoes: number
          moeda_original: string | null
          plataforma: string
          sincronizado_em: string
          status: string | null
        }
        Insert: {
          cambio?: number | null
          campanha_id: string
          campanha_nome?: string | null
          cliques?: number
          company_id: string
          conta_id: string
          custo?: number
          custo_original?: number | null
          data: string
          impressoes?: number
          moeda_original?: string | null
          plataforma: string
          sincronizado_em?: string
          status?: string | null
        }
        Update: {
          cambio?: number | null
          campanha_id?: string
          campanha_nome?: string | null
          cliques?: number
          company_id?: string
          conta_id?: string
          custo?: number
          custo_original?: number | null
          data?: string
          impressoes?: number
          moeda_original?: string | null
          plataforma?: string
          sincronizado_em?: string
          status?: string | null
        }
        Relationships: []
      }
      crm_ads_conexoes: {
        Row: {
          access_token: string
          company_id: string
          expira_em: string | null
          login_customer_id: string | null
          metodo: string
          plataforma: string
          refresh_token: string | null
          status: string
          ultima_sync_ok: string | null
          ultimo_erro: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          company_id: string
          expira_em?: string | null
          login_customer_id?: string | null
          metodo: string
          plataforma: string
          refresh_token?: string | null
          status?: string
          ultima_sync_ok?: string | null
          ultimo_erro?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          company_id?: string
          expira_em?: string | null
          login_customer_id?: string | null
          metodo?: string
          plataforma?: string
          refresh_token?: string | null
          status?: string
          ultima_sync_ok?: string | null
          ultimo_erro?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_ads_conexoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_contas"
            referencedColumns: ["company_id"]
          },
        ]
      }
      crm_ads_contas: {
        Row: {
          ativa: boolean
          company_id: string
          conta_id: string
          conta_nome: string | null
          moeda: string
          plataforma: string
          timezone: string
        }
        Insert: {
          ativa?: boolean
          company_id: string
          conta_id: string
          conta_nome?: string | null
          moeda: string
          plataforma: string
          timezone: string
        }
        Update: {
          ativa?: boolean
          company_id?: string
          conta_id?: string
          conta_nome?: string | null
          moeda?: string
          plataforma?: string
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_ads_contas_company_id_plataforma_fkey"
            columns: ["company_id", "plataforma"]
            isOneToOne: false
            referencedRelation: "crm_ads_conexoes"
            referencedColumns: ["company_id", "plataforma"]
          },
        ]
      }
      crm_ads_convites: {
        Row: {
          company_id: string
          criado_em: string
          expira_em: string
          nonce: string
          usado_em: string | null
        }
        Insert: {
          company_id: string
          criado_em?: string
          expira_em: string
          nonce: string
          usado_em?: string | null
        }
        Update: {
          company_id?: string
          criado_em?: string
          expira_em?: string
          nonce?: string
          usado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_ads_convites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_contas"
            referencedColumns: ["company_id"]
          },
        ]
      }
      crm_assinaturas_webhook: {
        Row: {
          company_id: string
          created_at: string | null
          dados: Json | null
          enabled: boolean | null
          events: Json | null
          id: string
          sincronizado_em: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          dados?: Json | null
          enabled?: boolean | null
          events?: Json | null
          id: string
          sincronizado_em?: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          dados?: Json | null
          enabled?: boolean | null
          events?: Json | null
          id?: string
          sincronizado_em?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      crm_campos_personalizados: {
        Row: {
          company_id: string
          created_at: string | null
          dados: Json | null
          entity_type: string | null
          id: string
          is_value_range: boolean | null
          key: string | null
          name: string | null
          options: Json | null
          parent_id: string | null
          position: number | null
          required: boolean | null
          sincronizado_em: string
          type: string | null
          updated_at: string | null
          visible: boolean | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          dados?: Json | null
          entity_type?: string | null
          id: string
          is_value_range?: boolean | null
          key?: string | null
          name?: string | null
          options?: Json | null
          parent_id?: string | null
          position?: number | null
          required?: boolean | null
          sincronizado_em?: string
          type?: string | null
          updated_at?: string | null
          visible?: boolean | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          dados?: Json | null
          entity_type?: string | null
          id?: string
          is_value_range?: boolean | null
          key?: string | null
          name?: string | null
          options?: Json | null
          parent_id?: string | null
          position?: number | null
          required?: boolean | null
          sincronizado_em?: string
          type?: string | null
          updated_at?: string | null
          visible?: boolean | null
        }
        Relationships: []
      }
      crm_canais: {
        Row: {
          active: boolean | null
          company_id: string
          created_at: string | null
          dados: Json | null
          id: string
          identity: Json | null
          number: string | null
          number_formatted: string | null
          sincronizado_em: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          company_id: string
          created_at?: string | null
          dados?: Json | null
          id: string
          identity?: Json | null
          number?: string | null
          number_formatted?: string | null
          sincronizado_em?: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          company_id?: string
          created_at?: string | null
          dados?: Json | null
          id?: string
          identity?: Json | null
          number?: string | null
          number_formatted?: string | null
          sincronizado_em?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_cards: {
        Row: {
          archived: boolean | null
          company_id: string
          contact_id: string | null
          created_at: string | null
          custom_fields: Json | null
          dados: Json | null
          etapa_desde: string | null
          id: string
          panel_id: string | null
          responsible_user_id: string | null
          sincronizado_em: string
          status: string | null
          step_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          archived?: boolean | null
          company_id: string
          contact_id?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          dados?: Json | null
          etapa_desde?: string | null
          id: string
          panel_id?: string | null
          responsible_user_id?: string | null
          sincronizado_em?: string
          status?: string | null
          step_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          archived?: boolean | null
          company_id?: string
          contact_id?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          dados?: Json | null
          etapa_desde?: string | null
          id?: string
          panel_id?: string | null
          responsible_user_id?: string | null
          sincronizado_em?: string
          status?: string | null
          step_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_cards_anotacoes: {
        Row: {
          card_id: string | null
          company_id: string
          created_at: string | null
          dados: Json | null
          files: Json | null
          id: string
          panel_id: string | null
          sincronizado_em: string | null
          text: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          card_id?: string | null
          company_id: string
          created_at?: string | null
          dados?: Json | null
          files?: Json | null
          id: string
          panel_id?: string | null
          sincronizado_em?: string | null
          text?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          card_id?: string | null
          company_id?: string
          created_at?: string | null
          dados?: Json | null
          files?: Json | null
          id?: string
          panel_id?: string | null
          sincronizado_em?: string | null
          text?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      crm_cards_etapas: {
        Row: {
          card_id: string
          company_id: string
          detectado_em: string
          entrou_em: string
          id: number
          panel_id: string | null
          saiu_em: string | null
          step_id: string
        }
        Insert: {
          card_id: string
          company_id: string
          detectado_em?: string
          entrou_em: string
          id?: number
          panel_id?: string | null
          saiu_em?: string | null
          step_id: string
        }
        Update: {
          card_id?: string
          company_id?: string
          detectado_em?: string
          entrou_em?: string
          id?: number
          panel_id?: string | null
          saiu_em?: string | null
          step_id?: string
        }
        Relationships: []
      }
      crm_carteiras: {
        Row: {
          company_id: string
          created_at: string | null
          dados: Json | null
          id: string
          name: string | null
          sincronizado_em: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          dados?: Json | null
          id: string
          name?: string | null
          sincronizado_em?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          dados?: Json | null
          id?: string
          name?: string | null
          sincronizado_em?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_chatbots: {
        Row: {
          archived: boolean | null
          automation_usage: Json | null
          channel_ids: Json | null
          company_id: string
          created_at: string | null
          dados: Json | null
          default_department_id: string | null
          id: string
          key: string | null
          name: string | null
          publish_status: string | null
          sincronizado_em: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          archived?: boolean | null
          automation_usage?: Json | null
          channel_ids?: Json | null
          company_id: string
          created_at?: string | null
          dados?: Json | null
          default_department_id?: string | null
          id: string
          key?: string | null
          name?: string | null
          publish_status?: string | null
          sincronizado_em?: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          archived?: boolean | null
          automation_usage?: Json | null
          channel_ids?: Json | null
          company_id?: string
          created_at?: string | null
          dados?: Json | null
          default_department_id?: string | null
          id?: string
          key?: string | null
          name?: string | null
          publish_status?: string | null
          sincronizado_em?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_config: {
        Row: {
          company_id: string
          config: Json | null
          updated_at: string
        }
        Insert: {
          company_id: string
          config?: Json | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          config?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "crm_contas"
            referencedColumns: ["company_id"]
          },
        ]
      }
      crm_contas: {
        Row: {
          company_id: string
          created_at: string | null
          dados: Json | null
          name: string | null
          partner_id: string | null
          partner_name: string | null
          setup_status: string | null
          sincronizado_em: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          dados?: Json | null
          name?: string | null
          partner_id?: string | null
          partner_name?: string | null
          setup_status?: string | null
          sincronizado_em?: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          dados?: Json | null
          name?: string | null
          partner_id?: string | null
          partner_name?: string | null
          setup_status?: string | null
          sincronizado_em?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_contas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "crm_contas"
            referencedColumns: ["company_id"]
          },
        ]
      }
      crm_contatos: {
        Row: {
          annotation: string | null
          company_id: string
          created_at: string | null
          custom_fields: Json | null
          dados: Json | null
          email: string | null
          id: string
          imported_at: string | null
          instagram: string | null
          messenger_id: string | null
          metadata: Json | null
          name: string | null
          name_instagram: string | null
          name_messenger: string | null
          name_whatsapp: string | null
          origin: string | null
          phone_number: string | null
          phone_number_formatted: string | null
          portfolio_ids: Json | null
          portfolio_names: Json | null
          sincronizado_em: string
          status: string | null
          tag_ids: Json | null
          tag_names: Json | null
          updated_at: string | null
          utm: Json | null
        }
        Insert: {
          annotation?: string | null
          company_id: string
          created_at?: string | null
          custom_fields?: Json | null
          dados?: Json | null
          email?: string | null
          id: string
          imported_at?: string | null
          instagram?: string | null
          messenger_id?: string | null
          metadata?: Json | null
          name?: string | null
          name_instagram?: string | null
          name_messenger?: string | null
          name_whatsapp?: string | null
          origin?: string | null
          phone_number?: string | null
          phone_number_formatted?: string | null
          portfolio_ids?: Json | null
          portfolio_names?: Json | null
          sincronizado_em?: string
          status?: string | null
          tag_ids?: Json | null
          tag_names?: Json | null
          updated_at?: string | null
          utm?: Json | null
        }
        Update: {
          annotation?: string | null
          company_id?: string
          created_at?: string | null
          custom_fields?: Json | null
          dados?: Json | null
          email?: string | null
          id?: string
          imported_at?: string | null
          instagram?: string | null
          messenger_id?: string | null
          metadata?: Json | null
          name?: string | null
          name_instagram?: string | null
          name_messenger?: string | null
          name_whatsapp?: string | null
          origin?: string | null
          phone_number?: string | null
          phone_number_formatted?: string | null
          portfolio_ids?: Json | null
          portfolio_names?: Json | null
          sincronizado_em?: string
          status?: string | null
          tag_ids?: Json | null
          tag_names?: Json | null
          updated_at?: string | null
          utm?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_contatos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_contas"
            referencedColumns: ["company_id"]
          },
        ]
      }
      crm_equipes: {
        Row: {
          agents: Json | null
          channels: Json | null
          company_id: string
          created_at: string | null
          dados: Json | null
          description: string | null
          distribuition_enabled: boolean | null
          id: string
          is_default: boolean | null
          is_private: boolean | null
          name: string | null
          restriction_type: string | null
          sincronizado_em: string
          updated_at: string | null
        }
        Insert: {
          agents?: Json | null
          channels?: Json | null
          company_id: string
          created_at?: string | null
          dados?: Json | null
          description?: string | null
          distribuition_enabled?: boolean | null
          id: string
          is_default?: boolean | null
          is_private?: boolean | null
          name?: string | null
          restriction_type?: string | null
          sincronizado_em?: string
          updated_at?: string | null
        }
        Update: {
          agents?: Json | null
          channels?: Json | null
          company_id?: string
          created_at?: string | null
          dados?: Json | null
          description?: string | null
          distribuition_enabled?: boolean | null
          id?: string
          is_default?: boolean | null
          is_private?: boolean | null
          name?: string | null
          restriction_type?: string | null
          sincronizado_em?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_etiquetas: {
        Row: {
          company_id: string
          created_at: string | null
          dados: Json | null
          id: string
          name: string | null
          sincronizado_em: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          dados?: Json | null
          id: string
          name?: string | null
          sincronizado_em?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          dados?: Json | null
          id?: string
          name?: string | null
          sincronizado_em?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_horarios_funcionamento: {
        Row: {
          company_id: string
          created_at: string | null
          dados: Json | null
          id: string
          sincronizado_em: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          dados?: Json | null
          id: string
          sincronizado_em?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          dados?: Json | null
          id?: string
          sincronizado_em?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_investimentos: {
        Row: {
          ano_mes: string
          categoria: string
          company_id: string
          fonte: string
          rotulo: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          ano_mes: string
          categoria?: string
          company_id: string
          fonte?: string
          rotulo?: string | null
          updated_at?: string
          valor?: number
        }
        Update: {
          ano_mes?: string
          categoria?: string
          company_id?: string
          fonte?: string
          rotulo?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_investimentos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_contas"
            referencedColumns: ["company_id"]
          },
        ]
      }
      crm_mensagens: {
        Row: {
          company_id: string
          created_at: string
          details: Json | null
          direction: string | null
          failed_reason: string | null
          file_id: string | null
          files_ids: Json | null
          id: string
          origin: string | null
          read_contact_at: string | null
          ref_id: string | null
          sender_id: string | null
          session_id: string
          sincronizado_em: string
          status: string | null
          template_id: string | null
          text: string | null
          timestamp: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id?: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id?: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      crm_mensagens_2026_07: {
        Row: {
          company_id: string
          created_at: string
          details: Json | null
          direction: string | null
          failed_reason: string | null
          file_id: string | null
          files_ids: Json | null
          id: string
          origin: string | null
          read_contact_at: string | null
          ref_id: string | null
          sender_id: string | null
          session_id: string
          sincronizado_em: string
          status: string | null
          template_id: string | null
          text: string | null
          timestamp: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id?: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id?: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      crm_mensagens_2026_08: {
        Row: {
          company_id: string
          created_at: string
          details: Json | null
          direction: string | null
          failed_reason: string | null
          file_id: string | null
          files_ids: Json | null
          id: string
          origin: string | null
          read_contact_at: string | null
          ref_id: string | null
          sender_id: string | null
          session_id: string
          sincronizado_em: string
          status: string | null
          template_id: string | null
          text: string | null
          timestamp: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id?: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id?: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      crm_mensagens_2026_09: {
        Row: {
          company_id: string
          created_at: string
          details: Json | null
          direction: string | null
          failed_reason: string | null
          file_id: string | null
          files_ids: Json | null
          id: string
          origin: string | null
          read_contact_at: string | null
          ref_id: string | null
          sender_id: string | null
          session_id: string
          sincronizado_em: string
          status: string | null
          template_id: string | null
          text: string | null
          timestamp: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id?: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id?: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      crm_mensagens_2026_10: {
        Row: {
          company_id: string
          created_at: string
          details: Json | null
          direction: string | null
          failed_reason: string | null
          file_id: string | null
          files_ids: Json | null
          id: string
          origin: string | null
          read_contact_at: string | null
          ref_id: string | null
          sender_id: string | null
          session_id: string
          sincronizado_em: string
          status: string | null
          template_id: string | null
          text: string | null
          timestamp: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id?: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id?: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      crm_mensagens_2026_11: {
        Row: {
          company_id: string
          created_at: string
          details: Json | null
          direction: string | null
          failed_reason: string | null
          file_id: string | null
          files_ids: Json | null
          id: string
          origin: string | null
          read_contact_at: string | null
          ref_id: string | null
          sender_id: string | null
          session_id: string
          sincronizado_em: string
          status: string | null
          template_id: string | null
          text: string | null
          timestamp: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id?: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id?: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      crm_mensagens_2026_12: {
        Row: {
          company_id: string
          created_at: string
          details: Json | null
          direction: string | null
          failed_reason: string | null
          file_id: string | null
          files_ids: Json | null
          id: string
          origin: string | null
          read_contact_at: string | null
          ref_id: string | null
          sender_id: string | null
          session_id: string
          sincronizado_em: string
          status: string | null
          template_id: string | null
          text: string | null
          timestamp: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id?: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id?: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      crm_mensagens_2027_01: {
        Row: {
          company_id: string
          created_at: string
          details: Json | null
          direction: string | null
          failed_reason: string | null
          file_id: string | null
          files_ids: Json | null
          id: string
          origin: string | null
          read_contact_at: string | null
          ref_id: string | null
          sender_id: string | null
          session_id: string
          sincronizado_em: string
          status: string | null
          template_id: string | null
          text: string | null
          timestamp: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id?: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id?: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      crm_mensagens_2027_02: {
        Row: {
          company_id: string
          created_at: string
          details: Json | null
          direction: string | null
          failed_reason: string | null
          file_id: string | null
          files_ids: Json | null
          id: string
          origin: string | null
          read_contact_at: string | null
          ref_id: string | null
          sender_id: string | null
          session_id: string
          sincronizado_em: string
          status: string | null
          template_id: string | null
          text: string | null
          timestamp: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id?: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id?: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      crm_mensagens_2027_03: {
        Row: {
          company_id: string
          created_at: string
          details: Json | null
          direction: string | null
          failed_reason: string | null
          file_id: string | null
          files_ids: Json | null
          id: string
          origin: string | null
          read_contact_at: string | null
          ref_id: string | null
          sender_id: string | null
          session_id: string
          sincronizado_em: string
          status: string | null
          template_id: string | null
          text: string | null
          timestamp: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id?: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id?: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      crm_mensagens_2027_04: {
        Row: {
          company_id: string
          created_at: string
          details: Json | null
          direction: string | null
          failed_reason: string | null
          file_id: string | null
          files_ids: Json | null
          id: string
          origin: string | null
          read_contact_at: string | null
          ref_id: string | null
          sender_id: string | null
          session_id: string
          sincronizado_em: string
          status: string | null
          template_id: string | null
          text: string | null
          timestamp: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id?: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id?: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      crm_mensagens_2027_05: {
        Row: {
          company_id: string
          created_at: string
          details: Json | null
          direction: string | null
          failed_reason: string | null
          file_id: string | null
          files_ids: Json | null
          id: string
          origin: string | null
          read_contact_at: string | null
          ref_id: string | null
          sender_id: string | null
          session_id: string
          sincronizado_em: string
          status: string | null
          template_id: string | null
          text: string | null
          timestamp: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id?: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id?: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      crm_mensagens_2027_06: {
        Row: {
          company_id: string
          created_at: string
          details: Json | null
          direction: string | null
          failed_reason: string | null
          file_id: string | null
          files_ids: Json | null
          id: string
          origin: string | null
          read_contact_at: string | null
          ref_id: string | null
          sender_id: string | null
          session_id: string
          sincronizado_em: string
          status: string | null
          template_id: string | null
          text: string | null
          timestamp: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id?: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id?: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      crm_mensagens_2027_07: {
        Row: {
          company_id: string
          created_at: string
          details: Json | null
          direction: string | null
          failed_reason: string | null
          file_id: string | null
          files_ids: Json | null
          id: string
          origin: string | null
          read_contact_at: string | null
          ref_id: string | null
          sender_id: string | null
          session_id: string
          sincronizado_em: string
          status: string | null
          template_id: string | null
          text: string | null
          timestamp: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id?: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id?: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      crm_mensagens_2027_08: {
        Row: {
          company_id: string
          created_at: string
          details: Json | null
          direction: string | null
          failed_reason: string | null
          file_id: string | null
          files_ids: Json | null
          id: string
          origin: string | null
          read_contact_at: string | null
          ref_id: string | null
          sender_id: string | null
          session_id: string
          sincronizado_em: string
          status: string | null
          template_id: string | null
          text: string | null
          timestamp: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id?: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id?: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      crm_mensagens_2027_09: {
        Row: {
          company_id: string
          created_at: string
          details: Json | null
          direction: string | null
          failed_reason: string | null
          file_id: string | null
          files_ids: Json | null
          id: string
          origin: string | null
          read_contact_at: string | null
          ref_id: string | null
          sender_id: string | null
          session_id: string
          sincronizado_em: string
          status: string | null
          template_id: string | null
          text: string | null
          timestamp: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          details?: Json | null
          direction?: string | null
          failed_reason?: string | null
          file_id?: string | null
          files_ids?: Json | null
          id?: string
          origin?: string | null
          read_contact_at?: string | null
          ref_id?: string | null
          sender_id?: string | null
          session_id?: string
          sincronizado_em?: string
          status?: string | null
          template_id?: string | null
          text?: string | null
          timestamp?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      crm_mensagens_agendadas: {
        Row: {
          company_id: string
          created_at: string | null
          dados: Json | null
          id: string
          sincronizado_em: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          dados?: Json | null
          id: string
          sincronizado_em?: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          dados?: Json | null
          id?: string
          sincronizado_em?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_modelos_mensagem: {
        Row: {
          company_id: string
          created_at: string | null
          dados: Json | null
          id: string
          name: string | null
          sincronizado_em: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          dados?: Json | null
          id: string
          name?: string | null
          sincronizado_em?: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          dados?: Json | null
          id?: string
          name?: string | null
          sincronizado_em?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_paineis: {
        Row: {
          archived: boolean | null
          auto_loss_days: number | null
          company_id: string
          created_at: string | null
          dados: Json | null
          id: string
          sincronizado_em: string
          steps: Json | null
          title: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          archived?: boolean | null
          auto_loss_days?: number | null
          company_id: string
          created_at?: string | null
          dados?: Json | null
          id: string
          sincronizado_em?: string
          steps?: Json | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          archived?: boolean | null
          auto_loss_days?: number | null
          company_id?: string
          created_at?: string | null
          dados?: Json | null
          id?: string
          sincronizado_em?: string
          steps?: Json | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_paineis_campos: {
        Row: {
          company_id: string
          created_at: string | null
          dados: Json | null
          entity_type: string | null
          id: string
          key: string | null
          name: string | null
          parent_id: string | null
          position: number | null
          required: boolean | null
          scope_id: string | null
          sincronizado_em: string | null
          type: string | null
          updated_at: string | null
          visible: boolean | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          dados?: Json | null
          entity_type?: string | null
          id: string
          key?: string | null
          name?: string | null
          parent_id?: string | null
          position?: number | null
          required?: boolean | null
          scope_id?: string | null
          sincronizado_em?: string | null
          type?: string | null
          updated_at?: string | null
          visible?: boolean | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          dados?: Json | null
          entity_type?: string | null
          id?: string
          key?: string | null
          name?: string | null
          parent_id?: string | null
          position?: number | null
          required?: boolean | null
          scope_id?: string | null
          sincronizado_em?: string | null
          type?: string | null
          updated_at?: string | null
          visible?: boolean | null
        }
        Relationships: []
      }
      crm_paineis_motivos_perda: {
        Row: {
          company_id: string
          created_at: string | null
          dados: Json | null
          id: string
          name: string | null
          sincronizado_em: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          dados?: Json | null
          id: string
          name?: string | null
          sincronizado_em?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          dados?: Json | null
          id?: string
          name?: string | null
          sincronizado_em?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_salarios: {
        Row: {
          company_id: string
          nome: string | null
          updated_at: string
          user_id: string
          valor_mensal: number
        }
        Insert: {
          company_id: string
          nome?: string | null
          updated_at?: string
          user_id: string
          valor_mensal?: number
        }
        Update: {
          company_id?: string
          nome?: string | null
          updated_at?: string
          user_id?: string
          valor_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_salarios_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_contas"
            referencedColumns: ["company_id"]
          },
        ]
      }
      crm_sequencias: {
        Row: {
          company_id: string
          created_at: string | null
          dados: Json | null
          id: string
          name: string | null
          sincronizado_em: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          dados?: Json | null
          id: string
          name?: string | null
          sincronizado_em?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          dados?: Json | null
          id?: string
          name?: string | null
          sincronizado_em?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_sessoes: {
        Row: {
          bot_id: string | null
          channel_id: string | null
          channel_type: string | null
          classification_amount: number | null
          classification_category: string | null
          classification_description: string | null
          company_id: string
          contact_id: string | null
          created_at: string | null
          crm_id: string | null
          dados: Json | null
          department_id: string | null
          end_at: string | null
          first_response_at: string | null
          id: string
          last_interaction_date: string | null
          last_message_in: string | null
          last_message_out: string | null
          last_message_text: string | null
          metadata: Json | null
          msgs_backfill_claim: string | null
          msgs_backfill_em: string | null
          msgs_backfill_tentativas: number
          number: string | null
          origin: string | null
          preview_url: string | null
          sincronizado_em: string
          start_at: string | null
          status: string | null
          status_description: string | null
          time_service: string | null
          time_wait: string | null
          title: string | null
          ultima_mensagem_sincronizada_em: string | null
          unread_count: number | null
          updated_at: string | null
          user_id: string | null
          utm: Json | null
          window_status: string | null
        }
        Insert: {
          bot_id?: string | null
          channel_id?: string | null
          channel_type?: string | null
          classification_amount?: number | null
          classification_category?: string | null
          classification_description?: string | null
          company_id: string
          contact_id?: string | null
          created_at?: string | null
          crm_id?: string | null
          dados?: Json | null
          department_id?: string | null
          end_at?: string | null
          first_response_at?: string | null
          id: string
          last_interaction_date?: string | null
          last_message_in?: string | null
          last_message_out?: string | null
          last_message_text?: string | null
          metadata?: Json | null
          msgs_backfill_claim?: string | null
          msgs_backfill_em?: string | null
          msgs_backfill_tentativas?: number
          number?: string | null
          origin?: string | null
          preview_url?: string | null
          sincronizado_em?: string
          start_at?: string | null
          status?: string | null
          status_description?: string | null
          time_service?: string | null
          time_wait?: string | null
          title?: string | null
          ultima_mensagem_sincronizada_em?: string | null
          unread_count?: number | null
          updated_at?: string | null
          user_id?: string | null
          utm?: Json | null
          window_status?: string | null
        }
        Update: {
          bot_id?: string | null
          channel_id?: string | null
          channel_type?: string | null
          classification_amount?: number | null
          classification_category?: string | null
          classification_description?: string | null
          company_id?: string
          contact_id?: string | null
          created_at?: string | null
          crm_id?: string | null
          dados?: Json | null
          department_id?: string | null
          end_at?: string | null
          first_response_at?: string | null
          id?: string
          last_interaction_date?: string | null
          last_message_in?: string | null
          last_message_out?: string | null
          last_message_text?: string | null
          metadata?: Json | null
          msgs_backfill_claim?: string | null
          msgs_backfill_em?: string | null
          msgs_backfill_tentativas?: number
          number?: string | null
          origin?: string | null
          preview_url?: string | null
          sincronizado_em?: string
          start_at?: string | null
          status?: string | null
          status_description?: string | null
          time_service?: string | null
          time_wait?: string | null
          title?: string | null
          ultima_mensagem_sincronizada_em?: string | null
          unread_count?: number | null
          updated_at?: string | null
          user_id?: string | null
          utm?: Json | null
          window_status?: string | null
        }
        Relationships: []
      }
      crm_tokens: {
        Row: {
          company_id: string
          token: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          token?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "crm_contas"
            referencedColumns: ["company_id"]
          },
        ]
      }
      crm_usuarios: {
        Row: {
          company_id: string
          created_at: string | null
          dados: Json | null
          departments: Json | null
          email: string | null
          id: string
          is_owner: boolean | null
          name: string | null
          phone_number: string | null
          profile: string | null
          short_name: string | null
          sincronizado_em: string
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          dados?: Json | null
          departments?: Json | null
          email?: string | null
          id: string
          is_owner?: boolean | null
          name?: string | null
          phone_number?: string | null
          profile?: string | null
          short_name?: string | null
          sincronizado_em?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          dados?: Json | null
          departments?: Json | null
          email?: string | null
          id?: string
          is_owner?: boolean | null
          name?: string | null
          phone_number?: string | null
          profile?: string | null
          short_name?: string | null
          sincronizado_em?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      followup_envios: {
        Row: {
          agente_id: string
          enviado_em: string
          id: string
          last_message_out: string
          ordem: number
          session_id: string
        }
        Insert: {
          agente_id: string
          enviado_em?: string
          id?: string
          last_message_out: string
          ordem: number
          session_id: string
        }
        Update: {
          agente_id?: string
          enviado_em?: string
          id?: string
          last_message_out?: string
          ordem?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_envios_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "agentes_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      gerente_categoria_templates: {
        Row: {
          categorias: Json
          created_at: string | null
          descricao: string | null
          id: string
          label: string
          updated_at: string | null
        }
        Insert: {
          categorias?: Json
          created_at?: string | null
          descricao?: string | null
          id?: string
          label: string
          updated_at?: string | null
        }
        Update: {
          categorias?: Json
          created_at?: string | null
          descricao?: string | null
          id?: string
          label?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      gerente_leads: {
        Row: {
          ativo: boolean
          canais: Json
          categorias: Json
          companyId: string | null
          conta_id: string
          created_at: string
          equipes: Json
          horario: Json | null
          id: string
          regras_etapas: Json
          updated_at: string
          webhook_nome: string | null
          webhook_url: string | null
        }
        Insert: {
          ativo?: boolean
          canais?: Json
          categorias?: Json
          companyId?: string | null
          conta_id: string
          created_at?: string
          equipes?: Json
          horario?: Json | null
          id?: string
          regras_etapas?: Json
          updated_at?: string
          webhook_nome?: string | null
          webhook_url?: string | null
        }
        Update: {
          ativo?: boolean
          canais?: Json
          categorias?: Json
          companyId?: string | null
          conta_id?: string
          created_at?: string
          equipes?: Json
          horario?: Json | null
          id?: string
          regras_etapas?: Json
          updated_at?: string
          webhook_nome?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gerente_leads_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["companyId"]
          },
          {
            foreignKeyName: "gerente_leads_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gerente_pacientes: {
        Row: {
          ativo: boolean
          canais: Json
          companyId: string | null
          conta_id: string
          created_at: string
          equipes: Json
          etapa_andamento_id: string | null
          etapa_andamento_nome: string | null
          etapa_nova_id: string | null
          etapa_nova_nome: string | null
          etapa_resolvida_id: string | null
          etapa_resolvida_nome: string | null
          horario: Json | null
          id: string
          painel_id: string | null
          painel_nome: string | null
          updated_at: string
          webhook_nome: string | null
          webhook_url: string | null
        }
        Insert: {
          ativo?: boolean
          canais?: Json
          companyId?: string | null
          conta_id: string
          created_at?: string
          equipes?: Json
          etapa_andamento_id?: string | null
          etapa_andamento_nome?: string | null
          etapa_nova_id?: string | null
          etapa_nova_nome?: string | null
          etapa_resolvida_id?: string | null
          etapa_resolvida_nome?: string | null
          horario?: Json | null
          id?: string
          painel_id?: string | null
          painel_nome?: string | null
          updated_at?: string
          webhook_nome?: string | null
          webhook_url?: string | null
        }
        Update: {
          ativo?: boolean
          canais?: Json
          companyId?: string | null
          conta_id?: string
          created_at?: string
          equipes?: Json
          etapa_andamento_id?: string | null
          etapa_andamento_nome?: string | null
          etapa_nova_id?: string | null
          etapa_nova_nome?: string | null
          etapa_resolvida_id?: string | null
          etapa_resolvida_nome?: string | null
          horario?: Json | null
          id?: string
          painel_id?: string | null
          painel_nome?: string | null
          updated_at?: string
          webhook_nome?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gerente_pacientes_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["companyId"]
          },
          {
            foreignKeyName: "gerente_pacientes_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_templates: {
        Row: {
          created_at: string
          id: string
          label: string
          prompt: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          prompt: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          AddToCart: boolean | null
          anuncio_id: string | null
          anuncio_nome: string | null
          campanha_id: string | null
          campanha_nome: string | null
          CartAbandoned: boolean | null
          clid: string | null
          companyId: string
          conjunto_id: string | null
          conjunto_nome: string | null
          contactId: string | null
          created_at: string
          event: string | null
          headline: string | null
          id: number
          LeadSubmitted: boolean | null
          nome: string | null
          Purchase: boolean | null
          sourceid: string | null
          telefone: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          AddToCart?: boolean | null
          anuncio_id?: string | null
          anuncio_nome?: string | null
          campanha_id?: string | null
          campanha_nome?: string | null
          CartAbandoned?: boolean | null
          clid?: string | null
          companyId: string
          conjunto_id?: string | null
          conjunto_nome?: string | null
          contactId?: string | null
          created_at?: string
          event?: string | null
          headline?: string | null
          id?: number
          LeadSubmitted?: boolean | null
          nome?: string | null
          Purchase?: boolean | null
          sourceid?: string | null
          telefone?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          AddToCart?: boolean | null
          anuncio_id?: string | null
          anuncio_nome?: string | null
          campanha_id?: string | null
          campanha_nome?: string | null
          CartAbandoned?: boolean | null
          clid?: string | null
          companyId?: string
          conjunto_id?: string | null
          conjunto_nome?: string | null
          contactId?: string | null
          created_at?: string
          event?: string | null
          headline?: string | null
          id?: number
          LeadSubmitted?: boolean | null
          nome?: string | null
          Purchase?: boolean | null
          sourceid?: string | null
          telefone?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lp_events: {
        Row: {
          company_id: string
          created_at: string
          event_data: Json | null
          event_name: string
          id: number
          page_id: string
          path: string | null
          session_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          event_data?: Json | null
          event_name: string
          id?: never
          page_id: string
          path?: string | null
          session_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          event_data?: Json | null
          event_name?: string
          id?: never
          page_id?: string
          path?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lp_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lp_events_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "lp_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lp_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lp_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lp_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lp_sessions_detail"
            referencedColumns: ["session_id"]
          },
        ]
      }
      lp_leads: {
        Row: {
          company_id: string
          created_at: string
          crm: string | null
          diagnostic: Json | null
          diagnostic_result: Json | null
          email: string
          has_clinic: string | null
          id: string
          name: string
          other_role: string | null
          page_id: string
          paid: boolean
          paid_at: string | null
          referrer: string | null
          revenue_band: string | null
          role: string
          session_id: string | null
          spouse_of: string | null
          uf: string | null
          utm: Json | null
          whatsapp: string
        }
        Insert: {
          company_id: string
          created_at?: string
          crm?: string | null
          diagnostic?: Json | null
          diagnostic_result?: Json | null
          email: string
          has_clinic?: string | null
          id: string
          name: string
          other_role?: string | null
          page_id: string
          paid?: boolean
          paid_at?: string | null
          referrer?: string | null
          revenue_band?: string | null
          role: string
          session_id?: string | null
          spouse_of?: string | null
          uf?: string | null
          utm?: Json | null
          whatsapp: string
        }
        Update: {
          company_id?: string
          created_at?: string
          crm?: string | null
          diagnostic?: Json | null
          diagnostic_result?: Json | null
          email?: string
          has_clinic?: string | null
          id?: string
          name?: string
          other_role?: string | null
          page_id?: string
          paid?: boolean
          paid_at?: string | null
          referrer?: string | null
          revenue_band?: string | null
          role?: string
          session_id?: string | null
          spouse_of?: string | null
          uf?: string | null
          utm?: Json | null
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "lp_leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lp_leads_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "lp_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lp_leads_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lp_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lp_leads_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lp_sessions_detail"
            referencedColumns: ["session_id"]
          },
        ]
      }
      lp_pages: {
        Row: {
          company_id: string
          created_at: string
          domain: string | null
          id: string
          metadata: Json | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          domain?: string | null
          id?: string
          metadata?: Json | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          domain?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lp_pages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lp_sessions: {
        Row: {
          company_id: string
          completed_form: boolean
          completed_quiz: boolean
          device_type: string | null
          email: string | null
          fbclid: string | null
          first_seen_at: string
          gclid: string | null
          id: string
          landing_path: string | null
          last_form_step: string | null
          last_quiz_step: string | null
          last_seen_at: string
          lead_id: string | null
          page_id: string
          paid: boolean
          paid_at: string | null
          payment_transaction_id: string | null
          payment_value_cents: number | null
          quiz_result: Json | null
          reached_payment: boolean
          referrer: string | null
          started_form: boolean
          started_quiz: boolean
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          viewed_landing: boolean
        }
        Insert: {
          company_id: string
          completed_form?: boolean
          completed_quiz?: boolean
          device_type?: string | null
          email?: string | null
          fbclid?: string | null
          first_seen_at?: string
          gclid?: string | null
          id: string
          landing_path?: string | null
          last_form_step?: string | null
          last_quiz_step?: string | null
          last_seen_at?: string
          lead_id?: string | null
          page_id: string
          paid?: boolean
          paid_at?: string | null
          payment_transaction_id?: string | null
          payment_value_cents?: number | null
          quiz_result?: Json | null
          reached_payment?: boolean
          referrer?: string | null
          started_form?: boolean
          started_quiz?: boolean
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewed_landing?: boolean
        }
        Update: {
          company_id?: string
          completed_form?: boolean
          completed_quiz?: boolean
          device_type?: string | null
          email?: string | null
          fbclid?: string | null
          first_seen_at?: string
          gclid?: string | null
          id?: string
          landing_path?: string | null
          last_form_step?: string | null
          last_quiz_step?: string | null
          last_seen_at?: string
          lead_id?: string | null
          page_id?: string
          paid?: boolean
          paid_at?: string | null
          payment_transaction_id?: string | null
          payment_value_cents?: number | null
          quiz_result?: Json | null
          reached_payment?: boolean
          referrer?: string | null
          started_form?: boolean
          started_quiz?: boolean
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewed_landing?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "lp_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lp_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lp_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lp_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lp_sessions_detail"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "lp_sessions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "lp_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      lp_webhook_events_raw: {
        Row: {
          email: string | null
          event_name: string | null
          handled: boolean
          id: number
          matched_lead_id: string | null
          page_id: string | null
          payload: Json
          received_at: string
          source: string
          transaction_id: string | null
        }
        Insert: {
          email?: string | null
          event_name?: string | null
          handled?: boolean
          id?: never
          matched_lead_id?: string | null
          page_id?: string | null
          payload: Json
          received_at?: string
          source: string
          transaction_id?: string | null
        }
        Update: {
          email?: string | null
          event_name?: string | null
          handled?: boolean
          id?: never
          matched_lead_id?: string | null
          page_id?: string | null
          payload?: Json
          received_at?: string
          source?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lp_webhook_events_raw_matched_lead_id_fkey"
            columns: ["matched_lead_id"]
            isOneToOne: false
            referencedRelation: "lp_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lp_webhook_events_raw_matched_lead_id_fkey"
            columns: ["matched_lead_id"]
            isOneToOne: false
            referencedRelation: "lp_sessions_detail"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "lp_webhook_events_raw_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "lp_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string | null
          cpf: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          name: string | null
          phone: string | null
          role: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          cpf?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          cpf?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_events: {
        Row: {
          created_at: string
          id: string
          payload: Json
          proposal_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
          proposal_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          proposal_id?: string | null
        }
        Relationships: []
      }
      proposta_contracts: {
        Row: {
          contract_id: string
          ordem: number
          proposta_id: string
        }
        Insert: {
          contract_id: string
          ordem?: number
          proposta_id: string
        }
        Update: {
          contract_id?: string
          ordem?: number
          proposta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposta_contracts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposta_contracts_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas: {
        Row: {
          company_id: string
          contract_id: string | null
          contract_pdf_path: string | null
          contract_feegow_em: string | null
          contract_feegow_erro: string | null
          contract_feegow_iniciado_em: string | null
          contract_sent_at: string | null
          contract_signed_at: string | null
          contract_signing_link: string | null
          created_at: string
          custom_payment_method: string | null
          discount_percent: number
          document_id: string | null
          id: string
          id_proposta_api: number | null
          incluir_tcle_padrao: boolean
          installment_value_cents: number | null
          installments: number | null
          itens_protocolo: Json | null
          observacoes: string | null
          paciente_alergias: string | null
          paciente_bairro: string | null
          paciente_cpf: string | null
          paciente_email: string | null
          paciente_id: string
          paciente_nascimento: string | null
          paciente_nome: string
          paciente_telefone: string | null
          payment_method: string | null
          prescricao_ajustes: Json
          prescricao_alinhar_semana: boolean
          prescricao_envio_iniciado_em: string | null
          prescricao_erro: string | null
          prescricao_feegow_em: string | null
          prescricao_gerada_em: string | null
          prescricao_gerada_por: string | null
          prescricao_hash: string | null
          prescricao_hash_enviado: string | null
          prescricao_inicio: string | null
          prescricao_revisao: number
          prescricao_revisoes: Json
          prescricao_snapshot: Json | null
          procedimentos_adicionais: Json | null
          profissional_cpf: string | null
          profissional_crm: string | null
          profissional_email: string | null
          profissional_especialidade: string | null
          profissional_id: string
          profissional_nome: string
          profissional_sys_user: string | null
          protocolo_id: string | null
          protocolo_nome: string | null
          status: string | null
          status_id: number | null
          updated_at: string
          user_id: string
          valor_total_cents: number
        }
        Insert: {
          company_id: string
          contract_id?: string | null
          contract_pdf_path?: string | null
          contract_feegow_em?: string | null
          contract_feegow_erro?: string | null
          contract_feegow_iniciado_em?: string | null
          contract_sent_at?: string | null
          contract_signed_at?: string | null
          contract_signing_link?: string | null
          created_at?: string
          custom_payment_method?: string | null
          discount_percent?: number
          document_id?: string | null
          id?: string
          id_proposta_api?: number | null
          incluir_tcle_padrao?: boolean
          installment_value_cents?: number | null
          installments?: number | null
          itens_protocolo?: Json | null
          observacoes?: string | null
          paciente_alergias?: string | null
          paciente_bairro?: string | null
          paciente_cpf?: string | null
          paciente_email?: string | null
          paciente_id: string
          paciente_nascimento?: string | null
          paciente_nome: string
          paciente_telefone?: string | null
          payment_method?: string | null
          prescricao_ajustes?: Json
          prescricao_alinhar_semana?: boolean
          prescricao_envio_iniciado_em?: string | null
          prescricao_erro?: string | null
          prescricao_feegow_em?: string | null
          prescricao_gerada_em?: string | null
          prescricao_gerada_por?: string | null
          prescricao_hash?: string | null
          prescricao_hash_enviado?: string | null
          prescricao_inicio?: string | null
          prescricao_revisao?: number
          prescricao_revisoes?: Json
          prescricao_snapshot?: Json | null
          procedimentos_adicionais?: Json | null
          profissional_cpf?: string | null
          profissional_crm?: string | null
          profissional_email?: string | null
          profissional_especialidade?: string | null
          profissional_id: string
          profissional_nome: string
          profissional_sys_user?: string | null
          protocolo_id?: string | null
          protocolo_nome?: string | null
          status?: string | null
          status_id?: number | null
          updated_at?: string
          user_id: string
          valor_total_cents?: number
        }
        Update: {
          company_id?: string
          contract_id?: string | null
          contract_pdf_path?: string | null
          contract_feegow_em?: string | null
          contract_feegow_erro?: string | null
          contract_feegow_iniciado_em?: string | null
          contract_sent_at?: string | null
          contract_signed_at?: string | null
          contract_signing_link?: string | null
          created_at?: string
          custom_payment_method?: string | null
          discount_percent?: number
          document_id?: string | null
          id?: string
          id_proposta_api?: number | null
          incluir_tcle_padrao?: boolean
          installment_value_cents?: number | null
          installments?: number | null
          itens_protocolo?: Json | null
          observacoes?: string | null
          paciente_alergias?: string | null
          paciente_bairro?: string | null
          paciente_cpf?: string | null
          paciente_email?: string | null
          paciente_id?: string
          paciente_nascimento?: string | null
          paciente_nome?: string
          paciente_telefone?: string | null
          payment_method?: string | null
          prescricao_ajustes?: Json
          prescricao_alinhar_semana?: boolean
          prescricao_envio_iniciado_em?: string | null
          prescricao_erro?: string | null
          prescricao_feegow_em?: string | null
          prescricao_gerada_em?: string | null
          prescricao_gerada_por?: string | null
          prescricao_hash?: string | null
          prescricao_hash_enviado?: string | null
          prescricao_inicio?: string | null
          prescricao_revisao?: number
          prescricao_revisoes?: Json
          prescricao_snapshot?: Json | null
          procedimentos_adicionais?: Json | null
          profissional_cpf?: string | null
          profissional_crm?: string | null
          profissional_email?: string | null
          profissional_especialidade?: string | null
          profissional_id?: string
          profissional_nome?: string
          profissional_sys_user?: string | null
          protocolo_id?: string | null
          protocolo_nome?: string | null
          status?: string | null
          status_id?: number | null
          updated_at?: string
          user_id?: string
          valor_total_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "propostas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_contracts: {
        Row: {
          contract_id: string
          ordem: number
          protocol_id: string
        }
        Insert: {
          contract_id: string
          ordem?: number
          protocol_id: string
        }
        Update: {
          contract_id?: string
          ordem?: number
          protocol_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_contracts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_contracts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_items: {
        Row: {
          created_at: string | null
          cuidados: string | null
          discount_percent: number
          dose: string | null
          id: string
          inicio_dias: number
          interval_days: number
          procedure_id: string
          procedure_name: string
          protocol_id: string
          quantity: number
          value_cents: number
          via: string | null
        }
        Insert: {
          created_at?: string | null
          cuidados?: string | null
          discount_percent?: number
          dose?: string | null
          id?: string
          inicio_dias?: number
          interval_days?: number
          procedure_id: string
          procedure_name: string
          protocol_id: string
          quantity: number
          value_cents: number
          via?: string | null
        }
        Update: {
          created_at?: string | null
          cuidados?: string | null
          discount_percent?: number
          dose?: string | null
          id?: string
          inicio_dias?: number
          interval_days?: number
          procedure_id?: string
          procedure_name?: string
          protocol_id?: string
          quantity?: number
          value_cents?: number
          via?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_items_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      protocols: {
        Row: {
          company_id: string
          created_at: string | null
          cuidados_gerais: string | null
          id: string
          incluir_tcle_padrao: boolean
          name: string
          sinais_alerta: string | null
          total_value_cents: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          cuidados_gerais?: string | null
          id?: string
          incluir_tcle_padrao?: boolean
          name: string
          sinais_alerta?: string | null
          total_value_cents?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          cuidados_gerais?: string | null
          id?: string
          incluir_tcle_padrao?: boolean
          name?: string
          sinais_alerta?: string | null
          total_value_cents?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocols_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      superadmin_token: {
        Row: {
          authorization: string | null
          created_at: string
          id: number
        }
        Insert: {
          authorization?: string | null
          created_at?: string
          id?: number
        }
        Update: {
          authorization?: string | null
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      sync_config: {
        Row: {
          ativo: boolean
          auth_scope: string
          categoria: string
          endpoint: string
          include_details: string | null
          max_paginas: number | null
          metodo: string
          namespace: string | null
          observacao: string | null
          paginacao: string
          paginacao_casing: string
          parametro_incremental: string | null
          pk_field: string
          promocoes: Json | null
          tabela_destino: string
          tier: string
        }
        Insert: {
          ativo?: boolean
          auth_scope?: string
          categoria: string
          endpoint: string
          include_details?: string | null
          max_paginas?: number | null
          metodo?: string
          namespace?: string | null
          observacao?: string | null
          paginacao?: string
          paginacao_casing?: string
          parametro_incremental?: string | null
          pk_field?: string
          promocoes?: Json | null
          tabela_destino: string
          tier: string
        }
        Update: {
          ativo?: boolean
          auth_scope?: string
          categoria?: string
          endpoint?: string
          include_details?: string | null
          max_paginas?: number | null
          metodo?: string
          namespace?: string | null
          observacao?: string | null
          paginacao?: string
          paginacao_casing?: string
          parametro_incremental?: string | null
          pk_field?: string
          promocoes?: Json | null
          tabela_destino?: string
          tier?: string
        }
        Relationships: []
      }
      sync_estado: {
        Row: {
          atualizado_em: string
          categoria: string
          company_id: string
          criado_em: string
          registros_atualizados: number | null
          ultima_tentativa_em: string | null
          ultima_tentativa_status: string | null
          ultimo_erro: string | null
          ultimo_sync_ok_em: string | null
        }
        Insert: {
          atualizado_em?: string
          categoria: string
          company_id: string
          criado_em?: string
          registros_atualizados?: number | null
          ultima_tentativa_em?: string | null
          ultima_tentativa_status?: string | null
          ultimo_erro?: string | null
          ultimo_sync_ok_em?: string | null
        }
        Update: {
          atualizado_em?: string
          categoria?: string
          company_id?: string
          criado_em?: string
          registros_atualizados?: number | null
          ultima_tentativa_em?: string | null
          ultima_tentativa_status?: string | null
          ultimo_erro?: string | null
          ultimo_sync_ok_em?: string | null
        }
        Relationships: []
      }
      tools: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tool_permissions: {
        Row: {
          company_id: string
          created_at: string
          id: string
          tool_id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          tool_id: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          tool_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tool_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tool_permissions_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_dlq: {
        Row: {
          attempts: number
          created_at: string | null
          event: string
          headers: Json
          id: string
          last_error: string | null
          last_status: number | null
          next_run_at: string | null
          payload: Json
          tenant_id: string
          updated_at: string | null
          url: string
        }
        Insert: {
          attempts?: number
          created_at?: string | null
          event: string
          headers: Json
          id?: string
          last_error?: string | null
          last_status?: number | null
          next_run_at?: string | null
          payload: Json
          tenant_id: string
          updated_at?: string | null
          url: string
        }
        Update: {
          attempts?: number
          created_at?: string | null
          event?: string
          headers?: Json
          id?: string
          last_error?: string | null
          last_status?: number | null
          next_run_at?: string | null
          payload?: Json
          tenant_id?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      webhook_endpoints: {
        Row: {
          created_at: string | null
          enabled: boolean
          event: string
          id: string
          secret: string
          tenant_id: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean
          event: string
          id?: string
          secret: string
          tenant_id: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean
          event?: string
          id?: string
          secret?: string
          tenant_id?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      zoom_meetings_cache: {
        Row: {
          cached_at: string | null
          duracao_minutos: number | null
          host_email: string | null
          host_id: string | null
          host_name: string | null
          start_time: string
          titulo: string | null
          zoom_meeting_id: string
        }
        Insert: {
          cached_at?: string | null
          duracao_minutos?: number | null
          host_email?: string | null
          host_id?: string | null
          host_name?: string | null
          start_time: string
          titulo?: string | null
          zoom_meeting_id: string
        }
        Update: {
          cached_at?: string | null
          duracao_minutos?: number | null
          host_email?: string | null
          host_id?: string | null
          host_name?: string | null
          start_time?: string
          titulo?: string | null
          zoom_meeting_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      crm_sync_saude: {
        Row: {
          atrasadas: number | null
          categoria: string | null
          com_erro: number | null
          contas: number | null
          pior_atraso_min: number | null
          sla_min: number | null
          veredito: string | null
        }
        Relationships: []
      }
      lp_attribution: {
        Row: {
          ad: string | null
          adset: string | null
          campaign: string | null
          completed_form: number | null
          completed_quiz: number | null
          conv_pct: number | null
          medium: string | null
          page_id: string | null
          paid: number | null
          reached_payment: number | null
          revenue_cents: number | null
          sessions: number | null
          source: string | null
          started_form: number | null
          started_quiz: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lp_sessions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "lp_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      lp_form_dropoff: {
        Row: {
          last_step: string | null
          page_id: string | null
          sessions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lp_sessions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "lp_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      lp_funnel: {
        Row: {
          completed_form: number | null
          completed_quiz: number | null
          conv_pct: number | null
          page_id: string | null
          paid: number | null
          reached_payment: number | null
          started_form: number | null
          started_quiz: number | null
          total_sessions: number | null
          viewed_landing: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lp_sessions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "lp_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      lp_quiz_dropoff: {
        Row: {
          last_step: string | null
          page_id: string | null
          sessions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lp_sessions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "lp_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      lp_sessions_detail: {
        Row: {
          company_id: string | null
          completed_form: boolean | null
          completed_quiz: boolean | null
          device_type: string | null
          fbclid: string | null
          first_seen_at: string | null
          gclid: string | null
          landing_path: string | null
          last_form_step: string | null
          last_quiz_step: string | null
          last_seen_at: string | null
          lead_has_clinic: string | null
          lead_id: string | null
          lead_name: string | null
          lead_revenue_band: string | null
          lead_role: string | null
          lead_whatsapp: string | null
          page_id: string | null
          paid: boolean | null
          payment_transaction_id: string | null
          payment_value_cents: number | null
          quiz_result: Json | null
          reached_payment: boolean | null
          referrer: string | null
          session_email: string | null
          session_id: string | null
          started_form: boolean | null
          started_quiz: boolean | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          viewed_landing: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "lp_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lp_sessions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "lp_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      lp_webhook_events_recent: {
        Row: {
          email: string | null
          event_name: string | null
          handled: boolean | null
          id: number | null
          matched_lead_id: string | null
          page_id: string | null
          received_at: string | null
          source: string | null
          transaction_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lp_webhook_events_raw_matched_lead_id_fkey"
            columns: ["matched_lead_id"]
            isOneToOne: false
            referencedRelation: "lp_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lp_webhook_events_raw_matched_lead_id_fkey"
            columns: ["matched_lead_id"]
            isOneToOne: false
            referencedRelation: "lp_sessions_detail"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "lp_webhook_events_raw_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "lp_pages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      bootstrap_super_admin: { Args: never; Returns: boolean }
      can_read_proposta: { Args: { _proposta_id: string }; Returns: boolean }
      can_read_protocol: { Args: { _protocol_id: string }; Returns: boolean }
      can_write_company_asset: { Args: { _path: string }; Returns: boolean }
      can_write_protocol: { Args: { _protocol_id: string }; Returns: boolean }
      crm_etiquetas_uso: {
        Args: { p_company_id: string }
        Returns: {
          contatos: number
          nome: string
        }[]
      }
      crm_mensagens_ensure_partitions: {
        Args: { months_ahead?: number }
        Returns: number
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tool_access: {
        Args: { _company_id: string; _tool_id: string; _user_id: string }
        Returns: boolean
      }
      insert_lp_webhook_raw: {
        Args: {
          p_email: string
          p_event_name: string
          p_page_id: string
          p_payload: Json
          p_source: string
          p_transaction_id: string
        }
        Returns: number
      }
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      mark_lp_purchase: {
        Args: {
          p_email: string
          p_page_id: string
          p_transaction_id: string
          p_value_cents: number
        }
        Returns: Json
      }
      mark_lp_refund: {
        Args: {
          p_email: string
          p_page_id: string
          p_reason: string
          p_transaction_id: string
        }
        Returns: Json
      }
      promote_to_super_admin: { Args: { user_email: string }; Returns: Json }
      record_lp_event: {
        Args: {
          p_email?: string
          p_event_data: Json
          p_event_name: string
          p_form_step?: string
          p_landing?: Json
          p_page_id: string
          p_path: string
          p_quiz_result?: Json
          p_quiz_step?: string
          p_session_id: string
        }
        Returns: undefined
      }
      record_lp_event_by_email: {
        Args: {
          p_email: string
          p_event_data: Json
          p_event_name: string
          p_page_id: string
          p_path: string
        }
        Returns: Json
      }
      save_lp_lead: {
        Args: {
          p_crm: string
          p_diagnostic: Json
          p_diagnostic_result: Json
          p_email: string
          p_has_clinic: string
          p_lead_id: string
          p_name: string
          p_other_role: string
          p_page_id: string
          p_referrer: string
          p_revenue_band: string
          p_role: string
          p_session_id: string
          p_spouse_of: string
          p_uf: string
          p_utm: Json
          p_whatsapp: string
        }
        Returns: undefined
      }
      sync_upsert: {
        Args: { p_conflict: string; p_rows: Json; p_table: string }
        Returns: number
      }
    }
    Enums: {
      user_role: "super_admin" | "company_admin" | "company_user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["super_admin", "company_admin", "company_user"],
    },
  },
} as const
