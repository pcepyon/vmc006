'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@clerk/nextjs';
import { UserInfoCard } from './UserInfoCard';
import { useUserSubscription } from '../hooks/useUserSubscription';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { data: subscription } = useUserSubscription();

  const navItems = [
    { href: '/dashboard', label: '홈', icon: Home },
    { href: '/dashboard/new', label: '새 검사', icon: PlusCircle },
  ];

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">사주 분석</h2>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Button
                key={item.href}
                variant={isActive ? 'default' : 'ghost'}
                className="w-full justify-start"
                asChild
              >
                <Link href={item.href}>
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t">
        {user && subscription && (
          <UserInfoCard
            email={user.primaryEmailAddress?.emailAddress || ''}
            subscriptionTier={subscription.subscription_tier}
            remainingTests={subscription.remaining_tests}
            onClick={() => router.push('/dashboard/subscription')}
          />
        )}
      </div>
    </aside>
  );
}
