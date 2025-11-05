import json
from typing import Union, Dict, Any, List

StructureType = Union[str, Dict[str, Any], List[Any]]

def get_structure(data: Any, show_example: bool = False, num_examples: int = 2) -> StructureType:
    if isinstance(data, dict):
        structure = {}
        for key, value in data.items():
            structure[key] = get_structure(value, show_example, num_examples)
        if show_example:
            structure["__example__"] = {k: _simplify_example(v) for k, v in data.items()}
        return structure

    elif isinstance(data, list):
        if data:
            first = data[0]
            structure = [get_structure(first, show_example, num_examples)]
            
            if show_example:
                for i in range(min(num_examples, len(data))):
                    structure.append({"__example__": _simplify_example(data[i])})
            return structure
        else:
            return '[]'

    elif isinstance(data, str):
        return 'string'
    elif isinstance(data, (int, float)):
        return 'number'
    elif isinstance(data, bool):
        return 'boolean'
    elif data is None:
        return 'null'
    else:
        return str(type(data).__name__)


def _simplify_example(value: Any, max_depth: int = 3, current_depth: int = 0) -> Any:
    if current_depth >= max_depth:
        if isinstance(value, dict):
            return {k: "..." for k in list(value.keys())[:3]}
        elif isinstance(value, list):
            return ["..."]
        return value
    
    if isinstance(value, str):
        return value
    elif isinstance(value, (int, float, bool)) or value is None:
        return value
    elif isinstance(value, dict):
        return {k: _simplify_example(v, max_depth, current_depth + 1) for k, v in value.items()}
    elif isinstance(value, list):
        return [_simplify_example(item, max_depth, current_depth + 1) for item in value[:2]]
    return str(value)


def read_json_structure(file_path: str, show_example: bool = False, num_examples: int = 2) -> StructureType:
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        return get_structure(data, show_example, num_examples)


if __name__ == "__main__":
    YOUR_FILE_PATH = "match_data.json"

    SHOW_EXAMPLE = True
    NUM_EXAMPLES = 2

    structure = read_json_structure(YOUR_FILE_PATH, show_example=SHOW_EXAMPLE, num_examples=NUM_EXAMPLES)
    print(json.dumps(structure, indent=4, ensure_ascii=False))