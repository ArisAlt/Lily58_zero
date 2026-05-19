"""
router.py — Python port of KeyVisualizer v2's gridRoute algorithm.

Rules (same as v2):
  - Y-band bucketing (tolerance 0.7u) → rows sorted top→bottom
  - X-band bucketing (tolerance 0.55u) → cols sorted left→right
  - Split: bisect at geometric midpoint; right half rows offset by left_rows,
           columns shared (same indices 0..N)
  - Pin allocation from flat pool, contiguous: rows first, then cols
"""
import copy
from .board_profiles import BOARD_PROFILES

ROW_TOL = 0.7
COL_TOL = 0.55
UNIT_SIZE = 55  # px per U (for cx/cy pre-computation, mirrors v2)


def _cx(k):
    return k.get("cx", k.get("x", 0) + k.get("w", 1) / 2)


def _cy(k):
    return k.get("cy", k.get("y", 0) + k.get("h", 1) / 2)


def grid_route(keys, row_offset=0, col_offset=0):
    """
    Assign matrix coordinates to `keys` (mutates in-place).
    Returns (num_rows, num_cols) for this half.
    """
    n = len(keys)
    if n == 0:
        return 0, 0

    indices = list(range(n))

    # ── Step 1: Y-band bucketing → rows ──────────────────────────────────────
    row_bands = []  # [{'avgY': float, 'idx': [int]}]
    for i in sorted(indices, key=lambda i: _cy(keys[i])):
        ky = _cy(keys[i])
        matched = next((b for b in row_bands if abs(b["avgY"] - ky) < ROW_TOL), None)
        if matched:
            matched["idx"].append(i)
            matched["avgY"] = sum(_cy(keys[j]) for j in matched["idx"]) / len(matched["idx"])
        else:
            row_bands.append({"avgY": ky, "idx": [i]})
    row_bands.sort(key=lambda b: b["avgY"])

    # ── Step 2: X-band bucketing → cols ──────────────────────────────────────
    col_bands = []  # [{'avgX': float, 'idx': [int]}]
    for i in indices:
        kx = _cx(keys[i])
        matched = next((b for b in col_bands if abs(b["avgX"] - kx) < COL_TOL), None)
        if matched:
            matched["idx"].append(i)
            matched["avgX"] = sum(_cx(keys[j]) for j in matched["idx"]) / len(matched["idx"])
        else:
            col_bands.append({"avgX": kx, "idx": [i]})
    col_bands.sort(key=lambda b: b["avgX"])

    # ── Step 3: Build col lookup {key_index → col_index} ─────────────────────
    col_of = {}
    for ci, band in enumerate(col_bands):
        for i in band["idx"]:
            col_of[i] = ci + col_offset

    # ── Step 4: Assign matrix coords ─────────────────────────────────────────
    for ri, band in enumerate(row_bands):
        for i in band["idx"]:
            keys[i]["matrix"] = [ri + row_offset, col_of.get(i, col_offset)]

    return len(row_bands), len(col_bands)


def route_layout(keys_raw, is_split, board_id):
    """
    Full routing pipeline. Returns dict ready to serialise as JSON.

    keys_raw: list of dicts parsed from KLE
    is_split: bool
    board_id: key into BOARD_PROFILES

    Returns:
    {
        layout: [...],           # keys with matrix coords + pin labels
        matrix_pins: {rows, cols},
        logical_rows: int,
        split: bool,
        board_used: str,
        error: str|None,
    }
    """
    keys = copy.deepcopy(keys_raw)
    board = BOARD_PROFILES.get(board_id)
    available_pins = board["pins"] if board else ["GP" + str(i) for i in range(30)]

    manual_keys = [k for k in keys if k.get("matrix_override") is not None]
    is_manual_routing = len(manual_keys) == len(keys) and len(keys) > 0

    if is_manual_routing:
        for k in keys:
            k["matrix"] = k["matrix_override"]
        
        logical_rows = max(k["matrix"][0] for k in keys) + 1
        logical_cols = max(k["matrix"][1] for k in keys) + 1
        # For split, assume per MCU rows is max left-half row?
        # V2 simply used the logical rows for monolithic, or calculated perHalfRows differently.
        # If it's manual, we'll just use logical_rows for both halves since we can't easily guess.
        per_half_rows = logical_rows
        if is_split:
            all_cx = [_cx(k) for k in keys]
            mid_x = (min(all_cx) + max(all_cx)) / 2
            left_keys = [k for k in keys if _cx(k) <= mid_x]
            if left_keys:
                per_half_rows = max(k["matrix"][0] for k in left_keys) + 1
        
        required_pins = per_half_rows + logical_cols
        routed_keys = keys
    elif is_split:
        all_cx = [_cx(k) for k in keys]
        mid_x = (min(all_cx) + max(all_cx)) / 2
        left  = [k for k in keys if _cx(k) <= mid_x]
        right = [k for k in keys if _cx(k) >  mid_x]

        left_rows,  left_cols  = grid_route(left,  0,          0)
        right_rows, right_cols = grid_route(right, left_rows,  0)

        per_half_rows = max(left_rows, right_rows)
        logical_rows  = left_rows + right_rows
        logical_cols  = max(left_cols, right_cols)
        required_pins = per_half_rows + logical_cols
        routed_keys   = left + right
    else:
        logical_rows, logical_cols = grid_route(keys, 0, 0)
        per_half_rows = logical_rows
        required_pins = logical_rows + logical_cols
        routed_keys   = keys

    # Pin allocation ─ contiguous pool
    error = None
    if required_pins > len(available_pins):
        error = (
            f"Pin limit exceeded: need {required_pins} pins "
            f"({per_half_rows} rows + {logical_cols} cols) "
            f"but {board_id!r} has only {len(available_pins)}."
        )

    pins       = available_pins[:required_pins]
    active_rows = pins[:per_half_rows]
    active_cols = pins[per_half_rows:per_half_rows + logical_cols]

    # Annotate keys with row/col pin labels
    for k in routed_keys:
        r, c = k.get("matrix", [0, 0])
        phys_row = r % per_half_rows if is_split else r
        k["row_pin"] = active_rows[phys_row] if phys_row < len(active_rows) else "?"
        k["col_pin"] = active_cols[c]        if c        < len(active_cols) else "?"

    return {
        "layout":      routed_keys,
        "matrix_pins": {"rows": active_rows, "cols": active_cols},
        "logical_rows": logical_rows,
        "split":       is_split,
        "board_used":  board_id,
        "keyboard_name": "auto_routed_kle_board",
        "manufacturer":  "Custom Handwired",
        "error":       error,
    }


