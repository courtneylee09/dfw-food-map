export function formatDistanceMiles(distance: number): string {
  if (!Number.isFinite(distance) || distance < 0) {
    return "N/A";
  }

  if (distance < 0.1) {
    return "<0.1 mi";
  }

  return `${distance.toFixed(1)} mi`;
}
