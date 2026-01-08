# 📋 Verification System - Quick Reference Card

## Essential Commands

```bash
# Update database schema (run this first!)
npm run db:push

# Run weekly verification check
npm run verify:weekly

# Export verification report to CSV
npm run verify:csv

# Start development server
npm run dev
```

## Key URLs

- **Main App**: `http://localhost:5000`
- **Submit Resource**: `http://localhost:5000/submit`
- **Admin Review**: `http://localhost:5000/verification-review` ⭐

## User Workflow

1. User visits food location
2. Finds it's closed
3. Opens location in app
4. Clicks **"Report Issue"** button
5. Confirms report
6. ✅ Done!

## Admin Workflow (Weekly)

1. Run verification script:
   ```bash
   npm run verify:weekly
   ```

2. Review report output

3. Visit admin page:
   ```
   http://localhost:5000/verification-review
   ```

4. For each flagged location:
   - Call or visit to verify status
   - Click **"Still Active - Mark Verified"** (if open)
   - Click **"Confirmed Closed - Remove"** (if closed)

## Files to Know

### Code
- `shared/schema.ts` - Database tables
- `server/routes.ts` - API endpoints
- `server/storage.ts` - Database operations
- `client/src/components/ResourceDetail.tsx` - Report button
- `client/src/pages/VerificationReview.tsx` - Admin page
- `scripts/weekly-verification.ts` - Verification script

### Documentation
- `VERIFICATION_IMPLEMENTATION.md` - What was built
- `docs/VERIFICATION_QUICKSTART.md` - 5-minute setup
- `docs/VERIFICATION_SYSTEM.md` - Complete documentation
- `scripts/README.md` - Script details

## API Endpoints

```
POST   /api/resources/:id/report       Submit user report
GET    /api/resources/flagged          Get flagged locations
GET    /api/resources/needs-verification?days=60
POST   /api/resources/:id/verify       Mark as verified
DELETE /api/resources/:id              Remove location
```

## Database Fields (foodResources)

```typescript
lastVerifiedDate: timestamp      // When last verified
verificationSource: varchar      // How verified (manual, api, etc)
reportedClosed: boolean         // User reported as closed
reportedClosedCount: varchar    // Number of reports
reportedClosedAt: timestamp     // First report date
```

## Automation Setup

### Windows (PowerShell as Admin)
```powershell
cd "C:\path\to\DFW-Food-Map"
$action = New-ScheduledTaskAction -Execute "npm" -Argument "run verify:weekly" -WorkingDirectory $PWD
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 9am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "FoodMapVerification"
```

### Linux/Mac (Crontab)
```bash
0 9 * * 1 cd /path/to/project && npm run verify:weekly
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Database not configured | Set `DATABASE_URL` in `.env` |
| Script shows 0 resources | Check database has data |
| Report button doesn't work | Check backend is running |
| Admin page blank | Add route to `App.tsx` |
| TypeScript errors | Run `npm run check` |

## Key Metrics to Monitor

- **Total Resources**: Number of locations in database
- **Needs Verification**: Locations >60 days old
- **Reported Closed**: User-flagged locations
- **Verification Rate**: % verified in last 60 days

**Target**: >95% verified within 60 days

## Best Practices

✅ Run verification weekly  
✅ Respond to reports within 48 hours  
✅ Call locations before removing  
✅ Document verification source  
✅ Export CSV for record keeping  
✅ Monitor false report patterns  

## Quick Win Checklist

- [ ] Run `npm run db:push` to update schema
- [ ] Test report button on a location
- [ ] Visit `/verification-review` page
- [ ] Run `npm run verify:weekly`
- [ ] Set up weekly automation
- [ ] Share admin URL with team

## Need Help?

1. Check `docs/VERIFICATION_QUICKSTART.md`
2. Review `docs/VERIFICATION_SYSTEM.md`
3. Examine code in `server/routes.ts`
4. Check database schema in `shared/schema.ts`

---

**Remember**: This system helps prevent hungry families from traveling to closed locations. Your weekly reviews make a real difference! 🌟
