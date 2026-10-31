"""Shared helpers for the demo-studio Python scripts: config loading with schema checks,
progress lines for tools that stream output, and small ffmpeg wrappers.

Scripts load this file by path (see load_demolib in each script) so they keep working
under `python3 -I`, which drops the script folder from sys.path.
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

PLUGIN_ROOT = Path(__file__).resolve().parent.parent
SCHEMAS = PLUGIN_ROOT / "schemas"
ASSETS = PLUGIN_ROOT / "assets"

_TYPES = {
    "object": lambda v: isinstance(v, dict),
    "array": lambda v: isinstance(v, list),
    "string": lambda v: isinstance(v, str),
    "number": lambda v: isinstance(v, (int, float)) and not isinstance(v, bool),
    "integer": lambda v: isinstance(v, int) and not isinstance(v, bool),
    "boolean": lambda v: isinstance(v, bool),
    "null": lambda v: v is None,
}


# ---------------------------------------------------------------- schema checks

def _resolve(schema: dict, root: dict) -> dict:
    while "$ref" in schema:
        ref = schema["$ref"]
        if not ref.startswith("#/$defs/"):
            raise ValueError(f"unsupported $ref {ref}")
        schema = root["$defs"][ref[len("#/$defs/"):]]
    return schema


def _check(value, schema: dict, root: dict, path: str) -> list[str]:
    """A small JSON Schema subset: type, enum, const, required, properties,
    patternProperties, additionalProperties, items, min/max items, minLength, pattern,
    minimum, maximum, exclusiveMinimum, oneOf, anyOf, $ref to #/$defs."""
    schema = _resolve(schema, root)
    where = path or "(top level)"
    if "const" in schema and value != schema["const"]:
        return [f"{where}: must be {schema['const']!r}"]
    if "enum" in schema and value not in schema["enum"]:
        return [f"{where}: must be one of {schema['enum']}, got {value!r}"]
    kinds = schema.get("type")
    if kinds:
        kinds = kinds if isinstance(kinds, list) else [kinds]
        if not any(_TYPES[k](value) for k in kinds):
            return [f"{where}: expected {' or '.join(kinds)}, got {type(value).__name__}"]

    for key in ("oneOf", "anyOf"):
        if key in schema:
            results = [_check(value, s, root, path) for s in schema[key]]
            passing = sum(1 for r in results if not r)
            if passing == 0:
                best = min(results, key=len)
                return [f"{where}: does not match any allowed shape; closest: {'; '.join(best)}"]
            if key == "oneOf" and passing > 1:
                return [f"{where}: matches more than one allowed shape"]

    errors: list[str] = []
    if isinstance(value, dict):
        for req in schema.get("required", []):
            if req not in value:
                errors.append(f"{where}: missing required field '{req}'")
        props = schema.get("properties", {})
        patterns = schema.get("patternProperties", {})
        extra = schema.get("additionalProperties", True)
        for k, v in value.items():
            sub = f"{path}.{k}" if path else k
            if k in props:
                errors += _check(v, props[k], root, sub)
                continue
            matched = [s for p, s in patterns.items() if re.search(p, k)]
            if matched:
                for s in matched:
                    errors += _check(v, s, root, sub)
            elif extra is False:
                errors.append(f"{where}: unknown field '{k}'")
            elif isinstance(extra, dict):
                errors += _check(v, extra, root, sub)
    elif isinstance(value, list):
        if "minItems" in schema and len(value) < schema["minItems"]:
            errors.append(f"{where}: needs at least {schema['minItems']} item(s)")
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            errors.append(f"{where}: allows at most {schema['maxItems']} item(s)")
        if "items" in schema:
            for i, item in enumerate(value):
                errors += _check(item, schema["items"], root, f"{path}[{i}]")
    elif isinstance(value, str):
        if "minLength" in schema and len(value) < schema["minLength"]:
            errors.append(f"{where}: must not be empty")
        if "pattern" in schema and not re.search(schema["pattern"], value):
            errors.append(f"{where}: {value!r} does not match {schema['pattern']}")
    elif _TYPES["number"](value):
        if "minimum" in schema and value < schema["minimum"]:
            errors.append(f"{where}: must be >= {schema['minimum']}")
        if "maximum" in schema and value > schema["maximum"]:
            errors.append(f"{where}: must be <= {schema['maximum']}")
        if "exclusiveMinimum" in schema and value <= schema["exclusiveMinimum"]:
            errors.append(f"{where}: must be > {schema['exclusiveMinimum']}")
    return errors


