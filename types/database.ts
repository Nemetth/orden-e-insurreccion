export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AttributeValueType =
  | "text"
  | "long_text"
  | "number"
  | "boolean"
  | "date"
  | "json"
  | "entity_ref";

export interface Database {
  public: {
    Tables: {
      entity_types: {
        Row: {
          id: string;
          slug: string;
          name: string;
          color: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          color?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          color?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      attributes: {
        Row: {
          id: string;
          entity_type_id: string;
          key: string;
          label: string;
          value_type: AttributeValueType;
          is_required: boolean;
          sort_order: number;
          meta: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_type_id: string;
          key: string;
          label: string;
          value_type: AttributeValueType;
          is_required?: boolean;
          sort_order?: number;
          meta?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          entity_type_id?: string;
          key?: string;
          label?: string;
          value_type?: AttributeValueType;
          is_required?: boolean;
          sort_order?: number;
          meta?: Json;
          created_at?: string;
        };
      };
      entities: {
        Row: {
          id: string;
          entity_type_id: string;
          slug: string | null;
          name: string;
          summary: string | null;
          meta: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          entity_type_id: string;
          slug?: string | null;
          name: string;
          summary?: string | null;
          meta?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          entity_type_id?: string;
          slug?: string | null;
          name?: string;
          summary?: string | null;
          meta?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      entity_values: {
        Row: {
          id: string;
          entity_id: string;
          attribute_id: string;
          value_text: string | null;
          value_numeric: string | null;
          value_boolean: boolean | null;
          value_timestamptz: string | null;
          value_json: Json | null;
          ref_entity_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          entity_id: string;
          attribute_id: string;
          value_text?: string | null;
          value_numeric?: string | null;
          value_boolean?: boolean | null;
          value_timestamptz?: string | null;
          value_json?: Json | null;
          ref_entity_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          entity_id?: string;
          attribute_id?: string;
          value_text?: string | null;
          value_numeric?: string | null;
          value_boolean?: boolean | null;
          value_timestamptz?: string | null;
          value_json?: Json | null;
          ref_entity_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      relationships: {
        Row: {
          id: string;
          source_entity_id: string;
          target_entity_id: string;
          relation_key: string;
          label: string | null;
          meta: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_entity_id: string;
          target_entity_id: string;
          relation_key: string;
          label?: string | null;
          meta?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          source_entity_id?: string;
          target_entity_id?: string;
          relation_key?: string;
          label?: string | null;
          meta?: Json;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
