/**
 * KeyVisualizer v3 — app.js
 * Frontend: renders keyboard, calls Django API endpoints.
 * No routing or ZIP generation here — all server-side.
 */

"use strict";

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════
const UNIT_SIZE  = 82;   // px per 1u — must match CSS --unit
const KEY_GAP    = 4;    // px between keys
const CSRFTOKEN  = "";   // CSRF exempt for API views

// ═══════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════
let currentResult  = null;  // last routing result from server
let showWiring     = false;
let showKeycaps    = true;  // true = keycap view, false = matrix view
let isBottomView   = false; // true = mirror X (soldering/wiring view)

// ═══════════════════════════════════════════════════════════════
// DOM refs
// ═══════════════════════════════════════════════════════════════
const stage           = document.getElementById("stage");
const tooltip         = document.getElementById("tooltip");
const warningBanner   = document.getElementById("warningBanner");
const exportZipBtn    = document.getElementById("exportZipBtn");
const saveLayoutBtn   = document.getElementById("saveLayoutBtn");
const viewToggleBtn   = document.getElementById("viewToggleBtn");
const wiringToggleBtn = document.getElementById("wiringToggleBtn");
const bottomViewBtn   = document.getElementById("bottomViewBtn");
const layoutList      = document.getElementById("layoutList");

// ═══════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);
const openModal  = id => { $(id).style.display = "flex"; };
const closeModal = id => { $(id).style.display = "none"; };

function showSpinner(btn, text="Loading…") {
  btn.disabled = true;
  btn._origText = btn.innerHTML;
  btn.innerHTML = `<span class="spinner"></span>${text}`;
}
function hideSpinner(btn) {
  btn.disabled = false;
  btn.innerHTML = btn._origText;
}

function showWarning(msg) {
  warningBanner.textContent = msg;
  warningBanner.style.display = "block";
}
function clearWarning() {
  warningBanner.style.display = "none";
}

async function apiFetch(url, opts = {}) {
  const resp = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json.error || `HTTP ${resp.status}`);
  return json;
}

