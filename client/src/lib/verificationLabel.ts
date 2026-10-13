// Public trust label for a listing, based on when it was last confirmed
// (by the verification agent or a person).

const CONFIRMED_WITHIN_DAYS = 120;

export interface VerificationLabel {
  confirmed: boolean;
  text: string;
}

export function getVerificationLabel(lastVerifiedDate: string | Date | null | undefined): VerificationLabel {
  const verified = lastVerifiedDate ? new Date(lastVerifiedDate) : null;
  const ageDays = verified ? (Date.now() - verified.getTime()) / (24 * 60 * 60 * 1000) : Infinity;
  if (verified && ageDays <= CONFIRMED_WITHIN_DAYS) {
    return {
      confirmed: true,
      text: `Confirmed ${verified.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
    };
  }
  return { confirmed: false, text: 'Not recently confirmed — call ahead' };
}
