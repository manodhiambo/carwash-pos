'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <Loader2 className={cn('animate-spin', sizeClasses[size], className)} />
  );
}

// Full page loader
interface PageLoaderProps {
  message?: string;
}

function PageLoader({ message = 'Loading...' }: PageLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" className="text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// Inline loader
interface InlineLoaderProps {
  message?: string;
  className?: string;
}

function InlineLoader({ message, className }: InlineLoaderProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Spinner size="sm" />
      {message && <span className="text-sm text-muted-foreground">{message}</span>}
    </div>
  );
}

// Button loader (for use inside buttons)
function ButtonLoader() {
  return <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
}

// Centered loader for containers
interface CenteredLoaderProps {
  message?: string;
  className?: string;
}

function CenteredLoader({ message, className }: CenteredLoaderProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      <Spinner size="lg" className="text-primary" />
      {message && (
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

// Overlay loader for cards/sections
interface OverlayLoaderProps {
  message?: string;
}

function OverlayLoader({ message }: OverlayLoaderProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[2px] rounded-lg">
      <div className="flex flex-col items-center gap-2">
        <Spinner size="lg" className="text-primary" />
        {message && (
          <p className="text-sm text-muted-foreground">{message}</p>
        )}
      </div>
    </div>
  );
}

// Dots loader animation
function DotsLoader({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
      <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
    </div>
  );
}

// Pulse loader
function PulseLoader({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
      <div className="w-3 h-3 rounded-full bg-primary animate-pulse [animation-delay:0.2s]" />
      <div className="w-3 h-3 rounded-full bg-primary animate-pulse [animation-delay:0.4s]" />
    </div>
  );
}

export {
  Spinner,
  PageLoader,
  InlineLoader,
  ButtonLoader,
  CenteredLoader,
  OverlayLoader,
  DotsLoader,
  PulseLoader,
};
