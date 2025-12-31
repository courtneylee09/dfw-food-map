import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { insertSubmissionSchema, type InsertSubmission } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import AddressAutocomplete from '@/components/AddressAutocomplete';

type SubmitResourceForm = InsertSubmission;

export default function SubmitResource() {
  const [, setLocation] = useLocation();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<SubmitResourceForm>({
    resolver: zodResolver(insertSubmissionSchema),
    defaultValues: {
      name: '',
      type: '',
      address: '',
      latitude: '',
      longitude: '',
      hours: '',
      photoUrl: '',
      phone: '',
      appointmentRequired: false,
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: InsertSubmission) => {
      return await apiRequest('POST', '/api/submissions', data);
    },
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const onSubmit = (data: SubmitResourceForm) => {
    submitMutation.mutate(data);
  };

  if (submitted) {
    return (
      <div className="h-screen-safe flex flex-col items-center justify-center p-6 bg-background text-center">
        <CheckCircle2 className="w-16 h-16 text-primary mb-4" />
        <h1 className="text-2xl font-bold mb-2">Thank You!</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          Your submission has been received and will be reviewed by our team. Once approved, it will appear on the map to help the community.
        </p>
        <Button
          onClick={() => setLocation('/')}
          className="min-h-11 text-base font-medium"
          data-testid="button-return-home"
        >
          Return to Map
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen-safe flex flex-col bg-background overflow-hidden">
      <div className="flex-none border-b p-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/')}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">Submit a Resource</h1>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-4 max-w-2xl mx-auto">
          <p className="text-muted-foreground mb-6">
            Know of a food resource that's not on our map? Help your community by submitting it here.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., St. Mary's Food Pantry"
                        className="min-h-11 text-base"
                        data-testid="input-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger
                          className="min-h-11 text-base"
                          data-testid="select-type"
                        >
                          <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Food Pantry">Food Pantry</SelectItem>
                        <SelectItem value="Community Fridge">Community Fridge</SelectItem>
                        <SelectItem value="Soup Kitchen">Soup Kitchen</SelectItem>
                        <SelectItem value="Hot Meal">Hot Meal</SelectItem>
                        <SelectItem value="Youth Supper">Youth Supper</SelectItem>
                        <SelectItem value="Senior Meals">Senior Meals</SelectItem>
                        <SelectItem value="Grocery Distribution">Grocery Distribution</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="relative overflow-visible">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <AddressAutocomplete
                        value={field.value}
                        onChange={field.onChange}
                        onSelect={(location) => {
                          form.setValue('address', location.formatted);
                          form.setValue('latitude', location.lat.toString());
                          form.setValue('longitude', location.lon.toString());
                        }}
                        placeholder="Start typing an address..."
                        data-testid="input-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hours of Operation</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Mon-Fri 9am-5pm, Sat 10am-2pm"
                        className="min-h-20 text-base resize-none"
                        data-testid="input-hours"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., (313) 555-1234"
                        className="min-h-11 text-base"
                        data-testid="input-phone"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="appointmentRequired"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appointment Required?</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === 'true')} 
                      value={field.value ? 'true' : 'false'}
                    >
                      <FormControl>
                        <SelectTrigger
                          className="min-h-11 text-base"
                          data-testid="select-appointment"
                        >
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full min-h-11 text-base font-medium"
                disabled={submitMutation.isPending}
                data-testid="button-submit"
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit Resource'}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
