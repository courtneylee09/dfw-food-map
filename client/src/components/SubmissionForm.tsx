import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Upload, CheckCircle } from 'lucide-react';

interface SubmissionFormProps {
  onBack: () => void;
  onSubmit: (data: SubmissionData) => void;
}

export interface SubmissionData {
  resourceName: string;
  resourceType: string;
  address: string;
  hours: string;
  photoUrl?: string;
}

export default function SubmissionForm({ onBack, onSubmit }: SubmissionFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<SubmissionData>({
    resourceName: '',
    resourceType: '',
    address: '',
    hours: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onBack();
    }, 2000);
  };

  if (submitted) {
    return (
      <div className="h-full flex items-center justify-center p-4 bg-background">
        <Card className="p-8 text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Thank you!</h2>
          <p className="text-lg text-muted-foreground">
            Your submission has been received. We'll review it and add it to our map soon.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">Suggest a Resource</h1>
      </div>

      <div className="flex-1 overflow-auto">
        <form onSubmit={handleSubmit} className="p-4 space-y-6 max-w-2xl mx-auto">
          <p className="text-base text-muted-foreground">
            Help your community by sharing a food resource. No login required.
          </p>

          <div className="space-y-2">
            <Label htmlFor="resourceName" className="text-base font-bold">
              Resource Name *
            </Label>
            <Input
              id="resourceName"
              value={formData.resourceName}
              onChange={(e) => setFormData({ ...formData, resourceName: e.target.value })}
              placeholder="e.g., Community Food Pantry"
              required
              className="min-h-12 text-base"
              data-testid="input-resource-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resourceType" className="text-base font-bold">
              Type of Resource *
            </Label>
            <Select
              value={formData.resourceType}
              onValueChange={(value) => setFormData({ ...formData, resourceType: value })}
              required
            >
              <SelectTrigger className="min-h-12 text-base" data-testid="select-resource-type">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Food Pantry">Food Pantry</SelectItem>
                <SelectItem value="Community Fridge">Community Fridge</SelectItem>
                <SelectItem value="Hot Meal">Hot Meal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-base font-bold">
              Address *
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Full street address"
              required
              className="min-h-12 text-base"
              data-testid="input-address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours" className="text-base font-bold">
              Hours
            </Label>
            <Textarea
              id="hours"
              value={formData.hours}
              onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
              placeholder="e.g., Mon-Fri 10AM-2PM, Weekends closed"
              className="min-h-24 text-base"
              data-testid="input-hours"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-bold">Photo (Optional)</Label>
            <Card className="p-6 border-dashed hover-elevate cursor-pointer">
              <div className="flex flex-col items-center gap-2 text-center">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <p className="text-base font-medium">Add a photo</p>
                <p className="text-sm text-muted-foreground">
                  Help others recognize this location
                </p>
              </div>
            </Card>
          </div>

          <Button
            type="submit"
            className="w-full min-h-12 text-base font-bold"
            data-testid="button-submit"
          >
            Submit Resource
          </Button>
        </form>
      </div>
    </div>
  );
}
