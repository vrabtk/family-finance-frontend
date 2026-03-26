import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../../store/auth.store';
import AuthShell from '../../components/auth/AuthShell';
import Input from '../../components/shared/Input';
import Button from '../../components/shared/Button';
import useIsMobile from '../../utils/useIsMobile';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuthStore();
  const isMobile = useIsMobile();
  const [form, setForm] = useState({ name:'', email:'', password:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    try {
      await signup(form.name, form.email, form.password);
      navigate('/expenses');
    } catch(err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally { setLoading(false); }
  };

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create a shared home finance workspace that stays current."
      subtitle="Bring income, expenses, loans, investments, insurance, and bank balances into one planning flow."
      altLabel="Already have access?"
      altHref="/login"
      altText="Sign in"
      footer="Your first workspace is created automatically after signup, and you can invite family members later from Settings."
    >
      <div style={{ marginBottom: isMobile ? 20 : 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', marginBottom: 8 }}>Create Account</div>
        <div style={{ fontSize: isMobile ? 24 : 28, fontWeight: 800, letterSpacing: -0.8, marginBottom: 8, lineHeight: 1.1 }}>Start with a clean workspace</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          Create your account, then import or enter the household data you want to track.
        </p>
      </div>

      <form onSubmit={handle}>
        <Input
          label="Full Name"
          type="text"
          autoComplete="name"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="Hari"
          style={{ marginBottom: 14 }}
          required
        />
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
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
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
        <div style={{ fontSize: 11, color: form.password.length >= 8 ? 'var(--green)' : 'var(--text-muted)', marginBottom: 16 }}>
          Use at least 8 characters for a safer account.
        </div>
        {error && (
          <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 14, padding: '10px 12px', background: 'rgba(74,16,16,.55)', borderRadius: 12, border: '1px solid rgba(248,113,113,.35)', lineHeight: 1.6 }}>
            {error}
          </div>
        )}
        <Button variant="primary" size="lg" style={{ width: '100%' }} loading={loading}>
          Create Account
        </Button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 18 }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--gold)', fontWeight: 700 }}>Sign in</Link>
      </p>
    </AuthShell>
  );
}
