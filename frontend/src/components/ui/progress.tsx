'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    indicatorClassName?: string;
  }
>(({ className, value, indicatorClassName, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      'relative h-4 w-full overflow-hidden rounded-full bg-secondary',
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        'h-full w-full flex-1 bg-primary transition-all',
        indicatorClassName
      )}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

// Progress with label
interface LabeledProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  label?: string;
  showValue?: boolean;
  indicatorClassName?: string;
}

const LabeledProgress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  LabeledProgressProps
>(({ className, value, label, showValue = true, indicatorClassName, ...props }, ref) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      {label && <span className="text-sm font-medium">{label}</span>}
      {showValue && (
        <span className="text-sm text-muted-foreground">{Math.round(value || 0)}%</span>
      )}
    </div>
    <Progress
      ref={ref}
      value={value}
      className={className}
      indicatorClassName={indicatorClassName}
      {...props}
    />
  </div>
));
LabeledProgress.displayName = 'LabeledProgress';

// Circular progress
interface CircularProgressProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  strokeWidth?: number;
  showValue?: boolean;
  className?: string;
  trackClassName?: string;
  indicatorClassName?: string;
}

const sizeConfig = {
  sm: { size: 40, fontSize: 'text-xs' },
  md: { size: 60, fontSize: 'text-sm' },
  lg: { size: 80, fontSize: 'text-base' },
};

function CircularProgress({
  value,
  size = 'md',
  strokeWidth = 4,
  showValue = true,
  className,
  trackClassName,
  indicatorClassName,
}: CircularProgressProps) {
  const config = sizeConfig[size];
  const radius = (config.size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: config.size, height: config.size }}
    >
      <svg
        className="transform -rotate-90"
        width={config.size}
        height={config.size}
      >
        <circle
          className={cn('text-muted', trackClassName)}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={config.size / 2}
          cy={config.size / 2}
        />
        <circle
          className={cn('text-primary transition-all duration-300', indicatorClassName)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={config.size / 2}
          cy={config.size / 2}
        />
      </svg>
      {showValue && (
        <span className={cn('absolute font-semibold', config.fontSize)}>
          {Math.round(value)}%
        </span>
      )}
    </div>
  );
}

// Step progress indicator
interface StepProgressProps {
  steps: { label: string; description?: string }[];
  currentStep: number;
  className?: string;
}

function StepProgress({ steps, currentStep, className }: StepProgressProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold transition-colors',
                  index < currentStep
                    ? 'border-primary bg-primary text-primary-foreground'
                    : index === currentStep
                    ? 'border-primary text-primary'
                    : 'border-muted text-muted-foreground'
                )}
              >
                {index < currentStep ? (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <div className="mt-2 text-center">
                <div
                  className={cn(
                    'text-sm font-medium',
                    index <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </div>
                {step.description && (
                  <div className="text-xs text-muted-foreground">{step.description}</div>
                )}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-4 mt-[-24px]',
                  index < currentStep ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export { Progress, LabeledProgress, CircularProgress, StepProgress };