// ═══════════════════════════════════════════════════════════════
// Render keyboard from routing result
// ═══════════════════════════════════════════════════════════════
function renderKeyboard(result) {
  currentResult = result;
  clearWarning();
  stage.innerHTML = "";

  const keys = result.layout || [];
  if (keys.length === 0) {
    stage.innerHTML = '<p style="color:var(--subtext0);padding:40px;">No keys in layout.</p>';
    return;
  }

  if (result.error) showWarning("⚠️ " + result.error);

  const validateMatrixIntegrity = (keysList) => {
    let matrixMap = {};
    let errors = new Set();
    keysList.forEach((key, index) => {
      if (key.matrix && key.matrix.length === 2) {
        let coordStr = `${key.matrix[0]},${key.matrix[1]}`;
        if (matrixMap[coordStr] !== undefined) {
          errors.add(index);
          errors.add(matrixMap[coordStr]);
        } else {
          matrixMap[coordStr] = index;
        }
      } else {
        errors.add(index); // Missing matrix
      }
    });
    return errors;
  };

  const matrixErrors = validateMatrixIntegrity(keys);
  if (matrixErrors.size > 0) {
    let existingMsg = warningBanner.style.display === "block" ? warningBanner.innerHTML + "<br><br>" : "";
    showWarning(existingMsg + `⚠️ Matrix Error: Detected duplicate or missing matrix coordinates on ${matrixErrors.size} keys. Highlighted in red.`);
  }

  // ── v2-parity: use visual (rotated) position = cx - w/2, cy - h/2 ─
  // Server stores cx/cy as rotated centres; fall back to x/y if not set.
  // This matches v2's final_x / final_y computation exactly.
  const visualX = k => (k.cx !== undefined ? k.cx - (k.w||1)/2 : k.x || 0);
  const visualY = k => (k.cy !== undefined ? k.cy - (k.h||1)/2 : k.y || 0);

  // ── Normalise: ensure no key renders off the left/top edge (same as v2) ──
  const PAD  = 0.25; // u of breathing room
  const minVX = Math.min(...keys.map(k => visualX(k)));
  const minVY = Math.min(...keys.map(k => visualY(k)));
  const offX  = minVX < PAD ? PAD - minVX : 0;
  const offY  = minVY < PAD ? PAD - minVY : 0;

  let maxX = 0, maxY = 0;
  keys.forEach(k => {
    const x2 = visualX(k) + offX + (k.w || 1);
    const y2 = visualY(k) + offY + (k.h || 1);
    if (x2 > maxX) maxX = x2;
    if (y2 > maxY) maxY = y2;
  });

  stage.style.width  = (maxX * UNIT_SIZE + 20) + "px";
  stage.style.height = Math.max(maxY * UNIT_SIZE + 20, 250) + "px";

  // Bottom view: mirror X so solder side matches physical orientation (same as v2)
  const drawX = (vx, w) => isBottomView ? maxX - vx - w : vx;

  // Store for wiring layer
  result._maxX    = maxX;
  result._offX    = offX;
  result._offY    = offY;

  keys.forEach((k, idx) => {
    const vx = visualX(k) + offX;
    const vy = visualY(k) + offY;
    const dx = drawX(vx, k.w || 1);
    const x  = dx * UNIT_SIZE;
    const y  = vy * UNIT_SIZE;
    const w  = ((k.w || 1) * UNIT_SIZE) - KEY_GAP;
    const h  = ((k.h || 1) * UNIT_SIZE) - KEY_GAP;

    const div = document.createElement("div");
    div.className = "key";
    div.id        = `key_${idx}`;
    div.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;`;

    const mat    = k.matrix || [0, 0];
    const rowPin = k.row_pin || "?";
    const colPin = k.col_pin || "?";

    const hasError = matrixErrors.has(idx);
    const pinColor = hasError ? "var(--red)" : "var(--pink)";

    const primaryLabel = (k.labels||[])[0] || k.label || "";
    const isMatrixLabel = /^(\d+)\s*,\s*(\d+)$/.test(primaryLabel);
    
    div.innerHTML = `
      ${!isMatrixLabel && primaryLabel ? `<div class="key-label">${primaryLabel}</div>` : ""}
      <div class="key-matrix" style="${hasError ? 'color: var(--red)' : ''}">[${mat[0]}, ${mat[1]}]</div>
      <div class="key-pin" style="color: ${pinColor}">${rowPin} | ${colPin}</div>
    `;

    div.addEventListener("mouseenter", () => {
      tooltip.innerHTML = `
        <div class="tt-mat">Matrix: [${mat[0]}, ${mat[1]}]</div>
        <div class="tt-row">Row pin: ${rowPin}</div>
        <div class="tt-col">Col pin: ${colPin}</div>
        <div style="color:var(--subtext0)">Pos: (${(k.x||0).toFixed(2)}, ${(k.y||0).toFixed(2)}) ${(k.w||1)}u</div>
      `;
      tooltip.style.display = "block";
    });
    div.addEventListener("mousemove", e => {
      tooltip.style.left = (e.clientX + 14) + "px";
      tooltip.style.top  = (e.clientY - 10) + "px";
    });
    div.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });

    stage.appendChild(div);
  });

  if (showWiring) drawWiring(result);

  exportZipBtn.style.display  = "inline-block";
  saveLayoutBtn.style.display = "inline-block";
}

// ═══════════════════════════════════════════════════════════════
// Wiring SVG overlay
// ═══════════════════════════════════════════════════════════════
const ROW_COLORS = [
  "#89b4fa","#cba6f7","#a6e3a1","#fab387",
  "#f38ba8","#74c7ec","#f9e2af","#eba0ac",
];
const COL_COLORS = [
  "#94e2d5","#89dceb","#f5c2e7","#b4befe",
  "#f2cdcd","#f5e0dc","#a6e3a1","#89b4fa",
];

function drawWiring(result) {
  const existingSvg = document.getElementById("routingLayer");
  if (existingSvg) existingSvg.remove();

  const keys = result.layout || [];
  const offX = result._offX || 0;
  const offY = result._offY || 0;
  const maxX = result._maxX || 0;

  const sw = parseFloat(stage.style.width)  || 800;
  const sh = parseFloat(stage.style.height) || 400;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = "routingLayer";
  svg.setAttribute("width",  sw);
  svg.setAttribute("height", sh);

  // Key draw-space centre (respects bottom-view mirror)
  const rawVX = k => (k.cx !== undefined ? k.cx : (k.x||0) + (k.w||1)/2) + offX;
  const kCX = k => {
    const vx = rawVX(k) - (k.w||1)/2;
    const dx = isBottomView ? maxX - vx - (k.w||1) : vx;
    return (dx + (k.w||1)/2) * UNIT_SIZE;
  };
  const kCY = k => ((k.cy !== undefined ? k.cy : (k.y||0) + (k.h||1)/2) + offY) * UNIT_SIZE;

  // Separate anchor zones: rows attach ABOVE key centre, cols BELOW
  // (~16px gap at 72px/u — prevents all wires piling on the same pixel)
  const ZONE       = UNIT_SIZE * 0.22;
  const rowAnchorY = k => kCY(k) - ZONE;
  const colAnchorY = k => kCY(k) + ZONE;

  const byRow = {}, byCol = {};
  keys.forEach(k => {
    const [r, c] = k.matrix || [0, 0];
    (byRow[r] = byRow[r] || []).push(k);
    (byCol[c] = byCol[c] || []).push(k);
  });

  const BUS_W      = 5;
  const STUB_W     = 2;
  const ROW_DASH   = "";          // rows: solid — easy to trace horizontally
  const COL_DASH   = "10,6";      // cols: bold dashes — distinct at crossings
  const STUB_DASH  = "3,4";       // stubs: fine dots so they read as connectors

  const mkLine = (x1, y1, x2, y2, color, w, opacity = 1, dash = "") => {
    const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l.setAttribute("x1", x1); l.setAttribute("y1", y1);
    l.setAttribute("x2", x2); l.setAttribute("y2", y2);
    l.setAttribute("stroke", color);
    l.setAttribute("stroke-width", w);
    l.setAttribute("stroke-linecap", "round");
    l.setAttribute("stroke-opacity", opacity);
    if (dash) l.setAttribute("stroke-dasharray", dash);
    svg.appendChild(l);
  };
  const mkDot = (x, y, color, r = 4) => {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", r);
    c.setAttribute("fill", color);
    svg.appendChild(c);
  };
  // Hollow ring at each switch connection point — less clutter than a solid dot
  const mkRing = (x, y, color) => {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", 4);
    c.setAttribute("fill", "none");
    c.setAttribute("stroke", color);
    c.setAttribute("stroke-width", 2);
    svg.appendChild(c);
  };

  // Find keyboard horizontal midpoint so we can keep each half's wires local
  const allX  = keys.map(k => kCX(k));
  const midX  = (Math.min(...allX) + Math.max(...allX)) / 2;
  const isLeft  = k => kCX(k) <= midX;
  const isRight = k => kCX(k) >  midX;

  // Draw a chain between an ordered array of {x,y} points
  const drawChain = (pts, color, dash) => {
    for (let i = 0; i < pts.length - 1; i++)
      mkLine(pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y, color, BUS_W, 1, dash);
    pts.forEach(p => mkDot(p.x, p.y, color, 4.5));
  };

  // ── ROW chains: left→right, split by half ──────────────────────────────
  Object.entries(byRow).forEach(([ri, rkeys]) => {
    const color = ROW_COLORS[+ri % ROW_COLORS.length];
    const mkPts = ks => ks.map(k => ({ x: kCX(k), y: rowAnchorY(k) }))
                          .sort((a, b) => a.x - b.x);
    drawChain(mkPts(rkeys.filter(isLeft)),  color, ROW_DASH);
    drawChain(mkPts(rkeys.filter(isRight)), color, ROW_DASH);
  });

  // ── COL chains: top→bottom, split by half ──────────────────────────────
  Object.entries(byCol).forEach(([ci, ckeys]) => {
    const color = COL_COLORS[+ci % COL_COLORS.length];
    const mkPts = ks => ks.map(k => ({ x: kCX(k), y: colAnchorY(k) }))
                          .sort((a, b) => a.y - b.y);
    drawChain(mkPts(ckeys.filter(isLeft)),  color, COL_DASH);
    drawChain(mkPts(ckeys.filter(isRight)), color, COL_DASH);
  });

  stage.appendChild(svg);
}




// ═══════════════════════════════════════════════════════════════
// Import KLE → POST /api/route/
// ═══════════════════════════════════════════════════════════════
$("importKleBtn").addEventListener("click", () => openModal("kleModal"));
$("closeKleModal").addEventListener("click", () => closeModal("kleModal"));

$("processKleBtn").addEventListener("click", async () => {
  const btn     = $("processKleBtn");
  const raw     = $("kleInput").value.trim();
  const isSplit = $("kleIsSplit").value === "true";
  const boardId = $("kleBoardSelect").value;

  if (!raw) { alert("Paste KLE JSON first."); return; }

  let kleJson;
  try { kleJson = JSON.parse(raw); }
  catch(e) { alert("Invalid JSON: " + e.message); return; }

  showSpinner(btn, "Routing…");
  try {
    const result = await apiFetch("/api/route/", {
      method: "POST",
      body: JSON.stringify({ kle_json: kleJson, is_split: isSplit, board_id: boardId }),
    });
    closeModal("kleModal");
    renderKeyboard(result);
    if (showWiring) drawWiring(result);
  } catch(e) {
    alert("Routing error: " + e.message);
  } finally {
    hideSpinner(btn);
  }
});

// ═══════════════════════════════════════════════════════════════
// Fetch QMK → GET /api/qmk/<path>/
// ═══════════════════════════════════════════════════════════════
$("fetchQmkBtn").addEventListener("click", () => openModal("qmkModal"));
$("closeQmkModal").addEventListener("click", () => closeModal("qmkModal"));

$("doFetchQmkBtn").addEventListener("click", async () => {
  const btn     = $("doFetchQmkBtn");
  const kbPath  = $("qmkSearch").value.trim();
  const boardId = $("qmkBoardSelect").value;
  if (!kbPath) { alert("Enter a keyboard path."); return; }

  showSpinner(btn, "Fetching…");
  try {
    const infoJson  = await apiFetch(`/api/qmk/${kbPath}/`);
    // Upload the info.json straight to the route endpoint
    const blob = new Blob([JSON.stringify(infoJson)], { type: "application/json" });
    const fd   = new FormData();
    fd.append("file", blob, "info.json");
    const uploaded = await fetch("/api/upload/", { method: "POST", body: fd }).then(r=>r.json());
    if (uploaded.error) throw new Error(uploaded.error);

    // Now route the parsed keys
    const result = await apiFetch("/api/route/", {
      method: "POST",
      body: JSON.stringify({
        kle_json: uploaded.keys.map(k => [k]),   // wrap each key for simple parse
        is_split: false,
        board_id: boardId,
      }),
    });
    // Use pre-existing matrix coords from info.json
    const mergedResult = { ...result, layout: uploaded.keys.map((k, i) => ({
      ...k,
      row_pin: result.matrix_pins.rows[k.matrix[0]] || "?",
      col_pin: result.matrix_pins.cols[k.matrix[1]] || "?",
    }))};
    mergedResult.keyboard_name = uploaded.keyboard_name;
    closeModal("qmkModal");
    renderKeyboard(mergedResult);
  } catch(e) {
    alert("Fetch error: " + e.message);
  } finally {
    hideSpinner(btn);
  }
});

// ═══════════════════════════════════════════════════════════════
// Upload info.json file
// ═══════════════════════════════════════════════════════════════
$("uploadJsonBtn").addEventListener("click", () => $("uploadInput").click());
$("uploadInput").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append("file", file);
  try {
    const uploaded = await fetch("/api/upload/", { method: "POST", body: fd }).then(r=>r.json());
    if (uploaded.error) throw new Error(uploaded.error);
    const boardId = "waveshare_2040_plus"; // default; could expose a picker
    const result = await apiFetch("/api/route/", {
      method: "POST",
      body: JSON.stringify({ kle_json: uploaded.keys.map(k => [k]), is_split: false, board_id: boardId }),
    });
    const mergedResult = { ...result, layout: uploaded.keys.map(k => ({
      ...k,
      row_pin: result.matrix_pins.rows[k.matrix[0]] || "?",
      col_pin: result.matrix_pins.cols[k.matrix[1]] || "?",
    }))};
    mergedResult.keyboard_name = uploaded.keyboard_name;
    renderKeyboard(mergedResult);
  } catch(e) {
    alert("Upload error: " + e.message);
  }
  e.target.value = "";
});

// ═══════════════════════════════════════════════════════════════
// Export Vial ZIP → POST /api/export/vial/
// ═══════════════════════════════════════════════════════════════
exportZipBtn.addEventListener("click", async () => {
  if (!currentResult) return;
  try {
    const resp = await fetch("/api/export/vial/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentResult),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || "Export failed");
    }
    const blob     = await resp.blob();
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement("a");
    const kbName   = currentResult.keyboard_name || "custom_handwired";
    a.href         = url;
    a.download     = `${kbName}_vial.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    // Populate and show compile modal
    document.querySelectorAll(".compile-kb-name").forEach(el => {
      el.textContent = kbName;
    });
    openModal("compileModal");
  } catch(e) {
    alert("Export error: " + e.message);
  }
});
$("closeCompileModal").addEventListener("click", () => closeModal("compileModal"));

