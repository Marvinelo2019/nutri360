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
      availability_blocks: {
        Row: {
          created_at: string;
          created_by: string;
          ends_at: string;
          id: string;
          label: string | null;
          organization_id: string;
          professional_user_id: string;
          starts_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      availability_rules: {
        Row: {
          created_at: string;
          created_by: string;
          day_of_week: number;
          ends_at_local: string;
          id: string;
          is_active: boolean;
          organization_id: string;
          professional_user_id: string;
          starts_at_local: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      appointments: {
        Row: {
          booking_source: "staff" | "public";
          created_at: string;
          created_by: string | null;
          ends_at: string;
          id: string;
          modality: Database["public"]["Enums"]["appointment_modality"];
          organization_id: string;
          patient_id: string;
          privacy_consent_accepted_at: string | null;
          privacy_consent_version: string | null;
          professional_user_id: string;
          starts_at: string;
          status: Database["public"]["Enums"]["appointment_status"];
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      consultations: {
        Row: {
          assessment: string | null;
          clinical_summary: string | null;
          completed_at: string | null;
          completed_by: string | null;
          consultation_type: Database["public"]["Enums"]["consultation_type"];
          created_at: string;
          created_by: string;
          id: string;
          objective: string | null;
          occurred_at: string;
          organization_id: string;
          patient_id: string;
          plan: string | null;
          status: Database["public"]["Enums"]["consultation_status"];
          subjective: string | null;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      dietary_histories: {
        Row: {
          created_at: string;
          eating_habits: string | null;
          organization_id: string;
          patient_id: string;
          physical_activity: string | null;
          preferences: string | null;
          recall_24h: string | null;
          restrictions: string | null;
          sleep_hours: number | null;
          updated_at: string;
          updated_by: string;
          water_liters: number | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      energy_calculations: {
        Row: {
          activity_factor: number;
          age_years_snapshot: number;
          carbohydrate_input: number;
          created_at: string;
          created_by: string;
          fat_input: number;
          formula: Database["public"]["Enums"]["energy_formula"];
          formula_version: string;
          goal_adjustment_kcal: number;
          height_cm_snapshot: number;
          id: string;
          macro_energy_kcal: number;
          macro_method: Database["public"]["Enums"]["macro_distribution_method"];
          measurement_id: string;
          organization_id: string;
          patient_id: string;
          protein_input: number;
          reference_sex: Database["public"]["Enums"]["growth_reference_sex"];
          resting_energy_kcal: number;
          target_carbohydrate_g: number;
          target_energy_kcal: number;
          target_fat_g: number;
          target_protein_g: number;
          total_energy_kcal: number;
          weight_kg_snapshot: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      food_groups: {
        Row: {
          carbohydrate_g: number;
          created_at: string;
          created_by: string;
          description: string | null;
          energy_kcal: number;
          fat_g: number;
          id: string;
          is_active: boolean;
          name: string;
          organization_id: string;
          portion_guidance: string | null;
          protein_g: number;
          sort_order: number;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      lab_results: {
        Row: {
          collected_on: string;
          created_at: string;
          id: string;
          notes: string | null;
          organization_id: string;
          patient_id: string;
          recorded_by: string;
          reference_max: number | null;
          reference_min: number | null;
          result_value: number;
          test_name: string;
          unit: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      meal_plan_items: {
        Row: {
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          equivalent_carbohydrate_g: number | null;
          equivalent_count: number | null;
          equivalent_energy_kcal: number | null;
          equivalent_fat_g: number | null;
          equivalent_protein_g: number | null;
          food_group_id: string | null;
          food_group_name_snapshot: string | null;
          food_name: string;
          guidance: string | null;
          id: string;
          meal_id: string;
          meal_plan_id: string;
          organization_id: string;
          quantity: number;
          sort_order: number;
          unit: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      meal_plan_template_items: {
        Row: {
          created_at: string;
          equivalent_carbohydrate_g: number | null;
          equivalent_count: number | null;
          equivalent_energy_kcal: number | null;
          equivalent_fat_g: number | null;
          equivalent_protein_g: number | null;
          food_group_id: string | null;
          food_group_name_snapshot: string | null;
          food_name: string;
          guidance: string | null;
          id: string;
          organization_id: string;
          quantity: number;
          sort_order: number;
          template_id: string;
          template_meal_id: string;
          unit: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      meal_plan_template_meals: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          organization_id: string;
          sort_order: number;
          suggested_time: string | null;
          template_id: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      meal_plan_templates: {
        Row: {
          category: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          instructions: string | null;
          is_active: boolean;
          name: string;
          organization_id: string;
          source_plan_id: string;
          target_carbohydrate_g: number | null;
          target_energy_kcal: number | null;
          target_fat_g: number | null;
          target_protein_g: number | null;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      meal_plan_meals: {
        Row: {
          created_at: string;
          id: string;
          meal_plan_id: string;
          name: string;
          organization_id: string;
          sort_order: number;
          suggested_time: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      meal_plans: {
        Row: {
          created_at: string;
          created_by: string;
          ends_on: string | null;
          id: string;
          instructions: string | null;
          name: string;
          organization_id: string;
          patient_id: string;
          pdf_generated_at: string | null;
          pdf_generated_by: string | null;
          pdf_object_path: string | null;
          starts_on: string | null;
          status: Database["public"]["Enums"]["meal_plan_status"];
          target_carbohydrate_g: number | null;
          target_energy_kcal: number | null;
          target_fat_g: number | null;
          target_protein_g: number | null;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      anthropometric_measurements: {
        Row: {
          abdominal_skinfold_mm: number | null;
          age_years_snapshot: number;
          arm_cm: number | null;
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
          calf_cm: number | null;
          hip_cm: number | null;
          organization_id: string;
          patient_id: string;
          recorded_by: string;
          subscapular_skinfold_mm: number | null;
          suprailiac_skinfold_mm: number | null;
          thigh_cm: number | null;
          triceps_skinfold_mm: number | null;
          waist_cm: number | null;
          waist_hip_ratio: number | null;
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
      public_booking_settings: {
        Row: {
          appointment_duration_minutes: number;
          booking_horizon_days: number;
          created_at: string;
          default_modality: Database["public"]["Enums"]["appointment_modality"];
          is_enabled: boolean;
          minimum_notice_hours: number;
          organization_id: string;
          privacy_consent_version: string;
          public_instructions: string | null;
          updated_at: string;
        };
        Insert: never;
        Update: never;
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
      patient_health_histories: {
        Row: {
          allergies: string | null;
          created_at: string;
          diagnoses: string | null;
          family_history: string | null;
          medical_history: string | null;
          medications: string | null;
          organization_id: string;
          patient_id: string;
          updated_at: string;
          updated_by: string;
        };
        Insert: never;
        Update: never;
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
          created_by: string | null;
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
      payments: {
        Row: {
          amount_centavos: number;
          appointment_id: string | null;
          created_at: string;
          external_reference: string | null;
          id: string;
          method: Database["public"]["Enums"]["payment_method"];
          organization_id: string;
          paid_at: string | null;
          patient_id: string;
          recorded_by: string;
          status: Database["public"]["Enums"]["payment_status"];
          updated_at: string;
        };
        Insert: never;
        Update: never;
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
      reminder_settings: {
        Row: {
          confirmation_enabled: boolean;
          created_at: string;
          max_attempts: number;
          organization_id: string;
          preferred_channel: Database["public"]["Enums"]["reminder_channel"];
          reminder_24h_enabled: boolean;
          reminder_2h_enabled: boolean;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      appointment_reminders: {
        Row: {
          appointment_id: string;
          attempt_count: number;
          channel: Database["public"]["Enums"]["reminder_channel"];
          created_at: string;
          id: string;
          idempotency_key: string;
          kind: Database["public"]["Enums"]["reminder_kind"];
          last_error_code: string | null;
          locked_at: string | null;
          locked_by: string | null;
          max_attempts: number;
          next_attempt_at: string;
          organization_id: string;
          provider_message_id: string | null;
          scheduled_at: string;
          sent_at: string | null;
          status: Database["public"]["Enums"]["reminder_status"];
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      reminder_delivery_attempts: {
        Row: {
          attempt_number: number;
          attempted_at: string;
          error_code: string | null;
          id: number;
          organization_id: string;
          outcome: Database["public"]["Enums"]["reminder_attempt_outcome"];
          provider: string;
          provider_message_id: string | null;
          reminder_id: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      add_meal_plan_item: {
        Args: {
          item_food_name: string;
          item_guidance: string | null;
          item_quantity: number;
          item_unit: string;
          target_meal_id: string;
        };
        Returns: string;
      };
      add_meal_plan_item_with_equivalent: {
        Args: {
          item_equivalent_count: number | null;
          item_food_name: string;
          item_guidance: string | null;
          item_quantity: number;
          item_unit: string;
          target_food_group_id: string | null;
          target_meal_id: string;
        };
        Returns: string;
      };
      archive_meal_plan_template: {
        Args: { target_template_id: string };
        Returns: undefined;
      };
      change_appointment_status: {
        Args: {
          next_status: Database["public"]["Enums"]["appointment_status"];
          target_appointment_id: string;
        };
        Returns: undefined;
      };
      change_meal_plan_status: {
        Args: {
          next_status: Database["public"]["Enums"]["meal_plan_status"];
          target_plan_id: string;
        };
        Returns: undefined;
      };
      change_payment_status: {
        Args: {
          next_status: Database["public"]["Enums"]["payment_status"];
          target_payment_id: string;
        };
        Returns: undefined;
      };
      complete_consultation: {
        Args: { target_consultation_id: string };
        Returns: undefined;
      };
      consume_public_booking_rate_limit: {
        Args: {
          maximum_requests: number;
          rate_fingerprint_hash: string;
          rate_scope: string;
          window_seconds: number;
        };
        Returns: boolean;
      };
      create_availability_block: {
        Args: {
          block_label: string | null;
          local_end: string;
          local_start: string;
          target_organization_id: string;
          target_professional_user_id: string;
        };
        Returns: string;
      };
      create_availability_rule: {
        Args: {
          local_end: string;
          local_start: string;
          target_organization_id: string;
          target_professional_user_id: string;
          weekday: number;
        };
        Returns: string;
      };
      create_consultation: {
        Args: {
          consultation_time: string;
          requested_type: Database["public"]["Enums"]["consultation_type"];
          target_patient_id: string;
        };
        Returns: string;
      };
      create_energy_calculation: {
        Args: {
          selected_activity_factor: number;
          selected_carbohydrate: number;
          selected_fat: number;
          selected_formula: Database["public"]["Enums"]["energy_formula"];
          selected_goal_adjustment_kcal: number;
          selected_macro_method: Database["public"]["Enums"]["macro_distribution_method"];
          selected_protein: number;
          source_measurement_id: string;
          target_patient_id: string;
        };
        Returns: string;
      };
      create_food_group: {
        Args: {
          group_carbohydrate_g: number;
          group_description: string | null;
          group_energy_kcal: number;
          group_fat_g: number;
          group_name: string;
          group_portion_guidance: string | null;
          group_protein_g: number;
          group_sort_order: number;
          target_organization_id: string;
        };
        Returns: string;
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
      create_meal_plan: {
        Args: {
          carbohydrate_g: number | null;
          energy_kcal: number | null;
          fat_g: number | null;
          plan_ends_on: string | null;
          plan_instructions: string | null;
          plan_name: string;
          plan_starts_on: string | null;
          protein_g: number | null;
          target_patient_id: string;
        };
        Returns: string;
      };
      create_meal_plan_from_template: {
        Args: {
          plan_ends_on: string | null;
          plan_name: string;
          plan_starts_on: string | null;
          target_patient_id: string;
          target_template_id: string;
        };
        Returns: string;
      };
      create_meal_plan_template_from_plan: {
        Args: {
          target_plan_id: string;
          template_category: string | null;
          template_description: string | null;
          template_name: string;
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
      create_payment: {
        Args: {
          payment_amount_centavos: number;
          payment_date: string;
          payment_method: Database["public"]["Enums"]["payment_method"];
          payment_reference: string | null;
          payment_status: Database["public"]["Enums"]["payment_status"];
          target_patient_id: string;
        };
        Returns: string;
      };
      create_public_booking: {
        Args: {
          booking_slug: string;
          patient_birth_date: string;
          patient_email: string | null;
          patient_first_name: string;
          patient_last_name: string;
          patient_phone_e164: string;
          selected_start: string;
          target_professional_user_id: string;
        };
        Returns: string;
      };
      delete_availability_block: {
        Args: { target_block_id: string };
        Returns: undefined;
      };
      delete_availability_rule: {
        Args: { target_rule_id: string };
        Returns: undefined;
      };
      get_public_booking_context: {
        Args: { booking_slug: string };
        Returns: {
          appointment_duration_minutes: number;
          booking_horizon_days: number;
          brand_color: string;
          clinic_timezone: string;
          contact_phone: string | null;
          minimum_notice_hours: number;
          organization_name: string;
          organization_slug: string;
          privacy_consent_version: string;
          public_instructions: string | null;
        }[];
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
      record_extended_adult_anthropometry: {
        Args: {
          measured_abdominal_mm: number | null;
          measured_arm_cm: number | null;
          measured_calf_cm: number | null;
          measured_height_cm: number;
          measured_hip_cm: number | null;
          measured_subscapular_mm: number | null;
          measured_suprailiac_mm: number | null;
          measured_thigh_cm: number | null;
          measured_triceps_mm: number | null;
          measured_waist_cm: number | null;
          measured_weight_kg: number;
          target_patient_id: string;
        };
        Returns: string;
      };
      record_clinical_read: {
        Args: { target_entity_type: string; target_patient_id: string };
        Returns: undefined;
      };
      record_consultation_read: {
        Args: { target_consultation_id: string };
        Returns: undefined;
      };
      record_energy_calculation_read: {
        Args: { target_calculation_id: string };
        Returns: undefined;
      };
      record_meal_plan_read: {
        Args: { target_plan_id: string };
        Returns: undefined;
      };
      record_meal_plan_pdf_download: {
        Args: { target_plan_id: string };
        Returns: string;
      };
      record_meal_plan_template_read: {
        Args: { target_template_id: string };
        Returns: undefined;
      };
      record_lab_result: {
        Args: {
          laboratory_collected_on: string;
          laboratory_notes: string | null;
          laboratory_reference_max: number | null;
          laboratory_reference_min: number | null;
          laboratory_result_value: number;
          laboratory_test_name: string;
          laboratory_unit: string;
          target_patient_id: string;
        };
        Returns: string;
      };
      remove_meal_plan_item: {
        Args: { target_item_id: string };
        Returns: undefined;
      };
      register_meal_plan_pdf: {
        Args: { object_path: string; target_plan_id: string };
        Returns: undefined;
      };
      update_meal_plan_item: {
        Args: {
          item_food_name: string;
          item_guidance: string | null;
          item_quantity: number;
          item_unit: string;
          target_item_id: string;
        };
        Returns: undefined;
      };
      update_meal_plan_item_with_equivalent: {
        Args: {
          item_equivalent_count: number | null;
          item_food_name: string;
          item_guidance: string | null;
          item_quantity: number;
          item_unit: string;
          target_food_group_id: string | null;
          target_item_id: string;
        };
        Returns: undefined;
      };
      update_food_group: {
        Args: {
          group_carbohydrate_g: number;
          group_description: string | null;
          group_energy_kcal: number;
          group_fat_g: number;
          group_is_active: boolean;
          group_name: string;
          group_portion_guidance: string | null;
          group_protein_g: number;
          group_sort_order: number;
          target_group_id: string;
        };
        Returns: undefined;
      };
      update_organization_branding: {
        Args: {
          organization_brand_color: string;
          organization_logo_path: string | null;
          organization_name: string;
          organization_phone_e164: string | null;
          target_organization_id: string;
        };
        Returns: undefined;
      };
      update_consultation_draft: {
        Args: {
          note_assessment: string | null;
          note_clinical_summary: string | null;
          note_objective: string | null;
          note_plan: string | null;
          note_subjective: string | null;
          target_consultation_id: string;
        };
        Returns: undefined;
      };
      save_patient_histories: {
        Args: {
          dietary_eating_habits: string | null;
          dietary_physical_activity: string | null;
          dietary_preferences: string | null;
          dietary_recall_24h: string | null;
          dietary_restrictions: string | null;
          dietary_sleep_hours: number | null;
          dietary_water_liters: number | null;
          history_allergies: string | null;
          history_diagnoses: string | null;
          history_family: string | null;
          history_medical: string | null;
          history_medications: string | null;
          target_patient_id: string;
        };
        Returns: undefined;
      };
      list_appointments_for_local_date: {
        Args: { target_date: string; target_organization_id: string };
        Returns: Database["public"]["Tables"]["appointments"]["Row"][];
      };
      list_public_booking_slots: {
        Args: {
          booking_slug: string;
          requested_days?: number;
          target_start_date: string;
        };
        Returns: {
          ends_at: string;
          professional_name: string;
          professional_user_id: string;
          starts_at: string;
        }[];
      };
      list_payments_for_local_month: {
        Args: { target_month: string; target_organization_id: string };
        Returns: Database["public"]["Tables"]["payments"]["Row"][];
      };
      list_scheduling_professionals: {
        Args: { target_organization_id: string };
        Returns: {
          full_name: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        }[];
      };
      save_public_booking_settings: {
        Args: {
          booking_enabled: boolean;
          booking_instructions: string | null;
          booking_modality: Database["public"]["Enums"]["appointment_modality"];
          duration_minutes: number;
          horizon_days: number;
          notice_hours: number;
          target_organization_id: string;
        };
        Returns: undefined;
      };
      save_reminder_settings: {
        Args: {
          enable_24h: boolean;
          enable_2h: boolean;
          enable_confirmation: boolean;
          reminder_channel: Database["public"]["Enums"]["reminder_channel"];
          target_organization_id: string;
        };
        Returns: undefined;
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
      consultation_status: "draft" | "completed";
      consultation_type: "initial" | "follow_up";
      energy_formula:
        "mifflin_st_jeor" | "harris_benedict_revised" | "fao_who_unu";
      growth_reference_sex: "female" | "male";
      macro_distribution_method: "percentage" | "grams_per_kg";
      membership_status: "invited" | "active" | "suspended";
      meal_plan_status: "draft" | "active" | "archived";
      patient_status: "active" | "inactive" | "archived";
      payment_method: "cash" | "card" | "transfer" | "other";
      payment_status: "pending" | "paid" | "voided" | "refunded";
      reminder_attempt_outcome: "sent" | "failed";
      reminder_channel: "whatsapp" | "sms" | "email";
      reminder_kind: "confirmation" | "reminder_24h" | "reminder_2h";
      reminder_status:
        "queued" | "processing" | "sent" | "failed" | "blocked" | "cancelled";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<TableName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TableName]["Row"];
