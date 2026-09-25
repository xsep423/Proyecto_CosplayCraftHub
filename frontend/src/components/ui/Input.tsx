import { type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react';

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

interface InputProps extends FieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  icon?: ReactNode;
}

interface TextareaProps extends FieldProps, Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {}

interface SelectProps extends FieldProps, Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  options: { value: string; label: string }[];
  placeholder?: string;
}

const inputBase = `
  w-full bg-panel border border-border rounded-lg px-3 py-2 text-sm text-text
  placeholder-muted outline-none
  focus:border-primary focus:ring-1 focus:ring-primary/30
  transition-colors duration-150
  disabled:opacity-50 disabled:cursor-not-allowed
`;

function FieldWrapper({ label, error, hint, required, children, className = '' }: FieldProps & { children: ReactNode }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-muted uppercase tracking-wider">
          {label}{required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Input({ label, error, hint, required, icon, className, ...props }: InputProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required} className={className}>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4">{icon}</span>
        )}
        <input
          className={`${inputBase} ${icon ? 'pl-9' : ''} ${error ? 'border-danger' : ''}`}
          {...props}
        />
      </div>
    </FieldWrapper>
  );
}

export function Textarea({ label, error, hint, required, className, ...props }: TextareaProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required} className={className}>
      <textarea
        rows={4}
        className={`${inputBase} resize-none ${error ? 'border-danger' : ''}`}
        {...props}
      />
    </FieldWrapper>
  );
}

export function Select({ label, error, hint, required, options, placeholder, className, ...props }: SelectProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required} className={className}>
      <select
        className={`${inputBase} cursor-pointer ${error ? 'border-danger' : ''}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value} className="bg-panel">{o.label}</option>
        ))}
      </select>
    </FieldWrapper>
  );
}
