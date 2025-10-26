"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

const buildRedirectUrl = (pathname: string) => {
  const redirectUrl = new URL("/sign-in", window.location.origin);
  redirectUrl.searchParams.set("redirect_url", pathname);
  return redirectUrl.toString();
};

type ProtectedLayoutProps = {
  children: ReactNode;
};

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoaded && !user) {
      router.replace(buildRedirectUrl(pathname));
    }
  }, [user, isLoaded, pathname, router]);

  if (!isLoaded || !user) {
    return null;
  }

  return <>{children}</>;
}
