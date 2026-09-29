export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string;
          created_by: string;
          ends_at: string;
          id: string;
          modality: Database["public"]["Enums"]["appointment_modality"];
          organization_id: string;
          patient_id: string;
          professional_user_id: string;
          starts_at: string;
          status: Database["public"]["Enums"]["appointment_status"];
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      anthropometric_measurements: {
        Row: {
          age_years_snapshot: number;
          bmi: number;
          bmi_classification: Database["public"]["Enums"]["adult_bmi_classification"];
          created_at: string;
          estimated_body_fat_percent: number | null;
          formula_version: string;
          height_cm: number;
          id: string;
          measured_at: string;
          normal_weight_max_kg: number;
          normal_weight_min_kg: number;
          organization_id: string;
          patient_id: string;
          recorded_by: string;
          weight_kg: number;
          weight_lb: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      audit_events: {
        Row: {
          action: string;
          actor_user_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: number;
          metadata: Json;
          organization_id: string;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: never;
          metadata?: Json;
          organization_id: string;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: never;
          metadata?: Json;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_memberships: {
        Row: {
          created_at: string;
          id: string;
          invited_by: string | null;
          organization_id: string;
          role: Database["public"]["Enums"]["app_role"];
          status: Database["public"]["Enums"]["membership_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          invited_by?: string | null;
          organization_id: string;
          role: Database["public"]["Enums"]["app_role"];
          status?: Database["public"]["Enums"]["membership_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          invited_by?: string | null;
          organization_id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          status?: Database["public"]["Enums"]["membership_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          brand_color: string;
          created_at: string;
          created_by: string;
          currency: string;
          deleted_at: string | null;
          id: string;
          logo_path: string | null;
          name: string;
          phone_e164: string | null;
          slug: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          brand_color?: string;
          created_at?: string;
          created_by: string;
          currency?: string;
          deleted_at?: string | null;
          id?: string;
          logo_path?: string | null;
          name: string;
          phone_e164?: string | null;
          slug: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          brand_color?: string;
          created_at?: string;
          created_by?: string;
          currency?: string;
          deleted_at?: string | null;
          id?: string;
          logo_path?: string | null;
          name?: string;
          phone_e164?: string | null;
          slug?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      patient_clinical_profiles: {
        Row: {
          consultation_reason: string | null;
          created_at: string;
          goal: string | null;
          organization_id: string;
          patient_id: string;
          updated_at: string;
        };
        Insert: never;
        Update: {
          consultation_reason?: string | null;
          goal?: string | null;
        };
        Relationships: [];
      };
      patient_consents: {
        Row: {
          accepted_at: string;
          consent_version: string;
          created_at: string;
          id: string;
          organization_id: string;
          patient_id: string;
          recorded_by: string;
          withdrawn_at: string | null;
        };
        Insert: never;
        Update: { withdrawn_at?: string | null };
        Relationships: [];
      };
      patients: {
        Row: {
          birth_date: string;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          email: string | null;
          first_name: string;
          growth_reference_sex:
            Database["public"]["Enums"]["growth_reference_sex"] | null;
          id: string;
          last_name: string;
          organization_id: string;
          phone_e164: string | null;
          preferred_name: string | null;
          status: Database["public"]["Enums"]["patient_status"];
          updated_at: string;
        };
        Insert: never;
        Update: Partial<Database["public"]["Tables"]["patients"]["Row"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string;
          locale: string;
          phone_e164: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          full_name: string;
          locale?: string;
          phone_e164?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          locale?: string;
          phone_e164?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      change_appointment_status: {
        Args: {
          next_status: Database["public"]["Enums"]["appointment_status"];
          target_appointment_id: string;
        };
        Returns: undefined;
      };
      create_appointment: {
        Args: {
          appointment_modality: Database["public"]["Enums"]["appointment_modality"];
          duration_minutes: number;
          local_start: string;
          target_patient_id: string;
          target_professional_user_id: string;
        };
        Returns: string;
      };
      create_organization: {
        Args: { organization_name: string; organization_slug: string };
        Returns: string;
      };
      create_patient: {
        Args: {
          accepted_consent: boolean;
          patient_birth_date: string;
          patient_consultation_reason: string | null;
          patient_email: string | null;
          patient_first_name: string;
          patient_goal: string | null;
          patient_growth_reference_sex:
            Database["public"]["Enums"]["growth_reference_sex"] | null;
          patient_last_name: string;
          patient_phone_e164: string | null;
          target_organization_id: string;
        };
        Returns: string;
      };
      record_adult_anthropometry: {
        Args: {
          measured_height_cm: number;
          measured_weight_kg: number;
          measurement_time?: string;
          target_patient_id: string;
        };
        Returns: string;
      };
      record_clinical_read: {
        Args: { target_entity_type: string; target_patient_id: string };
        Returns: undefined;
      };
      list_appointments_for_local_date: {
        Args: { target_date: string; target_organization_id: string };
        Returns: Database["public"]["Tables"]["appointments"]["Row"][];
      };
      list_scheduling_professionals: {
        Args: { target_organization_id: string };
        Returns: {
          full_name: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        }[];
      };
    };
    Enums: {
      adult_bmi_classification:
        | "severe_thinness"
        | "moderate_thinness"
        | "underweight"
        | "normal"
        | "overweight"
        | "obesity_i"
        | "obesity_ii"
        | "obesity_iii";
      app_role: "owner" | "nutritionist" | "assistant" | "patient";
      appointment_modality: "in_person" | "video" | "phone";
      appointment_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "no_show"
        | "cancelled"
        | "rescheduled";
      growth_reference_sex: "female" | "male";
      membership_status: "invited" | "active" | "suspended";
      patient_status: "active" | "inactive" | "archived";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<TableName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TableName]["Row"];
