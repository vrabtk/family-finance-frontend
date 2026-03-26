import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../../store/auth.store';
import AuthShell from '../../components/auth/AuthShell';
import Input from '../../components/shared/Input';
import Button from '../../components/shared/Button';
import useIsMobile from '../../utils/useIsMobile';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const isMobile = useIsMobile();
  const [form, setForm] = useState({ email:'', password:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(form.email, form.password);
      navigate('/expenses');
    } catch(err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in and pick up your latest household snapshot."
      subtitle="Review current expenses, debt, investments, and monthly cash flow from one place."
      altLabel="New here?"
      altHref="/signup"
      altText="Create an account"
      footer="Use the same account on every device so your workspace and invitations stay in sync."
    >
      <div style={{ marginBottom: isMobile ? 20 : 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', marginBottom: 8 }}>Sign In</div>
        <div style={{ fontSize: isMobile ? 24 : 28, fontWeight: 800, letterSpacing: -0.8, marginBottom: 8, lineHeight: 1.1 }}>Access your workspace</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          Sign in with your email to continue managing the current state of your family finances.
        </p>
      </div>

      <form onSubmit={handle}>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
          placeholder="you@example.com"
          style={{ marginBottom: 14 }}
          required
        />
        <div style={{ position: 'relative', marginBottom: 18 }}>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
            inputStyle={{ paddingRight: isMobile ? 82 : 78 }}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            style={{
              position: 'absolute',
              right: 10,
              top: isMobile ? 37 : 34,
              border: '1px solid var(--border2)',
              background: 'var(--surface3)',
              color: 'var(--text-dim)',
              borderRadius: 8,
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: isMobile ? 12 : 11,
              fontWeight: 700,
            }}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        {error && (
          <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 14, padding: '10px 12px', background: 'rgba(74,16,16,.55)', borderRadius: 12, border: '1px solid rgba(248,113,113,.35)', lineHeight: 1.6 }}>
            {error}
          </div>
        )}
        <Button variant="primary" size="lg" style={{ width: '100%' }} loading={loading}>
          Sign In
        </Button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 18 }}>
        No account yet? <Link to="/signup" style={{ color: 'var(--gold)', fontWeight: 700 }}>Create one</Link>
      </p>
    </AuthShell>
  );
}
