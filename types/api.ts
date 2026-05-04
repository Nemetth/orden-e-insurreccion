import type { Database } from "@/types/database";

type EntityRow = Database["public"]["Tables"]["entities"]["Row"];
type EntityTypeRow = Database["public"]["Tables"]["entity_types"]["Row"];
type EntityValueRow = Database["public"]["Tables"]["entity_values"]["Row"];
type AttributeRow = Database["public"]["Tables"]["attributes"]["Row"];
type RelationshipRow = Database["public"]["Tables"]["relationships"]["Row"];

export type EntityTypeWithAttributes = Database["public"]["Tables"]["entity_types"]["Row"] & {
  attributes: Database["public"]["Tables"]["attributes"]["Row"][];
};

export type EntityWithTypeAndValues = EntityRow & {
  entity_type: EntityTypeRow;
  values: Array<
    EntityValueRow & {
      attribute: AttributeRow;
    }
  >;
};

export type RelationshipWithEntities = RelationshipRow & {
  source_entity: EntityRow & { entity_type: EntityTypeRow };
  target_entity: EntityRow & { entity_type: EntityTypeRow };
};

type HistoryYearRow = Database["public"]["Tables"]["entity_history_years"]["Row"];
type HistoryAttrTypeRow =
  Database["public"]["Tables"]["history_attribute_types"]["Row"];
type HistoryValueRow = Database["public"]["Tables"]["entity_history_values"]["Row"];

/** Valor histórico con la definición del atributo (para UI / GET history). */
export type EntityHistoryValueWithType = HistoryValueRow & {
  history_attribute_type: HistoryAttrTypeRow;
};

export type EntityHistoryYearWithValues = HistoryYearRow & {
  values: EntityHistoryValueWithType[];
};

export type EntityHistoryPayload = {
  years: EntityHistoryYearWithValues[];
};

/** Un año de historia con entidad y tipo (respuesta plana de GET /api/history/global). */
export type GlobalHistoryYearEntry = HistoryYearRow & {
  values: EntityHistoryValueWithType[];
  entity: EntityRow;
  entity_type: EntityTypeRow;
};

export type GlobalHistoryPayload = GlobalHistoryYearEntry[];

export type EntityDocument = Database["public"]["Tables"]["entity_documents"]["Row"];

export type RumorCredibility = "confirmado" | "probable" | "dudoso" | "falso";

export type EntityRumorRow = Database["public"]["Tables"]["entity_rumors"]["Row"];

export type EntityRumorWithSource = EntityRumorRow & {
  source_entity:
    | (EntityRow & { entity_type: EntityTypeRow })
    | null;
};

export type EntityMapPositionRow = Database["public"]["Tables"]["entity_map_positions"]["Row"];
export type MapLocationRow = Database["public"]["Tables"]["map_locations"]["Row"];
export type MapRegionRow = Database["public"]["Tables"]["map_regions"]["Row"];

export type EntityMapPositionWithEntity = EntityMapPositionRow & {
  entity: EntityRow & { entity_type: EntityTypeRow };
};
