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

/** Atributos históricos por tipo (subconjunto de columnas EAV). */
export type HistoryAttributeValueType =
  | "text"
  | "long_text"
  | "number"
  | "boolean"
  | "date";

export interface Database {
  public: {
    Tables: {
      entity_types: {
        Row: {
          id: string;
          slug: string;
          name: string;
          color: string;
          icon: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          color?: string;
          icon?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          color?: string;
          icon?: string;
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
          tension_level: number;
          tension_notes: string | null;
          year_start: number | null;
          year_end: number | null;
        };
        Insert: {
          id?: string;
          source_entity_id: string;
          target_entity_id: string;
          relation_key: string;
          label?: string | null;
          meta?: Json;
          created_at?: string;
          tension_level?: number;
          tension_notes?: string | null;
          year_start?: number | null;
          year_end?: number | null;
        };
        Update: {
          id?: string;
          source_entity_id?: string;
          target_entity_id?: string;
          relation_key?: string;
          label?: string | null;
          meta?: Json;
          created_at?: string;
          tension_level?: number;
          tension_notes?: string | null;
          year_start?: number | null;
          year_end?: number | null;
        };
      };
      entity_documents: {
        Row: {
          id: string;
          entity_id: string;
          title: string;
          content: string | null;
          classification: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          entity_id: string;
          title: string;
          content?: string | null;
          classification?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          entity_id?: string;
          title?: string;
          content?: string | null;
          classification?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      entity_rumors: {
        Row: {
          id: string;
          entity_id: string;
          source_entity_id: string | null;
          content: string;
          year: number | null;
          credibility: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_id: string;
          source_entity_id?: string | null;
          content: string;
          year?: number | null;
          credibility?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          entity_id?: string;
          source_entity_id?: string | null;
          content?: string;
          year?: number | null;
          credibility?: string;
          created_at?: string;
        };
      };
      entity_map_positions: {
        Row: {
          id: string;
          entity_id: string;
          lat: string;
          lng: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_id: string;
          lat: number | string;
          lng: number | string;
          created_at?: string;
        };
        Update: {
          id?: string;
          entity_id?: string;
          lat?: number | string;
          lng?: number | string;
          created_at?: string;
        };
      };
      map_locations: {
        Row: {
          id: string;
          name: string;
          lat: string;
          lng: string;
          is_preset: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          lat: number | string;
          lng: number | string;
          is_preset?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          lat?: number | string;
          lng?: number | string;
          is_preset?: boolean;
          created_at?: string;
        };
      };
      map_regions: {
        Row: {
          id: string;
          name: string;
          color: string;
          geojson: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color?: string;
          geojson: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          color?: string;
          geojson?: Json;
          created_at?: string;
        };
      };
      entity_history_years: {
        Row: {
          id: string;
          entity_id: string;
          year: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_id: string;
          year: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          entity_id?: string;
          year?: number;
          created_at?: string;
        };
      };
      history_attribute_types: {
        Row: {
          id: string;
          entity_type_id: string;
          key: string;
          label: string;
          value_type: HistoryAttributeValueType;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_type_id: string;
          key: string;
          label: string;
          value_type: HistoryAttributeValueType;
          created_at?: string;
        };
        Update: {
          id?: string;
          entity_type_id?: string;
          key?: string;
          label?: string;
          value_type?: HistoryAttributeValueType;
          created_at?: string;
        };
      };
      entity_history_values: {
        Row: {
          id: string;
          history_year_id: string;
          history_attribute_type_id: string;
          value_text: string | null;
          value_number: string | null;
          value_boolean: boolean | null;
          value_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          history_year_id: string;
          history_attribute_type_id: string;
          value_text?: string | null;
          value_number?: string | null;
          value_boolean?: boolean | null;
          value_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          history_year_id?: string;
          history_attribute_type_id?: string;
          value_text?: string | null;
          value_number?: string | null;
          value_boolean?: boolean | null;
          value_date?: string | null;
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
