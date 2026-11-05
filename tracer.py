import sys
import json
import os
import types
import io

def serialize_val(val, depth=0, seen=None):
    if seen is None:
        seen = set()
    if depth > 4:
        return {"type": "primitive", "value": str(val)}

    val_id = id(val)
    if isinstance(val, (int, float, str, bool)) or val is None:
        return {"type": "primitive", "value": val}
    elif isinstance(val, (list, tuple)):
        items = []
        for v in val[:30]:
            items.append(serialize_val(v, depth + 1, seen))
        return {
            "type": "list",
            "values": items,
            "length": len(val),
            "isTuple": isinstance(val, tuple)
        }
    elif isinstance(val, set):
        items = []
        for v in list(val)[:30]:
            items.append(serialize_val(v, depth + 1, seen))
        return {
            "type": "set",
            "values": items,
            "length": len(val)
        }
    elif isinstance(val, dict):
        entries = []
        for k, v in list(val.items())[:30]:
            entries.append({
                "key": str(k),
                "value": serialize_val(v, depth + 1, seen)
            })
        return {
            "type": "dict",
            "entries": entries,
            "size": len(val)
        }
    elif hasattr(val, "next") or hasattr(val, "val") or hasattr(val, "data"):
        # Linked List node structure
        nodes = []
        curr = val
        node_seen = set()
        head_id = str(id(val))
        
        while curr is not None and id(curr) not in node_seen and len(nodes) < 25:
            node_seen.add(id(curr))
            node_val = getattr(curr, "val", getattr(curr, "data", str(curr)))
            next_node = getattr(curr, "next", None)
            nodes.append({
                "id": str(id(curr)),
                "val": serialize_val(node_val, depth + 1, seen),
                "nextId": str(id(next_node)) if next_node is not None else None
            })
            curr = next_node

        has_cycle = curr is not None and id(curr) in node_seen
        return {
            "type": "linked_list",
            "headId": head_id,
            "nodes": nodes,
            "hasCycle": has_cycle
        }
    else:
        return {"type": "primitive", "value": repr(val)}

def run_trace(code_str, max_steps=120):
    steps = []
    prev_vars = {}
    captured_stdout = io.StringIO()
    old_stdout = sys.stdout

    def make_tracer(target_fn):
        def tracer(frame, event, arg):
            if len(steps) >= max_steps:
                return None
            
            # Trace main module execution and top-level functions, ignoring internal class methods like __init__
            is_target_file = frame.f_code.co_filename == target_fn
            is_not_dunder = not frame.f_code.co_name.startswith("__")
            
            if is_target_file and event in ("line", "return") and is_not_dunder:
                line_no = frame.f_lineno
                locs = frame.f_locals
                filtered = {}
                for k, v in locs.items():
                    if k.startswith("__") or isinstance(v, (types.ModuleType, types.FunctionType, type)):
                        continue
                    filtered[k] = serialize_val(v)

                explanation = ""
                # Determine meaningful change explanation
                for var_name, var_data in filtered.items():
                    if var_name not in prev_vars:
                        v_type = var_data.get("type")
                        if v_type == "list":
                            explanation = f"Initialized list '{var_name}' with {var_data.get('length', 0)} elements"
                        elif v_type == "dict":
                            explanation = f"Initialized dictionary '{var_name}'"
                        elif v_type == "linked_list":
                            explanation = f"Created linked list node '{var_name}'"
                        else:
                            explanation = f"Assigned '{var_name}' = {var_data.get('value')}"
                        break
                    elif var_data != prev_vars.get(var_name):
                        v_type = var_data.get("type")
                        if v_type == "list":
                            prev_len = prev_vars[var_name].get("length", 0)
                            curr_len = var_data.get("length", 0)
                            if curr_len > prev_len:
                                explanation = f"Appended element to list '{var_name}' (length: {curr_len})"
                            elif curr_len < prev_len:
                                explanation = f"Removed element from list '{var_name}' (length: {curr_len})"
                            else:
                                explanation = f"Modified elements in list '{var_name}'"
                        elif v_type == "dict":
                            explanation = f"Updated dictionary '{var_name}' ({var_data.get('size', 0)} keys)"
                        elif v_type == "linked_list":
                            nodes_count = len(var_data.get("nodes", []))
                            explanation = f"Updated linked list '{var_name}' (length: {nodes_count})"
                        else:
                            explanation = f"Updated '{var_name}' = {var_data.get('value')}"
                        break

                prev_vars.clear()
                prev_vars.update(filtered)

                steps.append({
                    "step": len(steps) + 1,
                    "line": line_no,
                    "event": event,
                    "explanation": explanation or f"Executed line {line_no}",
                    "variables": filtered,
                    "stdout": captured_stdout.getvalue()
                })
            return tracer
        return tracer

    target_fn = "student_code.py"
    try:
        sys.stdout = captured_stdout
        compiled = compile(code_str, target_fn, "exec")
        sys.settrace(make_tracer(target_fn))
        exec(compiled, {})
    except Exception as e:
        steps.append({
            "step": len(steps) + 1,
            "line": 0,
            "event": "error",
            "explanation": f"Runtime Exception: {str(e)}",
            "variables": {},
            "stdout": captured_stdout.getvalue()
        })
    finally:
        sys.settrace(None)
        sys.stdout = old_stdout

    # Clean duplicates: if consecutive steps have identical line and variables, keep the latter
    cleaned = []
    for s in steps:
        if cleaned and cleaned[-1]["line"] == s["line"] and cleaned[-1]["variables"] == s["variables"]:
            cleaned[-1] = s
        else:
            cleaned.append(s)

    for i, s in enumerate(cleaned):
        s["step"] = i + 1

    return cleaned

if __name__ == "__main__":
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            code_input = f.read()
    else:
        code_input = sys.stdin.read()

    result = run_trace(code_input)
    print(json.dumps(result))
