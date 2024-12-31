'use client';

import Link from 'next/link';

interface AuthLinksProps {
  type: 'signin' | 'signup';
}

export default function AuthLinks({ type }: AuthLinksProps) {
  if (type === 'signin') {
    return (
      <p className="text-center text-gray-600">
        Don&apos;t have an account?{' '}
        <Link href="/auth/signup" className="text-blue-600 hover:text-blue-700">
          Sign up
        </Link>
      </p>
    );
  }

  return (
    <p className="text-center text-gray-600">
      Already have an account?{' '}
      <Link href="/auth/signin" className="text-blue-600 hover:text-blue-700">
        Sign in
      </Link>
    </p>
  );
}
