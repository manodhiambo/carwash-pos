'use client';

import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0'
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

// Switch with label
interface LabeledSwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  label: string;
  description?: string;
  labelPosition?: 'left' | 'right';
}

const LabeledSwitch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  LabeledSwitchProps
>(({ className, label, description, labelPosition = 'right', id, ...props }, ref) => {
  const inputId = id || React.useId();

  const labelContent = (
    <div className="grid gap-1.5 leading-none">
      <label
        htmlFor={inputId}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
      >
        {label}
      </label>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );

  return (
    <div className={cn('flex items-center justify-between', className)}>
      {labelPosition === 'left' && labelContent}
      <Switch ref={ref} id={inputId} {...props} />
      {labelPosition === 'right' && labelContent}
    </div>
  );
});
LabeledSwitch.displayName = 'LabeledSwitch';

export { Switch, LabeledSwitch };