// ═══════════════════════════════════════════════════════════════
// Save layout → POST /api/layouts/
// ═══════════════════════════════════════════════════════════════
saveLayoutBtn.addEventListener("click", () => {
  if (!currentResult) return;
  $("saveNameInput").value = currentResult.keyboard_name || "Untitled";
  openModal("saveModal");
});
$("closeSaveModal").addEventListener("click", () => closeModal("saveModal"));

$("doSaveBtn").addEventListener("click", async () => {
  const name = $("saveNameInput").value.trim() || "Untitled";
  try {
    const saved = await apiFetch("/api/layouts/", {
      method: "POST",
      body: JSON.stringify({ name, routing_result: currentResult }),
    });
    closeModal("saveModal");
    addLayoutCard({ id: saved.id, name, board_id: currentResult.board_used || "" });
    alert("Layout saved!");
  } catch(e) {
    alert("Save error: " + e.message);
  }
});

// ═══════════════════════════════════════════════════════════════
// Load / Delete layouts from sidebar
// ═══════════════════════════════════════════════════════════════
function addLayoutCard({ id, name, board_id }) {
  // Remove placeholder if present
  const empty = layoutList.querySelector(".sidebar-empty");
  if (empty) empty.remove();

  const card = document.createElement("div");
  card.className  = "layout-card";
  card.dataset.id = id;
  card.innerHTML  = `
    <div class="layout-card-name">${name}</div>
    <div class="layout-card-meta">${board_id} · just now</div>
    <div class="layout-card-actions">
      <button class="btn-xs btn-load" data-id="${id}">Load</button>
      <button class="btn-xs btn-del"  data-id="${id}">✕</button>
    </div>
  `;
  layoutList.prepend(card);
  wireCard(card);
}

