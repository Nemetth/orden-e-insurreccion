"use client";

import { useArchiveStore } from "@/store/archive-store";

import { AddAttributeModal } from "./modals/AddAttributeModal";
import { ConfirmDeleteModal } from "./modals/ConfirmDeleteModal";
import { CreateEntityModal } from "./modals/CreateEntityModal";
import { CreateRelationshipModal } from "./modals/CreateRelationshipModal";
import { CreateTypeModal } from "./modals/CreateTypeModal";
import { EditEntityModal } from "./modals/EditEntityModal";
import { EditRelationshipModal } from "./modals/EditRelationshipModal";
import { EditTypeModal } from "./modals/EditTypeModal";

export function ModalHost() {
  const modal = useArchiveStore((s) => s.modal);

  switch (modal.kind) {
    case "none":
      return null;
    case "createType":
      return <CreateTypeModal />;
    case "editType":
      return <EditTypeModal key={modal.typeId} typeId={modal.typeId} />;
    case "createEntity":
      return (
        <CreateEntityModal key={modal.defaultTypeId ?? "any"} defaultTypeId={modal.defaultTypeId} />
      );
    case "editEntity":
      return (
        <EditEntityModal key={modal.entityId} entityId={modal.entityId} />
      );
    case "createRelationship":
      return (
        <CreateRelationshipModal
          key={modal.defaultSourceId ?? "rel"}
          defaultSourceId={modal.defaultSourceId}
        />
      );
    case "editRelationship":
      return (
        <EditRelationshipModal
          key={modal.relationshipId}
          relationshipId={modal.relationshipId}
        />
      );
    case "addAttribute":
      return <AddAttributeModal key={modal.typeId} typeId={modal.typeId} />;
    case "confirmDelete":
      return (
        <ConfirmDeleteModal
          key={`${modal.target.kind}-${modal.target.id}`}
          target={modal.target}
        />
      );
    default:
      return null;
  }
}
