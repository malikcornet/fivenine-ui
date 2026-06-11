import { useEffect, useRef } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { attachDropdown } from '@fivenine-collective/ui/dropdown';
import { cx } from './cx.js';

export interface DropdownProps extends ComponentPropsWithoutRef<'div'> {
  label: ReactNode;
  align?: 'start' | 'end';
  onOpenChange?: (open: boolean) => void;
}

export function Dropdown({ label, align = 'start', onOpenChange, className, children, ...rest }: DropdownProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    if (!rootRef.current) return;
    return attachDropdown(rootRef.current, {
      onOpenChange: (open) => onOpenChangeRef.current?.(open),
    });
  }, []);

  const menuClasses = cx('fn-dropdown__menu', align === 'end' && 'fn-dropdown__menu--end');

  return (
    <div ref={rootRef} className={cx('fn-dropdown', className)} {...rest}>
      <button type="button" className="fn-btn fn-btn--secondary" data-fn-dropdown-trigger>
        {label}
      </button>
      <div className={menuClasses} role="menu">
        {children}
      </div>
    </div>
  );
}

export interface DropdownItemProps extends ComponentPropsWithoutRef<'button'> {}

export function DropdownItem({ className, ...rest }: DropdownItemProps) {
  return <button type="button" role="menuitem" className={cx('fn-dropdown__item', className)} {...rest} />;
}
