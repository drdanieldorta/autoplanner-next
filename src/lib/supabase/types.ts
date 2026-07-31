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
          companyId: string | null
          conta_id: string
          created_at: string
          followup_config: Json | null
          horario: Json | null
          id: string
          intervencao_humana: boolean
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
          companyId?: string | null
          conta_id: string
          created_at?: string
          followup_config?: Json | null
          horario?: Json | null
          id?: string
          intervencao_humana?: boolean
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
          companyId?: string | null
          conta_id?: string
          created_at?: string
          followup_config?: Json | null
          horario?: Json | null
          id?: string
          intervencao_humana?: boolean
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
          companyId: string
          conta_id: string
          created_at: string
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
          companyId: string
          conta_id: string
          created_at?: string
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
          companyId?: string
          conta_id?: string
          created_at?: string
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
      api_credentials: {
        Row: {
          authentique_token: string | null
          company_id: string
          created_at: string
          crm_admin_token: string | null
          crm_token: string | null
          feegow_token: string | null
          id: string
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
          mentorado: boolean | null
          name: string
          nicho: string | null
          telefone: string | null
          updated_at: string
          wavoip_enabled: boolean | null
          wavoip_token: string | null
        }
        Insert: {
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
          mentorado?: boolean | null
          name: string
          nicho?: string | null
          telefone?: string | null
          updated_at?: string
          wavoip_enabled?: boolean | null
          wavoip_token?: string | null
        }
        Update: {
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
      propostas: {
        Row: {
          company_id: string
          contract_id: string | null
          created_at: string
          custom_payment_method: string | null
          discount_percent: number
          document_id: string | null
          id: string
          id_proposta_api: number | null
          installment_value_cents: number | null
          installments: number | null
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
          prescricao_envio_iniciado_em: string | null
          prescricao_erro: string | null
          prescricao_feegow_em: string | null
          prescricao_gerada_em: string | null
          prescricao_gerada_por: string | null
          prescricao_ajustes: Json
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
          created_at?: string
          custom_payment_method?: string | null
          discount_percent?: number
          document_id?: string | null
          id?: string
          id_proposta_api?: number | null
          installment_value_cents?: number | null
          installments?: number | null
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
          prescricao_envio_iniciado_em?: string | null
          prescricao_erro?: string | null
          prescricao_feegow_em?: string | null
          prescricao_gerada_em?: string | null
          prescricao_gerada_por?: string | null
          prescricao_ajustes?: Json
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
          created_at?: string
          custom_payment_method?: string | null
          discount_percent?: number
          document_id?: string | null
          id?: string
          id_proposta_api?: number | null
          installment_value_cents?: number | null
          installments?: number | null
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
          prescricao_envio_iniciado_em?: string | null
          prescricao_erro?: string | null
          prescricao_feegow_em?: string | null
          prescricao_gerada_em?: string | null
          prescricao_gerada_por?: string | null
          prescricao_ajustes?: Json
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
      protocol_items: {
        Row: {
          created_at: string | null
          cuidados: string | null
          discount_percent: number
          id: string
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
          id?: string
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
          id?: string
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
      [_ in never]: never
    }
    Functions: {
      bootstrap_super_admin: { Args: never; Returns: boolean }
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
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      promote_to_super_admin: { Args: { user_email: string }; Returns: Json }
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
