# Security Guide - Keeping Credentials Safe

This guide explains how to keep your email credentials, database passwords, and API keys secure.

## ✅ What's Already Protected

### 1. `.gitignore` File
Your `.env` file is **already excluded** from git:
```
.env
.env.local
```

**This means:**
- ✅ `.env` files are **never committed** to git
- ✅ Credentials stay on your local machine
- ✅ If you push to GitHub, credentials won't be exposed

### 2. How `.env` Files Work

- **Local Development**: `.env` file stays on your computer only
- **Not in Git**: Already in `.gitignore`, so it won't be uploaded
- **Server-Side Only**: Environment variables are read by Node.js, not sent to the browser
- **Separate Files**: You can have different `.env` files for dev/production

---

## 🔒 Security Best Practices

### ✅ DO:
1. **Keep `.env` local** - Never commit it to git
2. **Use App Passwords** - For Gmail, use app passwords (not your main password)
3. **Restrict API Keys** - Limit Google Maps API key to your domain
4. **Use Environment Variables** - In production, use hosting platform's env vars
5. **Rotate Credentials** - Change passwords/keys periodically
6. **Limit Access** - Only share credentials with trusted team members

### ❌ DON'T:
1. **Don't commit `.env`** - Already protected, but double-check
2. **Don't share in chat/email** - Use secure password managers
3. **Don't hardcode credentials** - Always use environment variables
4. **Don't use production keys in dev** - Keep separate credentials
5. **Don't log credentials** - Never console.log passwords/keys

---

## 🚀 Production Deployment Security

When deploying to `imtechsavvy.org`, you'll use your hosting platform's secure environment variable system.

### Option 1: Vercel (Recommended for Next.js/React Apps)

1. Go to your project settings
2. Click **"Environment Variables"**
3. Add each variable:
   - `DATABASE_URL`
   - `GMAIL_USER`
   - `GMAIL_APP_PASSWORD`
   - `ADMIN_EMAIL`
   - `VITE_GOOGLE_MAPS_API_KEY`
4. **Never visible** in code or logs
5. **Encrypted at rest** by Vercel

### Option 2: Railway

1. Go to your project
2. Click **"Variables"** tab
3. Add environment variables
4. **Secure and encrypted**

### Option 3: Your Own Server (VPS/Dedicated)

1. Create `.env` file on server (not in git)
2. Set file permissions: `chmod 600 .env` (owner read/write only)
3. Use a process manager (PM2) that loads env vars securely
4. Consider using a secrets manager (AWS Secrets Manager, etc.)

### Option 4: Docker

1. Use Docker secrets or environment files
2. Never include `.env` in Docker image
3. Mount `.env` at runtime or use Docker secrets

---

## 🔐 Gmail App Password Security

### Why App Passwords Are Safer:

1. **Limited Scope**: Only works for email, not your full Google account
2. **Revocable**: Can be deleted anytime without changing main password
3. **No 2FA Bypass**: Still requires 2-Step Verification
4. **Auditable**: Google shows when/where app passwords are used

### How to Revoke:

1. Go to https://myaccount.google.com/apppasswords
2. Find "DFW Food Map" app password
3. Click delete/revoke
4. Generate a new one if needed

---

## 🛡️ Additional Security Measures

### 1. Restrict Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your API key
3. Under "Application restrictions":
   - Choose "HTTP referrers"
   - Add: `https://imtechsavvy.org/*`
   - Add: `https://www.imtechsavvy.org/*`
4. This prevents key theft/abuse

### 2. Database Connection Security

- ✅ Using SSL: Your Neon connection string includes `?sslmode=require`
- ✅ Encrypted in transit
- ✅ Connection string stored in environment variable only

### 3. Environment Variable Checklist

Before deploying, ensure these are set in your hosting platform:

```env
# Database
DATABASE_URL=postgresql://...

# Email (Gmail)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
ADMIN_EMAIL=your-email@gmail.com

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=your-api-key

# App URL
APP_URL=https://imtechsavvy.org
```

---

## 📋 Security Checklist for Deployment

Before going live:

- [ ] `.env` file is in `.gitignore` (already done ✅)
- [ ] No credentials in code files
- [ ] Google Maps API key restricted to your domain
- [ ] Gmail app password created (not main password)
- [ ] Environment variables set in hosting platform
- [ ] Database uses SSL connection
- [ ] HTTPS enabled on your domain
- [ ] Regular backups of database
- [ ] Credentials documented securely (password manager)

---

## 🚨 If Credentials Are Compromised

### Immediate Actions:

1. **Revoke compromised credentials**:
   - Gmail: Delete app password, create new one
   - Google Maps: Regenerate API key
   - Database: Change password in Neon dashboard

2. **Update environment variables** in hosting platform

3. **Review access logs**:
   - Check Google account activity
   - Check database connection logs
   - Check server logs for suspicious activity

4. **Rotate all credentials** as precaution

---

## 💡 Pro Tips

### Use a Password Manager
- Store credentials in 1Password, LastPass, Bitwarden, etc.
- Share with team securely
- Generate strong passwords

### Separate Dev/Production
- Different Gmail app passwords for dev/prod
- Different API keys if possible
- Different database instances

### Monitor Usage
- Check Google Cloud Console for API usage
- Monitor Neon database usage
- Set up alerts for unusual activity

### Regular Audits
- Review who has access quarterly
- Rotate credentials every 6-12 months
- Check for unused credentials

---

## 📞 Need Help?

If you suspect a security issue:
1. Revoke affected credentials immediately
2. Check logs for unauthorized access
3. Update all credentials
4. Review this guide for best practices

---

**Remember**: Security is an ongoing process, not a one-time setup. Stay vigilant! 🔒



