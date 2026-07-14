import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [errorMsg, setErrorMsg]       = useState('');
  const [loading, setLoading]         = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const demoPassword = import.meta.env.VITE_DEMO_SHARED_PASSWORD || '';

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: { username: '', password: '' },
  });

  useEffect(() => {
    const handleDemoAccountFill = (event) => {
      const { username, password } = event.detail || {};
      if (!username) return;
      setValue('username', username, { shouldDirty: true, shouldTouch: true });
      setValue('password', password || demoPassword, { shouldDirty: true, shouldTouch: true });
      setErrorMsg('');
      setShowPassword(false);
    };

    window.addEventListener('loan-desk-demo-account', handleDemoAccountFill);
    return () => window.removeEventListener('loan-desk-demo-account', handleDemoAccountFill);
  }, [demoPassword, setValue]);

  const onSubmit = async (data) => {
    setErrorMsg('');
    setLoading(true);
    try {
      const response = await login(data.username, data.password);

      if (response.roleType === 'employee') {
        navigate('/employee/dashboard', { replace: true });
      } else {
        navigate('/customer/dashboard', { replace: true });
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
        'Incorrect credentials. Please try again with your registered account.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Input base style (reused)
  const inputClass = (hasError) => [
    'w-full h-11 rounded-lg border bg-white px-4 text-sm text-slate-900',
    'placeholder:text-slate-400',
    'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
    'transition-colors duration-150',
    hasError ? 'border-red-400' : 'border-slate-300',
  ].join(' ');

  return (
    <div className="space-y-5">

      {/* Page heading */}
      <div>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
          Sign in to your account
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          Enter your registered email, mobile number, or employee ID.
        </p>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          padding: '12px 14px', borderRadius: '8px',
          background: '#fef2f2', border: '1px solid #fecaca',
        }}>
          <svg style={{ width: '14px', height: '14px', color: '#ef4444', flexShrink: 0, marginTop: '1px' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p style={{ fontSize: '13px', color: '#b91c1c', margin: 0, lineHeight: 1.5 }}>{errorMsg}</p>
        </div>
      )}

      {/* Login form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

        {/* Email / ID */}
        <div className="space-y-1.5">
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151' }}>
            Email / Mobile / Employee ID
          </label>
          <input
            type="text"
            autoComplete="username"
            placeholder="Enter your account email, mobile number, or employee ID"
            className={inputClass(!!errors.username)}
            {...register('username', { required: 'This field is required.' })}
          />
          {errors.username && (
            <p style={{ fontSize: '12px', color: '#ef4444', margin: 0 }}>{errors.username.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
              Password
            </label>
            <button
              type="button"
              onClick={() => setErrorMsg('Use the password assigned to your account.')}
              style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Forgot password?
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputClass(!!errors.password)}
              style={{ paddingRight: '44px' }}
              {...register('password', { required: 'Password is required.' })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#9ca3af', display: 'flex', alignItems: 'center',
              }}
            >
              {showPassword
                ? <EyeOff style={{ width: '16px', height: '16px' }} />
                : <Eye     style={{ width: '16px', height: '16px' }} />
              }
            </button>
          </div>
          {errors.password && (
            <p style={{ fontSize: '12px', color: '#ef4444', margin: 0 }}>{errors.password.message}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', height: '44px', borderRadius: '8px', border: 'none',
            background: loading ? '#93c5fd' : '#2563eb',
            color: 'white', fontWeight: 700, fontSize: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1d4ed8'; }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#2563eb'; }}
        >
          {loading ? (
            <>
              <svg style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Authenticating…
            </>
          ) : (
            <>
              Sign In
              <ArrowRight style={{ width: '15px', height: '15px' }} />
            </>
          )}
        </button>
      </form>

    </div>
  );
};

export default Login;
