# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in KeyGate, please report it responsibly.

**DO NOT open a public GitHub issue for security vulnerabilities.**

Instead, email: **security@keygate.dev**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and aim to release a fix within 7 days of confirmation.

## Security Model

### What KeyGate Protects

- **Vendor admin keys** are encrypted at rest in the database
- **Provisioned API keys** are shown exactly once during provisioning and never stored
- **All actions** are logged in an immutable audit trail
- **Authentication** uses JWT with configurable expiry

### What KeyGate Does NOT Protect

- KeyGate does not proxy or monitor actual LLM API calls
- Once a key is shared with a developer, KeyGate cannot prevent misuse until revocation
- Budget limits are enforced by the vendor, not by KeyGate

### Security Best Practices

When deploying KeyGate in production:

1. **Use a strong `SECRET_KEY`** — generate with `openssl rand -hex 32`
2. **Set `ENCRYPTION_KEY`** — for encrypting vendor admin keys at rest
3. **Use HTTPS** — always terminate TLS before KeyGate
4. **Restrict CORS** — set `CORS_ORIGINS` to your specific domain
5. **Rotate admin credentials** — change the default admin password immediately
6. **Network isolation** — run the database in a private network
7. **Regular backups** — back up the database regularly
8. **Monitor audit logs** — alert on unusual provisioning patterns

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅ Current |

## Acknowledgments

We appreciate responsible disclosure and will credit security researchers (with permission) in our release notes.