def parse_kle(kle_data):
    """
    Parse raw KLE JSON array into list of key dicts with x, y, w, h, cx, cy.
    Matches V2 parsing rules exactly:
      - cur_x resets to cur_rx at the start of each row  (V2: x = rx)
      - encountering rx in a dict: cur_x = cur_rx, cur_y = cur_ry  (V2: x = rx; y = ry)
      - encountering ry in a dict: cur_y = cur_ry                   (V2: y = ry)
    """
    import math
    keys = []
    cur_x, cur_y = 0.0, 0.0
    cur_w, cur_h = 1.0, 1.0
    cur_r, cur_rx, cur_ry = 0.0, 0.0, 0.0

    for row in kle_data:
        if isinstance(row, dict):
            # Top-level metadata — skip
            continue

        # V2 rule: x resets to rx at the start of every row
        cur_x = cur_rx
        cur_w, cur_h = 1.0, 1.0

        for item in row:
            if isinstance(item, dict):
                # Process r before rx/ry so origin is updated first
                if "r" in item:
                    cur_r = item["r"]
                if "rx" in item:
                    cur_rx = item["rx"]
                    cur_x  = cur_rx   # V2: x = rx
                    cur_y  = cur_ry   # V2: y = ry  (old ry, before ry update)
                if "ry" in item:
                    cur_ry = item["ry"]
                    cur_y  = cur_ry   # V2: y = ry
                # Apply per-key offsets after origin resets
                cur_x += item.get("x", 0.0)
                cur_y += item.get("y", 0.0)
                cur_w  = item.get("w", cur_w)
                cur_h  = item.get("h", cur_h)
            elif isinstance(item, str):
                lx, ly = cur_x, cur_y
                # Compute rotated visual top-left corner (same as V2's rotated_cx/cy)
                if cur_r:
                    rad = math.radians(cur_r)
                    dx  = (lx + cur_w / 2) - cur_rx
                    dy  = (ly + cur_h / 2) - cur_ry
                    vx  = cur_rx + dx * math.cos(rad) - dy * math.sin(rad)
                    vy  = cur_ry + dx * math.sin(rad) + dy * math.cos(rad)
                else:
                    vx = lx + cur_w / 2
                    vy = ly + cur_h / 2
                # kle-ng style manual matrix override: check if top-left label is "row,col"
                matrix_override = None
                labels = item.split("\n")
                primary = labels[0].strip() if labels else ""
                import re
                match = re.match(r"^(\d+)\s*,\s*(\d+)$", primary)
                if match:
                    matrix_override = [int(match.group(1)), int(match.group(2))]

                keys.append({
                    "x":  round(lx, 4),
                    "y":  round(ly, 4),
                    "w":  cur_w,
                    "h":  cur_h,
                    "r":  cur_r,
                    "rx": cur_rx,
                    "ry": cur_ry,
                    # cx/cy = rotated visual centre (matches V2's rotated_cx, rotated_cy)
                    "cx": round(vx, 4),
                    "cy": round(vy, 4),
                    "label": primary,
                    "labels": labels,
                    "matrix_override": matrix_override,
                })
                cur_x += cur_w
                cur_w, cur_h = 1.0, 1.0
        cur_y += 1.0

    return keys
