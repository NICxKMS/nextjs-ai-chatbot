'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AuthForm } from '@/features/auth';
import { getSupabaseBrowserClient } from '@/lib/auth/client';
import { toast } from '@/shared/ui';

/**
 * Register Page
 * Ref: oldapp/app/(auth)/register/page.tsx
 *
 * Handles new user registration via Supabase.
 * If email confirmation is enabled: shows success message and redirects to login.
 * If email confirmation is disabled: exchanges token for session and redirects to home.
 */
export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);
  const router = useRouter();

  const handleSubmit = async (formData: FormData) => {
    const submittedEmail = formData.get('email');
    const password = formData.get('password');

    if (typeof submittedEmail !== 'string' || typeof password !== 'string') {
      toast({
        type: 'error',
        description: 'Please provide a valid email and password.',
      });
      return;
    }

    setEmail(submittedEmail);

    const supabase = getSupabaseBrowserClient();

    const { data, error } = await supabase.auth.signUp({
      email: submittedEmail,
      password,
    });

    if (error || !data.user) {
      toast({
        type: 'error',
        description: error?.message || 'Failed to create account!',
      });
      return;
    }

    // When email confirmation is required, Supabase returns user but no session
    // The user needs to verify their email before they can log in
    if (!data.session) {
      toast({
        type: 'success',
        description:
          'Account created! Please check your email to verify your account.',
      });
      setIsSuccessful(true);
      // Redirect to login page so user can log in after confirming email
      router.push('/login');
      return;
    }

    // If we have a session (email confirmation disabled), exchange it for cookies
    const accessToken = data.session.access_token;

    try {
      const exchangeResponse = await fetch('/api/auth/exchange', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken }),
      });

      if (!exchangeResponse.ok) {
        toast({
          type: 'error',
          description:
            'Account created, but session setup failed. Please try logging in.',
        });
        return;
      }

      // Validate that a valid user was returned in the response
      const exchangeData = (await exchangeResponse.json()) as {
        user: unknown;
      };
      if (!exchangeData.user) {
        toast({
          type: 'error',
          description:
            'Account created, but session setup failed. Please try logging in.',
        });
        return;
      }
    } catch {
      toast({
        type: 'error',
        description:
          'Account created, but session setup failed. Please try logging in.',
      });
      return;
    }

    toast({
      type: 'success',
      description: 'Account created successfully!',
    });

    setIsSuccessful(true);
    router.push('/');
    router.refresh();
  };

  return (
    <AuthForm
      defaultEmail={email}
      isSuccessful={isSuccessful}
      mode="register"
      onSubmit={handleSubmit}
    />
  );
}
