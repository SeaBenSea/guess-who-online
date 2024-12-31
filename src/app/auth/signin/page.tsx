import SignInForm from '@/components/auth/SignInForm';
import AuthLinks from '@/components/auth/AuthLinks';

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Sign In</h1>
          <p className="mt-2 text-gray-600">
            Welcome back to Guess Who Online
          </p>
        </div>

        <SignInForm />
        <AuthLinks type="signin" />
      </div>
    </main>
  );
} 
