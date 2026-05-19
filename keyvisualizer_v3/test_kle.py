import json

def inject_matrix_into_kle(kle_raw, keys):
    """
    Given the original KLE JSON array and the list of keys (with 'matrix' injected),
    returns a new KLE JSON array where the primary label is replaced by "r,c".
    """
    new_kle = []
    key_idx = 0
    for row in kle_raw:
        if isinstance(row, dict):
            new_kle.append(row.copy())
            continue
            
        new_row = []
        for item in row:
            if isinstance(item, dict):
                new_row.append(item.copy())
            elif isinstance(item, str):
                mat = keys[key_idx].get("matrix", [0, 0])
                # KLE labels are separated by \n. We just replace the whole thing or the first line.
                # Vial only needs "r,c" as the primary label.
                new_row.append(f"{mat[0]},{mat[1]}")
                key_idx += 1
            else:
                new_row.append(item)
        new_kle.append(new_row)
    return new_kle

raw = [[{"rx": 0, "ry": 0, "r": 0}, "Esc\n\n0,0", "Q"], [{"x": 1}, "A"]]
keys = [{"matrix": [0,0]}, {"matrix": [0,1]}, {"matrix": [1,1]}]
print(json.dumps(inject_matrix_into_kle(raw, keys)))
