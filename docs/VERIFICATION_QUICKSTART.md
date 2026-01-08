# Quick Setup Guide - Verification System

This guide will help you set up the automated location verification system in 5 minutes.

## Step 1: Update Database Schema

Push the new schema changes to your database:

```bash
npm run db:push
```

This adds the verification tracking fields to your database.

## Step 2: Test User Reporting

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open the app in your browser (usually `http://localhost:5000`)

3. Click on any food location

4. Scroll to the bottom and click "Report Issue"

5. Confirm the report

✅ **Expected result:** You should see a success toast message.

## Step 3: Access Admin Review Page

The admin review page needs to be added to your routing. 

**Option A: Add directly to your URL bar:**
```
http://localhost:5000/verification-review
```

**Option B: Add route to App.tsx (recommended):**

Add this import at the top of `client/src/App.tsx`:
```typescript
import VerificationReview from '@/pages/VerificationReview';
```

Add this route in your router configuration:
```tsx
<Route path="/verification-review" element={<VerificationReview />} />
```

## Step 4: Run Weekly Verification Script

Test the verification script:

```bash
npm run verify:weekly
```

You should see a report showing:
- Total resources
- Number needing verification
- Detailed list of locations

## Step 5: Set Up Weekly Automation (Optional)

### On Windows (Task Scheduler):

Open PowerShell as Administrator:

```powershell
# Navigate to your project
cd "C:\Users\Courtney Hamilton\Downloads\DFW-Food-Map\DFW-Food-Map"

# Create scheduled task
$action = New-ScheduledTaskAction -Execute "npm" -Argument "run verify:weekly" -WorkingDirectory $PWD
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 9am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "FoodMapVerification" -Description "Weekly verification check for DFW Food Map"
```

### On Linux/Mac (Crontab):

```bash
crontab -e
```

Add this line:
```
0 9 * * 1 cd /path/to/DFW-Food-Map && npm run verify:weekly
```

## Verification Workflow

**Every week:**

1. **Run the script** (automatically via cron or manually):
   ```bash
   npm run verify:weekly
   ```

2. **Review the report** - Check which locations need verification

3. **Open admin page** - Visit `/verification-review`

4. **Take action on flagged locations:**
   - Call the location to verify they're still operating
   - If active: Click "Still Active - Mark Verified"
   - If closed: Click "Confirmed Closed - Remove"

## Testing the System

**Test the complete workflow:**

1. Report a location as closed (from the app)
2. Run verification script: `npm run verify:weekly`
3. Check that location appears in report
4. Visit `/verification-review` page
5. Click "Mark Verified" to clear the flag
6. Run script again - location should not appear

## Troubleshooting

**"Database not configured" error:**
- Make sure `DATABASE_URL` is set in your `.env` file
- Restart your dev server after adding it

**Script shows 0 resources:**
- Check that you have data in your database
- Run `npx tsx scripts/check-db.ts` to verify

**Report button doesn't work:**
- Check browser console for errors
- Make sure backend is running
- Verify API endpoints are accessible

**Admin page shows blank:**
- Check that route is added to App.tsx
- Verify `/api/resources/flagged` endpoint works
- Check browser console for errors

## What's Included

✅ User reporting system (Report Issue button)  
✅ Database tracking (verification dates, report counts)  
✅ Admin review interface (mark verified or remove)  
✅ Weekly verification script (identify stale data)  
✅ API endpoints for all operations  
✅ Comprehensive documentation  

## Next Steps

1. **Monitor regularly** - Check admin page weekly
2. **Respond to reports** - Handle user reports within 48 hours
3. **Keep data fresh** - Aim to verify all locations every 60 days
4. **Consider automation** - Add Google Places API for automated checks

## Need Help?

- Read full documentation: `docs/VERIFICATION_SYSTEM.md`
- Check scripts documentation: `scripts/README.md`
- Review API in: `server/routes.ts`
- Database schema: `shared/schema.ts`
