# Security Guidelines

## 🔐 Environment Variables & Secrets Management

### Critical Security Rules

1. **NEVER commit credentials to version control**
   - All `.env` files are gitignored
   - Use `.env.example` as a template
   - Rotate any accidentally exposed credentials immediately

2. **Environment File Structure**
   ```
   .env.example     # Template with dummy values (committed)
   .env.dev         # Development credentials (gitignored)
   .env.prod        # Production credentials (gitignored)
   .env             # Active environment (gitignored)
   ```

3. **Required API Key Rotations**
   If any of these keys are exposed, rotate immediately:
   - Resend API Key
   - DigitalOcean Spaces credentials
   - Google Maps API Keys
   - Pexels API Key
   - Mailtrap Token
   - JWT Secret
   - MongoDB credentials

### Production Deployment Security

1. **Use Environment Variables in Production**
   - Never hardcode credentials in Docker images
   - Use secrets management (AWS Secrets Manager, Vercel env vars)
   - Set strong, randomly generated secrets

2. **Secure JWT Secrets**
   ```bash
   # Generate a secure JWT secret
   openssl rand -base64 64
   ```

3. **Database Security**
   - Use strong passwords (minimum 16 characters)
   - Enable MongoDB authentication
   - Restrict network access to database
   - Use connection strings with SSL/TLS

### API Key Best Practices

1. **Restrict API Keys**
   - Google Maps: Restrict to specific domains
   - Pexels: Use rate limiting
   - DigitalOcean: Use IAM policies

2. **Frontend API Keys**
   - Only expose keys that are meant to be public
   - Use domain restrictions
   - Monitor usage

3. **Backend API Keys**
   - Never expose in frontend code
   - Use server-side proxy for sensitive APIs
   - Implement rate limiting

### Security Checklist

Before deployment:
- [ ] All `.env` files are gitignored
- [ ] No hardcoded credentials in source code
- [ ] Strong secrets generated for JWT/sessions
- [ ] API keys have appropriate restrictions
- [ ] Database has strong authentication
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] HTTPS is enforced in production
- [ ] Security headers are configured

### Exposed Credentials Response Plan

If credentials are exposed:
1. **Immediately rotate** the exposed credentials
2. **Check logs** for unauthorized access
3. **Update** all services using the credentials
4. **Audit** the repository history
5. **Notify** team members if needed

### Environment Variable Documentation

See `.env.example` for all required variables with descriptions.

Key variables that MUST be changed from defaults:
- `JWT_SECRET`
- `SESSION_SECRET`
- `MONGO_ROOT_PASSWORD`
- All API keys

### Monitoring & Alerts

Set up monitoring for:
- Failed authentication attempts
- Unusual API usage patterns
- Database connection failures
- Rate limit violations

### Additional Security Measures

1. **Dependencies**
   - Run `npm audit` regularly
   - Keep dependencies updated
   - Use Dependabot or similar

2. **Code Security**
   - Input validation on all endpoints
   - SQL/NoSQL injection prevention
   - XSS protection
   - CSRF tokens for state-changing operations

3. **File Uploads**
   - Validate file types
   - Scan for malware
   - Store in separate location from app
   - Use signed URLs for access

---

*Last updated: January 2025*