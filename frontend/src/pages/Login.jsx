
import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Mail,
  ArrowRight,
  LoaderCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";

import AuthLayout from "../components/auth/AuthLayout";
import PasswordInput from "../components/auth/PasswordInput";
import { loginUser } from "../services/authService";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const { refreshUser } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.email.trim() || !form.password) {
      toast.error("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await loginUser({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (!response.success) {
        toast.error(response.message || "Login failed.");
        return;
      }

      // The backend sets the HTTP-only authentication cookie.
      // Fetch the authenticated user and update React context.
      const currentUser = await refreshUser();

      if (!currentUser) {
        toast.error(
          "Login succeeded, but your session could not be verified. Please try again."
        );
        return;
      }

      toast.success(response.message || "Login successful!");

      // Return to the page the user originally requested,
      // or open the chat dashboard by default.
      const destination = location.state?.from?.pathname;

      navigate(
        destination && destination !== "/login"
          ? destination
          : "/chats",
        { replace: true }
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to log in. Please check your backend connection."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Enter your details to access your conversations."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-[#0F172A]"
          >
            Email address
          </label>

          <div className="relative">
            <Mail
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="h-12 w-full rounded-xl border border-[#E2E8F0] bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#059669] focus:ring-4 focus:ring-emerald-50"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label
              htmlFor="password"
              className="text-sm font-semibold text-[#0F172A]"
            >
              Password
            </label>

            <button
              type="button"
              onClick={() =>
                toast(
                  "Password recovery can be added after backend integration."
                )
              }
              className="text-xs font-semibold text-[#059669] transition hover:text-[#047857]"
            >
              Forgot password?
            </button>
          </div>

          <PasswordInput
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                password: event.target.value,
              }))
            }
            placeholder="Enter your password"
            autoComplete="current-password"
          />
        </div>

        {/* Submit */}
        <MotionSubmitButton loading={loading} />
      </form>

      {/* Register Link */}
      <p className="mt-7 text-center text-sm text-slate-500">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="font-semibold text-[#059669] transition hover:text-[#047857]"
        >
          Create account
        </Link>
      </p>
    </AuthLayout>
  );
}

function MotionSubmitButton({ loading }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#059669] px-4 text-sm font-semibold text-white shadow-lg shadow-emerald-100 transition duration-200 hover:-translate-y-0.5 hover:bg-[#047857] hover:shadow-xl hover:shadow-emerald-100 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <>
          <LoaderCircle
            size={18}
            className="animate-spin"
          />
          Signing in...
        </>
      ) : (
        <>
          Sign in
          <ArrowRight
            size={18}
            className="transition-transform group-hover:translate-x-1"
          />
        </>
      )}
    </button>
  );
}
