import { motion } from "framer-motion";
import { MessageCircle, ShieldCheck, Zap, Users } from "lucide-react";

const features = [
  {
    icon: MessageCircle,
    title: "Conversations that flow",
    description: "Enjoy simple, real-time conversations.",
  },
  {
    icon: Users,
    title: "Stay close to your people",
    description: "Bring friends and teams together.",
  },
  {
    icon: ShieldCheck,
    title: "Your space, your privacy",
    description: "Sign in securely to your account.",
  },
];

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <main className="min-h-screen bg-[#F8FAFC] p-3 sm:p-5 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-24px)] max-w-6xl overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white shadow-xl shadow-slate-200/50 sm:min-h-[calc(100vh-40px)] lg:grid-cols-2">
        {/* Left branding panel */}
        <section className="relative hidden overflow-hidden bg-[#0F172A] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />

          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#059669] shadow-lg shadow-emerald-900/30">
              <MessageCircle size={25} />
            </div>

            <span className="text-2xl font-bold tracking-tight">
              ChatApp
            </span>
          </motion.div>

          <div className="relative z-10 my-12">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-emerald-200">
                <Zap size={14} />
                YOUR WORLD, CONNECTED
              </span>

              <h1 className="mt-7 max-w-lg text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
                Good conversations
                <span className="mt-2 block text-emerald-400">
                  make every day better.
                </span>
              </h1>

              <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">
                A simple place to message your friends, connect with
                your team, and keep every conversation moving.
              </p>
            </motion.div>

            <div className="mt-10 space-y-5">
              {features.map(({ icon: Icon, title, description }, index) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + index * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-emerald-300">
                    <Icon size={19} />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold">{title}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      {description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-xs text-slate-400">
            Connect. Communicate. Stay together.
          </p>
        </section>

        {/* Right form panel */}
        <section className="flex min-w-0 items-center justify-center px-5 py-10 sm:px-10 lg:px-12 xl:px-16">
          <div className="w-full max-w-md">
            <div className="mb-9 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#059669] text-white">
                <MessageCircle size={23} />
              </div>

              <span className="text-xl font-bold text-[#0F172A]">
                ChatApp
              </span>
            </div>

            <motion.div
              key={title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-sm font-semibold text-[#059669]">
                WELCOME TO CHATAPP
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0F172A] sm:text-4xl">
                {title}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                {subtitle}
              </p>

              <div className="mt-8">{children}</div>
            </motion.div>
          </div>
        </section>
      </div>
    </main>
  );
}