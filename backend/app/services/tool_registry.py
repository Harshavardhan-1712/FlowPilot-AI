import json
import re
from typing import Dict, Any, Tuple, Optional
import httpx
from app.services.ssrf_guard import validate_url_safety

SENSITIVE_KEY_PATTERNS = [
    re.compile(r"pass(word)?", re.I),
    re.compile(r"secret", re.I),
    re.compile(r"token", re.I),
    re.compile(r"api[_-]?key", re.I),
    re.compile(r"auth(orization)?", re.I),
    re.compile(r"cookie", re.I),
]


def redact_secrets(data: Any) -> Any:
    """Recursively redacts sensitive keys from dictionaries and logs."""
    if isinstance(data, dict):
        clean = {}
        for k, v in data.items():
            if any(p.search(str(k)) for p in SENSITIVE_KEY_PATTERNS):
                clean[k] = "****** [REDACTED] ******"
            else:
                clean[k] = redact_secrets(v)
        return clean
    elif isinstance(data, list):
        return [redact_secrets(item) for item in data]
    return data


def execute_http_request(
    url: str,
    method: str = "GET",
    headers: Optional[Dict[str, str]] = None,
    json_data: Optional[Dict[str, Any]] = None,
    timeout: float = 10.0
) -> Dict[str, Any]:
    # 1. SSRF Protection check
    is_safe, error_msg = validate_url_safety(url)
    if not is_safe:
        raise PermissionError(f"Security Policy: Blocked SSRF request to destination '{url}': {error_msg}")

    # 2. Execute safe outbound request
    safe_headers = (headers or {}).copy()
    try:
        with httpx.Client(timeout=timeout, follow_redirects=False) as client:
            resp = client.request(
                method=method.upper(),
                url=url,
                headers=safe_headers,
                json=json_data
            )
            # Limit response payload size to prevent memory exhaustion (max 2 MB)
            if len(resp.content) > 2 * 1024 * 1024:
                return {
                    "status_code": resp.status_code,
                    "error": "Response exceeded maximum safe payload size of 2MB",
                    "truncated": True
                }

            try:
                body = resp.json()
            except Exception:
                body = resp.text[:2000]

            return {
                "status_code": resp.status_code,
                "data": body,
                "headers": dict(resp.headers),
            }
    except Exception as e:
        raise RuntimeError(f"HTTP request failed: {str(e)}")


def execute_data_transformation(data: Dict[str, Any], rule: Dict[str, Any]) -> Dict[str, Any]:
    """Extracts or transforms data according to mapping specification."""
    output = {}
    mapping = rule.get("mapping", {})
    if isinstance(mapping, dict):
        for target_key, source_path in mapping.items():
            # Simple dot-notation extraction
            parts = str(source_path).split(".")
            curr = data
            for part in parts:
                if isinstance(curr, dict) and part in curr:
                    curr = curr[part]
                else:
                    curr = None
                    break
            output[target_key] = curr
    else:
        output = {"transformed": data}
    return output


def execute_email_draft(recipient: str, subject: str, body: str) -> Dict[str, Any]:
    """Generates an email draft payload safely staged for human review or sending."""
    return {
        "status": "draft_created",
        "recipient": recipient,
        "subject": subject,
        "body_preview": body[:300] + ("..." if len(body) > 300 else ""),
        "full_body": body,
        "requires_sending_confirmation": True
    }
