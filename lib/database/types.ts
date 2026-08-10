/**
 * Hand-authored counterpart to `supabase gen types typescript` for
 * lib/database/schema.sql. Once a real Supabase project exists, replace
 * this file's contents with the CLI-generated output (same shape) so it
 * never drifts from the live schema — keep the export name `Database`
 * stable so `createClient<Database>()` call sites don't need to change.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type DecisionStatus = "draft" | "processing" | "completed" | "failed" | "archived";
export type DecisionEntityType = "vendor" | "supplier" | "product" | "service" | "contract_party" | "other";
export type ProfileSubscriptionStatus = "trial" | "active" | "canceled";

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          industry: string | null;
          country: string | null;
          currency: string;
          vat_rate: number;
          target_margin: number | null;
          budget: Json;
          software_stack: Json;
          preferences: Json;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name: string;
          industry?: string | null;
          country?: string | null;
          currency?: string;
          vat_rate?: number;
          target_margin?: number | null;
          budget?: Json;
          software_stack?: Json;
          preferences?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string;
          industry?: string | null;
          country?: string | null;
          currency?: string;
          vat_rate?: number;
          target_margin?: number | null;
          budget?: Json;
          software_stack?: Json;
          preferences?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      decisions: {
        Row: {
          id: string;
          company_id: string;
          created_by: string;
          module_key: string;
          module_version: string;
          title: string;
          status: DecisionStatus;
          input_data: Json;
          deterministic_metrics: Json | null;
          ai_analysis: Json | null;
          verdict_code: string | null;
          verdict_confidence: number | null;
          verdict: Json | null;
          risks: Json;
          recommended_actions: Json;
          final_decision: string | null;
          final_decision_notes: string | null;
          decided_at: string | null;
          outcome: Json | null;
          outcome_recorded_at: string | null;
          error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          created_by: string;
          module_key: string;
          module_version?: string;
          title: string;
          status?: DecisionStatus;
          input_data?: Json;
          deterministic_metrics?: Json | null;
          ai_analysis?: Json | null;
          verdict_code?: string | null;
          verdict_confidence?: number | null;
          verdict?: Json | null;
          risks?: Json;
          recommended_actions?: Json;
          final_decision?: string | null;
          final_decision_notes?: string | null;
          decided_at?: string | null;
          outcome?: Json | null;
          outcome_recorded_at?: string | null;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          created_by?: string;
          module_key?: string;
          module_version?: string;
          title?: string;
          status?: DecisionStatus;
          input_data?: Json;
          deterministic_metrics?: Json | null;
          ai_analysis?: Json | null;
          verdict_code?: string | null;
          verdict_confidence?: number | null;
          verdict?: Json | null;
          risks?: Json;
          recommended_actions?: Json;
          final_decision?: string | null;
          final_decision_notes?: string | null;
          decided_at?: string | null;
          outcome?: Json | null;
          outcome_recorded_at?: string | null;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      decision_documents: {
        Row: {
          id: string;
          decision_id: string;
          file_name: string;
          file_type: string;
          storage_path: string | null;
          source_kind: string;
          raw_text: string | null;
          parsed_data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          decision_id: string;
          file_name: string;
          file_type: string;
          storage_path?: string | null;
          source_kind?: string;
          raw_text?: string | null;
          parsed_data?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          decision_id?: string;
          file_name?: string;
          file_type?: string;
          storage_path?: string | null;
          source_kind?: string;
          raw_text?: string | null;
          parsed_data?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      decision_entities: {
        Row: {
          id: string;
          company_id: string | null;
          entity_type: DecisionEntityType;
          name: string;
          normalized_name: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          entity_type?: DecisionEntityType;
          name: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          entity_type?: DecisionEntityType;
          name?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      decision_entity_links: {
        Row: {
          id: string;
          decision_id: string;
          entity_id: string;
          role: string;
          metrics: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          decision_id: string;
          entity_id: string;
          role?: string;
          metrics?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          decision_id?: string;
          entity_id?: string;
          role?: string;
          metrics?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      company_module_access: {
        Row: {
          id: string;
          company_id: string;
          module_key: string;
          enabled: boolean;
          plan_tier: string | null;
          enabled_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          module_key: string;
          enabled?: boolean;
          plan_tier?: string | null;
          enabled_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          module_key?: string;
          enabled?: boolean;
          plan_tier?: string | null;
          enabled_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          trial_credits: number;
          stripe_customer_id: string | null;
          subscription_status: ProfileSubscriptionStatus;
          monthly_analyses_used: number;
          monthly_period_start: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trial_credits?: number;
          stripe_customer_id?: string | null;
          subscription_status?: ProfileSubscriptionStatus;
          monthly_analyses_used?: number;
          monthly_period_start?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          trial_credits?: number;
          stripe_customer_id?: string | null;
          subscription_status?: ProfileSubscriptionStatus;
          monthly_analyses_used?: number;
          monthly_period_start?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      decrement_trial_credit: {
        Args: { p_user_id: string };
        // Non-SETOF composite return: a single row, or null when the
        // WHERE clause matched nothing (i.e. no credits left to spend).
        Returns: {
          id: string;
          user_id: string;
          trial_credits: number;
          stripe_customer_id: string | null;
          subscription_status: ProfileSubscriptionStatus;
          monthly_analyses_used: number;
          monthly_period_start: string;
          created_at: string;
        } | null;
      };
      consume_monthly_analysis: {
        Args: { p_user_id: string; p_limit: number };
        // Non-SETOF composite return: a single row, or null when the
        // WHERE clause matched nothing (i.e. already at the monthly cap).
        Returns: {
          id: string;
          user_id: string;
          trial_credits: number;
          stripe_customer_id: string | null;
          subscription_status: ProfileSubscriptionStatus;
          monthly_analyses_used: number;
          monthly_period_start: string;
          created_at: string;
        } | null;
      };
    };
  };
}
