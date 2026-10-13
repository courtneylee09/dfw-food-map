import { CheckCircle2, PhoneCall } from 'lucide-react';
import { getVerificationLabel } from '@/lib/verificationLabel';

export default function VerificationBadge({
  lastVerifiedDate,
  size = 'sm',
}: {
  lastVerifiedDate: string | Date | null | undefined;
  size?: 'sm' | 'base';
}) {
  const label = getVerificationLabel(lastVerifiedDate);
  const Icon = label.confirmed ? CheckCircle2 : PhoneCall;
  return (
    <div
      className={`flex items-center gap-2 ${size === 'sm' ? 'text-sm' : 'text-base'} ${
        label.confirmed ? 'text-green-800' : 'text-amber-900'
      }`}
      data-testid="text-verification"
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{label.text}</span>
    </div>
  );
}
