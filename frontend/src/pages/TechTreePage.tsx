import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import { toPng } from "html-to-image";
import { getNodesBounds, getViewportForBounds } from "reactflow";
import { getTechTree, validateTechNode, buildTechNode } from "../api";
import type { TechNode, ValidationWarning } from "../types";
import { TechNodeBox } from "../components/TechNodeBox";

const COL_WIDTH = 160;
const ROW_HEIGHT = 50;

const nodeTypes = { techNode: TechNodeBox };

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

function TechTreeInner({ faction }: { faction: string }) {
  const [techNodes, setTechNodes] = useState<TechNode[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [editRequires, setEditRequires] = useState("");
  const [editCost, setEditCost] = useState(0);
  const [editX, setEditX] = useState(0);
  const [editY, setEditY] = useState(0);
  const [editIsTech, setEditIsTech] = useState(true);
  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);
  const [code, setCode] = useState("");
  const [validating, setValidating] = useState(false);

  const { getNodes } = useReactFlow();

  useEffect(() => {
    getTechTree(faction).then(setTechNodes);
    setSelected(null);
  }, [faction]);

  const byId = useMemo(() => new Map(techNodes.map((n) => [n.id, n])), [techNodes]);

  const matchedIds = useMemo(() => {
    if (!search.trim()) return new Set<string>();
    const q = search.toLowerCase();
    return new Set(
      techNodes
        .filter((n) => n.id.toLowerCase().includes(q) || n.displayName?.toLowerCase().includes(q))
        .map((n) => n.id)
    );
  }, [techNodes, search]);

  const flowNodes: Node[] = useMemo(
    () =>
      techNodes.map((n) => ({
        id: n.id,
        type: "techNode",
        position: { x: n.position.x * COL_WIDTH, y: n.position.y * ROW_HEIGHT },
        data: {
          label: n.id,
          displayName: n.displayName,
          isTechUpgrade: n.isTechUpgrade,
          hasUnresolvedRequires: n.requires.some((r) => !byId.has(r)),
          isSelected: selected === n.id,
          isMatched: matchedIds.has(n.id),
        },
      })),
    [techNodes, byId, selected, matchedIds]
  );

  const flowEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    for (const n of techNodes) {
      for (const reqId of n.requires) {
        if (!byId.has(reqId)) continue; // unresolved - node itself shows the red border instead
        const highlighted = selected === n.id || selected === reqId;
        edges.push({
          id: `${reqId}->${n.id}`,
          source: reqId,
          target: n.id,
          style: { stroke: highlighted ? "#7fb2ff" : "#3a3f47", strokeWidth: highlighted ? 2 : 1 },
        });
      }
    }
    return edges;
  }, [techNodes, byId, selected]);

  function selectNode(n: TechNode) {
    setSelected(n.id);
    setEditRequires(n.requires.join(", "));
    setEditCost(n.cost);
    setEditX(n.position.x);
    setEditY(n.position.y);
    setEditIsTech(n.isTechUpgrade);
    setWarnings([]);
    setCode("");
  }

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      const tn = byId.get(node.id);
      if (tn) selectNode(tn);
    },
    [byId]
  );

  useEffect(() => {
    if (!selected) return;
    setValidating(true);
    const handle = setTimeout(async () => {
      const candidate: TechNode = {
        id: selected,
        displayName: null,
        requires: editRequires.trim() ? editRequires.split(",").map((s) => s.trim()).filter(Boolean) : [],
        cost: editCost,
        position: { x: editX, y: editY },
        isTechUpgrade: editIsTech,
      };
      try {
        const result = await validateTechNode(faction, candidate);
        setWarnings(result.warnings);
      } finally {
        setValidating(false);
      }
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, editRequires, editCost, editX, editY, editIsTech, faction]);

  async function handleExportSnippet() {
    if (!selected) return;
    const candidate: TechNode = {
      id: selected,
      displayName: null,
      requires: editRequires.trim() ? editRequires.split(",").map((s) => s.trim()).filter(Boolean) : [],
      cost: editCost,
      position: { x: editX, y: editY },
      isTechUpgrade: editIsTech,
    };
    const result = await buildTechNode(candidate);
    setCode(result.code);
  }

  function handleDownloadCode() {
    if (!code) return;
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    downloadDataUrl(url, `${selected}.set`);
    URL.revokeObjectURL(url);
  }

  function handleExportImage() {
    const nodes = getNodes();
    if (nodes.length === 0) return;
    const bounds = getNodesBounds(nodes);
    const imageWidth = Math.max(800, bounds.width + 100);
    const imageHeight = Math.max(600, bounds.height + 100);
    const viewport = getViewportForBounds(bounds, imageWidth, imageHeight, 0.2, 2, 0.1);

    const el = document.querySelector(".react-flow__viewport") as HTMLElement;
    if (!el) return;

    toPng(el, {
      backgroundColor: "#14161a",
      width: imageWidth,
      height: imageHeight,
      style: {
        width: String(imageWidth),
        height: String(imageHeight),
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    }).then((dataUrl) => downloadDataUrl(dataUrl, `techtree_${faction}.png`));
  }

  return (
    <>
      <div className="techtree-scroll" style={{ height: "70vh" }}>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          minZoom={0.1}
          maxZoom={2.5}
        >
          <Background color="#2a2e35" gap={20} />
          <Controls />
          <MiniMap
            nodeColor={(n: Node) => (n.data?.isTechUpgrade ? "#2b4a75" : "#2d5a3d")}
            style={{ background: "#1c1f24" }}
          />
        </ReactFlow>
      </div>

      <div className="controls" style={{ marginTop: 12 }}>
        <input
          type="text"
          placeholder="Search node id..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={handleExportImage}>Export PNG</button>
        <span className="legend">
          <span className="legend-swatch tech" /> tech upgrade
          <span className="legend-swatch unlock" /> unit/squad unlock
          <span className="legend-swatch missing" /> unresolved requirement
        </span>
      </div>

      {selected && (
        <div className="techtree-editor">
          <h4>Editing: {byId.get(selected)?.displayName ?? selected}{byId.get(selected)?.displayName && <span className="internal-id"> ({selected})</span>}</h4>
          <div className="form-grid">
            <label className="wide">
              Requires (comma-separated ids)
              <input value={editRequires} onChange={(e) => setEditRequires(e.target.value)} />
            </label>
            <label>
              Cost
              <input type="number" value={editCost} onChange={(e) => setEditCost(parseFloat(e.target.value) || 0)} />
            </label>
            <label>
              Position X
              <input type="number" value={editX} onChange={(e) => setEditX(parseFloat(e.target.value) || 0)} />
            </label>
            <label>
              Position Y
              <input type="number" value={editY} onChange={(e) => setEditY(parseFloat(e.target.value) || 0)} />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={editIsTech} onChange={(e) => setEditIsTech(e.target.checked)} />
              Is a "tech" upgrade node
            </label>
          </div>

          <div className="validation-panel">
            {validating && <p className="validating">Validating...</p>}
            {!validating && warnings.length === 0 && <p className="valid-ok">✓ No issues found</p>}
            {!validating &&
              warnings.map((w, i) => (
                <p key={i} className={w.severity === "error" ? "validation-error" : "validation-warning"}>
                  {w.severity === "error" ? "✗" : "⚠"} {w.message}
                </p>
              ))}
          </div>

          <button className="generate-btn" onClick={handleExportSnippet}>
            Generate .set snippet
          </button>

          {code && (
            <div className="code-preview">
              <pre>{code}</pre>
              <div className="code-preview-actions">
                <button onClick={handleDownloadCode}>Download</button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export function TechTreePage() {
  const [faction, setFaction] = useState("ger");

  return (
    <div className="techtree-page">
      <div className="controls">
        <label>
          Faction:{" "}
          <select value={faction} onChange={(e) => setFaction(e.target.value)}>
            <option value="ger">German</option>
            <option value="rus">Soviet</option>
            <option value="usa">USA</option>
            <option value="eng">British/Commonwealth</option>
            <option value="fin">Finnish</option>
          </select>
        </label>
      </div>

      <ReactFlowProvider>
        <TechTreeInner faction={faction} />
      </ReactFlowProvider>
    </div>
  );
}