function wireCard(card) {
  card.querySelector(".btn-load").addEventListener("click", async e => {
    const id = e.target.dataset.id;
    try {
      const result = await apiFetch(`/api/layouts/${id}/`);
      renderKeyboard(result);
      if (showWiring) drawWiring(result);
    } catch(err) {
      alert("Load error: " + err.message);
    }
  });
  card.querySelector(".btn-del").addEventListener("click", async e => {
    const id = e.target.dataset.id;
    if (!confirm("Delete this layout?")) return;
    try {
      await fetch(`/api/layouts/${id}/`, { method: "DELETE" });
      card.remove();
    } catch(err) {
      alert("Delete error: " + err.message);
    }
  });
}

// Wire server-rendered cards
document.querySelectorAll(".layout-card").forEach(wireCard);

// ═══════════════════════════════════════════════════════════════
// View toggle (keycaps ↔ matrix)
// ═══════════════════════════════════════════════════════════════
viewToggleBtn.addEventListener("click", () => {
  showKeycaps = !showKeycaps;
  viewToggleBtn.textContent = showKeycaps ? "👀 View: Keycaps" : "👀 View: Matrix";
  if (currentResult) renderKeyboard(currentResult);
});

// ═══════════════════════════════════════════════════════════════
// Wiring toggle
// ═══════════════════════════════════════════════════════════════
wiringToggleBtn.addEventListener("click", () => {
  showWiring = !showWiring;
  wiringToggleBtn.textContent = showWiring ? "🔌 Wiring: On" : "🔌 Wiring: Off";
  if (currentResult) {
    const svgEl = document.getElementById("routingLayer");
    if (svgEl) svgEl.remove();
    if (showWiring) drawWiring(currentResult);
  }
});

// ═══════════════════════════════════════════════════════════════
// Bottom view toggle (mirror X — soldering reference, same as v2)
// ═══════════════════════════════════════════════════════════════
bottomViewBtn.addEventListener("click", () => {
  isBottomView = !isBottomView;
  bottomViewBtn.textContent = isBottomView ? "🛠️ Bottom View: On" : "🛠️ Bottom View: Off";
  bottomViewBtn.classList.toggle("btn-active", isBottomView);
  stage.classList.toggle("bottom-view", isBottomView);
  if (currentResult) renderKeyboard(currentResult);
});

// ═══════════════════════════════════════════════════════════════
// Clear all
// ═══════════════════════════════════════════════════════════════
$("clearAllBtn").addEventListener("click", () => {
  currentResult = null;
  clearWarning();
  stage.innerHTML = `
    <div class="stage-placeholder">
      <div class="placeholder-icon">⌨</div>
      <p>Import a KLE layout or fetch from QMK to begin</p>
      <p class="placeholder-hint">Supports split &amp; monolithic keyboards · Auto-routes matrix · Exports Vial firmware</p>
    </div>`;
  exportZipBtn.style.display  = "none";
  saveLayoutBtn.style.display = "none";
  tooltip.style.display = "none";
});
