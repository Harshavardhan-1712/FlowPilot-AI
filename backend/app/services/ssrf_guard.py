import ipaddress
import socket
from urllib.parse import urlparse
from typing import Tuple, Optional


BLOCKED_HOSTNAMES = {
    "localhost",
    "metadata.google.internal",
    "instance-data",
    "metadata.azure.com",
}


def is_ip_blocked(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
        return (
            ip.is_loopback
            or ip.is_private
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        )
    except ValueError:
        return True


def validate_url_safety(url: str) -> Tuple[bool, Optional[str]]:
    """
    Validates whether a URL is safe to request, blocking SSRF vulnerabilities.
    Returns (is_safe, error_message).
    """
    try:
        parsed = urlparse(url)
    except Exception:
        return False, "Malformed URL format."

    if parsed.scheme.lower() not in ("http", "https"):
        return False, f"Unsupported scheme '{parsed.scheme}'. Only http and https are allowed."

    hostname = parsed.hostname
    if not hostname:
        return False, "URL must include a valid hostname."

    hostname_lower = hostname.lower()
    if hostname_lower in BLOCKED_HOSTNAMES:
        return False, f"Access to '{hostname}' is blocked for security reasons."

    # Prevent access to IP addresses in private ranges
    try:
        # Check if hostname is directly an IP literal
        ip = ipaddress.ip_address(hostname)
        if is_ip_blocked(str(ip)):
            return False, f"Outbound requests to private/internal IP {ip} are prohibited."
    except ValueError:
        # Hostname is a domain name; resolve DNS to check target IP
        try:
            addr_info = socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80))
            for family, socktype, proto, canonname, sockaddr in addr_info:
                resolved_ip = sockaddr[0]
                if is_ip_blocked(resolved_ip):
                    return False, f"Domain '{hostname}' resolves to private/internal IP {resolved_ip}, which is blocked."
        except socket.gaierror:
            return False, f"Could not resolve domain name '{hostname}'."
        except Exception as e:
            return False, f"DNS resolution failed: {str(e)}"

    return True, None
