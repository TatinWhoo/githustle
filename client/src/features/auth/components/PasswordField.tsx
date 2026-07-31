import { useState, forwardRef, type InputHTMLAttributes } from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const PasswordField = forwardRef<HTMLInputElement, Props>(({ label, error, id, ...rest }, ref) => {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-semibold text-text-secondary">{label}</label>
      <div className="relative">
        <input ref={ref} id={id} type={show ? 'text' : 'password'} className="w-full text-sm px-3 py-2 border border-border rounded-md focus:outline-none focus:border-gh-teal focus:ring-1 focus:ring-gh-teal" {...rest} />
        <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide' : 'Show'} className="absolute right-2 top-2 text-text-muted">
          {show ? <EyeSlash size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p className="text-xs text-gh-red">{error}</p>}
    </div>
  );
});
PasswordField.displayName = 'PasswordField';
