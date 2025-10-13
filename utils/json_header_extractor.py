import json
from typing import Union, Dict, Any, List

# Define a custom type for the structure output for clarity
StructureType = Union[str, Dict[str, Any], List[Any]]

def get_structure(data: Any, show_example: bool = False) -> StructureType:
    """
    Recursively determines the structure (keys and data types) of a JSON object or array.

    Args:
        data: Parsed JSON data.
        show_example: If True, include one example value for each object/array.

    Returns:
        A simplified structure representation.
    """
    if isinstance(data, dict):
        structure = {}
        for key, value in data.items():
            structure[key] = get_structure(value, show_example)
        if show_example:
            # Include a simplified example (avoid deep nesting to keep it readable)
            structure["__example__"] = {k: _simplify_example(v) for k, v in data.items()}
        return structure

    elif isinstance(data, list):
        if data:
            first = data[0]
            structure = [get_structure(first, show_example)]
            if show_example:
                # Attach an example of one element
                structure.append({"__example__": _simplify_example(first)})
            return structure
        else:
            return '[]'

    # Handle primitive types
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


def _simplify_example(value: Any, max_len: int = 80) -> Any:
    """
    Simplify the example values to prevent printing huge data.
    Truncates long strings and nested structures.
    """
    if isinstance(value, str):
        return value[:max_len] + "..." if len(value) > max_len else value
    elif isinstance(value, (int, float, bool)) or value is None:
        return value
    elif isinstance(value, dict):
        # Keep shallow examples (just keys and simple values)
        return {k: _simplify_example(v) for k, v in list(value.items())[:5]}
    elif isinstance(value, list):
        # Show only the first element
        return [_simplify_example(value[0])] if value else []
    return str(value)


def read_json_structure(file_path: str, show_example: bool = False) -> StructureType:
    """
    Reads the structure of a JSON file by loading the root object/array
    and determining the types and keys within it.

    Args:
        file_path: The full path to your JSON file.
        show_example: Whether to include one example element per object/array.

    Returns:
        A dictionary representing the inferred schema.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return get_structure(data, show_example)
    except FileNotFoundError:
        print(f"Error: File not found at '{file_path}'")
        return {}
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON in '{file_path}': {e}")
        return {}
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return {}


if __name__ == "__main__":
    YOUR_FILE_PATH = "demo-data.json"

    # Change to True if you want one example row for each object/array
    SHOW_EXAMPLE = True

    structure = read_json_structure(YOUR_FILE_PATH, show_example=SHOW_EXAMPLE)
    print(json.dumps(structure, indent=4, ensure_ascii=False))
