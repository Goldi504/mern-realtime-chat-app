
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  UserRound,
  Mail,
  ArrowRight,
  LoaderCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";

import AuthLayout from "../components/auth/AuthLayout";
import PasswordInput from "../components/auth/PasswordInput";
import { registerUser } from "../services/authService";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
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

    // Validate full name
    if (form.name.trim().length < 2) {
      toast.error("Please enter your full name.");
      return;
    }

    // Validate email
    if (!form.email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }

    // Validate password
    if (form.password.length < 8) {
      toast.error("Password must contain at least 8 characters.");
      return;
    }

    // Confirm password
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await registerUser({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (response.success) {
        toast.success(
          response.message || "Account created successfully!"
        );

        // Redirect to Login after successful registration
        navigate("/login", {
          replace: true,
          state: {
            email: form.email.trim().toLowerCase(),
          },
        });
      } else {
        toast.error(response.message || "Registration failed.");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to register. Please check your backend connection."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join ChatApp and bring your conversations together."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-semibold text-[#0F172A]"
          >
            Full name
          </label>

          <div className="relative">
            <UserRound
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              autoComplete="name"
              minLength={2}
              maxLength={80}
              required
              className="h-12 w-full rounded-xl border border-[#E2E8F0] bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#059669] focus:ring-4 focus:ring-emerald-50"
            />
          </div>
        </div>

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
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-semibold text-[#0F172A]"
          >
            Password
          </label>

          <PasswordInput
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                password: event.target.value,
              }))
            }
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-2 block text-sm font-semibold text-[#0F172A]"
          >
            Confirm password
          </label>

          <PasswordInput
            value={form.confirmPassword}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                confirmPassword: event.target.value,
              }))
            }
            placeholder="Re-enter your password"
            autoComplete="new-password"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#059669] px-4 text-sm font-semibold text-white shadow-lg shadow-emerald-100 transition duration-200 hover:-translate-y-0.5 hover:bg-[#047857] hover:shadow-xl active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <LoaderCircle
                size={18}
                className="animate-spin"
              />
              Creating account...
            </>
          ) : (
            <>
              Create account
              <ArrowRight
                size={18}
                className="transition-transform group-hover:translate-x-1"
              />
            </>
          )}
        </button>

        <p className="pt-2 text-center text-xs leading-5 text-slate-400">
          By creating an account, you agree to use ChatApp responsibly.
        </p>
      </form>

      {/* Login Link */}
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-[#059669] transition hover:text-[#047857]"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
