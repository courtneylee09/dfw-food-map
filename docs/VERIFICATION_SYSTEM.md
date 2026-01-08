# Location Verification System

This system helps maintain accurate food resource information by tracking verification status and allowing users to report closed locations.

## Overview

The verification system includes:
1. **User Reporting** - Community members can report closed locations
2. **Verification Tracking** - Database tracks when locations were last verified
3. **Admin Review** - Web interface to review and manage flagged locations
4. **Weekly Reports** - Automated script to identify locations needing verification

## Database Schema

### Food Resources Table (Enhanced)
```sql
- lastVerifiedDate: timestamp (when location was last confirmed active)
- verificationSource: varchar (how it was verified: 'initial', 'manual', 'google_api', 'user_report')
- reportedClosed: boolean (flagged by users as potentially closed)
- reportedClosedCount: varchar (number of closure reports received)
- reportedClosedAt: timestamp (when first closure report was received)
```

### User Reports Table (New)
```sql
- id: varchar (primary key)
- resourceId: varchar (links to food_resources)
- reportType: varchar ('closed', 'incorrect_info', 'other')
- reportDetails: text (optional description)
- reportedAt: timestamp (when report was submitted)
- userIp: varchar (for preventing spam)
```

## User Features

### Reporting a Closed Location

Users can report locations via the "Report Issue" button on each location's detail page:

1. Click on a location in the map or list
2. Scroll to the bottom of the detail page
3. Click "Report Issue"
4. Confirm the report

When a location is reported:
- A report is logged in the `user_reports` table
- The location's `reportedClosed` flag is set to `true`
- The `reportedClosedCount` is incremented
- Admins are notified to review

## Admin Features

### Review Flagged Locations

Access the admin review page at `/verification-review` to:
- See all locations reported as closed
- View number of reports per location
- See when location was last verified
- Take action on each location

**Actions available:**
- **Mark Verified** - Location is still active, reset flags
- **Remove** - Location confirmed closed, remove from map

### Weekly Verification Script

Run the verification script to identify locations needing review:

```bash
# Basic run (60-day threshold)
npm run verify:weekly

# Custom threshold (90 days)
npx tsx scripts/weekly-verification.ts --days=90

# Export to CSV
npm run verify:csv
```

**The script reports:**
- Total resources in database
- Number needing verification
- Number reported closed
- Detailed list with days since last verification
- Prioritized by urgency (reported closed first)

## API Endpoints

### Report a Location
```
POST /api/resources/:id/report
Body: {
  "reportType": "closed",
  "reportDetails": "optional description"
}
```

### Get Flagged Resources
```
GET /api/resources/flagged
```

### Get Resources Needing Verification
```
GET /api/resources/needs-verification?days=60
```

### Mark Resource as Verified
```
POST /api/resources/:id/verify
Body: { "source": "manual_review" }
```

### Remove Resource
```
DELETE /api/resources/:id
```

## Automation Options

### 1. Set Up Weekly Cron Job

On Linux/Mac, add to crontab:
```bash
# Run every Monday at 9 AM
0 9 * * 1 cd /path/to/project && npm run verify:weekly
```

On Windows Task Scheduler:
```powershell
# Create a scheduled task
$action = New-ScheduledTaskAction -Execute "npm" -Argument "run verify:weekly" -WorkingDirectory "C:\path\to\project"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 9am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "FoodMapVerification"
```

### 2. GitHub Actions (CI/CD)

Create `.github/workflows/weekly-verification.yml`:
```yaml
name: Weekly Verification
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM
  workflow_dispatch:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run verify:csv
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      - uses: actions/upload-artifact@v3
        with:
          name: verification-report
          path: verification-report-*.csv
```

### 3. Email Notifications (Optional)

Modify `weekly-verification.ts` to send email reports:

```typescript
import { notificationService } from '../server/notifications';

// After generating report
if (report.needsVerification > 0) {
  await notificationService.sendVerificationReport(report);
}
```

## Best Practices

### Verification Frequency
- **High-traffic locations**: Verify every 30 days
- **Standard locations**: Verify every 60 days
- **Reported closed**: Verify immediately

### Handling Reports
1. Review reports within 48 hours
2. Call location to verify status
3. If confirmed closed, remove promptly
4. If still active, mark as verified
5. Consider adding verification notes

### Data Quality
- Keep verification sources documented
- Track verification history
- Monitor false reports (check IP patterns)
- Regularly review old unverified locations

## Workflow Example

**Weekly Admin Workflow:**

1. **Monday Morning** - Run verification script
   ```bash
   npm run verify:csv
   ```

2. **Review CSV Report** - Identify priority locations
   - Locations reported closed (urgent)
   - Locations >90 days old (high priority)
   - Locations >60 days old (normal priority)

3. **Visit Admin Page** - Process flagged locations
   ```
   Navigate to: /verification-review
   ```

4. **Verify Locations** - Call or visit locations
   - Mark verified if active
   - Remove if confirmed closed

5. **Track Progress** - Monitor metrics
   - Aim for <5% unverified locations
   - Target <24hr response to reports

## Upgrading to Automated Verification

For future automation with Google Places API:

1. Get Google Places API key
2. Add to environment variables
3. Create automated verification script:

```typescript
// scripts/auto-verify-google.ts
import { storage } from '../server/storage';
import { Client } from "@googlemaps/google-maps-services-js";

const client = new Client({});

async function verifyWithGoogle(placeId: string) {
  const response = await client.placeDetails({
    params: {
      place_id: placeId,
      fields: ['business_status', 'opening_hours'],
      key: process.env.GOOGLE_MAPS_API_KEY!,
    },
  });
  
  return response.data.result.business_status === 'OPERATIONAL';
}
```

**Cost estimate:** ~$17 per 1,000 locations verified monthly

## Troubleshooting

**Issue: Reports not saving**
- Check DATABASE_URL is configured
- Verify tables exist (`npm run db:push`)
- Check browser console for errors

**Issue: Script shows 0 resources**
- Ensure DATABASE_URL is set
- Check database connection
- Verify resources exist in database

**Issue: Admin page not loading**
- Add route to App.tsx
- Check API endpoints are responding
- Verify authentication if implemented

## Support

For questions or issues:
1. Check this documentation
2. Review API endpoints in `server/routes.ts`
3. Examine database schema in `shared/schema.ts`
4. Open an issue on GitHub
