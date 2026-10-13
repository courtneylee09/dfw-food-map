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

const SESSION_KEY = 'reviewSession';

interface Session {
  token: string;
  role: 'admin' | 'verifier';
  name: string;
}

function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function saveSession(session: Session | null) {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage unavailable; the sign-in lasts only for this page view
  }
}

class UnauthorizedError extends Error {}

type AdminFetch = (url: string, init?: RequestInit) => Promise<Response>;

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
  const [session, setSession] = useState<Session | null>(loadSession);

  const signIn = (next: Session) => {
    saveSession(next);
    setSession(next);
  };

  const signOut = async () => {
    if (session) {
      await fetch('/api/auth/logout', { method: 'POST', headers: { 'X-Session-Token': session.token } }).catch(() => {});
    }
    saveSession(null);
    setSession(null);
    queryClient.removeQueries({ queryKey: ['admin-checks'] });
  };

  const adminFetch: AdminFetch = async (url, init = {}) => {
    const response = await fetch(url, {
      ...init,
      headers: { ...init.headers, 'X-Session-Token': session?.token ?? '' },
    });
    if (response.status === 401) {
      saveSession(null);
      setSession(null);
      throw new UnauthorizedError('Please sign in again');
    }
    return response;
  };

  const queueQuery = useQuery<ReviewItem[]>({
    queryKey: ['admin-checks', 'pending', session?.token],
    enabled: !!session,
    queryFn: async () => {
      const response = await adminFetch('/api/admin/checks');
      if (!response.ok) throw new Error('Failed to fetch review queue');
      return response.json();
    },
  });

  const autoQuery = useQuery<ReviewItem[]>({
    queryKey: ['admin-checks', 'auto', session?.token],
    enabled: !!session,
    queryFn: async () => {
      const response = await adminFetch('/api/admin/checks?view=auto');
      if (!response.ok) throw new Error('Failed to fetch automatic changes');
      return response.json();
    },
  });

  const unconfirmedQuery = useQuery<ReviewItem[]>({
    queryKey: ['admin-checks', 'unconfirmed', session?.token],
    enabled: !!session,
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
    queryKey: ['flagged-resources', session?.token],
    enabled: !!session,
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

  if (!session) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Location Verification Review</h1>
        <LoginPanel onSignedIn={signIn} />
      </div>
    );
  }

  const isAdmin = session.role === 'admin';

  const queue = queueQuery.data ?? [];
  const checkedIds = new Set(queue.map((item) => item.resource.id));
  // Visitor reports the agent hasn't picked up yet
  const uncheckedReports = (flaggedQuery.data ?? []).filter((r) => !checkedIds.has(r.id));

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h1 className="text-3xl font-bold">Location Verification Review</h1>
          <div className="flex items-center gap-3 text-sm">
            <span data-testid="text-signed-in">
              Signed in as <strong>{session.name}</strong> ({isAdmin ? 'admin' : 'verifier'})
            </span>
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          The verification agent checks listings against public sources. Anything it can't confirm with confidence lands here for you to decide. Everything you do here is recorded under your name.
        </p>
      </div>

      <Tabs defaultValue="queue">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="queue">Needs review ({queue.length})</TabsTrigger>
          <TabsTrigger value="reports">Visitor reports ({uncheckedReports.length})</TabsTrigger>
          <TabsTrigger value="unconfirmed">Call list ({unconfirmedQuery.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="auto">Automatic changes ({autoQuery.data?.length ?? 0})</TabsTrigger>
          {isAdmin && <TabsTrigger value="volunteers">Volunteers</TabsTrigger>}
          {isAdmin && <TabsTrigger value="activity">Activity</TabsTrigger>}
        </TabsList>

        {isAdmin && (
          <TabsContent value="volunteers">
            <VolunteersPanel adminFetch={adminFetch} />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="activity">
            <ActivityPanel adminFetch={adminFetch} />
          </TabsContent>
        )}

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

function LoginPanel({ onSignedIn }: { onSignedIn: (session: Session) => void }) {
  const [role, setRole] = useState<'admin' | 'verifier' | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, username: role === 'verifier' ? username : undefined, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || 'Sign-in failed. Try again.');
        return;
      }
      onSignedIn({ token: data.token, role: data.role, name: data.name });
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
      setPassword('');
    }
  };

  if (!role) {
    return (
      <Card className="p-6 max-w-md space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <p className="font-semibold">How are you signing in?</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => setRole('admin')} data-testid="button-login-admin">
            <span className="font-semibold">Admin</span>
            <span className="text-xs text-muted-foreground">Password only</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => setRole('verifier')} data-testid="button-login-verifier">
            <span className="font-semibold">Verifier</span>
            <span className="text-xs text-muted-foreground">Username and password</span>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 max-w-md">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <p className="font-semibold">{role === 'admin' ? 'Admin sign-in' : 'Verifier sign-in'}</p>
        </div>
        {role === 'verifier' && (
          <div>
            <label htmlFor="login-username" className="text-sm font-medium">Username</label>
            <Input
              id="login-username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>
        )}
        <div>
          <label htmlFor="login-password" className="text-sm font-medium">Password</label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus={role === 'admin'}
          />
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => { setRole(null); setError(''); }}>
            Back
          </Button>
          <Button type="submit" className="flex-1" disabled={busy || !password || (role === 'verifier' && !username)}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

