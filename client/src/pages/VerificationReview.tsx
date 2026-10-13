import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle, XCircle, MapPin, Clock, AlertTriangle, Lock, EyeOff, ExternalLink } from 'lucide-react';
import type { FieldConfirmation, FoodResource, VerificationCheck } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

const PASSWORD_KEY = 'adminPassword';

function loadPassword(): string {
  try {
    return sessionStorage.getItem(PASSWORD_KEY) || '';
  } catch {
    return '';
  }
}

function savePassword(value: string) {
  try {
    if (value) sessionStorage.setItem(PASSWORD_KEY, value);
    else sessionStorage.removeItem(PASSWORD_KEY);
  } catch {
    // Storage unavailable; password lasts only for this page view
  }
}

class UnauthorizedError extends Error {}

interface ReviewItem {
  check: VerificationCheck;
  resource: FoodResource;
  confirmations: FieldConfirmation[];
}

interface Evidence {
  url: string;
  source_type: string;
  finding: string;
  quote?: string | null;
  observed_date: string | null;
}

interface Conflict {
  field: string;
  confirmedValue: string | null;
  confirmedAt: string;
  source: string;
  proposed: unknown;
}

type ConfirmedVia = 'evidence' | 'admin_call' | 'site_visit' | 'org_contact';

const STATUS_LABELS: Record<string, { label: string; tone: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Still active', tone: 'default' },
  active_with_changes: { label: 'Active — details changed', tone: 'secondary' },
  temporarily_closed: { label: 'Temporarily closed', tone: 'destructive' },
  likely_closed: { label: 'Likely closed', tone: 'destructive' },
  not_food_program: { label: 'Not a food program', tone: 'destructive' },
  unverifiable: { label: "Couldn't confirm — needs a call", tone: 'outline' },
};

const FIELD_LABELS: Record<string, string> = {
  hours: 'Hours',
  phone: 'Phone',
  address: 'Address',
  website: 'Website',
  appointment_required: 'Appointment required',
  notes: 'Note for visitors',
  status: 'Status',
};

const CONFIRMED_VIA_LABELS: Record<ConfirmedVia, string> = {
  evidence: 'Reviewed the evidence',
  admin_call: 'I called them',
  site_visit: 'I visited',
  org_contact: 'The organization told us',
};

