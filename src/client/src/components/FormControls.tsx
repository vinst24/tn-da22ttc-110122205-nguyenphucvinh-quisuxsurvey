import { useState, type ReactNode } from 'react';

const joinClasses = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

type FieldLabelProps = {
  htmlFor: string;
  children: ReactNode;
  className?: string;
  optional?: ReactNode;
};

export function FieldLabel({ htmlFor, children, className, optional }: FieldLabelProps) {
  const marginClass = /(?:^|\s)!?mb-/.test(className ?? '') ? '' : 'mb-2';

  return (
    <label htmlFor={htmlFor} className={joinClasses('block text-sm font-medium text-slate-700', marginClass, className)}>
      {children}
      {optional ? <span className="ml-1 text-slate-400 font-normal">{optional}</span> : null}
    </label>
  );
}

type FieldHintProps = {
  id?: string;
  children: ReactNode;
  tone?: 'neutral' | 'error';
  className?: string;
};

export function FieldHint({ id, children, tone = 'neutral', className }: FieldHintProps) {
  return (
    <p
      id={id}
      className={joinClasses(
        tone === 'error' ? 'text-red-600' : 'text-slate-400',
        'mt-1 text-sm',
        className,
      )}
    >
      {children}
    </p>
  );
}

export function InputIcon({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
      {children}
    </span>
  );
}

type ToggleRowProps = {
  id: string;
  label: ReactNode;
  description: ReactNode;
  defaultChecked: boolean;
  onChange?: (checked: boolean) => void;
};

export function ToggleRow({ id, label, description, defaultChecked, onChange }: ToggleRowProps) {
  const [checked, setChecked] = useState(defaultChecked);
  const handleChange = (nextChecked: boolean) => {
    setChecked(nextChecked);
    onChange?.(nextChecked);
  };

  return (
    <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 last:border-0">
      <div className="flex-1">
        <label htmlFor={id} className="block text-sm font-medium text-slate-900 mb-1">
          {label}
        </label>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => handleChange(event.target.checked)}
          className="sr-only peer"
        />
        <span className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
      </label>
    </div>
  );
}
