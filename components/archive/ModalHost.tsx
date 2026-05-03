"use client";

import { useArchiveStore } from "@/store/archive-store";

import { AddAttributeModal } from "./modals/AddAttributeModal";
import { CreateEntityModal } from "./modals/CreateEntityModal";
import { CreateRelationshipModal } from "./modals/CreateRelationshipModal";
import { CreateTypeModal } from "./modals/CreateTypeModal";

export function ModalHost() {
  const modal = useArchiveStore((s) => s.modal);

  switch (modal.kind) {
    case "none":
      return null;
    case "createType":
      return <CreateTypeModal />;
    case "createEntity":
      return <CreateEntityModal defaultTypeId={modal.defaultTypeId} />;
    case "createRelationship":
      return (
        <CreateRelationshipModal defaultSourceId={modal.defaultSourceId} />
      );
    case "addAttribute":
      return <AddAttributeModal typeId={modal.typeId} />;
    default:
      return null;
  }
}
