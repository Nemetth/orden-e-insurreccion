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
