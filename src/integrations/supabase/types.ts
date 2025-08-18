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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      agendamentos: {
        Row: {
          clinica_id: string
          created_at: string
          data: string
          event_google_id: string | null
          horario: string
          id: string
          paciente: string
          profissional: string
          status: string
          updated_at: string
        }
        Insert: {
          clinica_id: string
          created_at?: string
          data: string
          event_google_id?: string | null
          horario: string
          id?: string
          paciente: string
          profissional: string
          status?: string
          updated_at?: string
        }
        Update: {
          clinica_id?: string
          created_at?: string
          data?: string
          event_google_id?: string | null
          horario?: string
          id?: string
          paciente?: string
          profissional?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          clinica_id: string | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          session_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          clinica_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          session_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          clinica_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          session_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      clinicas: {
        Row: {
          agenda_ativa: boolean
          chave_acesso: string
          created_at: string
          dashboard_ativo: boolean
          feedbacks_ativos: boolean
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          agenda_ativa?: boolean
          chave_acesso: string
          created_at?: string
          dashboard_ativo?: boolean
          feedbacks_ativos?: boolean
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          agenda_ativa?: boolean
          chave_acesso?: string
          created_at?: string
          dashboard_ativo?: boolean
          feedbacks_ativos?: boolean
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedbacks: {
        Row: {
          clinica_id: string
          comentario: string | null
          como_conheceu: string | null
          criado_em: string
          id: string
          nota: number
          paciente: string
          palavras_chave: string[] | null
          profissional: string
          sentimento: number | null
        }
        Insert: {
          clinica_id: string
          comentario?: string | null
          como_conheceu?: string | null
          criado_em?: string
          id?: string
          nota: number
          paciente: string
          palavras_chave?: string[] | null
          profissional: string
          sentimento?: number | null
        }
        Update: {
          clinica_id?: string
          comentario?: string | null
          como_conheceu?: string | null
          criado_em?: string
          id?: string
          nota?: number
          paciente?: string
          palavras_chave?: string[] | null
          profissional?: string
          sentimento?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      google_oauth_tokens: {
        Row: {
          access_token: string
          clinica_id: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string | null
          scope: string
          updated_at: string
        }
        Insert: {
          access_token: string
          clinica_id: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token?: string | null
          scope: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          clinica_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string | null
          scope?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_oauth_tokens_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: true
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      medicos: {
        Row: {
          ativo: boolean
          clinica_id: string
          created_at: string
          crm: string
          email: string | null
          especialidade: string
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          clinica_id: string
          created_at?: string
          crm: string
          email?: string | null
          especialidade: string
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          clinica_id?: string
          created_at?: string
          crm?: string
          email?: string | null
          especialidade?: string
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      metricas_diarias: {
        Row: {
          clinica_id: string
          created_at: string
          data: string
          faltas_total: number
          id: string
          origens: Json | null
          palavras_chave_frequentes: Json | null
          sentimento_medio: number | null
          taxa_retorno: number | null
          tempo_medio_agendamento: number | null
          updated_at: string
          volume_por_profissional: Json | null
        }
        Insert: {
          clinica_id: string
          created_at?: string
          data: string
          faltas_total?: number
          id?: string
          origens?: Json | null
          palavras_chave_frequentes?: Json | null
          sentimento_medio?: number | null
          taxa_retorno?: number | null
          tempo_medio_agendamento?: number | null
          updated_at?: string
          volume_por_profissional?: Json | null
        }
        Update: {
          clinica_id?: string
          created_at?: string
          data?: string
          faltas_total?: number
          id?: string
          origens?: Json | null
          palavras_chave_frequentes?: Json | null
          sentimento_medio?: number | null
          taxa_retorno?: number | null
          tempo_medio_agendamento?: number | null
          updated_at?: string
          volume_por_profissional?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "metricas_diarias_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_clinicas: {
        Row: {
          ativo: boolean
          clinica_id: string
          created_at: string
          id: string
          numero_whatsapp: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          clinica_id: string
          created_at?: string
          id?: string
          numero_whatsapp: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          clinica_id?: string
          created_at?: string
          id?: string
          numero_whatsapp?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      analisar_sentimento: {
        Args: { texto: string }
        Returns: number
      }
      atualizar_metricas_diarias: {
        Args: { clinica_uuid: string; data_agendamento: string }
        Returns: undefined
      }
      calcular_tempo_medio_agendamento: {
        Args: { clinica_uuid: string; data_fim: string; data_inicio: string }
        Returns: number
      }
      calcular_volume_por_profissional: {
        Args: { clinica_uuid: string; data_fim: string; data_inicio: string }
        Returns: Json
      }
      extrair_palavras_chave: {
        Args: { texto: string }
        Returns: string[]
      }
      get_clinic_by_access_key: {
        Args: { access_key: string }
        Returns: {
          agenda_ativa: boolean
          dashboard_ativo: boolean
          feedbacks_ativos: boolean
          id: string
          nome: string
        }[]
      }
      validar_profissional_existe: {
        Args: { clinica_uuid: string; profissional_nome: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