function currentValue(resource: FoodResource, field: string): unknown {
  if (field === 'appointment_required') return resource.appointmentRequired ?? false;
  return (resource as unknown as Record<string, unknown>)[field] ?? null;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '(none)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export default function VerificationReview() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState(loadPassword);
  const [passwordInput, setPasswordInput] = useState('');

  const adminFetch = async (url: string, init: RequestInit = {}) => {
    const response = await fetch(url, {
      ...init,
      headers: { ...init.headers, 'X-Admin-Password': password },
    });
    if (response.status === 401) {
      savePassword('');
      setPassword('');
      throw new UnauthorizedError('Invalid admin password');
    }
    return response;
  };

  const queueQuery = useQuery<ReviewItem[]>({
    queryKey: ['admin-checks', 'pending', password],
    enabled: !!password,
    queryFn: async () => {
      const response = await adminFetch('/api/admin/checks');
      if (!response.ok) throw new Error('Failed to fetch review queue');
      return response.json();
    },
  });

  const autoQuery = useQuery<ReviewItem[]>({
    queryKey: ['admin-checks', 'auto', password],
    enabled: !!password,
    queryFn: async () => {
      const response = await adminFetch('/api/admin/checks?view=auto');
      if (!response.ok) throw new Error('Failed to fetch automatic changes');
      return response.json();
    },
  });

  const unconfirmedQuery = useQuery<ReviewItem[]>({
    queryKey: ['admin-checks', 'unconfirmed', password],
    enabled: !!password,
    queryFn: async () => {
      const response = await adminFetch('/api/admin/checks?view=unconfirmed');
      if (!response.ok) throw new Error('Failed to fetch call list');
      return response.json();
    },
  });

  const undoMutation = useMutation({
    mutationFn: async (checkId: string) => {
      const response = await adminFetch(`/api/admin/checks/${checkId}/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to undo');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-checks'] });
      toast({ title: 'Undone', description: 'The listing is back to how it was. The agent won’t re-apply this change.' });
    },
    onError: (error: Error) => {
      if (error instanceof UnauthorizedError) return;
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const flaggedQuery = useQuery<FoodResource[]>({
    queryKey: ['flagged-resources', password],
    enabled: !!password,
    queryFn: async () => {
      const response = await adminFetch('/api/resources/flagged');
      if (!response.ok) throw new Error('Failed to fetch flagged resources');
      return response.json();
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (input: {
      checkId: string;
      action: 'verify' | 'apply' | 'hide' | 'dismiss';
      changes?: Record<string, unknown>;
      confirmedVia: ConfirmedVia;
      note?: string;
    }) => {
      const { checkId, ...body } = input;
      const response = await adminFetch(`/api/admin/checks/${checkId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to save');
      return input.action;
    },
    onSuccess: (action) => {
      queryClient.invalidateQueries({ queryKey: ['admin-checks'] });
      queryClient.invalidateQueries({ queryKey: ['flagged-resources'] });
      const messages = {
        verify: 'Marked as verified.',
        apply: 'Changes applied and marked as verified.',
        hide: 'Hidden from the map.',
        dismiss: 'Dismissed.',
      };
      toast({ title: 'Saved', description: messages[action] });
    },
    onError: (error: Error) => {
      if (error instanceof UnauthorizedError) return;
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const verifyFlaggedMutation = useMutation({
    mutationFn: async (resourceId: string) => {
      const response = await adminFetch(`/api/resources/${resourceId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'manual_review' }),
      });
      if (!response.ok) throw new Error('Failed to verify resource');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flagged-resources'] });
      toast({ title: 'Resource verified', description: 'This location has been marked as verified and active.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to verify resource. Please try again.', variant: 'destructive' });
    },
  });

  if (!password) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Location Verification Review</h1>
        <Card className="p-6 max-w-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const value = passwordInput.trim();
              if (!value) return;
              savePassword(value);
              setPassword(value);
              setPasswordInput('');
            }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <p className="font-semibold">Admin password required</p>
            </div>
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="Admin password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoFocus
            />
            <Button type="submit" className="w-full">
              Continue
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  const queue = queueQuery.data ?? [];
  const checkedIds = new Set(queue.map((item) => item.resource.id));
  // Visitor reports the agent hasn't picked up yet
  const uncheckedReports = (flaggedQuery.data ?? []).filter((r) => !checkedIds.has(r.id));

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Location Verification Review</h1>
        <p className="text-muted-foreground">
          The verification agent checks listings against public sources. Anything it can't confirm with confidence lands here for you to decide.
        </p>
      </div>

      <Tabs defaultValue="queue">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="queue">Needs review ({queue.length})</TabsTrigger>
          <TabsTrigger value="reports">Visitor reports ({uncheckedReports.length})</TabsTrigger>
          <TabsTrigger value="unconfirmed">Call list ({unconfirmedQuery.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="auto">Automatic changes ({autoQuery.data?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          {queueQuery.isLoading ? (
            <p>Loading...</p>
          ) : queue.length === 0 ? (
            <AllClear text="Nothing waiting for review." />
          ) : (
            queue.map((item) => (
              <ReviewCard
                key={item.check.id}
                item={item}
                busy={resolveMutation.isPending}
                onResolve={(input) => resolveMutation.mutate({ checkId: item.check.id, ...input })}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Visitors reported these as closed. The agent checks reports within a day; you can also confirm one yourself.
          </p>
          {uncheckedReports.length === 0 ? (
            <AllClear text="No unchecked visitor reports." />
          ) : (
            uncheckedReports.map((resource) => (
              <Card key={resource.id} className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-lg font-bold">{resource.name}</h2>
                  <Badge variant="destructive">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {resource.reportedClosedCount || 1} report(s)
                  </Badge>
                </div>
                <p className="text-sm flex items-start gap-2 mb-1">
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" /> {resource.address}
                </p>
                {resource.hours && (
                  <p className="text-sm flex items-start gap-2 mb-4">
                    <Clock className="w-4 h-4 mt-0.5 text-muted-foreground" /> {resource.hours}
                  </p>
                )}
                <Button
                  onClick={() => verifyFlaggedMutation.mutate(resource.id)}
                  disabled={verifyFlaggedMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  I confirmed it's still active
                </Button>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="auto" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Changes the agent made on its own. Each one passed two checks: the quoted text was found on the source page,
            and a second, independent review agreed. Spot-check a few, and use Undo if something is wrong.
          </p>
          {(autoQuery.data ?? []).length === 0 ? (
            <AllClear text="No automatic changes yet." />
          ) : (
            (autoQuery.data ?? []).map(({ check, resource }) => (
              <AutoChangeCard
                key={check.id}
                check={check}
                resource={resource}
                busy={undoMutation.isPending}
                onUndo={() => undoMutation.mutate(check.id)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="unconfirmed" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The agent couldn't confirm these from public sources. They stay on the map with a "Not recently confirmed —
            call ahead" label. This is the call list: once you've confirmed one by phone, it moves out of here.
          </p>
          {(unconfirmedQuery.data ?? []).length === 0 ? (
            <AllClear text="Nothing unconfirmed." />
          ) : (
            (unconfirmedQuery.data ?? []).map((item) => (
              <ReviewCard
                key={item.check.id}
                item={item}
                busy={resolveMutation.isPending}
                onResolve={(input) => resolveMutation.mutate({ checkId: item.check.id, ...input })}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const AUTO_LABELS: Record<string, { label: string; tone: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  auto_verified: { label: 'Verified', tone: 'default' },
  auto_applied: { label: 'Updated', tone: 'secondary' },
  auto_hidden: { label: 'Hidden from map', tone: 'destructive' },
  pending: { label: 'Partly updated — rest in review', tone: 'outline' },
};

const HIDDEN_FIELDS_IN_DIFF = new Set(['latitude', 'longitude', 'hidden', 'hidden_reason']);

function AutoChangeCard({
  check,
  resource,
  busy,
  onUndo,
}: {
  check: VerificationCheck;
  resource: FoodResource;
  busy: boolean;
  onUndo: () => void;
}) {
  const applied = (check.appliedChanges as Record<string, { before: unknown; after: unknown }> | null) ?? {};
  const label = AUTO_LABELS[check.resolution] ?? { label: check.resolution, tone: 'outline' as const };
  const diffs = Object.entries(applied).filter(([field]) => !HIDDEN_FIELDS_IN_DIFF.has(field));
  const hiddenReason = applied.hidden_reason?.after as string | undefined;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <h2 className="font-bold">{resource.name}</h2>
        <Badge variant={label.tone}>{label.label}</Badge>
        <span className="text-xs text-muted-foreground">
          {check.checkedAt ? new Date(check.checkedAt).toLocaleDateString() : ''}
        </span>
      </div>
      <p className="text-sm mb-2">{check.summary}</p>
      {hiddenReason && <p className="text-sm mb-2 font-medium">{hiddenReason}</p>}
      {diffs.length > 0 && (
        <div className="text-sm space-y-1 mb-3">
          {diffs.map(([field, change]) => (
            <p key={field}>
              <span className="font-medium">{FIELD_LABELS[field] ?? field}:</span>{' '}
              <span className="text-muted-foreground line-through">{formatValue(change.before)}</span> →{' '}
              <span>{formatValue(change.after)}</span>
            </p>
          ))}
        </div>
      )}
      <details className="mb-3">
        <summary className="cursor-pointer text-sm font-semibold">Evidence</summary>
        <div className="mt-2">
          <EvidenceList evidence={(check.evidence as Evidence[] | null) ?? []} />
        </div>
      </details>
      {Object.keys(applied).length > 0 && (
        <Button variant="outline" size="sm" disabled={busy} onClick={onUndo}>
          Undo
        </Button>
      )}
    </Card>
  );
}

function AllClear({ text }: { text: string }) {
  return (
    <Card className="p-8 text-center">
      <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
      <h2 className="text-xl font-semibold mb-2">All clear</h2>
      <p className="text-muted-foreground">{text}</p>
    </Card>
  );
}

function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  if (evidence.length === 0) return null;
  return (
    <ul className="space-y-2 text-sm">
      {evidence.map((e, i) => (
        <li key={i} className="border-l-2 pl-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {e.source_type.replace(/_/g, ' ')}
            </Badge>
            {e.observed_date && <span className="text-xs text-muted-foreground">dated {e.observed_date}</span>}
            <a
              href={e.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline inline-flex items-center gap-1 break-all"
            >
              source <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="mt-1">{e.finding}</p>
          {e.quote && <blockquote className="mt-1 italic text-muted-foreground">“{e.quote}”</blockquote>}
        </li>
      ))}
    </ul>
  );
}

function ReviewCard({
  item,
  busy,
  onResolve,
}: {
  item: ReviewItem;
  busy: boolean;
  onResolve: (input: {
    action: 'verify' | 'apply' | 'hide' | 'dismiss';
    changes?: Record<string, unknown>;
    confirmedVia: ConfirmedVia;
    note?: string;
  }) => void;
}) {
  const { check, resource } = item;
  const proposed = (check.proposedChanges as Record<string, unknown> | null) ?? {};
  const conflicts = (check.conflicts as Conflict[] | null) ?? [];
  const evidence = (check.evidence as Evidence[] | null) ?? [];
  const status = STATUS_LABELS[check.status ?? ''] ?? { label: check.status ?? 'Error', tone: 'outline' as const };

  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(Object.keys(proposed).map((field) => [field, true])),
  );
  const [edited, setEdited] = useState<Record<string, unknown>>(proposed);
  const [confirmedVia, setConfirmedVia] = useState<ConfirmedVia>('evidence');
  const [note, setNote] = useState('');

  const selectedChanges = Object.fromEntries(
    Object.entries(edited).filter(([field]) => selected[field]),
  );
  const hasChanges = Object.keys(selectedChanges).length > 0;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <h2 className="text-xl font-bold">{resource.name}</h2>
        <Badge variant={status.tone}>{status.label}</Badge>
        {check.confidence && <Badge variant="outline">confidence: {check.confidence}</Badge>}
        {resource.reportedClosed && (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            reported closed
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        {resource.type} · {resource.address} · checked {check.checkedAt ? new Date(check.checkedAt).toLocaleDateString() : ''}
      </p>

      <p className="mb-4">{check.summary ?? check.error}</p>

      {conflicts.length > 0 && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="font-semibold mb-1">Conflicts with your manual entry</p>
          {conflicts.map((c, i) => (
            <p key={i}>
              {FIELD_LABELS[c.field] ?? c.field}: you confirmed <strong>{formatValue(c.confirmedValue)}</strong> on{' '}
              {new Date(c.confirmedAt).toLocaleDateString()} ({c.source === 'admin_undo' ? 'you undid an automatic change' : CONFIRMED_VIA_LABELS[c.source as ConfirmedVia] ?? c.source}); the agent found{' '}
              <strong>{formatValue(c.proposed)}</strong>.
            </p>
          ))}
        </div>
      )}

      {Object.keys(proposed).length > 0 && (
        <div className="mb-4">
          <p className="font-semibold mb-2">Proposed changes</p>
          <div className="space-y-3">
            {Object.keys(proposed).map((field) => (
              <div key={field} className="grid grid-cols-[auto_1fr] gap-3 items-start">
                <Checkbox
                  checked={!!selected[field]}
                  onCheckedChange={(checked) => setSelected((s) => ({ ...s, [field]: !!checked }))}
                  aria-label={`Apply ${FIELD_LABELS[field] ?? field}`}
                  className="mt-1"
                />
                <div className="text-sm space-y-1">
                  <p className="font-medium">{FIELD_LABELS[field] ?? field}</p>
                  <p className="text-muted-foreground line-through">{formatValue(currentValue(resource, field))}</p>
                  {field === 'appointment_required' ? (
                    <p>{formatValue(edited[field])}</p>
                  ) : (
                    <Input
                      value={String(edited[field] ?? '')}
                      onChange={(e) => setEdited((v) => ({ ...v, [field]: e.target.value }))}
                      disabled={!selected[field]}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <details className="mb-4">
        <summary className="cursor-pointer font-semibold">Evidence ({evidence.length})</summary>
        <div className="mt-3">
          <EvidenceList evidence={evidence} />
        </div>
      </details>

      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <div>
          <p className="text-sm font-medium mb-1">How did you confirm?</p>
          <Select value={confirmedVia} onValueChange={(v) => setConfirmedVia(v as ConfirmedVia)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CONFIRMED_VIA_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {confirmedVia !== 'evidence' && (
            <p className="text-xs text-muted-foreground mt-1">
              Saved as a primary source: the agent won't override it for 6 months.
            </p>
          )}
        </div>
        <div>
          <p className="text-sm font-medium mb-1">Note (optional)</p>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Spoke with Pastor J., 10/14" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {hasChanges && (
          <Button
            disabled={busy}
            onClick={() => onResolve({ action: 'apply', changes: selectedChanges, confirmedVia, note })}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Apply selected changes
          </Button>
        )}
        <Button
          variant={hasChanges ? 'outline' : 'default'}
          disabled={busy}
          onClick={() => onResolve({ action: 'verify', confirmedVia, note })}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Still active — no changes
        </Button>
        <Button
          variant="destructive"
          disabled={busy}
          onClick={() => {
            if (confirm(`Hide "${resource.name}" from the map? You can restore it later from the database.`)) {
              onResolve({ action: 'hide', confirmedVia, note });
            }
          }}
        >
          <EyeOff className="w-4 h-4 mr-2" />
          Hide from map
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => onResolve({ action: 'dismiss', confirmedVia, note })}>
          <XCircle className="w-4 h-4 mr-2" />
          Dismiss
        </Button>
      </div>
    </Card>
  );
}
