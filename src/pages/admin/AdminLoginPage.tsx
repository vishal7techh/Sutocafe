import { useState } from "react";
import { cafeConfig } from "../../data/cafeConfig";
import { loginAdmin } from "../../services/authService";

interface Props {
  onLoginSuccess: () => void;
  onBackToCustomerView: () => void;
}

export function AdminLoginPage({ onLoginSuccess, onBackToCustomerView }: Props) {
  const [email, setEmail] = useState("admin@sutocafe.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await loginAdmin(email, password);
    setLoading(false);

    if (res.success) {
      onLoginSuccess();
    } else {
      setError(res.error || "Invalid credentials.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-8 text-slate-800">
      <div className="w-full max-w-[380px] rounded-2xl border border-slate-200/80 bg-white p-6 shadow-lg">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 font-display text-2xl font-black text-navy">
            <span>{cafeConfig.name}</span>
            <span>☕</span>
          </div>
          <span className="mt-1 inline-block rounded-full bg-blue-50 px-3 py-0.5 text-xs font-bold text-blueink">
            Admin Portal
          </span>
          <p className="mt-2 text-xs text-slate-500">
            Login to manage orders, menu items, and table status
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="admin-email" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Admin Email
            </label>
            <input
              id="admin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@sutocafe.com"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blueink focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label htmlFor="admin-pass" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Password
            </label>
            <input
              id="admin-pass"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blueink focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-navy py-3 text-sm font-bold text-white shadow-md transition-transform active:scale-[0.99] hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Login to Admin Dashboard"}
          </button>
        </form>

        {/* Demo Helper Box */}
        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-center text-xs text-blue-900">
          💡 <strong>Demo Credentials:</strong> <br />
          Email: <code className="font-bold">admin@sutocafe.com</code> <br />
          Password: <code className="font-bold">admin123</code>
        </div>

        <button
          onClick={onBackToCustomerView}
          className="mt-4 w-full text-center text-xs font-semibold text-slate-500 hover:underline"
        >
          ← Back to Customer Menu
        </button>
      </div>
    </div>
  );
}
