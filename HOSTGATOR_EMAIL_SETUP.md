# HostGator Email Setup for Notifications

Since you're using HostGator email (via Roundcube) for `imtechsavvy.org`, here's how to configure email notifications.

## Step 1: Get Your HostGator SMTP Settings

HostGator typically uses these SMTP settings:

### For Shared Hosting (Most Common):
- **SMTP Host**: `mail.imtechsavvy.org` or `gator1234.hostgator.com` (check your HostGator cPanel)
- **SMTP Port**: `587` (TLS) or `465` (SSL)
- **SMTP Username**: Your full email address (e.g., `yourname@imtechsavvy.org`)
- **SMTP Password**: Your email account password
- **Security**: TLS (port 587) or SSL (port 465)

### How to Find Your Exact Settings:

1. **Log into HostGator cPanel**
2. Go to **"Email Accounts"** section
3. Click on your email account (or create one if needed)
4. Look for **"Connect Devices"** or **"Mail Client Configuration"**
5. You'll see SMTP settings there

**OR**

1. In cPanel, go to **"Email Routing"**
2. Check your domain's mail server settings
3. Note the mail server hostname

## Step 2: Add to Your .env File

Add these lines to your `.env` file in the root directory:

```env
# HostGator SMTP Email Notifications
SMTP_HOST=mail.imtechsavvy.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@imtechsavvy.org
SMTP_PASS=your-email-password
ADMIN_EMAIL=your-email@imtechsavvy.org
APP_URL=http://localhost:5000
```

**Replace:**
- `mail.imtechsavvy.org` with your actual HostGator mail server (might be `gator####.hostgator.com`)
- `your-email@imtechsavvy.org` with your actual email address
- `your-email-password` with your email account password

## Step 3: Common HostGator SMTP Settings

### Option A: Port 587 (TLS - Recommended)
```env
SMTP_HOST=mail.imtechsavvy.org
SMTP_PORT=587
SMTP_SECURE=false
```

### Option B: Port 465 (SSL)
```env
SMTP_HOST=mail.imtechsavvy.org
SMTP_PORT=465
SMTP_SECURE=true
```

### Option C: If mail.imtechsavvy.org doesn't work
Try your server's hostname:
```env
SMTP_HOST=gator1234.hostgator.com
SMTP_PORT=587
SMTP_SECURE=false
```

(Replace `gator1234` with your actual server number from cPanel)

## Step 4: Test the Configuration

1. Add the SMTP settings to your `.env` file
2. Restart your server: `npm run dev`
3. Submit a test entry through the form
4. Check your email inbox (and spam folder)

## Step 5: For Production (imtechsavvy.org)

When you deploy, use the same SMTP settings but update:

```env
APP_URL=https://imtechsavvy.org
```

Set these as environment variables in your hosting platform (not in code files).

---

## Troubleshooting

### "Connection timeout" or "Connection refused"
- Try port `465` with `SMTP_SECURE=true`
- Try using the server hostname instead of `mail.imtechsavvy.org`
- Check if HostGator requires specific IP whitelisting

### "Authentication failed"
- Double-check your email address (must be full address: `name@imtechsavvy.org`)
- Verify your email password is correct
- Some HostGator accounts require the cPanel password, not email password

### "Relay access denied"
- Make sure you're using the correct SMTP host
- Some HostGator plans require authentication from specific IPs
- Contact HostGator support if issues persist

### Not receiving emails
- Check spam/junk folder
- Verify `ADMIN_EMAIL` matches your email address
- Check server logs for error messages
- Test sending from Roundcube first to verify email works

---

## Finding Your Exact Settings in HostGator cPanel

1. **Log into cPanel** (usually `imtechsavvy.org/cpanel` or provided by HostGator)
2. Scroll to **"Email"** section
3. Click **"Email Accounts"**
4. Find your email account
5. Click **"Connect Devices"** or **"Configure Mail Client"**
6. Look for **"Manual Settings"** or **"SMTP Settings"**
7. Copy the settings shown there

---

## Security Notes

- ✅ Email password stored in `.env` (not in git)
- ✅ Use environment variables in production
- ✅ Consider creating a dedicated email for notifications (e.g., `notifications@imtechsavvy.org`)
- ✅ Keep email password secure and rotate periodically

---

## Alternative: Use Gmail Instead

If HostGator SMTP gives you trouble, you can use Gmail instead:

1. Create a Gmail account (or use existing)
2. Generate Gmail App Password
3. Use Gmail SMTP settings (see `EMAIL_NOTIFICATIONS_SETUP.md`)

This is often easier and more reliable than shared hosting SMTP.

---

**Need Help?** If you can't find your SMTP settings, contact HostGator support and ask for:
- SMTP server hostname
- SMTP port (587 or 465)
- Whether to use SSL/TLS
- Any IP restrictions



