import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import logoUrl from '@/assets/preproute logo.svg';
import illustrationUrl from '@/assets/login-illustration.svg';
import { getErrorMessage } from '@/lib/api';
import { loginSchema, type LoginFormValues } from '@/schemas/login.schema';
import { useAuthStore } from '@/store/auth.store';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      userId: '',
      password: '',
    },
  });

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    setApiError(null);

    try {
      await login(values);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setApiError(getErrorMessage(error, 'Unable to sign in. Please try again.'));
    }
  };

  const isLoading = loading || isSubmitting;

  return (
    <div className="grid min-h-svh grid-cols-1 lg:grid-cols-[52fr_48fr]">
      <div className="hidden bg-[#F5F7FA] lg:flex lg:items-center lg:justify-center lg:px-14">
        <img
          src={illustrationUrl}
          alt=""
          className="w-full max-w-[560px] select-none"
          draggable={false}
        />
      </div>

      <div className="flex items-center justify-center bg-white px-6 py-12 lg:px-14">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex items-center justify-start">
            <img
              src={logoUrl}
              alt="Preproute"
              className="h-8 w-auto"
              draggable={false}
            />
          </div>

          <div className="mb-6">
            <h1 className="text-[18px] font-semibold leading-6 text-[#111827]">
              Login
            </h1>
            <p className="mt-2 text-[12px] leading-5 text-[#6B7280]">
              Use your company provided Login credentials
            </p>
          </div>

          {apiError ? (
            <div
              role="alert"
              className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {apiError}
            </div>
          ) : null}

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div>
              <label
                htmlFor="userId"
                className="mb-2 block text-[12px] font-medium leading-4 text-[#111827]"
              >
                User ID
              </label>
              <input
                id="userId"
                type="text"
                autoComplete="username"
                disabled={isLoading}
                placeholder="Enter User ID"
                className="h-10 w-full rounded border border-[#E5E7EB] bg-white px-3 text-[13px] text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:border-[#5B7FFF] focus:ring-2 focus:ring-[#5B7FFF]/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                {...register('userId')}
              />
              {errors.userId ? (
                <p className="mt-1.5 text-sm text-red-600" role="alert">
                  {errors.userId.message}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-[12px] font-medium leading-4 text-[#111827]"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                disabled={isLoading}
                placeholder="Enter Password"
                className="h-10 w-full rounded border border-[#E5E7EB] bg-white px-3 text-[13px] text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:border-[#5B7FFF] focus:ring-2 focus:ring-[#5B7FFF]/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                {...register('password')}
              />
              {errors.password ? (
                <p className="mt-1.5 text-sm text-red-600" role="alert">
                  {errors.password.message}
                </p>
              ) : null}

              <div className="mt-2">
                <a
                  href="#"
                  className="text-[12px] font-medium text-[#6B7280] hover:text-[#111827]"
                >
                  Forgot password?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded bg-[#5B7FFF] text-[13px] font-semibold text-white transition hover:bg-[#4A6EFF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B7FFF] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Login
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
