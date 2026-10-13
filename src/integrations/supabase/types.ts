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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      analyses: {
        Row: {
          created_at: string
          id: string
          job_id: string
          profile_version: number | null
          result: Json
          score: number | null
          tender_id: string
          tender_version: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          profile_version?: number | null
          result: Json
          score?: number | null
          tender_id: string
          tender_version?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          profile_version?: number | null
          result?: Json
          score?: number | null
          tender_id?: string
          tender_version?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_jobs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          profile_version: number | null
          progress: Json | null
          status: string
          tender_id: string
          tender_version: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          profile_version?: number | null
          progress?: Json | null
          status?: string
          tender_id: string
          tender_version?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          profile_version?: number | null
          progress?: Json | null
          status?: string
          tender_id?: string
          tender_version?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_jobs_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      company_profile_versions: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          snapshot: Json
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          snapshot: Json
          user_id: string
          version: number
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          snapshot?: Json
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_profile_versions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_profiles: {
        Row: {
          availability: string | null
          business_name: string | null
          capacity_amount: number | null
          capacity_currency: string | null
          certifications: string | null
          created_at: string
          experience: Json
          id: string
          keywords: string[]
          offerings: string | null
          regions: string[]
          restrictions: string | null
          rnp_declared_at: string | null
          rnp_registrations: string | null
          ruc: string | null
          staff: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          availability?: string | null
          business_name?: string | null
          capacity_amount?: number | null
          capacity_currency?: string | null
          certifications?: string | null
          created_at?: string
          experience?: Json
          id?: string
          keywords?: string[]
          offerings?: string | null
          regions?: string[]
          restrictions?: string | null
          rnp_declared_at?: string | null
          rnp_registrations?: string | null
          ruc?: string | null
          staff?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          availability?: string | null
          business_name?: string | null
          capacity_amount?: number | null
          capacity_currency?: string | null
          certifications?: string | null
          created_at?: string
          experience?: Json
          id?: string
          keywords?: string[]
          offerings?: string | null
          regions?: string[]
          restrictions?: string | null
          rnp_declared_at?: string | null
          rnp_registrations?: string | null
          ruc?: string | null
          staff?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      cubso_segments: {
        Row: {
          code: string
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          title: string
          updated_at?: string
        }
        Update: {
          code?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          document_id: string
          id: string
          locator: string | null
        }
        Insert: {
          chunk_index: number
          content: string
          document_id: string
          id?: string
          locator?: string | null
        }
        Update: {
          chunk_index?: number
          content?: string
          document_id?: string
          id?: string
          locator?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          doc_type: string | null
          extension: string | null
          file_name: string | null
          id: string
          published_at: string | null
          size_label: string | null
          source_code: string
          stage: string | null
          storage_path: string | null
          tender_id: string
          url: string
        }
        Insert: {
          created_at?: string
          doc_type?: string | null
          extension?: string | null
          file_name?: string | null
          id?: string
          published_at?: string | null
          size_label?: string | null
          source_code: string
          stage?: string | null
          storage_path?: string | null
          tender_id: string
          url: string
        }
        Update: {
          created_at?: string
          doc_type?: string | null
          extension?: string | null
          file_name?: string | null
          id?: string
          published_at?: string | null
          size_label?: string | null
          source_code?: string
          stage?: string | null
          storage_path?: string | null
          tender_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      saved_tenders: {
        Row: {
          created_at: string
          id: string
          tender_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tender_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          tender_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_tenders_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      source_records: {
        Row: {
          captured_at: string
          hash: string
          id: string
          kind: string
          payload: Json
          source: string
          source_id: string
          tender_id: string | null
          url: string | null
        }
        Insert: {
          captured_at?: string
          hash: string
          id?: string
          kind?: string
          payload: Json
          source: string
          source_id: string
          tender_id?: string | null
          url?: string | null
        }
        Update: {
          captured_at?: string
          hash?: string
          id?: string
          kind?: string
          payload?: Json
          source?: string
          source_id?: string
          tender_id?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_records_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_runs: {
        Row: {
          cursor: Json | null
          error: string | null
          finished_at: string | null
          id: string
          records_changed: number
          records_new: number
          records_seen: number
          source: string
          started_at: string
          status: string
        }
        Insert: {
          cursor?: Json | null
          error?: string | null
          finished_at?: string | null
          id?: string
          records_changed?: number
          records_new?: number
          records_seen?: number
          source: string
          started_at?: string
          status?: string
        }
        Update: {
          cursor?: Json | null
          error?: string | null
          finished_at?: string | null
          id?: string
          records_changed?: number
          records_new?: number
          records_seen?: number
          source?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      tender_items: {
        Row: {
          amount: number | null
          cubso_code: string | null
          cubso_label: string | null
          currency: string | null
          description: string | null
          id: string
          item_number: string
          item_type: string | null
          quantity: string | null
          region: string | null
          status_code: string | null
          tender_id: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          cubso_code?: string | null
          cubso_label?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          item_number: string
          item_type?: string | null
          quantity?: string | null
          region?: string | null
          status_code?: string | null
          tender_id: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          cubso_code?: string | null
          cubso_label?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          item_number?: string
          item_type?: string | null
          quantity?: string | null
          region?: string | null
          status_code?: string | null
          tender_id?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_items_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tenders: {
        Row: {
          amount: number | null
          amount_level: string
          call_number: string | null
          closing_at: string | null
          closing_date_only: boolean
          cubso_labels: string[]
          cubso_segments: string[]
          currency: string | null
          description: string | null
          detail_fetched_at: string | null
          entity: string | null
          first_seen_at: string
          id: string
          last_checked_at: string
          last_seen_at: string
          listed_in_source: boolean
          nomenclature: string | null
          object_type: string | null
          ocid: string | null
          participation_end: string | null
          participation_start: string | null
          procedure_type: string | null
          published_at: string | null
          regions: string[]
          schedule: Json | null
          selection_modality: string | null
          source: string
          source_hash: string | null
          source_id: string
          source_url: string | null
          title: string
          version: number
        }
        Insert: {
          amount?: number | null
          amount_level?: string
          call_number?: string | null
          closing_at?: string | null
          closing_date_only?: boolean
          cubso_labels?: string[]
          cubso_segments?: string[]
          currency?: string | null
          description?: string | null
          detail_fetched_at?: string | null
          entity?: string | null
          first_seen_at?: string
          id?: string
          last_checked_at?: string
          last_seen_at?: string
          listed_in_source?: boolean
          nomenclature?: string | null
          object_type?: string | null
          ocid?: string | null
          participation_end?: string | null
          participation_start?: string | null
          procedure_type?: string | null
          published_at?: string | null
          regions?: string[]
          schedule?: Json | null
          selection_modality?: string | null
          source: string
          source_hash?: string | null
          source_id: string
          source_url?: string | null
          title: string
          version?: number
        }
        Update: {
          amount?: number | null
          amount_level?: string
          call_number?: string | null
          closing_at?: string | null
          closing_date_only?: boolean
          cubso_labels?: string[]
          cubso_segments?: string[]
          currency?: string | null
          description?: string | null
          detail_fetched_at?: string | null
          entity?: string | null
          first_seen_at?: string
          id?: string
          last_checked_at?: string
          last_seen_at?: string
          listed_in_source?: boolean
          nomenclature?: string | null
          object_type?: string | null
          ocid?: string | null
          participation_end?: string | null
          participation_start?: string | null
          procedure_type?: string | null
          published_at?: string | null
          regions?: string[]
          schedule?: Json | null
          selection_modality?: string | null
          source?: string
          source_hash?: string | null
          source_id?: string
          source_url?: string | null
          title?: string
          version?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
