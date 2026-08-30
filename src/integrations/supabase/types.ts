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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounting_judgements: {
        Row: {
          amount_pence: number | null
          bank_transaction_id: string | null
          client_id: string
          created_at: string
          created_by_user_id: string | null
          data_json: Json
          description: string | null
          document_id: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          judgement_type: string
          period_id: string
          posted_journal_id: string | null
          proposed_account_id: string | null
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          amount_pence?: number | null
          bank_transaction_id?: string | null
          client_id: string
          created_at?: string
          created_by_user_id?: string | null
          data_json?: Json
          description?: string | null
          document_id?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          judgement_type: string
          period_id: string
          posted_journal_id?: string | null
          proposed_account_id?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          amount_pence?: number | null
          bank_transaction_id?: string | null
          client_id?: string
          created_at?: string
          created_by_user_id?: string | null
          data_json?: Json
          description?: string | null
          document_id?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          judgement_type?: string
          period_id?: string
          posted_journal_id?: string | null
          proposed_account_id?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_judgements_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_judgements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_judgements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "accounting_judgements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "accounting_judgements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "accounting_judgements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_judgements_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounts_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_judgements_posted_journal_id_fkey"
            columns: ["posted_journal_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_judgements_proposed_account_id_fkey"
            columns: ["proposed_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_judgements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_judgements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      accounts_periods: {
        Row: {
          accounts_standard: string
          client_id: string
          created_at: string
          ct600_status: string
          filing_deadline: string | null
          id: string
          notes: string | null
          period_end: string
          period_start: string
          period_type: string
          sa_status: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accounts_standard?: string
          client_id: string
          created_at?: string
          ct600_status?: string
          filing_deadline?: string | null
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          period_type?: string
          sa_status?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accounts_standard?: string
          client_id?: string
          created_at?: string
          ct600_status?: string
          filing_deadline?: string | null
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          period_type?: string
          sa_status?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_periods_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_periods_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "accounts_periods_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "accounts_periods_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "accounts_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      aml_monitoring_alerts: {
        Row: {
          alert_type: string
          case_id: string
          client_id: string
          created_at: string
          description: string | null
          id: string
          metadata_json: Json
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by_user_id: string | null
          severity: string
          source: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          alert_type: string
          case_id: string
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata_json?: Json
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          severity?: string
          source?: string
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          case_id?: string
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata_json?: Json
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          severity?: string
          source?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aml_monitoring_alerts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "kyc_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aml_monitoring_alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aml_monitoring_alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "aml_monitoring_alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "aml_monitoring_alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "aml_monitoring_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aml_monitoring_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
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
      automation_execution_log: {
        Row: {
          executed_at: string
          id: string
          result_message: string | null
          rule_id: string | null
          status: string
          tenant_id: string
          trigger_data_json: Json | null
        }
        Insert: {
          executed_at?: string
          id?: string
          result_message?: string | null
          rule_id?: string | null
          status?: string
          tenant_id: string
          trigger_data_json?: Json | null
        }
        Update: {
          executed_at?: string
          id?: string
          result_message?: string | null
          rule_id?: string | null
          status?: string
          tenant_id?: string
          trigger_data_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_execution_log_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_execution_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_execution_log_tenant_id_fkey"
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
      bank_connections: {
        Row: {
          account_name: string
          account_number_masked: string | null
          balance_pence: number | null
          balance_updated_at: string | null
          client_id: string
          consent_expires_at: string | null
          created_at: string
          currency: string
          id: string
          ledger_account_id: string | null
          metadata_json: Json
          provider: string
          provider_connection_id: string | null
          sort_code: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number_masked?: string | null
          balance_pence?: number | null
          balance_updated_at?: string | null
          client_id: string
          consent_expires_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          ledger_account_id?: string | null
          metadata_json?: Json
          provider?: string
          provider_connection_id?: string | null
          sort_code?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number_masked?: string | null
          balance_pence?: number | null
          balance_updated_at?: string | null
          client_id?: string
          consent_expires_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          ledger_account_id?: string | null
          metadata_json?: Json
          provider?: string
          provider_connection_id?: string | null
          sort_code?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "bank_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "bank_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "bank_connections_ledger_account_id_fkey"
            columns: ["ledger_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount_pence: number
          bank_connection_id: string
          categorisation_status: string
          client_id: string
          confirmed_account_id: string | null
          created_at: string
          description: string
          id: string
          journal_entry_id: string | null
          matched_rule_id: string | null
          metadata_json: Json
          provider_transaction_id: string | null
          reference: string | null
          running_balance_pence: number | null
          suggested_account_id: string | null
          tenant_id: string
          transaction_date: string
          transaction_type: string | null
          updated_at: string
        }
        Insert: {
          amount_pence: number
          bank_connection_id: string
          categorisation_status?: string
          client_id: string
          confirmed_account_id?: string | null
          created_at?: string
          description: string
          id?: string
          journal_entry_id?: string | null
          matched_rule_id?: string | null
          metadata_json?: Json
          provider_transaction_id?: string | null
          reference?: string | null
          running_balance_pence?: number | null
          suggested_account_id?: string | null
          tenant_id: string
          transaction_date: string
          transaction_type?: string | null
          updated_at?: string
        }
        Update: {
          amount_pence?: number
          bank_connection_id?: string
          categorisation_status?: string
          client_id?: string
          confirmed_account_id?: string | null
          created_at?: string
          description?: string
          id?: string
          journal_entry_id?: string | null
          matched_rule_id?: string | null
          metadata_json?: Json
          provider_transaction_id?: string | null
          reference?: string | null
          running_balance_pence?: number | null
          suggested_account_id?: string | null
          tenant_id?: string
          transaction_date?: string
          transaction_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_connection_id_fkey"
            columns: ["bank_connection_id"]
            isOneToOne: false
            referencedRelation: "bank_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "bank_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "bank_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "bank_transactions_confirmed_account_id_fkey"
            columns: ["confirmed_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_suggested_account_id_fkey"
            columns: ["suggested_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          assigned_user_id: string | null
          client_id: string | null
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_at: string
          event_type: string
          id: string
          metadata_json: Json
          recurrence_rule: string | null
          start_at: string
          task_id: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          assigned_user_id?: string | null
          client_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at: string
          event_type?: string
          id?: string
          metadata_json?: Json
          recurrence_rule?: string | null
          start_at: string
          task_id?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          assigned_user_id?: string | null
          client_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string
          event_type?: string
          id?: string
          metadata_json?: Json
          recurrence_rule?: string | null
          start_at?: string
          task_id?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "calendar_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "calendar_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "calendar_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "calendar_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "calendar_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      categorisation_rules: {
        Row: {
          auto_post: boolean
          client_id: string | null
          created_at: string
          created_by: string | null
          hit_count: number
          id: string
          is_active: boolean
          last_matched_at: string | null
          match_field: string
          match_type: string
          match_value: string
          name: string
          priority: number
          target_account_id: string
          tenant_id: string
          updated_at: string
          vat_code: string | null
        }
        Insert: {
          auto_post?: boolean
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          hit_count?: number
          id?: string
          is_active?: boolean
          last_matched_at?: string | null
          match_field?: string
          match_type?: string
          match_value: string
          name: string
          priority?: number
          target_account_id: string
          tenant_id: string
          updated_at?: string
          vat_code?: string | null
        }
        Update: {
          auto_post?: boolean
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          hit_count?: number
          id?: string
          is_active?: boolean
          last_matched_at?: string | null
          match_field?: string
          match_type?: string
          match_value?: string
          name?: string
          priority?: number
          target_account_id?: string
          tenant_id?: string
          updated_at?: string
          vat_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categorisation_rules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorisation_rules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "categorisation_rules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "categorisation_rules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "categorisation_rules_target_account_id_fkey"
            columns: ["target_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorisation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorisation_rules_tenant_id_fkey"
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
          environment: string
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
          environment?: string
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
          environment?: string
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
            referencedRelation: "v_secretarial_due"
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
      charity_annual_returns: {
        Row: {
          charity_profile_id: string
          client_id: string
          created_at: string
          evidence_document_id: string | null
          external_reference: string | null
          financial_year_end: string
          gross_expenditure_pence: number
          gross_income_pence: number
          id: string
          return_json: Json
          status: string
          submission_method: string
          submitted_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          charity_profile_id: string
          client_id: string
          created_at?: string
          evidence_document_id?: string | null
          external_reference?: string | null
          financial_year_end: string
          gross_expenditure_pence?: number
          gross_income_pence?: number
          id?: string
          return_json?: Json
          status?: string
          submission_method?: string
          submitted_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          charity_profile_id?: string
          client_id?: string
          created_at?: string
          evidence_document_id?: string | null
          external_reference?: string | null
          financial_year_end?: string
          gross_expenditure_pence?: number
          gross_income_pence?: number
          id?: string
          return_json?: Json
          status?: string
          submission_method?: string
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "charity_annual_returns_charity_profile_id_fkey"
            columns: ["charity_profile_id"]
            isOneToOne: false
            referencedRelation: "charity_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charity_annual_returns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charity_annual_returns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "charity_annual_returns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "charity_annual_returns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "charity_annual_returns_evidence_document_id_fkey"
            columns: ["evidence_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charity_annual_returns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charity_annual_returns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      charity_applications: {
        Row: {
          application_json: Json
          application_type: string
          charity_profile_id: string
          client_id: string
          created_at: string
          evidence_document_id: string | null
          external_reference: string | null
          id: string
          status: string
          submitted_at: string | null
          tenant_id: string
          trustee_declaration_at: string | null
          trustee_declaration_by_user_id: string | null
          updated_at: string
        }
        Insert: {
          application_json?: Json
          application_type?: string
          charity_profile_id: string
          client_id: string
          created_at?: string
          evidence_document_id?: string | null
          external_reference?: string | null
          id?: string
          status?: string
          submitted_at?: string | null
          tenant_id: string
          trustee_declaration_at?: string | null
          trustee_declaration_by_user_id?: string | null
          updated_at?: string
        }
        Update: {
          application_json?: Json
          application_type?: string
          charity_profile_id?: string
          client_id?: string
          created_at?: string
          evidence_document_id?: string | null
          external_reference?: string | null
          id?: string
          status?: string
          submitted_at?: string | null
          tenant_id?: string
          trustee_declaration_at?: string | null
          trustee_declaration_by_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "charity_applications_charity_profile_id_fkey"
            columns: ["charity_profile_id"]
            isOneToOne: false
            referencedRelation: "charity_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charity_applications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charity_applications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "charity_applications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "charity_applications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "charity_applications_evidence_document_id_fkey"
            columns: ["evidence_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charity_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charity_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      charity_profiles: {
        Row: {
          charity_number: string | null
          client_id: string
          commission_last_synced_at: string | null
          created_at: string
          governing_document_type: string | null
          hmrc_charities_reference: string | null
          id: string
          legal_structure: string
          metadata_json: Json
          public_benefit_summary: string | null
          registration_status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          charity_number?: string | null
          client_id: string
          commission_last_synced_at?: string | null
          created_at?: string
          governing_document_type?: string | null
          hmrc_charities_reference?: string | null
          id?: string
          legal_structure?: string
          metadata_json?: Json
          public_benefit_summary?: string | null
          registration_status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          charity_number?: string | null
          client_id?: string
          commission_last_synced_at?: string | null
          created_at?: string
          governing_document_type?: string | null
          hmrc_charities_reference?: string | null
          id?: string
          legal_structure?: string
          metadata_json?: Json
          public_benefit_summary?: string | null
          registration_status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "charity_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charity_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "charity_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "charity_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "charity_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charity_profiles_tenant_id_fkey"
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
      cis_contractors: {
        Row: {
          accounts_office_ref: string | null
          client_id: string
          created_at: string
          id: string
          paye_reference: string | null
          status: string
          tenant_id: string
          updated_at: string
          utr: string
          verification_date: string | null
        }
        Insert: {
          accounts_office_ref?: string | null
          client_id: string
          created_at?: string
          id?: string
          paye_reference?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          utr: string
          verification_date?: string | null
        }
        Update: {
          accounts_office_ref?: string | null
          client_id?: string
          created_at?: string
          id?: string
          paye_reference?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          utr?: string
          verification_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cis_contractors_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cis_contractors_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "cis_contractors_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "cis_contractors_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "cis_contractors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cis_contractors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      cis_deductions: {
        Row: {
          contractor_id: string
          created_at: string
          deduction_amount_pence: number
          deduction_rate: number
          description: string | null
          gross_amount_pence: number
          id: string
          materials_amount_pence: number
          net_amount_pence: number
          payment_date: string | null
          subcontractor_id: string
          tax_month: number
          tax_year: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          contractor_id: string
          created_at?: string
          deduction_amount_pence?: number
          deduction_rate: number
          description?: string | null
          gross_amount_pence?: number
          id?: string
          materials_amount_pence?: number
          net_amount_pence?: number
          payment_date?: string | null
          subcontractor_id: string
          tax_month: number
          tax_year: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          contractor_id?: string
          created_at?: string
          deduction_amount_pence?: number
          deduction_rate?: number
          description?: string | null
          gross_amount_pence?: number
          id?: string
          materials_amount_pence?: number
          net_amount_pence?: number
          payment_date?: string | null
          subcontractor_id?: string
          tax_month?: number
          tax_year?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cis_deductions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "cis_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cis_deductions_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "cis_subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cis_deductions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cis_deductions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      cis_monthly_returns: {
        Row: {
          contractor_id: string
          created_at: string
          employment_status_declaration: boolean
          hmrc_receipt_id: string | null
          id: string
          nil_return: boolean
          status: string
          submission_job_id: string | null
          submitted_at: string | null
          tax_month: number
          tax_year: string
          tenant_id: string
          total_deductions_pence: number
          total_gross_pence: number
          total_materials_pence: number
          updated_at: string
        }
        Insert: {
          contractor_id: string
          created_at?: string
          employment_status_declaration?: boolean
          hmrc_receipt_id?: string | null
          id?: string
          nil_return?: boolean
          status?: string
          submission_job_id?: string | null
          submitted_at?: string | null
          tax_month: number
          tax_year: string
          tenant_id: string
          total_deductions_pence?: number
          total_gross_pence?: number
          total_materials_pence?: number
          updated_at?: string
        }
        Update: {
          contractor_id?: string
          created_at?: string
          employment_status_declaration?: boolean
          hmrc_receipt_id?: string | null
          id?: string
          nil_return?: boolean
          status?: string
          submission_job_id?: string | null
          submitted_at?: string | null
          tax_month?: number
          tax_year?: string
          tenant_id?: string
          total_deductions_pence?: number
          total_gross_pence?: number
          total_materials_pence?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cis_monthly_returns_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "cis_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cis_monthly_returns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cis_monthly_returns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      cis_subcontractors: {
        Row: {
          address_json: Json
          client_id: string | null
          company_number: string | null
          contractor_id: string
          created_at: string
          deduction_rate: number
          hmrc_verification_ref: string | null
          id: string
          last_verified_at: string | null
          name: string
          nino: string | null
          tenant_id: string
          trading_name: string | null
          updated_at: string
          utr: string | null
          verification_status: string
        }
        Insert: {
          address_json?: Json
          client_id?: string | null
          company_number?: string | null
          contractor_id: string
          created_at?: string
          deduction_rate?: number
          hmrc_verification_ref?: string | null
          id?: string
          last_verified_at?: string | null
          name: string
          nino?: string | null
          tenant_id: string
          trading_name?: string | null
          updated_at?: string
          utr?: string | null
          verification_status?: string
        }
        Update: {
          address_json?: Json
          client_id?: string | null
          company_number?: string | null
          contractor_id?: string
          created_at?: string
          deduction_rate?: number
          hmrc_verification_ref?: string | null
          id?: string
          last_verified_at?: string | null
          name?: string
          nino?: string | null
          tenant_id?: string
          trading_name?: string | null
          updated_at?: string
          utr?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cis_subcontractors_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cis_subcontractors_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "cis_subcontractors_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "cis_subcontractors_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "cis_subcontractors_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "cis_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cis_subcontractors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cis_subcontractors_tenant_id_fkey"
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
            referencedRelation: "v_secretarial_due"
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
      client_onboarding: {
        Row: {
          aml_case_id: string | null
          client_id: string
          coa_template_id: string | null
          completed_at: string | null
          created_at: string
          current_step: string
          engagement_document_id: string | null
          engagement_signed: boolean
          id: string
          notes: string | null
          selected_services: string[]
          started_by: string | null
          status: string
          steps_json: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          aml_case_id?: string | null
          client_id: string
          coa_template_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: string
          engagement_document_id?: string | null
          engagement_signed?: boolean
          id?: string
          notes?: string | null
          selected_services?: string[]
          started_by?: string | null
          status?: string
          steps_json?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          aml_case_id?: string | null
          client_id?: string
          coa_template_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: string
          engagement_document_id?: string | null
          engagement_signed?: boolean
          id?: string
          notes?: string | null
          selected_services?: string[]
          started_by?: string | null
          status?: string
          steps_json?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_onboarding_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_onboarding_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_onboarding_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_onboarding_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_onboarding_coa_template_id_fkey"
            columns: ["coa_template_id"]
            isOneToOne: false
            referencedRelation: "coa_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_onboarding_engagement_document_id_fkey"
            columns: ["engagement_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_onboarding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_onboarding_tenant_id_fkey"
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
            referencedRelation: "v_secretarial_due"
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
            referencedRelation: "v_secretarial_due"
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
            referencedRelation: "v_secretarial_due"
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
            referencedRelation: "v_secretarial_due"
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
            referencedRelation: "v_secretarial_due"
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
      currencies: {
        Row: {
          code: string
          created_at: string
          exchange_rate: number
          id: string
          is_active: boolean
          is_base: boolean
          name: string
          rate_updated_at: string | null
          symbol: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          exchange_rate?: number
          id?: string
          is_active?: boolean
          is_base?: boolean
          name: string
          rate_updated_at?: string | null
          symbol?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          exchange_rate?: number
          id?: string
          is_active?: boolean
          is_base?: boolean
          name?: string
          rate_updated_at?: string | null
          symbol?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "currencies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "currencies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      data_subject_requests: {
        Row: {
          acknowledged_at: string | null
          completed_at: string | null
          created_at: string
          decision_notes: string | null
          id: string
          request_type: string
          requested_at: string
          status: string
          subject_user_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          completed_at?: string | null
          created_at?: string
          decision_notes?: string | null
          id?: string
          request_type: string
          requested_at?: string
          status?: string
          subject_user_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          completed_at?: string | null
          created_at?: string
          decision_notes?: string | null
          id?: string
          request_type?: string
          requested_at?: string
          status?: string
          subject_user_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_subject_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_subject_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      document_fingerprints: {
        Row: {
          client_id: string | null
          created_at: string
          document_id: string
          id: string
          sha256: string
          size_bytes: number
          tenant_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          document_id: string
          id?: string
          sha256: string
          size_bytes?: number
          tenant_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          document_id?: string
          id?: string
          sha256?: string
          size_bytes?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_fingerprints_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_fingerprints_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "document_fingerprints_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "document_fingerprints_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "document_fingerprints_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_fingerprints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_fingerprints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      document_requests: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          document_types: string[]
          due_date: string | null
          id: string
          requested_by_user_id: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          document_types?: string[]
          due_date?: string | null
          id?: string
          requested_by_user_id?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          document_types?: string[]
          due_date?: string | null
          id?: string
          requested_by_user_id?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "document_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "document_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "document_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_tenant_id_fkey"
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
      document_versions: {
        Row: {
          created_at: string
          document_id: string
          id: string
          notes: string | null
          size_bytes: number
          storage_path: string
          uploaded_by_user_id: string | null
          version_number: number
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          notes?: string | null
          size_bytes?: number
          storage_path: string
          uploaded_by_user_id?: string | null
          version_number?: number
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          notes?: string | null
          size_bytes?: number
          storage_path?: string
          uploaded_by_user_id?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          client_id: string | null
          created_at: string
          document_type: string
          filename: string
          folder_path: string
          id: string
          metadata_json: Json
          mime_type: string
          ocr_text: string | null
          request_id: string | null
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
          folder_path?: string
          id?: string
          metadata_json?: Json
          mime_type: string
          ocr_text?: string | null
          request_id?: string | null
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
          folder_path?: string
          id?: string
          metadata_json?: Json
          mime_type?: string
          ocr_text?: string | null
          request_id?: string | null
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
            referencedRelation: "v_secretarial_due"
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
            foreignKeyName: "documents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "document_requests"
            referencedColumns: ["id"]
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
      duplicate_candidates: {
        Row: {
          candidate_document_id: string
          client_id: string
          confidence: number
          created_at: string
          detection_method: string
          id: string
          period_id: string | null
          primary_document_id: string
          reasons_json: Json
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          candidate_document_id: string
          client_id: string
          confidence?: number
          created_at?: string
          detection_method: string
          id?: string
          period_id?: string | null
          primary_document_id: string
          reasons_json?: Json
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          candidate_document_id?: string
          client_id?: string
          confidence?: number
          created_at?: string
          detection_method?: string
          id?: string
          period_id?: string | null
          primary_document_id?: string
          reasons_json?: Json
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "duplicate_candidates_candidate_document_id_fkey"
            columns: ["candidate_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_candidates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_candidates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "duplicate_candidates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "duplicate_candidates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "duplicate_candidates_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounts_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_candidates_primary_document_id_fkey"
            columns: ["primary_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_candidates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_candidates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      ec_sales_entries: {
        Row: {
          client_id: string
          country_code: string
          created_at: string
          customer_name: string
          customer_vat_number: string
          id: string
          period_end: string
          period_start: string
          status: string
          supply_type: string
          tenant_id: string
          updated_at: string
          value_gbp_pence: number
          vat_return_id: string | null
        }
        Insert: {
          client_id: string
          country_code: string
          created_at?: string
          customer_name: string
          customer_vat_number: string
          id?: string
          period_end: string
          period_start: string
          status?: string
          supply_type?: string
          tenant_id: string
          updated_at?: string
          value_gbp_pence?: number
          vat_return_id?: string | null
        }
        Update: {
          client_id?: string
          country_code?: string
          created_at?: string
          customer_name?: string
          customer_vat_number?: string
          id?: string
          period_end?: string
          period_start?: string
          status?: string
          supply_type?: string
          tenant_id?: string
          updated_at?: string
          value_gbp_pence?: number
          vat_return_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ec_sales_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ec_sales_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ec_sales_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ec_sales_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ec_sales_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ec_sales_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ec_sales_entries_vat_return_id_fkey"
            columns: ["vat_return_id"]
            isOneToOne: false
            referencedRelation: "v_vat_due"
            referencedColumns: ["vat_return_id"]
          },
          {
            foreignKeyName: "ec_sales_entries_vat_return_id_fkey"
            columns: ["vat_return_id"]
            isOneToOne: false
            referencedRelation: "vat_returns"
            referencedColumns: ["id"]
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
            referencedRelation: "v_secretarial_due"
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
      evidence_matches: {
        Row: {
          bank_transaction_id: string
          client_id: string
          confidence: number
          created_at: string
          document_id: string
          extraction_id: string | null
          factors_json: Json
          id: string
          match_type: string
          period_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          bank_transaction_id: string
          client_id: string
          confidence?: number
          created_at?: string
          document_id: string
          extraction_id?: string | null
          factors_json?: Json
          id?: string
          match_type?: string
          period_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          bank_transaction_id?: string
          client_id?: string
          confidence?: number
          created_at?: string
          document_id?: string
          extraction_id?: string | null
          factors_json?: Json
          id?: string
          match_type?: string
          period_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_matches_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_matches_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_matches_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "evidence_matches_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "evidence_matches_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "evidence_matches_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_matches_extraction_id_fkey"
            columns: ["extraction_id"]
            isOneToOne: false
            referencedRelation: "receipt_extractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_matches_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounts_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_matches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_matches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      gift_aid_claims: {
        Row: {
          charity_profile_id: string
          claim_reference: string
          client_id: string
          created_at: string
          donation_count: number
          donation_total_pence: number
          finalised_at: string | null
          finalised_by_user_id: string | null
          hmrc_response_json: Json | null
          id: string
          period_end: string
          period_start: string
          status: string
          submission_job_id: string | null
          tax_reclaim_pence: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          charity_profile_id: string
          claim_reference: string
          client_id: string
          created_at?: string
          donation_count?: number
          donation_total_pence?: number
          finalised_at?: string | null
          finalised_by_user_id?: string | null
          hmrc_response_json?: Json | null
          id?: string
          period_end: string
          period_start: string
          status?: string
          submission_job_id?: string | null
          tax_reclaim_pence?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          charity_profile_id?: string
          claim_reference?: string
          client_id?: string
          created_at?: string
          donation_count?: number
          donation_total_pence?: number
          finalised_at?: string | null
          finalised_by_user_id?: string | null
          hmrc_response_json?: Json | null
          id?: string
          period_end?: string
          period_start?: string
          status?: string
          submission_job_id?: string | null
          tax_reclaim_pence?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_aid_claims_charity_profile_id_fkey"
            columns: ["charity_profile_id"]
            isOneToOne: false
            referencedRelation: "charity_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_aid_claims_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_aid_claims_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "gift_aid_claims_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "gift_aid_claims_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "gift_aid_claims_submission_job_id_fkey"
            columns: ["submission_job_id"]
            isOneToOne: false
            referencedRelation: "submission_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_aid_claims_submission_job_id_fkey"
            columns: ["submission_job_id"]
            isOneToOne: false
            referencedRelation: "v_submission_jobs_recent"
            referencedColumns: ["submission_job_id"]
          },
          {
            foreignKeyName: "gift_aid_claims_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_aid_claims_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      gift_aid_donations: {
        Row: {
          claim_id: string
          client_id: string
          created_at: string
          declaration_confirmed: boolean
          declaration_document_id: string | null
          donation_date: string
          donation_pence: number
          donor_house: string | null
          donor_name: string
          donor_postcode: string | null
          id: string
          metadata_json: Json
          sponsored_event: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          claim_id: string
          client_id: string
          created_at?: string
          declaration_confirmed?: boolean
          declaration_document_id?: string | null
          donation_date: string
          donation_pence: number
          donor_house?: string | null
          donor_name: string
          donor_postcode?: string | null
          id?: string
          metadata_json?: Json
          sponsored_event?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          claim_id?: string
          client_id?: string
          created_at?: string
          declaration_confirmed?: boolean
          declaration_document_id?: string | null
          donation_date?: string
          donation_pence?: number
          donor_house?: string | null
          donor_name?: string
          donor_postcode?: string | null
          id?: string
          metadata_json?: Json
          sponsored_event?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_aid_donations_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "gift_aid_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_aid_donations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_aid_donations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "gift_aid_donations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "gift_aid_donations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "gift_aid_donations_declaration_document_id_fkey"
            columns: ["declaration_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_aid_donations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_aid_donations_tenant_id_fkey"
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
            referencedRelation: "v_secretarial_due"
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
            referencedRelation: "v_secretarial_due"
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
          dunning_count: number | null
          id: string
          invoice_number: string
          issue_date: string
          last_dunning_at: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          status: string
          stripe_checkout_url: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
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
          dunning_count?: number | null
          id?: string
          invoice_number: string
          issue_date?: string
          last_dunning_at?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          stripe_checkout_url?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
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
          dunning_count?: number | null
          id?: string
          invoice_number?: string
          issue_date?: string
          last_dunning_at?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          stripe_checkout_url?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
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
            referencedRelation: "v_secretarial_due"
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
      itsa_final_declarations: {
        Row: {
          calculation_json: Json
          client_id: string
          created_at: string
          declaration_accepted: boolean
          hmrc_receipt_id: string | null
          id: string
          status: string
          submission_job_id: string | null
          submitted_at: string | null
          tax_year: string
          tenant_id: string
          total_deductions_pence: number
          total_income_pence: number
          total_tax_due_pence: number
          updated_at: string
        }
        Insert: {
          calculation_json?: Json
          client_id: string
          created_at?: string
          declaration_accepted?: boolean
          hmrc_receipt_id?: string | null
          id?: string
          status?: string
          submission_job_id?: string | null
          submitted_at?: string | null
          tax_year: string
          tenant_id: string
          total_deductions_pence?: number
          total_income_pence?: number
          total_tax_due_pence?: number
          updated_at?: string
        }
        Update: {
          calculation_json?: Json
          client_id?: string
          created_at?: string
          declaration_accepted?: boolean
          hmrc_receipt_id?: string | null
          id?: string
          status?: string
          submission_job_id?: string | null
          submitted_at?: string | null
          tax_year?: string
          tenant_id?: string
          total_deductions_pence?: number
          total_income_pence?: number
          total_tax_due_pence?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "itsa_final_declarations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itsa_final_declarations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "itsa_final_declarations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "itsa_final_declarations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "itsa_final_declarations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itsa_final_declarations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      itsa_obligations: {
        Row: {
          business_id: string | null
          client_id: string
          created_at: string
          due_date: string
          hmrc_receipt_id: string | null
          id: string
          nino: string
          obligation_type: string
          period_end: string
          period_start: string
          status: string
          submission_job_id: string | null
          submitted_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          client_id: string
          created_at?: string
          due_date: string
          hmrc_receipt_id?: string | null
          id?: string
          nino: string
          obligation_type?: string
          period_end: string
          period_start: string
          status?: string
          submission_job_id?: string | null
          submitted_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          client_id?: string
          created_at?: string
          due_date?: string
          hmrc_receipt_id?: string | null
          id?: string
          nino?: string
          obligation_type?: string
          period_end?: string
          period_start?: string
          status?: string
          submission_job_id?: string | null
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "itsa_obligations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itsa_obligations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "itsa_obligations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "itsa_obligations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "itsa_obligations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itsa_obligations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      itsa_updates: {
        Row: {
          adjustments_json: Json
          client_id: string
          created_at: string
          expenses_json: Json
          hmrc_receipt_id: string | null
          id: string
          income_json: Json
          net_profit_pence: number
          obligation_id: string
          status: string
          submitted_at: string | null
          tenant_id: string
          total_expenses_pence: number
          total_income_pence: number
          update_type: string
          updated_at: string
        }
        Insert: {
          adjustments_json?: Json
          client_id: string
          created_at?: string
          expenses_json?: Json
          hmrc_receipt_id?: string | null
          id?: string
          income_json?: Json
          net_profit_pence?: number
          obligation_id: string
          status?: string
          submitted_at?: string | null
          tenant_id: string
          total_expenses_pence?: number
          total_income_pence?: number
          update_type?: string
          updated_at?: string
        }
        Update: {
          adjustments_json?: Json
          client_id?: string
          created_at?: string
          expenses_json?: Json
          hmrc_receipt_id?: string | null
          id?: string
          income_json?: Json
          net_profit_pence?: number
          obligation_id?: string
          status?: string
          submitted_at?: string | null
          tenant_id?: string
          total_expenses_pence?: number
          total_income_pence?: number
          update_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "itsa_updates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itsa_updates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "itsa_updates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "itsa_updates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "itsa_updates_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "itsa_obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itsa_updates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itsa_updates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      ixbrl_filing_instances: {
        Row: {
          accounts_period_id: string | null
          client_id: string
          created_at: string
          generated_at: string | null
          generated_xbrl: string | null
          id: string
          status: string
          submission_job_id: string | null
          submitted_at: string | null
          taxonomy_id: string
          tenant_id: string
          updated_at: string
          validation_errors_json: Json
        }
        Insert: {
          accounts_period_id?: string | null
          client_id: string
          created_at?: string
          generated_at?: string | null
          generated_xbrl?: string | null
          id?: string
          status?: string
          submission_job_id?: string | null
          submitted_at?: string | null
          taxonomy_id: string
          tenant_id: string
          updated_at?: string
          validation_errors_json?: Json
        }
        Update: {
          accounts_period_id?: string | null
          client_id?: string
          created_at?: string
          generated_at?: string | null
          generated_xbrl?: string | null
          id?: string
          status?: string
          submission_job_id?: string | null
          submitted_at?: string | null
          taxonomy_id?: string
          tenant_id?: string
          updated_at?: string
          validation_errors_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ixbrl_filing_instances_accounts_period_id_fkey"
            columns: ["accounts_period_id"]
            isOneToOne: false
            referencedRelation: "accounts_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ixbrl_filing_instances_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ixbrl_filing_instances_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ixbrl_filing_instances_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ixbrl_filing_instances_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ixbrl_filing_instances_taxonomy_id_fkey"
            columns: ["taxonomy_id"]
            isOneToOne: false
            referencedRelation: "ixbrl_taxonomies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ixbrl_filing_instances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ixbrl_filing_instances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      ixbrl_tag_mappings: {
        Row: {
          account_code: string
          context_ref: string | null
          created_at: string
          decimals: number | null
          id: string
          is_custom: boolean
          notes: string | null
          tag_name: string
          tag_namespace: string
          taxonomy_id: string
          tenant_id: string
          unit_ref: string | null
          updated_at: string
        }
        Insert: {
          account_code: string
          context_ref?: string | null
          created_at?: string
          decimals?: number | null
          id?: string
          is_custom?: boolean
          notes?: string | null
          tag_name: string
          tag_namespace?: string
          taxonomy_id: string
          tenant_id: string
          unit_ref?: string | null
          updated_at?: string
        }
        Update: {
          account_code?: string
          context_ref?: string | null
          created_at?: string
          decimals?: number | null
          id?: string
          is_custom?: boolean
          notes?: string | null
          tag_name?: string
          tag_namespace?: string
          taxonomy_id?: string
          tenant_id?: string
          unit_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ixbrl_tag_mappings_taxonomy_id_fkey"
            columns: ["taxonomy_id"]
            isOneToOne: false
            referencedRelation: "ixbrl_taxonomies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ixbrl_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ixbrl_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      ixbrl_taxonomies: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          schema_url: string | null
          taxonomy_type: string
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          schema_url?: string | null
          taxonomy_type?: string
          version: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          schema_url?: string | null
          taxonomy_type?: string
          version?: string
        }
        Relationships: []
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
            referencedRelation: "v_secretarial_due"
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
      kyc_cases: {
        Row: {
          adverse_media_check: boolean | null
          approved_at: string | null
          approved_by_user_id: string | null
          assigned_to_user_id: string | null
          client_id: string
          created_at: string
          expires_at: string | null
          id: string
          id_verification_provider: string | null
          id_verification_reference: string | null
          id_verification_result_json: Json
          id_verification_status: string | null
          last_monitored_at: string | null
          monitoring_enabled: boolean
          next_review_date: string | null
          pep_check: boolean | null
          risk_level: string
          risk_notes: string | null
          risk_score: number | null
          sanctions_check: boolean | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          adverse_media_check?: boolean | null
          approved_at?: string | null
          approved_by_user_id?: string | null
          assigned_to_user_id?: string | null
          client_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          id_verification_provider?: string | null
          id_verification_reference?: string | null
          id_verification_result_json?: Json
          id_verification_status?: string | null
          last_monitored_at?: string | null
          monitoring_enabled?: boolean
          next_review_date?: string | null
          pep_check?: boolean | null
          risk_level?: string
          risk_notes?: string | null
          risk_score?: number | null
          sanctions_check?: boolean | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          adverse_media_check?: boolean | null
          approved_at?: string | null
          approved_by_user_id?: string | null
          assigned_to_user_id?: string | null
          client_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          id_verification_provider?: string | null
          id_verification_reference?: string | null
          id_verification_result_json?: Json
          id_verification_status?: string | null
          last_monitored_at?: string | null
          monitoring_enabled?: boolean
          next_review_date?: string | null
          pep_check?: boolean | null
          risk_level?: string
          risk_notes?: string | null
          risk_score?: number | null
          sanctions_check?: boolean | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kyc_cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "kyc_cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "kyc_cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "kyc_cases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kyc_cases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      kyc_checks: {
        Row: {
          case_id: string
          check_type: string
          checked_at: string | null
          checked_by_user_id: string | null
          created_at: string
          document_id: string | null
          id: string
          notes: string | null
          result_json: Json
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          case_id: string
          check_type: string
          checked_at?: string | null
          checked_by_user_id?: string | null
          created_at?: string
          document_id?: string | null
          id?: string
          notes?: string | null
          result_json?: Json
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          check_type?: string
          checked_at?: string | null
          checked_by_user_id?: string | null
          created_at?: string
          document_id?: string | null
          id?: string
          notes?: string | null
          result_json?: Json
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_checks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "kyc_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kyc_checks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kyc_checks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kyc_checks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
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
            referencedRelation: "v_secretarial_due"
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
      llp_accounts_reviews: {
        Row: {
          accounts_period_id: string
          client_id: string
          created_at: string
          filing_checklist_json: Json
          id: string
          members_approval_json: Json
          status: string
          submission_job_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accounts_period_id: string
          client_id: string
          created_at?: string
          filing_checklist_json?: Json
          id?: string
          members_approval_json?: Json
          status?: string
          submission_job_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accounts_period_id?: string
          client_id?: string
          created_at?: string
          filing_checklist_json?: Json
          id?: string
          members_approval_json?: Json
          status?: string
          submission_job_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "llp_accounts_reviews_accounts_period_id_fkey"
            columns: ["accounts_period_id"]
            isOneToOne: true
            referencedRelation: "accounts_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llp_accounts_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llp_accounts_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "llp_accounts_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "llp_accounts_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "llp_accounts_reviews_submission_job_id_fkey"
            columns: ["submission_job_id"]
            isOneToOne: false
            referencedRelation: "submission_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llp_accounts_reviews_submission_job_id_fkey"
            columns: ["submission_job_id"]
            isOneToOne: false
            referencedRelation: "v_submission_jobs_recent"
            referencedColumns: ["submission_job_id"]
          },
          {
            foreignKeyName: "llp_accounts_reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llp_accounts_reviews_tenant_id_fkey"
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
            referencedRelation: "v_secretarial_due"
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
            referencedRelation: "v_secretarial_due"
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
            referencedRelation: "v_secretarial_due"
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
            referencedRelation: "v_secretarial_due"
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
      oauth_states: {
        Row: {
          client_id: string
          consumed_at: string | null
          created_at: string
          created_by_user_id: string
          expires_at: string
          id: string
          provider: string
          redirect_uri: string
          scopes: string[]
          state_hash: string
          tenant_id: string
        }
        Insert: {
          client_id: string
          consumed_at?: string | null
          created_at?: string
          created_by_user_id: string
          expires_at: string
          id?: string
          provider: string
          redirect_uri: string
          scopes?: string[]
          state_hash: string
          tenant_id: string
        }
        Update: {
          client_id?: string
          consumed_at?: string | null
          created_at?: string
          created_by_user_id?: string
          expires_at?: string
          id?: string
          provider?: string
          redirect_uri?: string
          scopes?: string[]
          state_hash?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_states_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_states_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "oauth_states_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "oauth_states_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "oauth_states_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_states_tenant_id_fkey"
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
            referencedRelation: "v_secretarial_due"
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
            referencedRelation: "v_secretarial_due"
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
      partners: {
        Row: {
          client_id: string
          created_at: string
          display_name: string
          id: string
          joined_at: string | null
          left_at: string | null
          loss_share_percent: number | null
          metadata_json: Json
          ni_number: string | null
          partner_type: string
          partnership_profile_id: string
          profit_share_percent: number | null
          tenant_id: string
          updated_at: string
          utr: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          display_name: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          loss_share_percent?: number | null
          metadata_json?: Json
          ni_number?: string | null
          partner_type?: string
          partnership_profile_id: string
          profit_share_percent?: number | null
          tenant_id: string
          updated_at?: string
          utr?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          display_name?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          loss_share_percent?: number | null
          metadata_json?: Json
          ni_number?: string | null
          partner_type?: string
          partnership_profile_id?: string
          profit_share_percent?: number | null
          tenant_id?: string
          updated_at?: string
          utr?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "partners_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "partners_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "partners_partnership_profile_id_fkey"
            columns: ["partnership_profile_id"]
            isOneToOne: false
            referencedRelation: "partnership_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      partnership_profiles: {
        Row: {
          accounting_date: string | null
          client_id: string
          companies_house_number: string | null
          created_at: string
          id: string
          metadata_json: Json
          nominated_partner_id: string | null
          partnership_type: string
          partnership_utr: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accounting_date?: string | null
          client_id: string
          companies_house_number?: string | null
          created_at?: string
          id?: string
          metadata_json?: Json
          nominated_partner_id?: string | null
          partnership_type: string
          partnership_utr?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accounting_date?: string | null
          client_id?: string
          companies_house_number?: string | null
          created_at?: string
          id?: string
          metadata_json?: Json
          nominated_partner_id?: string | null
          partnership_type?: string
          partnership_utr?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "partnership_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "partnership_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "partnership_profiles_nominated_partner_id_fkey"
            columns: ["nominated_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      partnership_returns: {
        Row: {
          accounts_period_id: string | null
          allocations_json: Json
          approved_at: string | null
          approved_by_user_id: string | null
          client_id: string
          created_at: string
          hmrc_response_json: Json | null
          id: string
          partnership_profile_id: string
          return_json: Json
          status: string
          submission_job_id: string | null
          tax_year: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accounts_period_id?: string | null
          allocations_json?: Json
          approved_at?: string | null
          approved_by_user_id?: string | null
          client_id: string
          created_at?: string
          hmrc_response_json?: Json | null
          id?: string
          partnership_profile_id: string
          return_json?: Json
          status?: string
          submission_job_id?: string | null
          tax_year: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accounts_period_id?: string | null
          allocations_json?: Json
          approved_at?: string | null
          approved_by_user_id?: string | null
          client_id?: string
          created_at?: string
          hmrc_response_json?: Json | null
          id?: string
          partnership_profile_id?: string
          return_json?: Json
          status?: string
          submission_job_id?: string | null
          tax_year?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_returns_accounts_period_id_fkey"
            columns: ["accounts_period_id"]
            isOneToOne: false
            referencedRelation: "accounts_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_returns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_returns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "partnership_returns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "partnership_returns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "partnership_returns_partnership_profile_id_fkey"
            columns: ["partnership_profile_id"]
            isOneToOne: false
            referencedRelation: "partnership_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_returns_submission_job_id_fkey"
            columns: ["submission_job_id"]
            isOneToOne: false
            referencedRelation: "submission_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_returns_submission_job_id_fkey"
            columns: ["submission_job_id"]
            isOneToOne: false
            referencedRelation: "v_submission_jobs_recent"
            referencedColumns: ["submission_job_id"]
          },
          {
            foreignKeyName: "partnership_returns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_returns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      pay_runs: {
        Row: {
          created_at: string
          employer_id: string
          eps_submission_job_id: string | null
          fps_submission_job_id: string | null
          id: string
          notes: string | null
          pay_date: string
          pay_frequency: string
          period_end: string
          period_start: string
          status: string
          tax_period: number
          tax_year: string
          tenant_id: string
          total_gross_pence: number
          total_net_pence: number
          total_ni_employee_pence: number
          total_ni_employer_pence: number
          total_pension_employee_pence: number | null
          total_pension_employer_pence: number | null
          total_student_loan_pence: number | null
          total_tax_pence: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          employer_id: string
          eps_submission_job_id?: string | null
          fps_submission_job_id?: string | null
          id?: string
          notes?: string | null
          pay_date: string
          pay_frequency?: string
          period_end: string
          period_start: string
          status?: string
          tax_period: number
          tax_year?: string
          tenant_id: string
          total_gross_pence?: number
          total_net_pence?: number
          total_ni_employee_pence?: number
          total_ni_employer_pence?: number
          total_pension_employee_pence?: number | null
          total_pension_employer_pence?: number | null
          total_student_loan_pence?: number | null
          total_tax_pence?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          employer_id?: string
          eps_submission_job_id?: string | null
          fps_submission_job_id?: string | null
          id?: string
          notes?: string | null
          pay_date?: string
          pay_frequency?: string
          period_end?: string
          period_start?: string
          status?: string
          tax_period?: number
          tax_year?: string
          tenant_id?: string
          total_gross_pence?: number
          total_net_pence?: number
          total_ni_employee_pence?: number
          total_ni_employer_pence?: number
          total_pension_employee_pence?: number | null
          total_pension_employer_pence?: number | null
          total_student_loan_pence?: number | null
          total_tax_pence?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_runs_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "payroll_employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      payroll_absences: {
        Row: {
          absence_type: string
          created_at: string
          days: number
          employee_id: string
          employer_id: string
          end_date: string | null
          hours: number | null
          id: string
          is_paid: boolean
          notes: string | null
          start_date: string
          status: string
          statutory_pay_type: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          absence_type: string
          created_at?: string
          days?: number
          employee_id: string
          employer_id: string
          end_date?: string | null
          hours?: number | null
          id?: string
          is_paid?: boolean
          notes?: string | null
          start_date: string
          status?: string
          statutory_pay_type?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          absence_type?: string
          created_at?: string
          days?: number
          employee_id?: string
          employer_id?: string
          end_date?: string | null
          hours?: number | null
          id?: string
          is_paid?: boolean
          notes?: string | null
          start_date?: string
          status?: string
          statutory_pay_type?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_absences_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "payroll_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_absences_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "payroll_employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_absences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_absences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      payroll_benefits: {
        Row: {
          amount_made_good_pence: number | null
          benefit_type: string
          cash_equivalent_pence: number
          created_at: string
          description: string
          employee_id: string
          employer_id: string
          end_date: string | null
          id: string
          metadata_json: Json
          payrolled: boolean
          section: string | null
          start_date: string | null
          tax_year: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_made_good_pence?: number | null
          benefit_type: string
          cash_equivalent_pence?: number
          created_at?: string
          description: string
          employee_id: string
          employer_id: string
          end_date?: string | null
          id?: string
          metadata_json?: Json
          payrolled?: boolean
          section?: string | null
          start_date?: string | null
          tax_year?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_made_good_pence?: number | null
          benefit_type?: string
          cash_equivalent_pence?: number
          created_at?: string
          description?: string
          employee_id?: string
          employer_id?: string
          end_date?: string | null
          id?: string
          metadata_json?: Json
          payrolled?: boolean
          section?: string | null
          start_date?: string | null
          tax_year?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_benefits_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "payroll_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_benefits_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "payroll_employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_benefits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_benefits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      payroll_employees: {
        Row: {
          account_name: string | null
          account_number: string | null
          address_json: Json
          address_line1: string | null
          address_line2: string | null
          annual_salary_pence: number | null
          bank_account_json: Json
          city: string | null
          country: string | null
          county: string | null
          created_at: string
          date_of_birth: string | null
          directors_nic_method: string | null
          email: string | null
          employer_id: string
          first_name: string
          gender: string | null
          holiday_carried_forward: number | null
          holiday_entitlement_days: number | null
          holiday_taken_days: number | null
          hourly_rate_pence: number | null
          id: string
          is_active: boolean
          is_director: boolean
          is_irregular_employment: boolean | null
          last_name: string
          leave_date: string | null
          ni_category: string | null
          ni_number: string | null
          notes: string | null
          p45_issue_date: string | null
          p45_previous_pay_pence: number | null
          p45_previous_tax_pence: number | null
          pay_method: string
          payment_method: string | null
          payroll_id: string | null
          pension_employee_pct: number | null
          pension_employer_pct: number | null
          pension_opt_out: boolean
          phone: string | null
          postcode: string | null
          postgrad_loan: boolean
          sort_code: string | null
          start_date: string | null
          starter_declaration: string | null
          student_loan_plan: string | null
          tax_code: string | null
          tenant_id: string
          title: string | null
          updated_at: string
          user_id: string | null
          week1_month1: boolean | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          address_json?: Json
          address_line1?: string | null
          address_line2?: string | null
          annual_salary_pence?: number | null
          bank_account_json?: Json
          city?: string | null
          country?: string | null
          county?: string | null
          created_at?: string
          date_of_birth?: string | null
          directors_nic_method?: string | null
          email?: string | null
          employer_id: string
          first_name: string
          gender?: string | null
          holiday_carried_forward?: number | null
          holiday_entitlement_days?: number | null
          holiday_taken_days?: number | null
          hourly_rate_pence?: number | null
          id?: string
          is_active?: boolean
          is_director?: boolean
          is_irregular_employment?: boolean | null
          last_name: string
          leave_date?: string | null
          ni_category?: string | null
          ni_number?: string | null
          notes?: string | null
          p45_issue_date?: string | null
          p45_previous_pay_pence?: number | null
          p45_previous_tax_pence?: number | null
          pay_method?: string
          payment_method?: string | null
          payroll_id?: string | null
          pension_employee_pct?: number | null
          pension_employer_pct?: number | null
          pension_opt_out?: boolean
          phone?: string | null
          postcode?: string | null
          postgrad_loan?: boolean
          sort_code?: string | null
          start_date?: string | null
          starter_declaration?: string | null
          student_loan_plan?: string | null
          tax_code?: string | null
          tenant_id: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
          week1_month1?: boolean | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          address_json?: Json
          address_line1?: string | null
          address_line2?: string | null
          annual_salary_pence?: number | null
          bank_account_json?: Json
          city?: string | null
          country?: string | null
          county?: string | null
          created_at?: string
          date_of_birth?: string | null
          directors_nic_method?: string | null
          email?: string | null
          employer_id?: string
          first_name?: string
          gender?: string | null
          holiday_carried_forward?: number | null
          holiday_entitlement_days?: number | null
          holiday_taken_days?: number | null
          hourly_rate_pence?: number | null
          id?: string
          is_active?: boolean
          is_director?: boolean
          is_irregular_employment?: boolean | null
          last_name?: string
          leave_date?: string | null
          ni_category?: string | null
          ni_number?: string | null
          notes?: string | null
          p45_issue_date?: string | null
          p45_previous_pay_pence?: number | null
          p45_previous_tax_pence?: number | null
          pay_method?: string
          payment_method?: string | null
          payroll_id?: string | null
          pension_employee_pct?: number | null
          pension_employer_pct?: number | null
          pension_opt_out?: boolean
          phone?: string | null
          postcode?: string | null
          postgrad_loan?: boolean
          sort_code?: string | null
          start_date?: string | null
          starter_declaration?: string | null
          student_loan_plan?: string | null
          tax_code?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
          week1_month1?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_employees_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "payroll_employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      payroll_employers: {
        Row: {
          accounts_office_ref: string | null
          apprenticeship_levy: boolean | null
          apprenticeship_levy_allowance_pence: number | null
          cis_registered: boolean | null
          client_id: string
          created_at: string
          employer_name: string
          employment_allowance: boolean | null
          hmrc_gateway_id: string | null
          id: string
          is_active: boolean
          pay_frequency: string
          paye_reference: string | null
          pension_provider: string | null
          pension_scheme_ref: string | null
          small_employer: boolean | null
          staging_date: string | null
          tax_year: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accounts_office_ref?: string | null
          apprenticeship_levy?: boolean | null
          apprenticeship_levy_allowance_pence?: number | null
          cis_registered?: boolean | null
          client_id: string
          created_at?: string
          employer_name: string
          employment_allowance?: boolean | null
          hmrc_gateway_id?: string | null
          id?: string
          is_active?: boolean
          pay_frequency?: string
          paye_reference?: string | null
          pension_provider?: string | null
          pension_scheme_ref?: string | null
          small_employer?: boolean | null
          staging_date?: string | null
          tax_year?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accounts_office_ref?: string | null
          apprenticeship_levy?: boolean | null
          apprenticeship_levy_allowance_pence?: number | null
          cis_registered?: boolean | null
          client_id?: string
          created_at?: string
          employer_name?: string
          employment_allowance?: boolean | null
          hmrc_gateway_id?: string | null
          id?: string
          is_active?: boolean
          pay_frequency?: string
          paye_reference?: string | null
          pension_provider?: string | null
          pension_scheme_ref?: string | null
          small_employer?: boolean | null
          staging_date?: string | null
          tax_year?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_employers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_employers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "payroll_employers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "payroll_employers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "payroll_employers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_employers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      payroll_forms: {
        Row: {
          created_at: string
          document_id: string | null
          employee_id: string | null
          employer_id: string
          form_data_json: Json
          form_type: string
          generated_at: string | null
          hmrc_response_json: Json | null
          id: string
          notes: string | null
          sent_at: string | null
          status: string
          submitted_at: string | null
          tax_year: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          employee_id?: string | null
          employer_id: string
          form_data_json?: Json
          form_type: string
          generated_at?: string | null
          hmrc_response_json?: Json | null
          id?: string
          notes?: string | null
          sent_at?: string | null
          status?: string
          submitted_at?: string | null
          tax_year?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          employee_id?: string | null
          employer_id?: string
          form_data_json?: Json
          form_type?: string
          generated_at?: string | null
          hmrc_response_json?: Json | null
          id?: string
          notes?: string | null
          sent_at?: string | null
          status?: string
          submitted_at?: string | null
          tax_year?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_forms_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_forms_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "payroll_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_forms_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "payroll_employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_forms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_forms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      payslips: {
        Row: {
          additions_json: Json
          attachment_of_earnings_pence: number | null
          created_at: string
          deductions_json: Json
          document_id: string | null
          employee_id: string | null
          employee_name: string
          gross_pence: number
          holiday_pay_pence: number | null
          hours_worked: number | null
          id: string
          net_pence: number
          ni_employee_pence: number
          ni_employer_pence: number
          ni_number: string | null
          overtime_hours: number | null
          overtime_pence: number | null
          pay_run_id: string
          pension_employee_pence: number
          pension_employer_pence: number
          sap_pence: number | null
          shpp_pence: number | null
          sick_pay_pence: number | null
          smp_pence: number | null
          spp_pence: number | null
          student_loan_pence: number
          tax_code: string | null
          tax_pence: number
          tenant_id: string
          updated_at: string
          ytd_gross_pence: number
          ytd_ni_pence: number
          ytd_tax_pence: number
        }
        Insert: {
          additions_json?: Json
          attachment_of_earnings_pence?: number | null
          created_at?: string
          deductions_json?: Json
          document_id?: string | null
          employee_id?: string | null
          employee_name: string
          gross_pence?: number
          holiday_pay_pence?: number | null
          hours_worked?: number | null
          id?: string
          net_pence?: number
          ni_employee_pence?: number
          ni_employer_pence?: number
          ni_number?: string | null
          overtime_hours?: number | null
          overtime_pence?: number | null
          pay_run_id: string
          pension_employee_pence?: number
          pension_employer_pence?: number
          sap_pence?: number | null
          shpp_pence?: number | null
          sick_pay_pence?: number | null
          smp_pence?: number | null
          spp_pence?: number | null
          student_loan_pence?: number
          tax_code?: string | null
          tax_pence?: number
          tenant_id: string
          updated_at?: string
          ytd_gross_pence?: number
          ytd_ni_pence?: number
          ytd_tax_pence?: number
        }
        Update: {
          additions_json?: Json
          attachment_of_earnings_pence?: number | null
          created_at?: string
          deductions_json?: Json
          document_id?: string | null
          employee_id?: string | null
          employee_name?: string
          gross_pence?: number
          holiday_pay_pence?: number | null
          hours_worked?: number | null
          id?: string
          net_pence?: number
          ni_employee_pence?: number
          ni_employer_pence?: number
          ni_number?: string | null
          overtime_hours?: number | null
          overtime_pence?: number | null
          pay_run_id?: string
          pension_employee_pence?: number
          pension_employer_pence?: number
          sap_pence?: number | null
          shpp_pence?: number | null
          sick_pay_pence?: number | null
          smp_pence?: number | null
          spp_pence?: number | null
          student_loan_pence?: number
          tax_code?: string | null
          tax_pence?: number
          tenant_id?: string
          updated_at?: string
          ytd_gross_pence?: number
          ytd_ni_pence?: number
          ytd_tax_pence?: number
        }
        Relationships: [
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "payroll_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "pay_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      pension_contributions: {
        Row: {
          created_at: string
          employee_contribution_pence: number
          employer_contribution_pence: number
          enrolment_id: string
          id: string
          payrun_id: string | null
          period: string
          qualifying_earnings_pence: number
          scheme_id: string
          status: string
          submitted_to_provider_at: string | null
          tenant_id: string
          total_contribution_pence: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_contribution_pence?: number
          employer_contribution_pence?: number
          enrolment_id: string
          id?: string
          payrun_id?: string | null
          period: string
          qualifying_earnings_pence?: number
          scheme_id: string
          status?: string
          submitted_to_provider_at?: string | null
          tenant_id: string
          total_contribution_pence?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_contribution_pence?: number
          employer_contribution_pence?: number
          enrolment_id?: string
          id?: string
          payrun_id?: string | null
          period?: string
          qualifying_earnings_pence?: number
          scheme_id?: string
          status?: string
          submitted_to_provider_at?: string | null
          tenant_id?: string
          total_contribution_pence?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pension_contributions_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: false
            referencedRelation: "pension_enrolments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pension_contributions_scheme_id_fkey"
            columns: ["scheme_id"]
            isOneToOne: false
            referencedRelation: "pension_schemes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pension_contributions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pension_contributions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      pension_enrolments: {
        Row: {
          created_at: string
          employee_contribution_pct: number | null
          employee_id: string
          employer_contribution_pct: number | null
          enrolled_at: string
          enrolment_type: string
          id: string
          opt_out_window_end: string | null
          opted_out_at: string | null
          postponement_end: string | null
          scheme_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_contribution_pct?: number | null
          employee_id: string
          employer_contribution_pct?: number | null
          enrolled_at?: string
          enrolment_type?: string
          id?: string
          opt_out_window_end?: string | null
          opted_out_at?: string | null
          postponement_end?: string | null
          scheme_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_contribution_pct?: number | null
          employee_id?: string
          employer_contribution_pct?: number | null
          enrolled_at?: string
          enrolment_type?: string
          id?: string
          opt_out_window_end?: string | null
          opted_out_at?: string | null
          postponement_end?: string | null
          scheme_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pension_enrolments_scheme_id_fkey"
            columns: ["scheme_id"]
            isOneToOne: false
            referencedRelation: "pension_schemes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pension_enrolments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pension_enrolments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      pension_schemes: {
        Row: {
          client_id: string
          contribution_employee_pct: number
          contribution_employer_pct: number
          created_at: string
          employer_reference: string | null
          id: string
          metadata_json: Json
          provider: string
          qualifying_earnings_lower_pence: number
          qualifying_earnings_upper_pence: number
          re_enrolment_date: string | null
          scheme_reference: string | null
          staging_date: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          contribution_employee_pct?: number
          contribution_employer_pct?: number
          created_at?: string
          employer_reference?: string | null
          id?: string
          metadata_json?: Json
          provider?: string
          qualifying_earnings_lower_pence?: number
          qualifying_earnings_upper_pence?: number
          re_enrolment_date?: string | null
          scheme_reference?: string | null
          staging_date?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          contribution_employee_pct?: number
          contribution_employer_pct?: number
          created_at?: string
          employer_reference?: string | null
          id?: string
          metadata_json?: Json
          provider?: string
          qualifying_earnings_lower_pence?: number
          qualifying_earnings_upper_pence?: number
          re_enrolment_date?: string | null
          scheme_reference?: string | null
          staging_date?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pension_schemes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pension_schemes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "pension_schemes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "pension_schemes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "pension_schemes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pension_schemes_tenant_id_fkey"
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
      portal_invitations: {
        Row: {
          accepted_at: string | null
          client_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          portal_role: string
          status: string
          tenant_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          client_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          portal_role?: string
          status?: string
          tenant_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          client_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          portal_role?: string
          status?: string
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "portal_invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "portal_invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "portal_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      portal_users: {
        Row: {
          client_id: string | null
          created_at: string
          display_name: string
          id: string
          last_login_at: string | null
          phone: string | null
          portal_role: string
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          last_login_at?: string | null
          phone?: string | null
          portal_role?: string
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          last_login_at?: string | null
          phone?: string | null
          portal_role?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "portal_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "portal_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "portal_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
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
      regulatory_capability_controls: {
        Row: {
          application_reference: string | null
          capability_key: string
          control_status: string
          created_at: string
          created_by_user_id: string | null
          id: string
          next_review_date: string | null
          notes: string | null
          owner_name: string | null
          owner_user_id: string | null
          production_enabled: boolean
          production_enabled_at: string | null
          production_enabled_by_user_id: string | null
          production_gate_reason: string | null
          target_date: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          application_reference?: string | null
          capability_key: string
          control_status?: string
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          next_review_date?: string | null
          notes?: string | null
          owner_name?: string | null
          owner_user_id?: string | null
          production_enabled?: boolean
          production_enabled_at?: string | null
          production_enabled_by_user_id?: string | null
          production_gate_reason?: string | null
          target_date?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          application_reference?: string | null
          capability_key?: string
          control_status?: string
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          next_review_date?: string | null
          notes?: string | null
          owner_name?: string | null
          owner_user_id?: string | null
          production_enabled?: boolean
          production_enabled_at?: string | null
          production_enabled_by_user_id?: string | null
          production_gate_reason?: string | null
          target_date?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      regulatory_readiness_evidence: {
        Row: {
          capability_key: string
          created_at: string
          document_id: string | null
          environment: string
          evidence_kind: string
          evidence_url: string | null
          id: string
          notes: string | null
          recorded_by_user_id: string | null
          reference: string | null
          result: string
          tenant_id: string
          tested_at: string | null
          title: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          capability_key: string
          created_at?: string
          document_id?: string | null
          environment?: string
          evidence_kind: string
          evidence_url?: string | null
          id?: string
          notes?: string | null
          recorded_by_user_id?: string | null
          reference?: string | null
          result?: string
          tenant_id: string
          tested_at?: string | null
          title: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          capability_key?: string
          created_at?: string
          document_id?: string | null
          environment?: string
          evidence_kind?: string
          evidence_url?: string | null
          id?: string
          notes?: string | null
          recorded_by_user_id?: string | null
          reference?: string | null
          result?: string
          tenant_id?: string
          tested_at?: string | null
          title?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          accepted_at: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          declined_at: string | null
          engagement_letter_doc_id: string | null
          fee_breakdown_json: Json
          fee_frequency: string
          id: string
          prospect_email: string | null
          prospect_name: string | null
          sent_at: string | null
          services_json: Json
          status: string
          tenant_id: string
          terms_text: string | null
          title: string
          total_fee_pence: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          accepted_at?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          declined_at?: string | null
          engagement_letter_doc_id?: string | null
          fee_breakdown_json?: Json
          fee_frequency?: string
          id?: string
          prospect_email?: string | null
          prospect_name?: string | null
          sent_at?: string | null
          services_json?: Json
          status?: string
          tenant_id: string
          terms_text?: string | null
          title: string
          total_fee_pence?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          accepted_at?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          declined_at?: string | null
          engagement_letter_doc_id?: string | null
          fee_breakdown_json?: Json
          fee_frequency?: string
          id?: string
          prospect_email?: string | null
          prospect_name?: string | null
          sent_at?: string | null
          services_json?: Json
          status?: string
          tenant_id?: string
          terms_text?: string | null
          title?: string
          total_fee_pence?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "proposals_engagement_letter_doc_id_fkey"
            columns: ["engagement_letter_doc_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_tenant_id_fkey"
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
            referencedRelation: "v_secretarial_due"
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
      recurring_invoice_templates: {
        Row: {
          client_id: string
          created_at: string
          description: string
          frequency: string
          id: string
          is_active: boolean
          last_issued_at: string | null
          net_amount_pence: number
          next_issue_date: string | null
          tenant_id: string
          total_pence: number
          updated_at: string
          vat_rate: number
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_issued_at?: string | null
          net_amount_pence?: number
          next_issue_date?: string | null
          tenant_id: string
          total_pence?: number
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_issued_at?: string | null
          net_amount_pence?: number
          next_issue_date?: string | null
          tenant_id?: string
          total_pence?: number
          updated_at?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "recurring_invoice_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_invoice_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "recurring_invoice_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "recurring_invoice_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "recurring_invoice_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_invoice_templates_tenant_id_fkey"
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
      secretarial_changes: {
        Row: {
          approved_at: string | null
          approved_by_user_id: string | null
          assigned_user_id: string | null
          change_type: string
          client_id: string
          created_at: string
          created_by_user_id: string | null
          description: string | null
          id: string
          payload_json: Json
          requires_auth_code: boolean
          status: string
          submission_job_id: string | null
          tenant_id: string
          title: string
          updated_at: string
          validation_json: Json
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          assigned_user_id?: string | null
          change_type: string
          client_id: string
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          payload_json?: Json
          requires_auth_code?: boolean
          status?: string
          submission_job_id?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          validation_json?: Json
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          assigned_user_id?: string | null
          change_type?: string
          client_id?: string
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          payload_json?: Json
          requires_auth_code?: boolean
          status?: string
          submission_job_id?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          validation_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "secretarial_changes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secretarial_changes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "secretarial_changes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "secretarial_changes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "secretarial_changes_submission_job_id_fkey"
            columns: ["submission_job_id"]
            isOneToOne: false
            referencedRelation: "submission_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secretarial_changes_submission_job_id_fkey"
            columns: ["submission_job_id"]
            isOneToOne: false
            referencedRelation: "v_submission_jobs_recent"
            referencedColumns: ["submission_job_id"]
          },
          {
            foreignKeyName: "secretarial_changes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secretarial_changes_tenant_id_fkey"
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
            referencedRelation: "v_secretarial_due"
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
            referencedRelation: "v_secretarial_due"
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
            referencedRelation: "v_secretarial_due"
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
      signature_requests: {
        Row: {
          client_id: string
          created_at: string
          created_by_user_id: string | null
          decline_reason: string | null
          declined_at: string | null
          document_id: string | null
          expires_at: string | null
          id: string
          last_reminder_at: string | null
          reminder_count: number
          sent_at: string | null
          signed_at: string | null
          signed_document_path: string | null
          signer_email: string
          signer_name: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by_user_id?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          document_id?: string | null
          expires_at?: string | null
          id?: string
          last_reminder_at?: string | null
          reminder_count?: number
          sent_at?: string | null
          signed_at?: string | null
          signed_document_path?: string | null
          signer_email: string
          signer_name: string
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by_user_id?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          document_id?: string | null
          expires_at?: string | null
          id?: string
          last_reminder_at?: string | null
          reminder_count?: number
          sent_at?: string | null
          signed_at?: string | null
          signed_document_path?: string | null
          signer_email?: string
          signer_name?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "signature_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "signature_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "signature_requests_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      staff_availability: {
        Row: {
          created_at: string
          date: string
          hours_available: number | null
          id: string
          notes: string | null
          status: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          hours_available?: number | null
          id?: string
          notes?: string | null
          status?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          hours_available?: number | null
          id?: string
          notes?: string | null
          status?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_availability_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_availability_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          attempts: number
          created_at: string
          event_id: string
          event_type: string
          last_error: string | null
          livemode: boolean
          processed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          event_id: string
          event_type: string
          last_error?: string | null
          livemode: boolean
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          event_id?: string
          event_type?: string
          last_error?: string | null
          livemode?: boolean
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      submission_attempts: {
        Row: {
          attempt_no: number
          duration_ms: number | null
          error_class: string | null
          error_detail: string | null
          error_message: string | null
          finished_at: string | null
          http_status: number | null
          id: string
          job_id: string
          provider_code: string | null
          provider_message: string | null
          request_meta_redacted: Json | null
          response_meta_redacted: Json | null
          started_at: string
          status: string
        }
        Insert: {
          attempt_no: number
          duration_ms?: number | null
          error_class?: string | null
          error_detail?: string | null
          error_message?: string | null
          finished_at?: string | null
          http_status?: number | null
          id?: string
          job_id: string
          provider_code?: string | null
          provider_message?: string | null
          request_meta_redacted?: Json | null
          response_meta_redacted?: Json | null
          started_at?: string
          status?: string
        }
        Update: {
          attempt_no?: number
          duration_ms?: number | null
          error_class?: string | null
          error_detail?: string | null
          error_message?: string | null
          finished_at?: string | null
          http_status?: number | null
          id?: string
          job_id?: string
          provider_code?: string | null
          provider_message?: string | null
          request_meta_redacted?: Json | null
          response_meta_redacted?: Json | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_attempts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "submission_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_attempts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_submission_jobs_recent"
            referencedColumns: ["submission_job_id"]
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
            referencedRelation: "v_secretarial_due"
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
      subscription_plans: {
        Row: {
          allowed_modules: string[]
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_clients: number
          max_users: number
          name: string
          price_annual_pence: number
          price_monthly_pence: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          allowed_modules?: string[]
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_clients?: number
          max_users?: number
          name: string
          price_annual_pence?: number
          price_monthly_pence?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allowed_modules?: string[]
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_clients?: number
          max_users?: number
          name?: string
          price_annual_pence?: number
          price_monthly_pence?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
            referencedRelation: "v_secretarial_due"
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
      tax_computations: {
        Row: {
          computation_type: string
          computed_values: Json
          created_at: string
          form_data: Json
          id: string
          notes: string | null
          period_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          computation_type?: string
          computed_values?: Json
          created_at?: string
          form_data?: Json
          id?: string
          notes?: string | null
          period_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          computation_type?: string
          computed_values?: Json
          created_at?: string
          form_data?: Json
          id?: string
          notes?: string | null
          period_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_computations_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounts_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_computations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_computations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      tb_imports: {
        Row: {
          client_id: string
          created_at: string
          error_log_json: Json
          file_name: string | null
          id: string
          imported_by: string | null
          mapping_json: Json
          rows_mapped: number | null
          rows_posted: number | null
          rows_total: number | null
          source: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          error_log_json?: Json
          file_name?: string | null
          id?: string
          imported_by?: string | null
          mapping_json?: Json
          rows_mapped?: number | null
          rows_posted?: number | null
          rows_total?: number | null
          source?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          error_log_json?: Json
          file_name?: string | null
          id?: string
          imported_by?: string | null
          mapping_json?: Json
          rows_mapped?: number | null
          rows_posted?: number | null
          rows_total?: number | null
          source?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tb_imports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tb_imports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "tb_imports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "tb_imports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "tb_imports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tb_imports_tenant_id_fkey"
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
      tenant_subscriptions: {
        Row: {
          billing_cycle: string
          cancelled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
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
          stripe_customer_id: string | null
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
          stripe_customer_id?: string | null
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
          stripe_customer_id?: string | null
          support_email?: string | null
          timezone?: string | null
          trading_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          client_id: string | null
          created_at: string
          date: string
          description: string
          duration_minutes: number
          id: string
          is_billable: boolean
          rate_pence: number | null
          status: string
          task_id: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          date?: string
          description?: string
          duration_minutes?: number
          id?: string
          is_billable?: boolean
          rate_pence?: number | null
          status?: string
          task_id?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          date?: string
          description?: string
          duration_minutes?: number
          id?: string
          is_billable?: boolean
          rate_pence?: number | null
          status?: string
          task_id?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "time_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "time_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      trial_balance_entries: {
        Row: {
          account_code: string
          account_name: string
          account_type: string
          adjustment_credit_pence: number
          adjustment_debit_pence: number
          adjustment_notes: string | null
          brought_forward: boolean
          comparative_credit_pence: number
          comparative_debit_pence: number
          created_at: string
          credit_pence: number
          debit_pence: number
          id: string
          period_id: string
          sort_order: number
          source_period_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_code: string
          account_name: string
          account_type?: string
          adjustment_credit_pence?: number
          adjustment_debit_pence?: number
          adjustment_notes?: string | null
          brought_forward?: boolean
          comparative_credit_pence?: number
          comparative_debit_pence?: number
          created_at?: string
          credit_pence?: number
          debit_pence?: number
          id?: string
          period_id: string
          sort_order?: number
          source_period_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_code?: string
          account_name?: string
          account_type?: string
          adjustment_credit_pence?: number
          adjustment_debit_pence?: number
          adjustment_notes?: string | null
          brought_forward?: boolean
          comparative_credit_pence?: number
          comparative_debit_pence?: number
          created_at?: string
          credit_pence?: number
          debit_pence?: number
          id?: string
          period_id?: string
          sort_order?: number
          source_period_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_balance_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounts_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_balance_entries_source_period_id_fkey"
            columns: ["source_period_id"]
            isOneToOne: false
            referencedRelation: "accounts_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_balance_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_balance_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
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
          due_date: string | null
          finalised_at: string | null
          finalised_by_user_id: string | null
          hmrc_receipt: string | null
          hmrc_response_json: Json | null
          id: string
          notes: string | null
          period_end: string
          period_key: string | null
          period_start: string
          status: string
          submission_job_id: string | null
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
          due_date?: string | null
          finalised_at?: string | null
          finalised_by_user_id?: string | null
          hmrc_receipt?: string | null
          hmrc_response_json?: Json | null
          id?: string
          notes?: string | null
          period_end: string
          period_key?: string | null
          period_start: string
          status?: string
          submission_job_id?: string | null
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
          due_date?: string | null
          finalised_at?: string | null
          finalised_by_user_id?: string | null
          hmrc_receipt?: string | null
          hmrc_response_json?: Json | null
          id?: string
          notes?: string | null
          period_end?: string
          period_key?: string | null
          period_start?: string
          status?: string
          submission_job_id?: string | null
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
            referencedRelation: "v_secretarial_due"
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
            foreignKeyName: "vat_returns_submission_job_id_fkey"
            columns: ["submission_job_id"]
            isOneToOne: false
            referencedRelation: "submission_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vat_returns_submission_job_id_fkey"
            columns: ["submission_job_id"]
            isOneToOne: false
            referencedRelation: "v_submission_jobs_recent"
            referencedColumns: ["submission_job_id"]
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
      year_end_checks: {
        Row: {
          category: string
          check_key: string
          client_id: string
          completed_at: string | null
          completed_by_user_id: string | null
          created_at: string
          id: string
          notes: string | null
          period_id: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          check_key: string
          client_id: string
          completed_at?: string | null
          completed_by_user_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          period_id: string
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          check_key?: string
          client_id?: string
          completed_at?: string | null
          completed_by_user_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          period_id?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "year_end_checks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "year_end_checks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "year_end_checks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "year_end_checks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "year_end_checks_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounts_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "year_end_checks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "year_end_checks_tenant_id_fkey"
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
            referencedRelation: "v_secretarial_due"
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
          change_id: string | null
          change_type: string | null
          client_id: string | null
          client_legal_name: string | null
          requires_auth_code: boolean | null
          status: string | null
          tenant_id: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "secretarial_changes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secretarial_changes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_tasks"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "secretarial_changes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_secretarial_due"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "secretarial_changes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_tasks_due_next_14d"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "secretarial_changes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secretarial_changes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_practice_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_secretarial_due: {
        Row: {
          ch_last_synced_at: string | null
          client_id: string | null
          client_legal_name: string | null
          company_number: string | null
          company_status: string | null
          next_confirmation_statement_due: string | null
          open_secretarial_changes: number | null
          tenant_id: string | null
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
            referencedRelation: "v_secretarial_due"
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
            referencedRelation: "v_secretarial_due"
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
            referencedRelation: "v_secretarial_due"
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
      can_portal_view_pay_run: {
        Args: { _run_id: string; _user_id: string }
        Returns: boolean
      }
      can_portal_view_payslip: {
        Args: { _payslip_id: string; _user_id: string }
        Returns: boolean
      }
      claim_stripe_webhook_event: {
        Args: { p_event_id: string; p_event_type: string; p_livemode: boolean }
        Returns: boolean
      }
      get_portal_client_id: { Args: { _user_id: string }; Returns: string }
      get_portal_role: { Args: { _user_id: string }; Returns: string }
      get_portal_tenant_id: { Args: { _user_id: string }; Returns: string }
      get_tenant_allowed_modules: {
        Args: { p_tenant_id: string }
        Returns: string[]
      }
      get_tenant_plan_limits: {
        Args: { p_tenant_id: string }
        Returns: {
          max_clients: number
          max_users: number
          plan_code: string
          plan_name: string
        }[]
      }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      get_user_type: { Args: { _user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      post_bank_transaction: {
        Args: { p_transaction_id: string }
        Returns: string
      }
      run_accounts_intelligence: {
        Args: { p_client_id: string; p_period_id: string }
        Returns: Json
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
      seed_year_end_checks: { Args: { p_period_id: string }; Returns: number }
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
