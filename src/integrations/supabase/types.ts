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
      credential_logs: {
        Row: {
          action: string
          credential_id: string
          id: string
          performed_by: string | null
          timestamp: string
        }
        Insert: {
          action: string
          credential_id: string
          id?: string
          performed_by?: string | null
          timestamp?: string
        }
        Update: {
          action?: string
          credential_id?: string
          id?: string
          performed_by?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "credential_logs_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      credentials: {
        Row: {
          created_at: string
          hash: string
          id: string
          institution_id: string
          issued_by: string | null
          level: number
          skill_id: string
          status: Database["public"]["Enums"]["credential_status"]
          student_id: string
        }
        Insert: {
          created_at?: string
          hash: string
          id?: string
          institution_id: string
          issued_by?: string | null
          level: number
          skill_id: string
          status?: Database["public"]["Enums"]["credential_status"]
          student_id: string
        }
        Update: {
          created_at?: string
          hash?: string
          id?: string
          institution_id?: string
          issued_by?: string | null
          level?: number
          skill_id?: string
          status?: Database["public"]["Enums"]["credential_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credentials_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credentials_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credentials_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          created_at: string
          id: string
          location: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          institution_id: string | null
          name: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          institution_id?: string | null
          name: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          institution_id?: string | null
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      reassessment_requests: {
        Row: {
          created_at: string
          credential_id: string | null
          id: string
          institution_id: string | null
          reason: string
          requested_by: string | null
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string
          credential_id?: string | null
          id?: string
          institution_id?: string | null
          reason: string
          requested_by?: string | null
          status?: string
          student_id: string
        }
        Update: {
          created_at?: string
          credential_id?: string | null
          id?: string
          institution_id?: string | null
          reason?: string
          requested_by?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reassessment_requests_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reassessment_requests_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reassessment_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
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
      students: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          name: string
          trade: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          name: string
          trade: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          name?: string
          trade?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          institution_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      whitelist: {
        Row: {
          created_at: string
          email: string
          id: string
          institution_id: string | null
          is_used: boolean
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          institution_id?: string | null
          is_used?: boolean
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          institution_id?: string | null
          is_used?: boolean
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "whitelist_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_institution: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "iti_admin" | "principal" | "trainer" | "student"
      credential_status: "valid" | "revoked"
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
      app_role: ["iti_admin", "principal", "trainer", "student"],
      credential_status: ["valid", "revoked"],
    },
  },
} as const
