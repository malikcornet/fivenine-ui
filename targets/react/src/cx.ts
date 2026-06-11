/** Joins truthy class names. Internal helper for the wrapper components. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
