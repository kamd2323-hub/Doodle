'use client'

import { cn } from '@/lib/utils'

interface MemberAvatarProps {
  name: string
  size?: 'sm' | 'lg'
  className?: string
}

const COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-violet-500',
  'bg-pink-500',
  'bg-teal-500',
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

export function MemberAvatar({ name, size = 'sm', className }: MemberAvatarProps) {
  const initials = getInitials(name || '?')
  const color = getColor(name)

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center text-white font-medium flex-shrink-0',
        size === 'sm' ? 'h-9 w-9 text-xs' : 'h-12 w-12 text-sm',
        color,
        className
      )}
      title={name}
    >
      {initials}
    </div>
  )
}