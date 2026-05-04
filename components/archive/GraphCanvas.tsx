"use client";

import * as d3 from "d3";
import { useEffect, useRef } from "react";

import type { EntityWithTypeAndValues, RelationshipWithEntities } from "@/types/api";

type Props = {
  entities: EntityWithTypeAndValues[];
  relationships: RelationshipWithEntities[];
  selectedEntityId: string | null;
  onSelectEntity: (id: string) => void;
};

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  color: string;
}

function tensionEdgeStyle(level: number): { color: string; width: number } {
  const L = Math.max(0, Math.min(100, level));
  const t = L / 100;
  const c1: [number, number, number] = [45, 107, 74];
  const c2: [number, number, number] = [201, 162, 39];
  const c3: [number, number, number] = [155, 44, 44];
  let rgb: [number, number, number];
  if (t <= 0.5) {
    const u = t / 0.5;
    rgb = [
      Math.round(c1[0] + (c2[0] - c1[0]) * u),
      Math.round(c1[1] + (c2[1] - c1[1]) * u),
      Math.round(c1[2] + (c2[2] - c1[2]) * u),
    ];
  } else {
    const u = (t - 0.5) / 0.5;
    rgb = [
      Math.round(c2[0] + (c3[0] - c2[0]) * u),
      Math.round(c2[1] + (c3[1] - c2[1]) * u),
      Math.round(c2[2] + (c3[2] - c2[2]) * u),
    ];
  }
  return {
    color: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`,
    width: 0.85 + (L / 100) * 4.5,
  };
}

export function GraphCanvas({
  entities,
  relationships,
  selectedEntityId,
  onSelectEntity,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const svgEl = svgRef.current;
    if (!container || !svgEl) return;

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 400);

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height).attr("class", "touch-none");

    const gZoom = svg.append("g");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 5])
      .on("zoom", (event) => {
        gZoom.attr("transform", event.transform.toString());
      });
    svg.call(zoom).on("dblclick.zoom", null);

    if (entities.length === 0) {
      gZoom
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#8a8580")
        .attr("font-family", "var(--font-jetbrains)")
        .attr("font-size", 13)
        .text("No hay entidades en el archivo. Creá tipos y nodos desde el índice.");
      return;
    }

    const nodes: SimNode[] = entities.map((e) => ({
      id: e.id,
      name: e.name,
      color: e.entity_type.color ?? "#c9a227",
      x: width / 2 + (Math.random() - 0.5) * 160,
      y: height / 2 + (Math.random() - 0.5) * 160,
    }));

    const idSet = new Set(nodes.map((n) => n.id));
    const linkData = relationships
      .filter(
        (r) => idSet.has(r.source_entity_id) && idSet.has(r.target_entity_id)
      )
      .map((r) => ({
        source: r.source_entity_id,
        target: r.target_entity_id,
        label: r.label ?? r.relation_key,
        tension: r.tension_level ?? 50,
      }));

    const linkForce = d3
      .forceLink(linkData)
      .id((d) => (d as SimNode).id)
      .distance(120)
      .strength(0.35);

    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force("link", linkForce)
      .force("charge", d3.forceManyBody().strength(-320))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide<SimNode>().radius(32));

    const gLinks = gZoom.append("g").attr("stroke", "#4a4a55");

    const linkLines = gLinks
      .selectAll("line")
      .data(linkData)
      .join("line")
      .attr("stroke-opacity", 0.92)
      .attr("stroke", (d) => tensionEdgeStyle(d.tension).color)
      .attr("stroke-width", (d) => tensionEdgeStyle(d.tension).width);

    const gLabels = gZoom.append("g");

    const linkText = gLabels
      .selectAll("text")
      .data(linkData)
      .join("text")
      .attr("font-size", 9)
      .attr("fill", "#c9a227")
      .attr("font-family", "var(--font-jetbrains)")
      .attr("text-anchor", "middle")
      .attr("pointer-events", "none")
      .text((d) => d.label);

    const nodeG = gZoom.append("g");

    const drag = d3
      .drag<SVGGElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.35).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    const nodeSel = nodeG
      .selectAll("g")
      .data(nodes)
      .join("g")
      .style("cursor", "grab")
      // d3 drag + join("g") — variance en tipos de Selection
      .call(drag as never)
      .on("click", (event, d) => {
        event.stopPropagation();
        onSelectEntity(d.id);
      });

    nodeSel
      .append("circle")
      .attr("r", 26)
      .attr("fill", (d) => d.color)
      .attr("stroke", (d) =>
        d.id === selectedEntityId ? "#c9a227" : "#2a2835"
      )
      .attr("stroke-width", (d) => (d.id === selectedEntityId ? 3 : 1));

    nodeSel
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 4)
      .attr("font-size", 10)
      .attr("fill", "#f4efe4")
      .attr("font-family", "var(--font-jetbrains)")
      .attr("pointer-events", "none")
      .text((d) =>
        d.name.length > 20 ? `${d.name.slice(0, 18)}…` : d.name
      );

    function nodeXY(end: unknown): { x: number; y: number } {
      const n = end as SimNode;
      return { x: n.x ?? 0, y: n.y ?? 0 };
    }

    simulation.on("tick", () => {
      linkLines
        .attr("x1", (d) => nodeXY(d.source).x)
        .attr("y1", (d) => nodeXY(d.source).y)
        .attr("x2", (d) => nodeXY(d.target).x)
        .attr("y2", (d) => nodeXY(d.target).y);

      linkText.attr("transform", (d) => {
        const s = nodeXY(d.source);
        const t = nodeXY(d.target);
        const x = (s.x + t.x) / 2;
        const y = (s.y + t.y) / 2;
        return `translate(${x},${y})`;
      });

      nodeSel.attr(
        "transform",
        (d) => `translate(${d.x ?? 0},${d.y ?? 0})`
      );
    });

    return () => {
      simulation.stop();
    };
  }, [entities, relationships, selectedEntityId, onSelectEntity]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 min-h-0 bg-archive-void"
    >
      <svg ref={svgRef} className="h-full w-full block" />
    </div>
  );
}
