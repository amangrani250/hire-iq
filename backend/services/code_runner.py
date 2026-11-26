"""Code execution for the Coding Lab.

Two providers:

- ``local``  — uses installed Python/Node/Java runtimes in a temporary folder.
- ``judge0`` — remote Judge0 CE sandbox, required on Vercel where arbitrary
  compilers are not available. Defaults to the public CE instance; set
  JUDGE0_URL / JUDGE0_API_KEY for a self-hosted or RapidAPI instance.

Only the provider facade (`language_catalog`, `run_solution`) is used by the API.
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import lru_cache
from pathlib import Path
from typing import Any

import httpx

from core.config import log, settings

MAX_CODE_BYTES = 30_000
COMPILE_TIMEOUT_SECONDS = 15
TEST_TIMEOUT_SECONDS = 4
MAX_OUTPUT_CHARS = 20_000
JUDGE0_CACHE_SECONDS = 3600


class JudgeUnavailableError(RuntimeError):
    """Raised when the remote judge cannot be reached or rejects the request."""


# ---------------------------------------------------------------------------
# Provider selection
# ---------------------------------------------------------------------------


def execution_provider() -> str:
    configured = (settings.CODE_EXECUTION_PROVIDER or "auto").strip().lower()
    if configured in {"local", "judge0"}:
        return configured
    # Vercel cannot host arbitrary compilers; use the remote sandbox by default.
    if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        return "judge0"
    return "local"


# ---------------------------------------------------------------------------
# Local runtime catalog
# ---------------------------------------------------------------------------


def _which(command: str) -> str | None:
    return shutil.which(command)


@lru_cache(maxsize=None)
def _command_version(command: tuple[str, ...]) -> str:
    try:
        result = subprocess.run(
            list(command),
            capture_output=True,
            text=True,
            timeout=6,
            encoding="utf-8",
            errors="replace",
        )
        output = (result.stdout or result.stderr or "").strip().splitlines()
        return output[0].strip() if output else ""
    except Exception:
        return ""


def _major_version(version: str) -> int:
    match = re.search(r"(\d+)", version or "")
    return int(match.group(1)) if match else 0


@lru_cache(maxsize=1)
def _local_language_catalog() -> list[dict]:
    node = _which("node")
    java = _which("java")
    javac = _which("javac")
    node_version = _command_version((node, "--version")) if node else ""
    java_version = _command_version((java, "-version")) if java else ""
    javac_version = _command_version((javac, "-version")) if javac else ""

    return [
        {
            "id": "python",
            "label": "Python",
            "extension": "py",
            "version": sys.version.split()[0],
            "available": bool(sys.executable),
        },
        {
            "id": "javascript",
            "label": "JavaScript",
            "extension": "js",
            "version": node_version.replace("v", ""),
            "available": bool(node),
        },
        {
            "id": "typescript",
            "label": "TypeScript",
            "extension": "ts",
            "version": node_version.replace("v", ""),
            "available": bool(node) and _major_version(node_version) >= 23,
        },
        {
            "id": "java",
            "label": "Java",
            "extension": "java",
            "version": (javac_version or java_version).replace("javac ", "").replace("openjdk version ", ""),
            "available": bool(java and javac),
        },
    ]


# ---------------------------------------------------------------------------
# Judge0 catalog
# ---------------------------------------------------------------------------


_JUDGE0_CACHE: dict[str, Any] = {"at": 0.0, "languages": []}

# Used only if the catalog request fails. These IDs match the public CE instance
# and are overridden automatically when /languages is available.
_JUDGE0_FALLBACK = [
    {"id": 113, "name": "Python (3.14.0)"},
    {"id": 102, "name": "JavaScript (Node.js 22.08.0)"},
    {"id": 101, "name": "TypeScript (5.6.2)"},
    {"id": 91, "name": "Java (JDK 17.0.6)"},
]

_JUDGE0_SPECS = [
    ("python", "Python", "py", re.compile(r"^Python \(3\.")),
    ("javascript", "JavaScript", "js", re.compile(r"^JavaScript \(Node\.js")),
    ("typescript", "TypeScript", "ts", re.compile(r"^TypeScript")),
    ("java", "Java", "java", re.compile(r"^Java \(")),
]


def _judge0_headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if not settings.JUDGE0_API_KEY:
        return headers
    if settings.JUDGE0_RAPIDAPI_HOST:
        headers["X-RapidAPI-Key"] = settings.JUDGE0_API_KEY
        headers["X-RapidAPI-Host"] = settings.JUDGE0_RAPIDAPI_HOST
    else:
        headers["X-Auth-Token"] = settings.JUDGE0_API_KEY
    return headers


def _judge0_languages() -> list[dict]:
    now = time.time()
    if _JUDGE0_CACHE["languages"] and now - _JUDGE0_CACHE["at"] < JUDGE0_CACHE_SECONDS:
        return _JUDGE0_CACHE["languages"]

    url = settings.JUDGE0_URL.rstrip("/") + "/languages"
    try:
        response = httpx.get(url, headers=_judge0_headers(), timeout=20)
        response.raise_for_status()
        languages = response.json()
        if isinstance(languages, list) and languages:
            _JUDGE0_CACHE.update({"at": now, "languages": languages})
            return languages
    except Exception as exc:
        log.warning("Judge0 catalog unavailable: %s", exc)

    return _JUDGE0_CACHE["languages"] or _JUDGE0_FALLBACK


def _version_key(name: str) -> tuple[int, ...]:
    match = re.search(r"\(([^)]+)\)", name or "")
    if not match:
        return (0,)
    parts = re.findall(r"\d+", match.group(1))
    return tuple(int(part) for part in parts[:4]) or (0,)


def _judge0_catalog() -> list[dict]:
    languages = _judge0_languages()
    catalog: list[dict] = []

    for language_id, label, extension, pattern in _JUDGE0_SPECS:
        options = [
            item
            for item in languages
            if isinstance(item, dict) and pattern.search(item.get("name", ""))
        ]
        if not options:
            catalog.append(
                {
                    "id": language_id,
                    "label": label,
                    "extension": extension,
                    "version": "",
                    "available": False,
                }
            )
            continue

        chosen = max(options, key=lambda item: _version_key(item.get("name", "")))
        name = chosen.get("name", "")
        version = (re.search(r"\(([^)]+)\)", name or "") or [None, name])[1]
        catalog.append(
            {
                "id": language_id,
                "label": label,
                "extension": extension,
                "version": str(version).replace("Node.js ", "").replace("JDK ", ""),
                "available": True,
                "judge0_id": chosen.get("id"),
            }
        )

    return catalog


def _judge0_language(language_id: str) -> dict | None:
    return next((item for item in _judge0_catalog() if item["id"] == language_id), None)


# ---------------------------------------------------------------------------
# Public catalog
# ---------------------------------------------------------------------------


def language_catalog() -> list[dict]:
    if execution_provider() == "judge0":
        return [
            {key: value for key, value in item.items() if key != "judge0_id"}
            for item in _judge0_catalog()
        ]
    return _local_language_catalog()


def get_language(language_id: str) -> dict | None:
    return next((item for item in language_catalog() if item["id"] == language_id), None)


# ---------------------------------------------------------------------------
# Local runner
# ---------------------------------------------------------------------------


def _local_commands(language_id: str) -> dict | None:
    if language_id == "python":
        return {
            "source": "main.py",
            "compile": None,
            "run": [sys.executable, "main.py"],
        }

    node = _which("node")
    if language_id in {"javascript", "typescript"} and node:
        filename = "main.js" if language_id == "javascript" else "main.ts"
        return {"source": filename, "compile": None, "run": [node, filename]}

    java = _which("java")
    javac = _which("javac")
    if language_id == "java" and java and javac:
        return {
            "source": "Main.java",
            "compile": [javac, "-encoding", "UTF-8", "Main.java"],
            "run": [java, "-cp", ".", "Main"],
        }

    return None


def _normalize(text: str) -> str:
    cleaned = text.replace("\r\n", "\n").replace("\r", "\n").strip()
    return "\n".join(line.rstrip() for line in cleaned.split("\n"))


def _truncate(text: str) -> str:
    if len(text) <= MAX_OUTPUT_CHARS:
        return text
    return f"{text[:MAX_OUTPUT_CHARS]}\n… output truncated …"


def _run_solution_local(language_id: str, challenge: dict, code: str, mode: str) -> dict:
    language = get_language(language_id)
    if not language or not language["available"]:
        raise ValueError(f"{language_id} is not available on this server.")

    payload = code.encode("utf-8")
    if len(payload) > MAX_CODE_BYTES:
        raise ValueError(f"Code is too large. Keep it under {MAX_CODE_BYTES // 1000} KB.")

    commands = _local_commands(language_id)
    if not commands:
        raise ValueError(f"No runnable toolchain found for {language_id}.")

    tests = [test for test in challenge["tests"] if mode == "submit" or test.get("sample")]
    if not tests:
        raise ValueError("No tests are configured for this challenge.")

    started_at = time.perf_counter()
    temp_dir = Path(tempfile.mkdtemp(prefix="hireiq-code-"))
    env = {
        "PATH": os.environ.get("PATH", ""),
        "SystemRoot": os.environ.get("SystemRoot", ""),
        "WINDIR": os.environ.get("WINDIR", ""),
        "COMSPEC": os.environ.get("COMSPEC", ""),
        "HOME": str(temp_dir),
        "TMP": str(temp_dir),
        "TEMP": str(temp_dir),
        "TZ": "UTC",
        "PYTHONIOENCODING": "utf-8",
        "NO_COLOR": "1",
        "LANG": "en_US.UTF-8",
    }

    try:
        (temp_dir / commands["source"]).write_text(code, encoding="utf-8")

        compile_output = ""
        if commands["compile"]:
            try:
                compiled = subprocess.run(
                    commands["compile"],
                    cwd=temp_dir,
                    capture_output=True,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                    timeout=COMPILE_TIMEOUT_SECONDS,
                    env=env,
                )
            except subprocess.TimeoutExpired:
                return {
                    "status": "compile_error",
                    "compile_output": "Compilation timed out.",
                    "tests": [],
                    "passed": 0,
                    "total": len(tests),
                    "duration_ms": int((time.perf_counter() - started_at) * 1000),
                }

            compile_output = _truncate((compiled.stdout or "") + (compiled.stderr or "")).strip()
            if compiled.returncode != 0:
                return {
                    "status": "compile_error",
                    "compile_output": compile_output or "Compilation failed.",
                    "tests": [],
                    "passed": 0,
                    "total": len(tests),
                    "duration_ms": int((time.perf_counter() - started_at) * 1000),
                }

        results: list[dict] = []
        for test in tests:
            test_started = time.perf_counter()
            actual = ""
            stderr = ""
            status = "failed"
            try:
                process = subprocess.run(
                    commands["run"],
                    cwd=temp_dir,
                    input=test["input"],
                    capture_output=True,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                    timeout=TEST_TIMEOUT_SECONDS,
                    env=env,
                )
                actual = _truncate(process.stdout or "")
                stderr = _truncate(process.stderr or "")
                if process.returncode != 0:
                    status = "runtime_error"
                elif _normalize(actual) == _normalize(test["expected"]):
                    status = "passed"
            except subprocess.TimeoutExpired:
                status = "timeout"
                stderr = f"Time limit exceeded ({TEST_TIMEOUT_SECONDS}s)."
            except Exception as exc:
                status = "runtime_error"
                stderr = str(exc)

            results.append(
                {
                    "name": test["name"],
                    "passed": status == "passed",
                    "status": status,
                    "input": test["input"],
                    "expected": test["expected"],
                    "actual": actual,
                    "stderr": stderr,
                    "hidden": not bool(test.get("sample")),
                    "duration_ms": int((time.perf_counter() - test_started) * 1000),
                }
            )

        passed = sum(1 for result in results if result["passed"])
        return {
            "status": "passed" if passed == len(results) else "failed",
            "compile_output": compile_output,
            "tests": results,
            "passed": passed,
            "total": len(results),
            "duration_ms": int((time.perf_counter() - started_at) * 1000),
        }
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


# ---------------------------------------------------------------------------
# Judge0 runner
# ---------------------------------------------------------------------------


def _execute_judge0_test(
    client: httpx.Client,
    base_url: str,
    headers: dict[str, str],
    language: dict,
    test: dict,
    source_code: str,
) -> dict:
    payload = {
        "source_code": source_code,
        "language_id": language["judge0_id"],
        "stdin": test["input"],
        "cpu_time_limit": 3,
        "wall_time_limit": 6,
        "memory_limit": 256000,
    }
    started_at = time.perf_counter()
    response: httpx.Response | None = None
    for attempt in range(3):
        try:
            response = client.post(
                f"{base_url}/submissions?base64_encoded=false&wait=true",
                json=payload,
            )
        except httpx.HTTPError as exc:
            if attempt < 2:
                time.sleep(0.6 * (attempt + 1))
                continue
            raise JudgeUnavailableError(f"Judge0 is unreachable: {exc}") from exc

        if response.status_code == 429 or response.status_code >= 500:
            if attempt < 2:
                time.sleep(0.7 * (attempt + 1))
                continue
        break

    if response is None:
        raise JudgeUnavailableError("Judge0 did not respond.")

    if response.status_code not in (200, 201):
        raise JudgeUnavailableError(
            f"Judge0 returned HTTP {response.status_code}: {response.text[:200]}"
        )

    data = response.json()
    status = data.get("status") or {}
    status_id = status.get("id")
    stdout = _truncate(data.get("stdout") or "")
    stderr = _truncate(data.get("stderr") or "")
    compile_output = _truncate(data.get("compile_output") or "")
    measured_ms = int((time.perf_counter() - started_at) * 1000)
    reported_ms = int(float(data.get("time") or 0) * 1000) or measured_ms

    if status_id == 6:
        test_status = "compile_error"
    elif status_id == 5:
        test_status = "timeout"
    elif isinstance(status_id, int) and status_id >= 7:
        test_status = "runtime_error"
    elif status_id == 3 and _normalize(stdout) == _normalize(test["expected"]):
        test_status = "passed"
    else:
        test_status = "failed"

    if compile_output and not stderr:
        stderr = compile_output

    return {
        "name": test["name"],
        "passed": test_status == "passed",
        "status": test_status,
        "input": test["input"],
        "expected": test["expected"],
        "actual": stdout,
        "stderr": stderr,
        "hidden": not bool(test.get("sample")),
        "duration_ms": reported_ms,
        "compile_output": compile_output,
        "judge0_status": status.get("description"),
    }


def _run_solution_judge0(language_id: str, challenge: dict, code: str, mode: str) -> dict:
    language = _judge0_language(language_id)
    if not language or not language.get("available") or not language.get("judge0_id"):
        raise ValueError(f"{language_id} is not available on the judge.")

    if len(code.encode("utf-8")) > MAX_CODE_BYTES:
        raise ValueError(f"Code is too large. Keep it under {MAX_CODE_BYTES // 1000} KB.")

    tests = [test for test in challenge["tests"] if mode == "submit" or test.get("sample")]
    if not tests:
        raise ValueError("No tests are configured for this challenge.")

    source_code = code
    if language_id == "typescript":
        # Judge0's TypeScript image has no Node typings; keep the candidate's
        # TypeScript execution-focused rather than failing on missing @types.
        source_code = "// @ts-nocheck\n" + code

    base_url = settings.JUDGE0_URL.rstrip("/")
    headers = _judge0_headers()
    started_at = time.perf_counter()
    results: list[dict | None] = [None] * len(tests)

    with httpx.Client(timeout=30, headers=headers) as client:
        workers = min(4, len(tests))
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {
                pool.submit(
                    _execute_judge0_test,
                    client,
                    base_url,
                    headers,
                    language,
                    test,
                    source_code,
                ): index
                for index, test in enumerate(tests)
            }
            for future in as_completed(futures):
                results[futures[future]] = future.result()

    completed = [result for result in results if result is not None]
    compile_errors = [
        result for result in completed if result["status"] == "compile_error"
    ]
    if compile_errors:
        compile_output = next(
            (result["compile_output"] for result in compile_errors if result["compile_output"]),
            "Compilation failed.",
        )
        return {
            "status": "compile_error",
            "compile_output": compile_output,
            "tests": [],
            "passed": 0,
            "total": len(tests),
            "duration_ms": int((time.perf_counter() - started_at) * 1000),
        }

    for result in completed:
        result.pop("compile_output", None)
        result.pop("judge0_status", None)

    passed = sum(1 for result in completed if result["passed"])
    return {
        "status": "passed" if passed == len(completed) else "failed",
        "compile_output": "",
        "tests": completed,
        "passed": passed,
        "total": len(completed),
        "duration_ms": int((time.perf_counter() - started_at) * 1000),
    }


# ---------------------------------------------------------------------------
# Facade
# ---------------------------------------------------------------------------


def run_solution(language_id: str, challenge: dict, code: str, mode: str = "run") -> dict:
    """Compile/run a solution with the configured provider."""
    if execution_provider() == "judge0":
        return _run_solution_judge0(language_id, challenge, code, mode)
    return _run_solution_local(language_id, challenge, code, mode)
