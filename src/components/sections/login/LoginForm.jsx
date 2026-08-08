import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Stethoscope,
} from "lucide-react";

export default function LoginForm({ onSubmit, loading, mode, onModeChange }) {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  function handleChange(event) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit?.(formData);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-violet-50 p-4 sm:p-6 lg:p-8">
      <section className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-indigo-100/60 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden flex-col justify-between bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-12 text-white lg:flex"
        >
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                <Stethoscope size={23} />
              </div>

              <div>
                <p className="text-lg font-semibold">CareTrack</p>
                <p className="text-sm text-indigo-100">
                  Doctor Follow-up CRM
                </p>
              </div>
            </div>

            <p className="mt-24 text-sm font-semibold tracking-[0.2em] text-indigo-200">
              CLINIC OPERATIONS
            </p>

            <h1 className="mt-5 max-w-md text-4xl font-semibold leading-tight">
              Every patient follow-up, organized in one place.
            </h1>

            <p className="mt-6 max-w-md leading-7 text-indigo-100">
              Manage patient records, appointments, prescriptions, and daily
              follow-up calls with clarity.
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-5">
            <p className="text-sm leading-6 text-indigo-50">
              Secure access for the doctor and authorized clinic assistant.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-center p-6 sm:p-10 lg:p-12"
        >
          <div className="w-full max-w-md">
            <div className="lg:hidden">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                <Stethoscope size={23} />
              </div>

              <p className="mt-4 text-lg font-semibold text-slate-800">
                CareTrack
              </p>
            </div>

            <div className="mt-9 lg:mt-0">
              <p className="text-sm font-semibold tracking-[0.16em] text-indigo-600">
                WELCOME BACK
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-800">
                {mode === "register" ? "Create your clinic account" : "Sign in to your clinic"}
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                {mode === "register" ? "Create the first authorized clinic account." : "Enter your secure clinic credentials to continue."}
              </p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              {mode === "register" && (
                <div>
                  <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">Your name</label>
                  <input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Dr. Name" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100" />
                </div>
              )}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={19}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="doctor@clinic.com"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={19}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={mode === "register" ? "At least 8 characters" : "Enter your password"}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-12 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (mode === "register" ? "Creating account..." : "Signing in...") : (mode === "register" ? "Create clinic account" : "Sign in securely")}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>

            <button type="button" onClick={() => onModeChange?.(mode === "login" ? "register" : "login")} className="mt-4 w-full text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              {mode === "login" ? "Set up a new clinic account" : "Already have an account? Sign in"}
            </button>

            <p className="mt-8 text-center text-xs leading-5 text-slate-400">
              {mode === "login"
                ? "Authorized clinic access only."
                : "Only the first clinic account can be registered."}
            </p>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
