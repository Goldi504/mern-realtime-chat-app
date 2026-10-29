import { useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";

export default function PasswordInput({
  value,
  onChange,
  placeholder = "Enter your password",
  autoComplete = "current-password",
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <LockKeyhole
        size={18}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
      />

      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        minLength={8}
        className="h-12 w-full rounded-xl border border-[#E2E8F0] bg-white pl-11 pr-12 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#059669] focus:ring-4 focus:ring-emerald-50"
      />

      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-[#DCFCE7] hover:text-[#059669]"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}