interface VolunteerAccount {
  id: string;
  username: string;
  displayName: string;
  active: boolean;
  createdAt: string | null;
  lastLoginAt: string | null;
}

function generatePassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function VolunteersPanel({ adminFetch }: { adminFetch: AdminFetch }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(generatePassword);
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  const volunteersQuery = useQuery<VolunteerAccount[]>({
    queryKey: ['admin-checks', 'verifiers'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/verifiers');
      if (!response.ok) throw new Error('Failed to load volunteers');
      return response.json();
    },
  });

  const save = useMutation({
    mutationFn: async (input: { method: 'POST' | 'PATCH'; url: string; body: unknown; done: string }) => {
      const response = await adminFetch(input.url, {
        method: input.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input.body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to save');
      return input.done;
    },
    onSuccess: (done) => {
      queryClient.invalidateQueries({ queryKey: ['admin-checks', 'verifiers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-checks', 'activity'] });
      toast({ title: 'Saved', description: done });
    },
    onError: (error: Error) => {
      if (error instanceof UnauthorizedError) return;
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="font-bold text-lg mb-1">Add a verifier</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Share the username and password with the volunteer privately, for example by text, never in a public post.
        </p>
        <form
          className="grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(
              {
                method: 'POST',
                url: '/api/admin/verifiers',
                body: { displayName, username, password },
                done: `${displayName} can now sign in as "${username.trim().toLowerCase()}".`,
              },
              {
                onSuccess: () => {
                  setDisplayName('');
                  setUsername('');
                  setPassword(generatePassword());
                },
              },
            );
          }}
        >
          <div>
            <label htmlFor="new-name" className="text-sm font-medium">Name</label>
            <Input id="new-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jordan R." />
          </div>
          <div>
            <label htmlFor="new-username" className="text-sm font-medium">Username</label>
            <Input id="new-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="jordan.r" autoComplete="off" />
          </div>
          <div>
            <label htmlFor="new-password" className="text-sm font-medium">Temporary password</label>
            <div className="flex gap-2">
              <Input id="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
              <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())}>
                New
              </Button>
            </div>
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={save.isPending || !displayName.trim() || !username.trim() || password.length < 10}>
              Add verifier
            </Button>
          </div>
        </form>
      </Card>

      {(volunteersQuery.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No verifiers yet.</p>
      ) : (
        (volunteersQuery.data ?? []).map((v) => (
          <Card key={v.id} className="p-4">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-bold">{v.displayName}</h3>
              <span className="text-sm text-muted-foreground">{v.username}</span>
              <Badge variant={v.active ? 'default' : 'outline'}>{v.active ? 'Active' : 'Deactivated'}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Last signed in: {v.lastLoginAt ? new Date(v.lastLoginAt).toLocaleString() : 'never'}
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                size="sm"
                variant="outline"
                disabled={save.isPending}
                onClick={() =>
                  save.mutate({
                    method: 'PATCH',
                    url: `/api/admin/verifiers/${v.id}`,
                    body: { active: !v.active },
                    done: v.active ? `${v.displayName} is deactivated and signed out.` : `${v.displayName} can sign in again.`,
                  })
                }
              >
                {v.active ? 'Deactivate' : 'Reactivate'}
              </Button>
              {resetFor === v.id ? (
                <>
                  <Input
                    aria-label={`New password for ${v.displayName}`}
                    className="max-w-[220px]"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    autoComplete="off"
                  />
                  <Button
                    size="sm"
                    disabled={save.isPending || resetPassword.length < 10}
                    onClick={() =>
                      save.mutate(
                        {
                          method: 'PATCH',
                          url: `/api/admin/verifiers/${v.id}`,
                          body: { password: resetPassword },
                          done: `${v.displayName}'s password is reset. Share the new one privately.`,
                        },
                        { onSuccess: () => setResetFor(null) },
                      )
                    }
                  >
                    Save password
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setResetFor(null)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setResetFor(v.id);
                    setResetPassword(generatePassword());
                  }}
                >
                  Reset password
                </Button>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

interface ActivityRow {
  id: string;
  at: string;
  role: string;
  verifierId: string | null;
  actorName: string;
  action: string;
  resourceName: string | null;
  details: {
    changes?: Record<string, { before: unknown; after: unknown }>;
    confirmedVia?: string;
    note?: string | null;
    username?: string;
    displayName?: string;
    ip?: string | null;
    device?: string;
    reason?: string;
  } | null;
}

const ACTION_LABELS: Record<string, string> = {
  sign_in: 'Signed in',
  sign_in_failed: 'Failed sign-in',
  sign_in_locked: 'Failed sign-in — locked out for 15 minutes',
  review_apply: 'Applied changes',
  review_verify: 'Marked still active',
  review_hide: 'Hid from map',
  review_dismiss: 'Dismissed',
  undo_automatic_change: 'Undid an automatic change',
  report_cleared: 'Cleared a visitor report',
  listing_deleted: 'Deleted a listing',
  verifier_created: 'Added a verifier',
  verifier_updated: 'Updated a verifier',
};

function ActivityPanel({ adminFetch }: { adminFetch: AdminFetch }) {
  const [who, setWho] = useState('everyone');
  const [hideSignIns, setHideSignIns] = useState(true);

  const activityQuery = useQuery<ActivityRow[]>({
    queryKey: ['admin-checks', 'activity'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/activity');
      if (!response.ok) throw new Error('Failed to load activity');
      return response.json();
    },
  });

  const rows = activityQuery.data ?? [];
  const people = Array.from(new Set(rows.map((r) => r.actorName))).sort();
  const shown = rows.filter((r) => (who === 'everyone' || r.actorName === who) && !(hideSignIns && r.action === 'sign_in'));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="w-56">
          <Select value={who} onValueChange={setWho}>
            <SelectTrigger aria-label="Filter by person">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="everyone">Everyone</SelectItem>
              {people.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={hideSignIns} onCheckedChange={(c) => setHideSignIns(!!c)} />
          Hide sign-ins
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <Card className="divide-y">
          {shown.map((r) => {
            const changes = Object.entries(r.details?.changes ?? {});
            return (
              <div key={r.id} className="p-3 text-sm">
                <div className="flex flex-wrap gap-x-2">
                  <span className="text-muted-foreground tabular-nums">{new Date(r.at).toLocaleString()}</span>
                  <span className="font-semibold">{r.actorName}</span>
                  <span>{ACTION_LABELS[r.action] ?? r.action}</span>
                  {r.resourceName && <span className="font-medium">· {r.resourceName}</span>}
                  {r.details?.username && <span className="font-medium">· {r.details.username}</span>}
                </div>
                {(r.details?.device || r.details?.ip || r.details?.reason) && (
                  <p className={`mt-1 ${r.action.startsWith('sign_in_') ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {[r.details?.reason, r.details?.device, r.details?.ip ? `IP ${r.details.ip}` : null].filter(Boolean).join(' · ')}
                  </p>
                )}
                {changes.length > 0 && (
                  <ul className="mt-1 text-muted-foreground">
                    {changes.map(([field, c]) => (
                      <li key={field}>
                        {FIELD_LABELS[field] ?? field}: <span className="line-through">{formatValue(c.before)}</span> → {formatValue(c.after)}
                      </li>
                    ))}
                  </ul>
                )}
                {(r.details?.confirmedVia || r.details?.note) && (
                  <p className="mt-1 text-muted-foreground">
                    {r.details?.confirmedVia && CONFIRMED_VIA_LABELS[r.details.confirmedVia as ConfirmedVia]}
                    {r.details?.confirmedVia && r.details?.note ? ' — ' : ''}
                    {r.details?.note}
                  </p>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
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
