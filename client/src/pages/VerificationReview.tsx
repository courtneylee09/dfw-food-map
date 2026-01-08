import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { FoodResource } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

export default function VerificationReview() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: flaggedResources, isLoading } = useQuery<FoodResource[]>({
    queryKey: ['flagged-resources'],
    queryFn: async () => {
      const response = await fetch('/api/resources/flagged');
      if (!response.ok) throw new Error('Failed to fetch flagged resources');
      return response.json();
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (resourceId: string) => {
      const response = await fetch(`/api/resources/${resourceId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'manual_review' }),
      });
      if (!response.ok) throw new Error('Failed to verify resource');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flagged-resources'] });
      toast({
        title: "Resource verified",
        description: "This location has been marked as verified and active.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to verify resource. Please try again.",
        variant: "destructive",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (resourceId: string) => {
      const response = await fetch(`/api/resources/${resourceId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove resource');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flagged-resources'] });
      toast({
        title: "Resource removed",
        description: "This location has been removed from the map.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove resource. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Location Verification Review</h1>
        <p>Loading flagged locations...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Location Verification Review</h1>
        <p className="text-muted-foreground">
          Review locations that have been reported as closed or need verification.
        </p>
      </div>

      {!flaggedResources || flaggedResources.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
          <h2 className="text-xl font-semibold mb-2">All Clear!</h2>
          <p className="text-muted-foreground">
            No locations currently flagged for review.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {flaggedResources.map((resource) => (
            <Card key={resource.id} className="p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-xl font-bold">{resource.name}</h2>
                    <Badge variant="destructive" className="ml-2">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Reported Closed
                    </Badge>
                  </div>
                  <Badge variant="secondary" className="mb-3">
                    {resource.type}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                  <span className="text-sm">{resource.address}</span>
                </div>
                {resource.hours && (
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 mt-1 text-muted-foreground" />
                    <span className="text-sm">{resource.hours}</span>
                  </div>
                )}
              </div>

              <div className="bg-muted/50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Reports</p>
                    <p className="font-semibold">{resource.reportedClosedCount || 0} report(s)</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Verified</p>
                    <p className="font-semibold">
                      {resource.lastVerifiedDate
                        ? new Date(resource.lastVerifiedDate).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Reported At</p>
                    <p className="font-semibold">
                      {resource.reportedClosedAt
                        ? new Date(resource.reportedClosedAt).toLocaleDateString()
                        : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Verification Source</p>
                    <p className="font-semibold">{resource.verificationSource || 'initial'}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => verifyMutation.mutate(resource.id)}
                  disabled={verifyMutation.isPending}
                  className="flex-1"
                  variant="default"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Still Active - Mark Verified
                </Button>
                <Button
                  onClick={() => {
                    if (confirm(`Are you sure you want to remove "${resource.name}"? This action cannot be undone.`)) {
                      removeMutation.mutate(resource.id);
                    }
                  }}
                  disabled={removeMutation.isPending}
                  className="flex-1"
                  variant="destructive"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Confirmed Closed - Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
