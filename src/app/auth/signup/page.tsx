import SignUpForm from '@/components/auth/SignUpForm';
import AuthLinks from '@/components/auth/AuthLinks';

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Sign Up</h1>
          <p className="mt-2 text-gray-600">
            Create your account to start playing Guess Who Online
          </p>
        </div>

        <SignUpForm />
        <AuthLinks type="signup" />
      </div>
    </main>
  );
} 