def validate(data, schema_name: str, definition: str | None = None) -> list[str]:
    """Checks data against schemas/<schema_name>.schema.json, or one of its $defs."""
    root = json.loads((SCHEMAS / f"{schema_name}.schema.json").read_text())
    schema = root["$defs"][definition] if definition else root
    return _check(data, schema, root, "")


def load_config(path: Path, schema_name: str, tool: str) -> dict:
    """Reads a JSON config and exits with every schema problem listed, before any work starts."""
    if not path.exists():
        sys.exit(f"{tool}: config not found: {path}")
    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError as error:
        sys.exit(f"{tool}: {path.name} is not valid JSON: {error}")
    errors = validate(data, schema_name)
    if errors:
        sys.exit(f"{tool}: {path.name} does not match schemas/{schema_name}.schema.json:\n  "
                 + "\n  ".join(errors))
    return data


# ---------------------------------------------------------------- progress and ffmpeg

def progress(stage: str, done: int, total: int) -> None:
    print(f"PROGRESS {stage} {done}/{total}", flush=True)


def output(path: Path | str) -> None:
    print(f"OUTPUT {path}", flush=True)


def require(*tools: str) -> None:
    missing = [t for t in tools if not shutil.which(t)]
    if missing:
        sys.exit(f"missing {', '.join(missing)}; run scripts/doctor.sh for install commands")


def run(cmd: list, tool: str = "ffmpeg") -> str:
    result = subprocess.run([str(c) for c in cmd], capture_output=True, text=True)
    if result.returncode:
        sys.exit(f"{tool} failed: {' '.join(map(str, cmd[:8]))}...\n{result.stderr[-1500:]}")
    return result.stdout


def run_progress(cmd: list, stage: str, total_frames: int, tool: str = "ffmpeg") -> None:
    """Runs ffmpeg with -progress on stdout and turns it into PROGRESS lines (about every 5%)."""
    cmd = [str(c) for c in cmd]
    cmd = [cmd[0], "-progress", "pipe:1", "-nostats", *cmd[1:]]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    total = max(1, total_frames)
    last = -1
    for line in proc.stdout:
        if line.startswith("frame="):
            done = min(total, int(line.split("=", 1)[1] or 0))
            step = done * 20 // total
            if step != last:
                last = step
                progress(stage, done, total)
    stderr = proc.stderr.read()
    if proc.wait():
        sys.exit(f"{tool} failed: {' '.join(cmd[:8])}...\n{stderr[-1500:]}")
    if last != 20:
        progress(stage, total, total)


def probe_size(path: Path) -> tuple[int, int]:
    out = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
               "-of", "csv=p=0", path], "ffprobe")
    w, h = out.strip().split(",")[:2]
    return int(w), int(h)


def duration(path: Path) -> float:
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], "ffprobe")
    return float(out.strip())


def has_audio(path: Path) -> bool:
    out = run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index",
               "-of", "csv=p=0", path], "ffprobe")
    return bool(out.strip())


def has_filter(name: str) -> bool:
    out = subprocess.run(["ffmpeg", "-hide_banner", "-filters"], capture_output=True, text=True).stdout
    return any(line.split()[1:2] == [name] for line in out.splitlines() if line.strip())


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "demo"
