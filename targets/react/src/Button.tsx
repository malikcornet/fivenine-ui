import type { ComponentPropsWithoutRef, Ref } from 'react';
import { cx } from './cx.js';

export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: 'primary' | 'secondary';
  ref?: Ref<HTMLButtonElement>;
}

export function Button({ variant = 'primary', className, ...rest }: ButtonProps) {
  return <button type="button" className={cx('fn-btn', `fn-btn--${variant}`, className)} {...rest} />;
}
