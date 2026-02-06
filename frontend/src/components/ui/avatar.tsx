'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn, getInitials, stringToColor } from '@/lib/utils';

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
      className
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-muted',
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// User Avatar with automatic fallback
interface UserAvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

function UserAvatar({ name, src, size = 'md', className }: UserAvatarProps) {
  const initials = getInitials(name);
  const colorClass = stringToColor(name);

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback className={cn(colorClass, 'text-white font-medium')}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

// Avatar Group for showing multiple users
interface AvatarGroupProps {
  users: Array<{ name: string; src?: string | null }>;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function AvatarGroup({ users, max = 4, size = 'md', className }: AvatarGroupProps) {
  const visibleUsers = users.slice(0, max);
  const remainingCount = users.length - max;

  return (
    <div className={cn('flex -space-x-2', className)}>
      {visibleUsers.map((user, index) => (
        <UserAvatar
          key={index}
          name={user.name}
          src={user.src}
          size={size}
          className="ring-2 ring-background"
        />
      ))}
      {remainingCount > 0 && (
        <Avatar
          className={cn(
            sizeClasses[size],
            'ring-2 ring-background bg-muted'
          )}
        >
          <AvatarFallback className="text-muted-foreground font-medium">
            +{remainingCount}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

export { Avatar, AvatarImage, AvatarFallback, UserAvatar, AvatarGroup };
