import { create } from "zustand";

import { archiveApi } from "@/lib/api/archive-client";
import type {
  EntityTypeWithAttributes,
  EntityWithTypeAndValues,
  RelationshipWithEntities,
} from "@/types/api";

export type ViewMode = "graph" | "dossier";

export type ConfirmDeleteTarget =
  | { kind: "type"; id: string; title: string }
  | { kind: "entity"; id: string; title: string }
  | { kind: "relationship"; id: string; title: string };

export type ArchiveModalState =
  | { kind: "none" }
  | { kind: "createType" }
  | { kind: "editType"; typeId: string }
  | { kind: "createEntity"; defaultTypeId?: string }
  | { kind: "editEntity"; entityId: string }
  | { kind: "createRelationship"; defaultSourceId?: string }
  | { kind: "editRelationship"; relationshipId: string }
  | { kind: "addAttribute"; typeId: string }
  | { kind: "confirmDelete"; target: ConfirmDeleteTarget };

type ArchiveStore = {
  types: EntityTypeWithAttributes[];
  entities: EntityWithTypeAndValues[];
  relationships: RelationshipWithEntities[];
  loading: boolean;
  error: string | null;
  mode: ViewMode;
  selectedEntityId: string | null;
  modal: ArchiveModalState;

  setMode: (mode: ViewMode) => void;
  selectEntity: (id: string | null) => void;
  openModal: (m: ArchiveModalState) => void;
  closeModal: () => void;
  setError: (msg: string | null) => void;

  refreshTypes: () => Promise<void>;
  refreshEntities: () => Promise<void>;
  refreshRelationships: () => Promise<void>;
  refreshAll: () => Promise<void>;

  /** Tras mutación local opcional (evita flicker). */
  upsertEntity: (e: EntityWithTypeAndValues) => void;
};

export const useArchiveStore = create<ArchiveStore>((set, get) => ({
  types: [],
  entities: [],
  relationships: [],
  loading: false,
  error: null,
  mode: "graph",
  selectedEntityId: null,
  modal: { kind: "none" },

  setMode: (mode) => set({ mode }),
  selectEntity: (id) => set({ selectedEntityId: id }),
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: { kind: "none" } }),
  setError: (error) => set({ error }),

  refreshTypes: async () => {
    const types = await archiveApi.getTypes();
    set({ types });
  },

  refreshEntities: async () => {
    const entities = await archiveApi.getEntities();
    set({ entities });
  },

  refreshRelationships: async () => {
    const relationships = await archiveApi.getRelationships();
    set({ relationships });
  },

  refreshAll: async () => {
    set({ loading: true, error: null });
    try {
      const [types, entities, relationships] = await Promise.all([
        archiveApi.getTypes(),
        archiveApi.getEntities(),
        archiveApi.getRelationships(),
      ]);
      set({ types, entities, relationships, loading: false });

      const sel = get().selectedEntityId;
      if (sel && !entities.some((e) => e.id === sel)) {
        set({ selectedEntityId: null, mode: "graph" });
      }
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Error al cargar el archivo",
        loading: false,
      });
    }
  },

  upsertEntity: (updated) =>
    set((s) => ({
      entities: s.entities.some((x) => x.id === updated.id)
        ? s.entities.map((x) => (x.id === updated.id ? updated : x))
        : [...s.entities, updated],
    })),
}));
