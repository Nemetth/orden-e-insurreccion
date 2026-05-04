"use client";

import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GeoJsonObject } from "geojson";
import type { Feature } from "geojson";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Pane,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";
import { MapPin, MousePointer2, Pentagon } from "lucide-react";

import { archiveApi } from "@/lib/api/archive-client";
import { useArchiveStore } from "@/store/archive-store";
import { useToastStore } from "@/store/toast-store";
import type {
  EntityMapPositionWithEntity,
  MapLocationRow,
  MapRegionRow,
} from "@/types/api";

const CENTER: [number, number] = [-38, -63];
const ZOOM = 5;
const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const GOLD = "#c9a227";

const REGION_PANE = "archiveRegionsPane";
const REGION_PANE_Z = 390;

const PALETTE = ["#8b1a1a", "#c9a227", "#1a2e1a", "#1a1a2e", "#2e1a1a"] as const;

type MapTool = "select" | "draw" | "place";

function createGoldPresetIcon(): L.DivIcon {
  return L.divIcon({
    className: "archive-leaflet-divicon",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${GOLD};border:2px solid #1a1824;box-shadow:0 0 8px rgba(201,162,39,0.45)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

const entityIconCache = new Map<string, L.DivIcon>();

function getEntityIcon(color: string): L.DivIcon {
  const c = color || GOLD;
  const hit = entityIconCache.get(c);
  if (hit) return hit;
  const icon = L.divIcon({
    className: "archive-leaflet-divicon",
    html: `<div style="width:26px;height:26px;border-radius:50%;background:${c};border:2px solid #1a1824"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
  entityIconCache.set(c, icon);
  return icon;
}

function MapPlacementHandler({
  activeEntityId,
  onPlace,
}: {
  activeEntityId: string | null;
  onPlace: (entityId: string, lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (!activeEntityId) return;
      onPlace(activeEntityId, e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function DrawPolygonController({
  enabled,
  onFeature,
}: {
  enabled: boolean;
  onFeature: (feature: Feature) => void;
}) {
  const map = useMap();
  const drawerRef = useRef<L.Draw.Polygon | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (drawerRef.current) {
        drawerRef.current.disable();
        drawerRef.current = null;
      }
      return;
    }

    const onCreated = (e: L.LeafletEvent) => {
      const ev = e as L.DrawEvents.Created;
      const layer = ev.layer;
      map.removeLayer(layer);
      drawerRef.current?.disable();
      const gj = layer.toGeoJSON() as Feature;
      onFeature(gj);
    };

    map.on(L.Draw.Event.CREATED, onCreated);
    const drawMap = map as L.DrawMap;
    const drawer = new L.Draw.Polygon(drawMap, {
      shapeOptions: {
        color: "#c9a227",
        weight: 2,
      },
    });
    drawerRef.current = drawer;
    drawer.enable();

    return () => {
      map.off(L.Draw.Event.CREATED, onCreated);
      drawer.disable();
      drawerRef.current = null;
    };
  }, [enabled, map, onFeature]);

  return null;
}

function RegionPopupBody({
  region,
  onUpdate,
  onDelete,
}: {
  region: MapRegionRow;
  onUpdate: (id: string, patch: { name?: string; color?: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(region.name);
  const [color, setColor] = useState(region.color);

  useEffect(() => {
    setName(region.name);
    setColor(region.color);
  }, [region.id, region.name, region.color]);

  return (
    <div
      style={{
        minWidth: "11rem",
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: "12px",
        color: "#e8e4dc",
      }}
    >
      <label style={{ display: "block", marginBottom: "0.5rem" }}>
        <span style={{ color: "#8a8580", fontSize: "10px" }}>Nombre</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            const t = name.trim();
            if (t && t !== region.name) onUpdate(region.id, { name: t });
          }}
          style={{
            marginTop: "0.25rem",
            width: "100%",
            border: "1px solid #2a2835",
            background: "#0c0c14",
            color: "#e8e4dc",
            padding: "0.25rem 0.35rem",
          }}
        />
      </label>
      <div style={{ marginBottom: "0.5rem" }}>
        <span style={{ color: "#8a8580", fontSize: "10px" }}>Color</span>
        <div
          style={{
            marginTop: "0.35rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
          }}
        >
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => {
                setColor(c);
                onUpdate(region.id, { color: c });
              }}
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "4px",
                background: c,
                border:
                  color === c
                    ? "2px solid #e8e4dc"
                    : "2px solid rgba(0,0,0,0.35)",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onDelete(region.id)}
        style={{
          width: "100%",
          border: "1px solid rgba(139,26,26,0.55)",
          background: "rgba(139,26,26,0.12)",
          padding: "0.35rem 0",
          fontSize: "10px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#e8a0a0",
          cursor: "pointer",
        }}
      >
        Eliminar región
      </button>
    </div>
  );
}

export function TerritoryMapPanel() {
  const entities = useArchiveStore((s) => s.entities);
  const selectEntity = useArchiveStore((s) => s.selectEntity);
  const setMode = useArchiveStore((s) => s.setMode);
  const setError = useArchiveStore((s) => s.setError);
  const pushToast = useToastStore((s) => s.pushToast);

  const [positions, setPositions] = useState<EntityMapPositionWithEntity[]>([]);
  const [locations, setLocations] = useState<MapLocationRow[]>([]);
  const [regions, setRegions] = useState<MapRegionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tool, setTool] = useState<MapTool>("select");
  const [locatingEntityId, setLocatingEntityId] = useState<string | null>(null);
  const [newRegionDraft, setNewRegionDraft] = useState<Feature | null>(null);
  const [newRegionName, setNewRegionName] = useState("Nueva región");
  const [newRegionColor, setNewRegionColor] = useState<string>(PALETTE[0]);

  const goldIcon = useMemo(() => createGoldPresetIcon(), []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pos, loc, reg] = await Promise.all([
        archiveApi.getMapPositions(),
        archiveApi.getMapLocations(),
        archiveApi.getMapRegions(),
      ]);
      setPositions(pos);
      setLocations(loc);
      setRegions(reg);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar mapa");
    } finally {
      setLoading(false);
    }
  }, [setError]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (tool !== "place") setLocatingEntityId(null);
  }, [tool]);

  const positionedIds = useMemo(
    () => new Set(positions.map((p) => p.entity_id)),
    [positions]
  );

  const unplacedEntities = useMemo(
    () =>
      [...entities]
        .filter((e) => !positionedIds.has(e.id))
        .sort((a, b) => a.name.localeCompare(b.name, "es")),
    [entities, positionedIds]
  );

  const openDossier = (entityId: string) => {
    selectEntity(entityId);
    setMode("dossier");
  };

  const handlePlaceOnMap = useCallback(
    async (entityId: string, lat: number, lng: number) => {
      try {
        const created = await archiveApi.postMapPosition({
          entity_id: entityId,
          lat,
          lng,
        });
        setPositions((prev) => {
          const rest = prev.filter((p) => p.entity_id !== entityId);
          return [...rest, created];
        });
        setLocatingEntityId(null);
        pushToast("Entidad ubicada en el mapa", "success");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar posición");
      }
    },
    [pushToast, setError]
  );

  const handleDragEnd = useCallback(
    async (positionId: string, lat: number, lng: number) => {
      try {
        const updated = await archiveApi.patchMapPosition(positionId, {
          lat,
          lng,
        });
        setPositions((prev) =>
          prev.map((p) => (p.id === positionId ? updated : p))
        );
        pushToast("Posición actualizada", "success");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al mover marcador");
        void loadAll();
      }
    },
    [loadAll, pushToast, setError]
  );

  const onDrawFeature = useCallback((feature: Feature) => {
    setNewRegionDraft(feature);
    setNewRegionName("Nueva región");
    setNewRegionColor(PALETTE[0]);
  }, []);

  const drawActive = tool === "draw" && !newRegionDraft;

  const handleSaveNewRegion = async () => {
    if (!newRegionDraft) return;
    const nm = newRegionName.trim();
    if (!nm) {
      pushToast("El nombre es obligatorio", "error");
      return;
    }
    try {
      const row = await archiveApi.postMapRegion({
        name: nm,
        color: newRegionColor,
        geojson: newRegionDraft as unknown as Record<string, unknown>,
      });
      setRegions((r) => [row, ...r]);
      setNewRegionDraft(null);
      pushToast("Región guardada", "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar región");
    }
  };

  const handleRegionPatch = useCallback(
    async (id: string, patch: { name?: string; color?: string }) => {
      try {
        const updated = await archiveApi.patchMapRegion(id, patch);
        setRegions((prev) => prev.map((r) => (r.id === id ? updated : r)));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al actualizar región");
        void loadAll();
      }
    },
    [loadAll, setError]
  );

  const handleRegionDelete = useCallback(
    async (id: string) => {
      try {
        await archiveApi.deleteMapRegion(id);
        setRegions((prev) => prev.filter((r) => r.id !== id));
        pushToast("Región eliminada", "success");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al eliminar");
      }
    },
    [pushToast, setError]
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-sm text-archive-muted">
        Cargando mapa…
      </div>
    );
  }

  const mapCrosshair =
    tool === "draw" || (tool === "place" && locatingEntityId);

  return (
    <div className="flex h-full min-h-0 flex-row bg-archive-void">
      <aside className="flex w-72 shrink-0 flex-col border-r border-archive-border bg-archive-panel/90">
        <div className="border-b border-archive-border px-4 py-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-archive-muted">
            Sin ubicar
          </h2>
          <p className="mt-1 font-mono text-[10px] leading-relaxed text-archive-muted/90">
            {tool === "place" ? (
              <>
                Elegí <span className="text-archive-gold">Ubicar</span> y hacé
                clic en el mapa.
              </>
            ) : (
              <span className="text-archive-muted">
                Activá el modo <span className="text-archive-gold">Colocar</span>{" "}
                en la barra del mapa para ubicar entidades.
              </span>
            )}
          </p>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {unplacedEntities.map((e) => (
            <li
              key={e.id}
              className="mb-2 flex items-center justify-between gap-2 rounded border border-archive-border/60 bg-archive-void/40 px-2 py-2"
            >
              <span className="min-w-0 truncate font-playfair text-sm text-archive-ink">
                {e.name}
              </span>
              <button
                type="button"
                disabled={tool !== "place"}
                onClick={() =>
                  setLocatingEntityId((cur) => (cur === e.id ? null : e.id))
                }
                className={`shrink-0 border px-2 py-1 font-mono text-[9px] uppercase tracking-wider transition ${
                  tool !== "place"
                    ? "cursor-not-allowed border-archive-border/40 text-archive-muted/50"
                    : locatingEntityId === e.id
                      ? "border-archive-gold bg-archive-gold/15 text-archive-gold"
                      : "border-archive-border text-archive-muted hover:border-archive-gold/40 hover:text-archive-gold"
                }`}
              >
                {locatingEntityId === e.id ? "Cancelar" : "Ubicar"}
              </button>
            </li>
          ))}
          {unplacedEntities.length === 0 && (
            <li className="px-2 py-6 text-center font-mono text-xs text-archive-muted">
              Todas las entidades tienen coordenadas.
            </li>
          )}
        </ul>
      </aside>

      <div
        className={
          mapCrosshair
            ? "relative min-h-0 flex-1 [&_.leaflet-container]:!cursor-crosshair"
            : "relative min-h-0 flex-1"
        }
      >
        <div className="pointer-events-none absolute right-3 top-3 z-[1000] flex gap-2">
          <ToolbarBtn
            active={tool === "select"}
            onClick={() => setTool("select")}
            label="Selección"
            icon={MousePointer2}
          />
          <ToolbarBtn
            active={tool === "draw"}
            onClick={() => setTool("draw")}
            label="Dibujar"
            icon={Pentagon}
          />
          <ToolbarBtn
            active={tool === "place"}
            onClick={() => setTool("place")}
            label="Colocar"
            icon={MapPin}
          />
        </div>

        {newRegionDraft && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-sm border border-archive-border bg-archive-panel p-5 shadow-2xl">
              <h3 className="font-playfair text-lg text-archive-gold">
                Nueva región
              </h3>
              <label className="mt-4 block font-mono text-[10px] uppercase tracking-wider text-archive-muted">
                Nombre
                <input
                  value={newRegionName}
                  onChange={(e) => setNewRegionName(e.target.value)}
                  className="mt-1 w-full border border-archive-border bg-archive-void px-3 py-2 font-mono text-sm text-archive-ink"
                />
              </label>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-archive-muted">
                Color
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    onClick={() => setNewRegionColor(c)}
                    className={`h-8 w-8 rounded border-2 transition ${
                      newRegionColor === c
                        ? "border-archive-ink"
                        : "border-transparent"
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewRegionDraft(null)}
                  className="border border-archive-border px-4 py-2 font-mono text-xs text-archive-muted hover:border-archive-muted hover:text-archive-ink"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveNewRegion()}
                  className="bg-archive-crimson px-4 py-2 font-mono text-xs text-archive-ink hover:opacity-90"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        <MapContainer
          center={CENTER}
          zoom={ZOOM}
          className="h-full w-full min-h-[420px] z-0"
          scrollWheelZoom
          style={{ background: "#080810" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url={TILE_URL}
            subdomains="abcd"
            maxZoom={20}
          />

          <Pane name={REGION_PANE} style={{ zIndex: REGION_PANE_Z }}>
            {regions.map((r) => (
              <GeoJSON
                key={r.id}
                data={r.geojson as unknown as GeoJsonObject}
                interactive={tool === "select"}
                style={{
                  color: r.color,
                  fillColor: r.color,
                  fillOpacity: 0.3,
                  weight: 2,
                  opacity: 1,
                }}
              >
                <Popup>
                  <RegionPopupBody
                    region={r}
                    onUpdate={handleRegionPatch}
                    onDelete={handleRegionDelete}
                  />
                </Popup>
              </GeoJSON>
            ))}
          </Pane>

          <DrawPolygonController enabled={drawActive} onFeature={onDrawFeature} />

          <MapPlacementHandler
            activeEntityId={tool === "place" ? locatingEntityId : null}
            onPlace={handlePlaceOnMap}
          />

          {locations.map((loc) => (
            <Marker
              key={loc.id}
              position={[Number(loc.lat), Number(loc.lng)]}
              icon={goldIcon}
              draggable={false}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                {loc.name}
              </Tooltip>
            </Marker>
          ))}

          {positions.map((pos) => {
            const color = pos.entity.entity_type.color ?? GOLD;
            const icon = getEntityIcon(color);
            const lat = Number(pos.lat);
            const lng = Number(pos.lng);
            return (
              <Marker
                key={pos.id}
                position={[lat, lng]}
                icon={icon}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const ll = e.target.getLatLng();
                    void handleDragEnd(pos.id, ll.lat, ll.lng);
                  },
                }}
              >
                <Popup>
                  <div
                    style={{
                      minWidth: "10rem",
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: "12px",
                      color: "#e8e4dc",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "var(--font-playfair), Georgia, serif",
                        fontSize: "1rem",
                        color: "#c9a227",
                        marginBottom: "0.35rem",
                      }}
                    >
                      {pos.entity.name}
                    </p>
                    <p style={{ color: "#8a8580", marginBottom: "0.65rem" }}>
                      {pos.entity.entity_type.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => openDossier(pos.entity_id)}
                      style={{
                        width: "100%",
                        border: "1px solid rgba(201,162,39,0.45)",
                        background: "rgba(201,162,39,0.1)",
                        padding: "0.4rem 0",
                        fontSize: "10px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#c9a227",
                        cursor: "pointer",
                      }}
                    >
                      Ver dossier
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

function ToolbarBtn({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`pointer-events-auto inline-flex items-center gap-2 border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] transition ${
        active
          ? "border-archive-gold bg-archive-gold/20 text-archive-gold"
          : "border-archive-border/90 bg-archive-panel/95 text-archive-muted hover:border-archive-muted hover:text-archive-ink"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </button>
  );
}
