export interface DropdownOptions {
  onOpenChange?: (open: boolean) => void;
}

/**
 * Attach dropdown behavior to a `.fn-dropdown` root element.
 * Returns a detach function that removes all listeners.
 */
export function attachDropdown(root: HTMLElement, options?: DropdownOptions): () => void;
