# Email Notifications Setup

Get notified via email whenever someone submits a new food resource!

## Option 1: Gmail (Easiest - Recommended)

### Step 1: Generate Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Click **Security** (left sidebar)
3. Under "How you sign in to Google", click **2-Step Verification** (enable it if not already)
4. Scroll down and click **App passwords**
5. Select app: **Mail**
6. Select device: **Other (Custom name)**
7. Enter name: **DFW Food Map**
8. Click **Generate**
9. **Copy the 16-character password** (you'll need this!)

### Step 2: Add to .env File

Add these lines to your `.env` file:

```env
# Gmail Email Notifications
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
ADMIN_EMAIL=your-email@gmail.com
```

**Important:**
- Use your actual Gmail address for `GMAIL_USER` and `ADMIN_EMAIL`
- Use the 16-character app password (not your regular Gmail password)
- Never commit the `.env` file to git

### Step 3: Restart Server

```bash
npm run dev
```

That's it! You'll now receive emails when submissions come in.

---

## Option 2: Custom SMTP (For Other Email Providers)

If you use a different email provider (Outlook, Yahoo, custom domain, etc.):

### Add to .env File

```env
# Custom SMTP Email Notifications
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-email-password
ADMIN_EMAIL=your-email@yourdomain.com
```

### Common SMTP Settings

**Outlook/Hotmail:**
- Host: `smtp-mail.outlook.com`
- Port: `587`
- Secure: `false`

**Yahoo:**
- Host: `smtp.mail.yahoo.com`
- Port: `587`
- Secure: `false`

**Custom Domain (e.g., imtechsavvy.org):**
- Check with your email provider for SMTP settings
- Usually: `smtp.yourdomain.com` or `mail.yourdomain.com`

---

## Testing

1. Submit a test entry through the form
2. Check your email inbox
3. You should receive a notification email with submission details

## Viewing Submissions

### Option A: Check via Script

```bash
npx tsx scripts/check-submissions.ts
```

This shows all submissions in your terminal.

### Option B: API Endpoint

Visit: `http://localhost:5000/api/submissions`

Returns JSON with all submissions.

### Option C: Database Query

You can also query the database directly using any PostgreSQL client.

---

## Troubleshooting

### "Email notifications not configured"
- Make sure `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set in `.env`
- Restart the server after adding credentials

### "Failed to send email notification"
- Check that your Gmail app password is correct
- Make sure 2-Step Verification is enabled
- Verify the email addresses are correct

### Not receiving emails
- Check spam/junk folder
- Verify the `ADMIN_EMAIL` matches your email
- Check server logs for error messages
- Test with a different email address

---

## Security Notes

- **Never commit `.env` file** to git (already in `.gitignore`)
- **App passwords** are safer than regular passwords
- **SMTP credentials** should be kept secure
- Consider using environment variables in production

---

## Production Deployment

When deploying to `imtechsavvy.org`, make sure to:
1. Set environment variables in your hosting platform
2. Use the same email configuration
3. Update `APP_URL` in `.env` to your domain

Example:
```env
APP_URL=https://imtechsavvy.org
```

This ensures email links point to your production site.



