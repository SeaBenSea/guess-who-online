import Link from 'next/link';

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md space-y-8 text-center">
        <h1 className="text-4xl font-bold">Check Your Email</h1>
        <div className="space-y-4">
          <p className="text-gray-600">
            We&apos;ve sent you an email with a verification link. Please click the link to verify your email address.
          </p>
          <p className="text-gray-600">
            After verifying your email, you can{' '}
            <Link href="/auth/signin" className="text-blue-600 hover:text-blue-700">
              sign in
            </Link>
            {' '}to your account.
          </p>
        </div>
      </div>
    </main>
  );
} 
