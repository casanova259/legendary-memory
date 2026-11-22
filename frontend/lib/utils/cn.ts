/**
 * Lightweight classNames combiner
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ').trim();
}
