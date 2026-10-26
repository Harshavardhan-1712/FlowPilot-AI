from app.services.ssrf_guard import validate_url_safety


def test_ssrf_blocks_localhost():
    is_safe, error = validate_url_safety("http://localhost:8080/admin")
    assert is_safe is False
    assert "blocked" in error.lower()


def test_ssrf_blocks_loopback_ip():
    is_safe, error = validate_url_safety("http://127.0.0.1:5000/internal")
    assert is_safe is False
    assert "private/internal" in error.lower()


def test_ssrf_blocks_private_subnet_ips():
    # 10.0.0.0/8
    is_safe, _ = validate_url_safety("http://10.0.0.5/secret")
    assert is_safe is False

    # 172.16.0.0/12
    is_safe, _ = validate_url_safety("http://172.16.50.1/config")
    assert is_safe is False

    # 192.168.0.0/16
    is_safe, _ = validate_url_safety("http://192.168.1.1/router")
    assert is_safe is False


def test_ssrf_blocks_cloud_metadata():
    is_safe, error = validate_url_safety("http://169.254.169.254/latest/meta-data")
    assert is_safe is False
    assert "private/internal" in error.lower()


def test_ssrf_allows_public_urls():
    is_safe, error = validate_url_safety("https://api.github.com/events")
    assert is_safe is True
    assert error is None
