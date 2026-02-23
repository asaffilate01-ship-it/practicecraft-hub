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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          after_json: Json | null
          before_json: Json | null
          created_at: string
          entity_id: string | null
          entity_name: string
          id: string
          ip_address: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_name: string
          id?: string
          ip_address?: string | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string
          id?: string
          ip_address?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          action_payload_json: Json
          action_type: string
          created_at: string
          id: string
          is_enabled: boolean | null
          name: string
          tenant_id: string
          trigger_filter_json: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          action_payload_json?: Json
          action_type: string
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          name: string
          tenant_id: string
          trigger_filter_json?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          action_payload_json?: Json
          action_type?: string
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          name?: string
          tenant_id?: string
          trigger_filter_json?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      ch_filings: {
        Row: {
          accepted_at: string | null
          ch_barcode: string | null
          ch_transaction_id: string | null
          client_id: string
          created_at: string
          filing_description: string | null
          filing_type: string
          id: string
          rejected_reason: string | null
          request_json: Json
          response_json: Json
          status: string
          submitted_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          ch_barcode?: string | null
          ch_transaction_id?: string | null
          client_id: string
          created_at?: string
          filing_description?: string | null
          filing_type: string
          id?: string
          rejected_reason?: string | null
          request_json?: Json
          response_json?: Json
          status?: string
          submitted_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          ch_barcode?: string | null
          ch_transaction_id?: string | null
          client_id?: string
          created_at?: string
          filing_description?: string | null
          filing_type?: string
          id?: string
          rejected_reason?: string | null
          request_json?: Json
          response_json?: Json
          status?: string
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ch_filings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ch_filings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ch_filings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ch_filings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ch_filings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_type: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_type?: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_type?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      client_credentials: {
        Row: {
          ciphertext: string
          client_id: string
          created_at: string
          credential_type: string
          expires_at: string | null
          id: string
          metadata_json: Json
          provider: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ciphertext: string
          client_id: string
          created_at?: string
          credential_type: string
          expires_at?: string | null
          id?: string
          metadata_json?: Json
          provider: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ciphertext?: string
          client_id?: string
          created_at?: string
          credential_type?: string
          expires_at?: string | null
          id?: string
          metadata_json?: Json
          provider?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_credentials_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credentials_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_credentials_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_credentials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credentials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      clients: {
        Row: {
          address_json: Json | null
          archived_at: string | null
          assigned_manager_user_id: string | null
          charity_number: string | null
          company_number: string | null
          created_at: string
          email: string | null
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          legal_name: string
          nino: string | null
          paye_reference: string | null
          phone: string | null
          status: Database["public"]["Enums"]["client_status"]
          tenant_id: string
          trading_name: string | null
          updated_at: string
          utr: string | null
          vat_number: string | null
        }
        Insert: {
          address_json?: Json | null
          archived_at?: string | null
          assigned_manager_user_id?: string | null
          charity_number?: string | null
          company_number?: string | null
          created_at?: string
          email?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          legal_name: string
          nino?: string | null
          paye_reference?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          tenant_id: string
          trading_name?: string | null
          updated_at?: string
          utr?: string | null
          vat_number?: string | null
        }
        Update: {
          address_json?: Json | null
          archived_at?: string | null
          assigned_manager_user_id?: string | null
          charity_number?: string | null
          company_number?: string | null
          created_at?: string
          email?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          legal_name?: string
          nino?: string | null
          paye_reference?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          tenant_id?: string
          trading_name?: string | null
          updated_at?: string
          utr?: string | null
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      coa_template_accounts: {
        Row: {
          coa_template_id: string
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          is_control: boolean | null
          name: string
          sort_order: number | null
          subtype: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          coa_template_id: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_control?: boolean | null
          name: string
          sort_order?: number | null
          subtype?: string | null
          tenant_id: string
          type: string
        }
        Update: {
          coa_template_id?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_control?: boolean | null
          name?: string
          sort_order?: number | null
          subtype?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "coa_template_accounts_coa_template_id_fkey"
            columns: ["coa_template_id"]
            isOneToOne: false
            referencedRelation: "coa_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coa_template_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coa_template_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      coa_templates: {
        Row: {
          created_at: string
          description: string | null
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          is_default: boolean | null
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
          is_default?: boolean | null
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          is_default?: boolean | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coa_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coa_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      company_profiles: {
        Row: {
          client_id: string
          company_name: string
          company_number: string
          company_status: string
          created_at: string
          id: string
          incorporation_date: string | null
          last_accounts_due: string | null
          last_confirmation_statement_date: string | null
          last_synced_at: string | null
          next_accounts_due: string | null
          next_confirmation_statement_due: string | null
          officers_snapshot_json: Json
          psc_snapshot_json: Json
          registered_office_json: Json
          sic_codes: string[]
          sync_error: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          company_name: string
          company_number: string
          company_status?: string
          created_at?: string
          id?: string
          incorporation_date?: string | null
          last_accounts_due?: string | null
          last_confirmation_statement_date?: string | null
          last_synced_at?: string | null
          next_accounts_due?: string | null
          next_confirmation_statement_due?: string | null
          officers_snapshot_json?: Json
          psc_snapshot_json?: Json
          registered_office_json?: Json
          sic_codes?: string[]
          sync_error?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          company_name?: string
          company_number?: string
          company_status?: string
          created_at?: string
          id?: string
          incorporation_date?: string | null
          last_accounts_due?: string | null
          last_confirmation_statement_date?: string | null
          last_synced_at?: string | null
          next_accounts_due?: string | null
          next_confirmation_statement_due?: string | null
          officers_snapshot_json?: Json
          psc_snapshot_json?: Json
          registered_office_json?: Json
          sic_codes?: string[]
          sync_error?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "company_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "company_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      company_register_directors: {
        Row: {
          appointed_on: string | null
          ch_officer_id: string | null
          client_id: string
          created_at: string
          date_of_birth: string | null
          full_name: string
          id: string
          is_active: boolean
          nationality: string | null
          occupation: string | null
          residential_address_json: Json
          resigned_on: string | null
          service_address_json: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          appointed_on?: string | null
          ch_officer_id?: string | null
          client_id: string
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          nationality?: string | null
          occupation?: string | null
          residential_address_json?: Json
          resigned_on?: string | null
          service_address_json?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          appointed_on?: string | null
          ch_officer_id?: string | null
          client_id?: string
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          nationality?: string | null
          occupation?: string | null
          residential_address_json?: Json
          resigned_on?: string | null
          service_address_json?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_register_directors_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_register_directors_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "company_register_directors_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "company_register_directors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_register_directors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      company_register_members: {
        Row: {
          address_json: Json
          client_id: string
          created_at: string
          date_became_member: string | null
          date_ceased_member: string | null
          full_name: string
          id: string
          is_active: boolean
          share_class_id: string | null
          shares_held: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address_json?: Json
          client_id: string
          created_at?: string
          date_became_member?: string | null
          date_ceased_member?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          share_class_id?: string | null
          shares_held?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address_json?: Json
          client_id?: string
          created_at?: string
          date_became_member?: string | null
          date_ceased_member?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          share_class_id?: string | null
          shares_held?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_register_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_register_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "company_register_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "company_register_members_share_class_id_fkey"
            columns: ["share_class_id"]
            isOneToOne: false
            referencedRelation: "share_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_register_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_register_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      company_register_psc: {
        Row: {
          ceased_on: string | null
          ch_psc_id: string | null
          client_id: string
          country_of_residence: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string
          id: string
          is_active: boolean
          nationality: string | null
          natures_of_control: string[]
          notified_on: string | null
          service_address_json: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ceased_on?: string | null
          ch_psc_id?: string | null
          client_id: string
          country_of_residence?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          nationality?: string | null
          natures_of_control?: string[]
          notified_on?: string | null
          service_address_json?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ceased_on?: string | null
          ch_psc_id?: string | null
          client_id?: string
          country_of_residence?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          nationality?: string | null
          natures_of_control?: string[]
          notified_on?: string | null
          service_address_json?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_register_psc_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_register_psc_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "company_register_psc_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "company_register_psc_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_register_psc_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      confirmation_statement_cycles: {
        Row: {
          ch_filing_id: string | null
          client_id: string
          created_at: string
          due_date: string
          filed_at: string | null
          id: string
          review_period_end: string
          review_period_start: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ch_filing_id?: string | null
          client_id: string
          created_at?: string
          due_date: string
          filed_at?: string | null
          id?: string
          review_period_end: string
          review_period_start: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ch_filing_id?: string | null
          client_id?: string
          created_at?: string
          due_date?: string
          filed_at?: string | null
          id?: string
          review_period_end?: string
          review_period_start?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "confirmation_statement_cycles_ch_filing_id_fkey"
            columns: ["ch_filing_id"]
            isOneToOne: false
            referencedRelation: "ch_filings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confirmation_statement_cycles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confirmation_statement_cycles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "confirmation_statement_cycles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "confirmation_statement_cycles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confirmation_statement_cycles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      document_tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      documents: {
        Row: {
          client_id: string | null
          created_at: string
          document_type: string
          filename: string
          id: string
          metadata_json: Json
          mime_type: string
          ocr_text: string | null
          size_bytes: number
          status: string
          storage_path: string
          tags: string[] | null
          tenant_id: string
          updated_at: string
          uploaded_by_user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          document_type?: string
          filename: string
          id?: string
          metadata_json?: Json
          mime_type: string
          ocr_text?: string | null
          size_bytes?: number
          status?: string
          storage_path: string
          tags?: string[] | null
          tenant_id: string
          updated_at?: string
          uploaded_by_user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          document_type?: string
          filename?: string
          id?: string
          metadata_json?: Json
          mime_type?: string
          ocr_text?: string | null
          size_bytes?: number
          status?: string
          storage_path?: string
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string
          uploaded_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      domain_events: {
        Row: {
          created_at: string
          id: string
          payload: Json
          processed: boolean
          tenant_id: string
          trigger: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          processed?: boolean
          tenant_id: string
          trigger: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          processed?: boolean
          tenant_id?: string
          trigger?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          body_text: string | null
          created_at: string
          id: string
          is_active: boolean | null
          key: string
          name: string
          subject: string
          tenant_id: string
          updated_at: string
          variables_json: Json
        }
        Insert: {
          body_html: string
          body_text?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          subject: string
          tenant_id: string
          updated_at?: string
          variables_json?: Json
        }
        Update: {
          body_html?: string
          body_text?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          subject?: string
          tenant_id?: string
          updated_at?: string
          variables_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      engagement_services: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      event_dedupe: {
        Row: {
          created_at: string
          id: string
          key: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_dedupe_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_dedupe_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      event_logs: {
        Row: {
          actor_user_id: string | null
          client_id: string | null
          correlation_id: string | null
          created_at: string
          event_type: string
          id: string
          payload_json: Json
          source: string
          tenant_id: string
        }
        Insert: {
          actor_user_id?: string | null
          client_id?: string | null
          correlation_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload_json?: Json
          source?: string
          tenant_id: string
        }
        Update: {
          actor_user_id?: string | null
          client_id?: string | null
          correlation_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload_json?: Json
          source?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "event_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "event_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      incorp_documents: {
        Row: {
          application_id: string
          created_at: string
          document_id: string | null
          document_type: string
          id: string
          person_id: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          document_id?: string | null
          document_type: string
          id?: string
          person_id?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          document_id?: string | null
          document_type?: string
          id?: string
          person_id?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incorp_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "incorporation_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incorp_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incorp_documents_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "incorp_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incorp_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incorp_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      incorp_people: {
        Row: {
          application_id: string
          consent_to_act: boolean
          country_of_residence: string | null
          created_at: string
          date_of_birth: string | null
          first_name: string
          id: string
          kyc_status: string
          last_name: string
          middle_names: string | null
          nationality: string | null
          natures_of_control: string[] | null
          occupation: string | null
          residential_address_json: Json
          role: string
          service_address_json: Json
          tenant_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          application_id: string
          consent_to_act?: boolean
          country_of_residence?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name: string
          id?: string
          kyc_status?: string
          last_name: string
          middle_names?: string | null
          nationality?: string | null
          natures_of_control?: string[] | null
          occupation?: string | null
          residential_address_json?: Json
          role: string
          service_address_json?: Json
          tenant_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          consent_to_act?: boolean
          country_of_residence?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string
          id?: string
          kyc_status?: string
          last_name?: string
          middle_names?: string | null
          nationality?: string | null
          natures_of_control?: string[] | null
          occupation?: string | null
          residential_address_json?: Json
          role?: string
          service_address_json?: Json
          tenant_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incorp_people_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "incorporation_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incorp_people_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incorp_people_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      incorp_share_structure: {
        Row: {
          amount_paid_pence: number
          amount_unpaid_pence: number
          application_id: string
          class_name: string
          created_at: string
          currency: string
          id: string
          nominal_value_pence: number
          shares_subscribed: number
          subscriber_person_id: string | null
          tenant_id: string
          total_shares: number
        }
        Insert: {
          amount_paid_pence?: number
          amount_unpaid_pence?: number
          application_id: string
          class_name?: string
          created_at?: string
          currency?: string
          id?: string
          nominal_value_pence?: number
          shares_subscribed?: number
          subscriber_person_id?: string | null
          tenant_id: string
          total_shares?: number
        }
        Update: {
          amount_paid_pence?: number
          amount_unpaid_pence?: number
          application_id?: string
          class_name?: string
          created_at?: string
          currency?: string
          id?: string
          nominal_value_pence?: number
          shares_subscribed?: number
          subscriber_person_id?: string | null
          tenant_id?: string
          total_shares?: number
        }
        Relationships: [
          {
            foreignKeyName: "incorp_share_structure_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "incorporation_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incorp_share_structure_subscriber_person_id_fkey"
            columns: ["subscriber_person_id"]
            isOneToOne: false
            referencedRelation: "incorp_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incorp_share_structure_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incorp_share_structure_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      incorp_status_history: {
        Row: {
          application_id: string
          changed_by_user_id: string | null
          created_at: string
          from_status: string | null
          id: string
          notes: string | null
          tenant_id: string
          to_status: string
        }
        Insert: {
          application_id: string
          changed_by_user_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          tenant_id: string
          to_status: string
        }
        Update: {
          application_id?: string
          changed_by_user_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          tenant_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "incorp_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "incorporation_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incorp_status_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incorp_status_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      incorporation_applications: {
        Row: {
          articles_type: string
          ch_company_number: string | null
          ch_incorporation_date: string | null
          ch_submission_id: string | null
          client_id: string | null
          created_at: string
          created_by_user_id: string | null
          data_json: Json
          entity_type: string
          id: string
          payment_amount_pence: number | null
          payment_reference: string | null
          payment_status: string
          proposed_name: string | null
          registered_office_json: Json
          sail_address_json: Json | null
          sic_codes: string[]
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          articles_type?: string
          ch_company_number?: string | null
          ch_incorporation_date?: string | null
          ch_submission_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          data_json?: Json
          entity_type?: string
          id?: string
          payment_amount_pence?: number | null
          payment_reference?: string | null
          payment_status?: string
          proposed_name?: string | null
          registered_office_json?: Json
          sail_address_json?: Json | null
          sic_codes?: string[]
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          articles_type?: string
          ch_company_number?: string | null
          ch_incorporation_date?: string | null
          ch_submission_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          data_json?: Json
          entity_type?: string
          id?: string
          payment_amount_pence?: number | null
          payment_reference?: string | null
          payment_status?: string
          proposed_name?: string | null
          registered_office_json?: Json
          sail_address_json?: Json | null
          sic_codes?: string[]
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incorporation_applications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incorporation_applications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "incorporation_applications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "incorporation_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incorporation_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      integration_health: {
        Row: {
          checked_at: string
          client_id: string
          id: string
          last_error: string | null
          provider: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          checked_at?: string
          client_id: string
          id?: string
          last_error?: string | null
          provider: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          checked_at?: string
          client_id?: string
          id?: string
          last_error?: string | null
          provider?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_health_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_health_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "integration_health_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "integration_health_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_health_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          line_total: number
          quantity: number
          unit_price: number
          vat_rate: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          line_total?: number
          quantity?: number
          unit_price?: number
          vat_rate?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          line_total?: number
          quantity?: number
          unit_price?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_templates: {
        Row: {
          created_at: string
          footer_text: string | null
          id: string
          is_default: boolean | null
          key: string
          layout_json: Json
          name: string
          tenant_id: string
          terms_text: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          footer_text?: string | null
          id?: string
          is_default?: boolean | null
          key: string
          layout_json?: Json
          name: string
          tenant_id: string
          terms_text?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          footer_text?: string | null
          id?: string
          is_default?: boolean | null
          key?: string
          layout_json?: Json
          name?: string
          tenant_id?: string
          terms_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          client_id: string | null
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          status: string
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          subtotal: number
          tenant_id: string
          total: number
          updated_at: string
          vat_amount: number
        }
        Insert: {
          amount_paid?: number
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number
          tenant_id: string
          total?: number
          updated_at?: string
          vat_amount?: number
        }
        Update: {
          amount_paid?: number
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number
          tenant_id?: string
          total?: number
          updated_at?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          entry_date: string
          id: string
          is_posted: boolean
          narration: string | null
          reference: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          is_posted?: boolean
          narration?: string | null
          reference?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          is_posted?: boolean
          narration?: string | null
          reference?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "journal_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "journal_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string
          created_at: string
          credit: number
          debit: number
          description: string | null
          id: string
          journal_entry_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_suggestions: {
        Row: {
          approved_at: string | null
          approved_by_user_id: string | null
          client_id: string
          created_at: string
          document_id: string
          extraction_id: string | null
          id: string
          lines_json: Json
          posted_journal_id: string | null
          reason: string | null
          status: string
          suggested_by: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          client_id: string
          created_at?: string
          document_id: string
          extraction_id?: string | null
          id?: string
          lines_json?: Json
          posted_journal_id?: string | null
          reason?: string | null
          status?: string
          suggested_by?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          client_id?: string
          created_at?: string
          document_id?: string
          extraction_id?: string | null
          id?: string
          lines_json?: Json
          posted_journal_id?: string | null
          reason?: string | null
          status?: string
          suggested_by?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_suggestions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_suggestions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ledger_suggestions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ledger_suggestions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_suggestions_extraction_id_fkey"
            columns: ["extraction_id"]
            isOneToOne: false
            referencedRelation: "receipt_extractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_suggestions_posted_journal_id_fkey"
            columns: ["posted_journal_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_suggestions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_suggestions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string
          document_id: string
          id: string
          message_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          message_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          message_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      message_thread_assignments: {
        Row: {
          assigned_at: string
          assigned_by_user_id: string | null
          assigned_to_user_id: string | null
          id: string
          tenant_id: string
          thread_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by_user_id?: string | null
          assigned_to_user_id?: string | null
          id?: string
          tenant_id: string
          thread_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by_user_id?: string | null
          assigned_to_user_id?: string | null
          id?: string
          tenant_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_thread_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_thread_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "message_thread_assignments_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: true
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_thread_assignments_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: true
            referencedRelation: "v_threads_needing_attention"
            referencedColumns: ["thread_id"]
          },
        ]
      }
      message_thread_participants: {
        Row: {
          created_at: string
          id: string
          role: string
          tenant_id: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          tenant_id: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          tenant_id?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_thread_participants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_thread_participants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "message_thread_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_thread_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "v_threads_needing_attention"
            referencedColumns: ["thread_id"]
          },
        ]
      }
      message_threads: {
        Row: {
          client_id: string
          created_at: string
          created_by_user_id: string | null
          id: string
          last_message_at: string
          last_message_id: string | null
          priority: string
          status: string
          subject: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          last_message_at?: string
          last_message_id?: string | null
          priority?: string
          status?: string
          subject: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          last_message_at?: string
          last_message_id?: string | null
          priority?: string
          status?: string
          subject?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "message_threads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "message_threads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          body_html: string | null
          created_at: string
          id: string
          is_internal: boolean
          sender_type: string
          sender_user_id: string | null
          tenant_id: string
          thread_id: string
        }
        Insert: {
          body: string
          body_html?: string | null
          created_at?: string
          id?: string
          is_internal?: boolean
          sender_type?: string
          sender_user_id?: string | null
          tenant_id: string
          thread_id: string
        }
        Update: {
          body?: string
          body_html?: string | null
          created_at?: string
          id?: string
          is_internal?: boolean
          sender_type?: string
          sender_user_id?: string | null
          tenant_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "v_threads_needing_attention"
            referencedColumns: ["thread_id"]
          },
        ]
      }
      minutes_documents: {
        Row: {
          client_id: string
          content_html: string | null
          created_at: string
          created_by_user_id: string | null
          document_id: string | null
          document_type: string
          id: string
          secretarial_event_id: string | null
          signed_at: string | null
          template_key: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          content_html?: string | null
          created_at?: string
          created_by_user_id?: string | null
          document_id?: string | null
          document_type?: string
          id?: string
          secretarial_event_id?: string | null
          signed_at?: string | null
          template_key?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          content_html?: string | null
          created_at?: string
          created_by_user_id?: string | null
          document_id?: string | null
          document_type?: string
          id?: string
          secretarial_event_id?: string | null
          signed_at?: string | null
          template_key?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "minutes_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minutes_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "minutes_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "minutes_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minutes_documents_secretarial_event_id_fkey"
            columns: ["secretarial_event_id"]
            isOneToOne: false
            referencedRelation: "secretarial_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minutes_documents_secretarial_event_id_fkey"
            columns: ["secretarial_event_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_changes_pending"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "minutes_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minutes_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          body_preview: string | null
          channel: string
          client_id: string | null
          created_at: string
          error_message: string | null
          id: string
          meta_json: Json
          provider: string | null
          provider_message_id: string | null
          sent_at: string | null
          status: string
          subject: string | null
          template_key: string | null
          tenant_id: string
          to_address: string | null
          user_id: string | null
        }
        Insert: {
          body_preview?: string | null
          channel: string
          client_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          meta_json?: Json
          provider?: string | null
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_key?: string | null
          tenant_id: string
          to_address?: string | null
          user_id?: string | null
        }
        Update: {
          body_preview?: string | null
          channel?: string
          client_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          meta_json?: Json
          provider?: string | null
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_key?: string | null
          tenant_id?: string
          to_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "notification_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "notification_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          attempt_count: number
          channel: string
          client_id: string | null
          created_at: string
          id: string
          last_error: string | null
          next_retry_at: string | null
          payload_json: Json
          status: string
          template_key: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          channel: string
          client_id?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          next_retry_at?: string | null
          payload_json?: Json
          status?: string
          template_key?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          channel?: string
          client_id?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          next_retry_at?: string | null
          payload_json?: Json
          status?: string
          template_key?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "notification_queue_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "notification_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      notification_rules: {
        Row: {
          applies_to_json: Json
          channel: string
          created_at: string
          days_before_due: number
          id: string
          is_enabled: boolean | null
          name: string
          template_key: string | null
          tenant_id: string
        }
        Insert: {
          applies_to_json?: Json
          channel: string
          created_at?: string
          days_before_due?: number
          id?: string
          is_enabled?: boolean | null
          name: string
          template_key?: string | null
          tenant_id: string
        }
        Update: {
          applies_to_json?: Json
          channel?: string
          created_at?: string
          days_before_due?: number
          id?: string
          is_enabled?: boolean | null
          name?: string
          template_key?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      ocr_jobs: {
        Row: {
          attempt_count: number
          client_id: string | null
          created_at: string
          document_id: string
          id: string
          last_error: string | null
          provider: string
          request_json: Json
          result_json: Json | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          client_id?: string | null
          created_at?: string
          document_id: string
          id?: string
          last_error?: string | null
          provider?: string
          request_json?: Json
          result_json?: Json | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          client_id?: string | null
          created_at?: string
          document_id?: string
          id?: string
          last_error?: string | null
          provider?: string
          request_json?: Json
          result_json?: Json | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocr_jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ocr_jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ocr_jobs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      onboarding_cases: {
        Row: {
          checklist_json: Json
          client_id: string | null
          created_at: string
          created_by_user_id: string | null
          data_json: Json
          entity_type: string
          id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          checklist_json?: Json
          client_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          data_json?: Json
          entity_type: string
          id?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          checklist_json?: Json
          client_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          data_json?: Json
          entity_type?: string
          id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "onboarding_cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "onboarding_cases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_cases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      onboarding_steps: {
        Row: {
          created_at: string
          data_json: Json
          id: string
          onboarding_case_id: string
          required: boolean
          step_key: string
          step_status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_json?: Json
          id?: string
          onboarding_case_id: string
          required?: boolean
          step_key: string
          step_status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_json?: Json
          id?: string
          onboarding_case_id?: string
          required?: boolean
          step_key?: string
          step_status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_steps_onboarding_case_id_fkey"
            columns: ["onboarding_case_id"]
            isOneToOne: false
            referencedRelation: "onboarding_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_steps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_steps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      permission_presets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          permissions_json: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          permissions_json?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          permissions_json?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          tenant_id: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          tenant_id: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          tenant_id?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      receipt_extractions: {
        Row: {
          client_id: string | null
          confidence: number | null
          created_at: string
          currency: string | null
          document_id: string
          id: string
          invoice_number: string | null
          raw_json: Json
          receipt_date: string | null
          supplier_name: string | null
          supplier_vat_number: string | null
          tenant_id: string
          total_gross_pence: number | null
          total_net_pence: number | null
          total_vat_pence: number | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          confidence?: number | null
          created_at?: string
          currency?: string | null
          document_id: string
          id?: string
          invoice_number?: string | null
          raw_json?: Json
          receipt_date?: string | null
          supplier_name?: string | null
          supplier_vat_number?: string | null
          tenant_id: string
          total_gross_pence?: number | null
          total_net_pence?: number | null
          total_vat_pence?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          confidence?: number | null
          created_at?: string
          currency?: string | null
          document_id?: string
          id?: string
          invoice_number?: string | null
          raw_json?: Json
          receipt_date?: string | null
          supplier_name?: string | null
          supplier_vat_number?: string | null
          tenant_id?: string
          total_gross_pence?: number | null
          total_net_pence?: number | null
          total_vat_pence?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_extractions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_extractions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "receipt_extractions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "receipt_extractions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_extractions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_extractions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system_role: boolean | null
          name: string
          permissions_json: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system_role?: boolean | null
          name: string
          permissions_json?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system_role?: boolean | null
          name?: string
          permissions_json?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      secretarial_events: {
        Row: {
          client_id: string
          created_at: string
          created_by_user_id: string | null
          description: string | null
          effective_date: string | null
          event_type: string
          filed_at: string | null
          filing_id: string | null
          id: string
          payload_json: Json
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          effective_date?: string | null
          event_type: string
          filed_at?: string | null
          filing_id?: string | null
          id?: string
          payload_json?: Json
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          effective_date?: string | null
          event_type?: string
          filed_at?: string | null
          filing_id?: string | null
          id?: string
          payload_json?: Json
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "secretarial_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secretarial_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "secretarial_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "secretarial_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secretarial_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      share_classes: {
        Row: {
          class_name: string
          client_id: string
          created_at: string
          currency: string
          dividend_rights: boolean
          id: string
          nominal_value_pence: number
          tenant_id: string
          total_issued: number
          updated_at: string
          voting_rights: boolean
        }
        Insert: {
          class_name?: string
          client_id: string
          created_at?: string
          currency?: string
          dividend_rights?: boolean
          id?: string
          nominal_value_pence?: number
          tenant_id: string
          total_issued?: number
          updated_at?: string
          voting_rights?: boolean
        }
        Update: {
          class_name?: string
          client_id?: string
          created_at?: string
          currency?: string
          dividend_rights?: boolean
          id?: string
          nominal_value_pence?: number
          tenant_id?: string
          total_issued?: number
          updated_at?: string
          voting_rights?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "share_classes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_classes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "share_classes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "share_classes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_classes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      share_transactions: {
        Row: {
          client_id: string
          consideration_text: string | null
          created_at: string
          effective_date: string
          from_member_id: string | null
          id: string
          num_shares: number
          price_per_share_pence: number | null
          resolution_document_id: string | null
          share_class_id: string | null
          tenant_id: string
          to_member_id: string | null
          transaction_type: string
        }
        Insert: {
          client_id: string
          consideration_text?: string | null
          created_at?: string
          effective_date?: string
          from_member_id?: string | null
          id?: string
          num_shares: number
          price_per_share_pence?: number | null
          resolution_document_id?: string | null
          share_class_id?: string | null
          tenant_id: string
          to_member_id?: string | null
          transaction_type?: string
        }
        Update: {
          client_id?: string
          consideration_text?: string | null
          created_at?: string
          effective_date?: string
          from_member_id?: string | null
          id?: string
          num_shares?: number
          price_per_share_pence?: number | null
          resolution_document_id?: string | null
          share_class_id?: string | null
          tenant_id?: string
          to_member_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "share_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "share_transactions_from_member_id_fkey"
            columns: ["from_member_id"]
            isOneToOne: false
            referencedRelation: "company_register_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_transactions_resolution_document_id_fkey"
            columns: ["resolution_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_transactions_share_class_id_fkey"
            columns: ["share_class_id"]
            isOneToOne: false
            referencedRelation: "share_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "share_transactions_to_member_id_fkey"
            columns: ["to_member_id"]
            isOneToOne: false
            referencedRelation: "company_register_members"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_jobs: {
        Row: {
          attempt_count: number
          client_id: string
          correlation_id: string | null
          created_at: string
          id: string
          idempotency_key: string
          last_error: string | null
          next_retry_at: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          request_json: Json
          response_json: Json | null
          status: Database["public"]["Enums"]["submission_status"]
          submission_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          client_id: string
          correlation_id?: string | null
          created_at?: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          next_retry_at?: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          request_json?: Json
          response_json?: Json | null
          status?: Database["public"]["Enums"]["submission_status"]
          submission_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          client_id?: string
          correlation_id?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          next_retry_at?: string | null
          provider?: Database["public"]["Enums"]["integration_provider"]
          request_json?: Json
          response_json?: Json | null
          status?: Database["public"]["Enums"]["submission_status"]
          submission_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "submission_jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "submission_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      task_templates: {
        Row: {
          checklist_json: Json | null
          created_at: string
          default_days_before_due: number | null
          default_priority: Database["public"]["Enums"]["priority"]
          description: string | null
          entity_types: Database["public"]["Enums"]["entity_type"][] | null
          id: string
          name: string
          service_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          checklist_json?: Json | null
          created_at?: string
          default_days_before_due?: number | null
          default_priority?: Database["public"]["Enums"]["priority"]
          description?: string | null
          entity_types?: Database["public"]["Enums"]["entity_type"][] | null
          id?: string
          name: string
          service_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          checklist_json?: Json | null
          created_at?: string
          default_days_before_due?: number | null
          default_priority?: Database["public"]["Enums"]["priority"]
          description?: string | null
          entity_types?: Database["public"]["Enums"]["entity_type"][] | null
          id?: string
          name?: string
          service_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "engagement_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to_user_id: string | null
          checklist_json: Json | null
          client_id: string | null
          color_tag: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["priority"]
          status: Database["public"]["Enums"]["task_status"]
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          checklist_json?: Json | null
          client_id?: string | null
          color_tag?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["priority"]
          status?: Database["public"]["Enums"]["task_status"]
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to_user_id?: string | null
          checklist_json?: Json | null
          client_id?: string | null
          color_tag?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["priority"]
          status?: Database["public"]["Enums"]["task_status"]
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      template_variable_whitelist: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          template_type: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          template_type?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          template_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_variable_whitelist_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_variable_whitelist_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      template_versions: {
        Row: {
          body_html: string | null
          body_text: string | null
          created_at: string
          created_by_user_id: string | null
          id: string
          subject: string | null
          template_key: string
          template_type: string
          tenant_id: string
          variables_json: Json
          version: number
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          subject?: string | null
          template_key: string
          template_type?: string
          tenant_id: string
          variables_json?: Json
          version: number
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          subject?: string | null
          template_key?: string
          template_type?: string
          tenant_id?: string
          variables_json?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      tenants: {
        Row: {
          address_json: Json | null
          brand_primary_color: string | null
          brand_secondary_color: string | null
          created_at: string
          firm_name: string
          id: string
          is_white_label_enabled: boolean | null
          logo_url: string | null
          phone: string | null
          plan_code: string | null
          primary_domain: string | null
          support_email: string | null
          timezone: string | null
          trading_name: string | null
          updated_at: string
        }
        Insert: {
          address_json?: Json | null
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          created_at?: string
          firm_name: string
          id?: string
          is_white_label_enabled?: boolean | null
          logo_url?: string | null
          phone?: string | null
          plan_code?: string | null
          primary_domain?: string | null
          support_email?: string | null
          timezone?: string | null
          trading_name?: string | null
          updated_at?: string
        }
        Update: {
          address_json?: Json | null
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          created_at?: string
          firm_name?: string
          id?: string
          is_white_label_enabled?: boolean | null
          logo_url?: string | null
          phone?: string | null
          plan_code?: string | null
          primary_domain?: string | null
          support_email?: string | null
          timezone?: string | null
          trading_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      vat_returns: {
        Row: {
          box1: number
          box2: number
          box3: number
          box4: number
          box5: number
          box6: number
          box7: number
          box8: number
          box9: number
          client_id: string | null
          created_at: string
          hmrc_receipt: string | null
          id: string
          notes: string | null
          period_end: string
          period_start: string
          status: string
          submitted_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          box1?: number
          box2?: number
          box3?: number
          box4?: number
          box5?: number
          box6?: number
          box7?: number
          box8?: number
          box9?: number
          client_id?: string | null
          created_at?: string
          hmrc_receipt?: string | null
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          status?: string
          submitted_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          box1?: number
          box2?: number
          box3?: number
          box4?: number
          box5?: number
          box6?: number
          box7?: number
          box8?: number
          box9?: number
          client_id?: string | null
          created_at?: string
          hmrc_receipt?: string | null
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          status?: string
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vat_returns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vat_returns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "vat_returns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "vat_returns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vat_returns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          created_at: string
          events: string[]
          id: string
          is_enabled: boolean | null
          name: string
          secret: string
          tenant_id: string
          url: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          id?: string
          is_enabled?: boolean | null
          name: string
          secret: string
          tenant_id: string
          url: string
        }
        Update: {
          created_at?: string
          events?: string[]
          id?: string
          is_enabled?: boolean | null
          name?: string
          secret?: string
          tenant_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_endpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
    }
    Views: {
      v_billing_kpis: {
        Row: {
          invoices_count: number | null
          invoices_total: number | null
          month: string | null
          overdue_count: number | null
          overdue_total: number | null
          paid_total: number | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_company_register_health: {
        Row: {
          active_directors: number | null
          active_members: number | null
          active_pscs: number | null
          client_id: string | null
          client_legal_name: string | null
          company_number: string | null
          has_auth_code: boolean | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "company_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "company_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_overdue_tasks: {
        Row: {
          assigned_to_user_id: string | null
          assigned_user_name: string | null
          client_id: string | null
          client_legal_name: string | null
          days_overdue: number | null
          due_date: string | null
          entity_type: Database["public"]["Enums"]["entity_type"] | null
          priority: Database["public"]["Enums"]["priority"] | null
          status: Database["public"]["Enums"]["task_status"] | null
          task_id: string | null
          tenant_id: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_practice_dashboard_kpis: {
        Row: {
          active_clients: number | null
          open_tasks: number | null
          overdue_invoices: number | null
          overdue_tasks: number | null
          tenant_id: string | null
          vat_due_14d: number | null
        }
        Insert: {
          active_clients?: never
          open_tasks?: never
          overdue_invoices?: never
          overdue_tasks?: never
          tenant_id?: string | null
          vat_due_14d?: never
        }
        Update: {
          active_clients?: never
          open_tasks?: never
          overdue_invoices?: never
          overdue_tasks?: never
          tenant_id?: string | null
          vat_due_14d?: never
        }
        Relationships: []
      }
      v_secretarial_changes_pending: {
        Row: {
          client_id: string | null
          client_legal_name: string | null
          created_at: string | null
          description: string | null
          effective_date: string | null
          event_id: string | null
          event_type: string | null
          status: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "secretarial_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secretarial_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "secretarial_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "secretarial_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secretarial_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_secretarial_due: {
        Row: {
          accounts_urgency: string | null
          client_id: string | null
          client_legal_name: string | null
          company_number: string | null
          cs_urgency: string | null
          next_accounts_due: string | null
          next_confirmation_statement_due: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "company_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "company_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_submission_jobs_recent: {
        Row: {
          attempt_count: number | null
          client_id: string | null
          client_legal_name: string | null
          correlation_id: string | null
          created_at: string | null
          last_error: string | null
          provider: string | null
          status: string | null
          submission_job_id: string | null
          submission_type: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "submission_jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "submission_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_submission_success_30d: {
        Row: {
          accepted_30d: number | null
          provider: string | null
          rejected_30d: number | null
          submission_type: string | null
          success_pct_30d: number | null
          tenant_id: string | null
          total_30d: number | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_tasks_due_next_14d: {
        Row: {
          assigned_user_name: string | null
          client_id: string | null
          client_legal_name: string | null
          days_until_due: number | null
          due_date: string | null
          priority: Database["public"]["Enums"]["priority"] | null
          status: Database["public"]["Enums"]["task_status"] | null
          task_id: string | null
          tenant_id: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_threads_needing_attention: {
        Row: {
          client_id: string | null
          client_legal_name: string | null
          last_message_at: string | null
          last_sender_type: string | null
          priority: string | null
          status: string | null
          subject: string | null
          tenant_id: string | null
          thread_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "message_threads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "message_threads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_vat_due: {
        Row: {
          client_id: string | null
          client_legal_name: string | null
          net_vat_due: number | null
          period_end: string | null
          period_start: string | null
          status: string | null
          submitted_at: string | null
          tenant_id: string | null
          vat_return_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vat_returns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vat_returns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "vat_returns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "vat_returns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vat_returns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
    }
    Functions: {
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      seed_template_whitelist: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      seed_templates_and_automations: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      seed_tenant: { Args: { p_tenant_id: string }; Returns: undefined }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "firm_owner"
        | "manager"
        | "staff"
        | "payroll_officer"
        | "client_user"
        | "employee"
      client_status: "prospect" | "active" | "dormant" | "ceased"
      entity_type:
        | "ltd"
        | "sole_trader"
        | "partnership"
        | "llp"
        | "charity"
        | "trust"
      integration_provider:
        | "hmrc"
        | "companies_house"
        | "charity_commission"
        | "open_banking"
        | "stripe"
        | "gocardless"
      priority: "low" | "medium" | "high" | "urgent"
      submission_status:
        | "draft"
        | "queued"
        | "sent"
        | "accepted"
        | "rejected"
        | "cancelled"
      task_status:
        | "todo"
        | "in_progress"
        | "blocked"
        | "awaiting_client"
        | "awaiting_hmrc"
        | "done"
        | "cancelled"
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
      app_role: [
        "super_admin",
        "firm_owner",
        "manager",
        "staff",
        "payroll_officer",
        "client_user",
        "employee",
      ],
      client_status: ["prospect", "active", "dormant", "ceased"],
      entity_type: [
        "ltd",
        "sole_trader",
        "partnership",
        "llp",
        "charity",
        "trust",
      ],
      integration_provider: [
        "hmrc",
        "companies_house",
        "charity_commission",
        "open_banking",
        "stripe",
        "gocardless",
      ],
      priority: ["low", "medium", "high", "urgent"],
      submission_status: [
        "draft",
        "queued",
        "sent",
        "accepted",
        "rejected",
        "cancelled",
      ],
      task_status: [
        "todo",
        "in_progress",
        "blocked",
        "awaiting_client",
        "awaiting_hmrc",
        "done",
        "cancelled",
      ],
    },
  },
} as const
