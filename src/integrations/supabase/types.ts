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
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
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
        ]
      }
    }
    Views: {
      [_ in never]: never
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
      priority: "low" | "medium" | "high" | "urgent"
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
      priority: ["low", "medium", "high", "urgent"],
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
