import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  Stethoscope,
} from "lucide-react";

export default function LoginForm({
  onSubmit,
  loading,
  mode,
  onModeChange,
  registrationAllowed = false,
}) {
  const [showPassword, setShowPassword] =
    useState(false);

  const [formData, setFormData] =
    useState({
      name: "",
      email: "",
      password: "",
      otp: "",
      newPassword: "",
      confirmPassword: "",
    });

  function handleChange(event) {
    setFormData((current) => ({
      ...current,
      [event.target.name]:
        event.target.value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit?.(formData);
  }

  const register =
    mode === "register";
  const forgot = mode === "forgot";
  const reset = mode === "reset";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-violet-50 p-4 sm:p-6 lg:p-8">
      <section className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-indigo-100/60 lg:grid-cols-2">
        <motion.div
          initial={{
            opacity: 0,
            x: -30,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            duration: 0.6,
          }}
          className="hidden flex-col justify-between bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-12 text-white lg:flex"
        >
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                <Stethoscope
                  size={23}
                />
              </div>

              <div>
                <p className="text-lg font-semibold">
                  CareTrack
                </p>
                <p className="text-sm text-indigo-100">
                  Dr. Vaibhav Mathur Clinic CRM
                </p>
              </div>
            </div>

            <p className="mt-24 text-sm font-semibold tracking-[0.2em] text-indigo-200">
              CLINIC OPERATIONS
            </p>

            <h1 className="mt-5 max-w-md text-4xl font-semibold leading-tight">
              Patient follow-ups,
              appointments and records —
              all in one place.
            </h1>

            <p className="mt-6 max-w-md leading-7 text-indigo-100">
              Manage consultations,
              prescriptions, appointments
              and follow-up care with clarity.
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-5">
            <p className="text-sm leading-6 text-indigo-50">
              Secure access for
              Dr. Vaibhav Mathur and
              authorized clinic staff.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{
            opacity: 0,
            x: 30,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            duration: 0.6,
          }}
          className="flex items-center justify-center p-6 sm:p-10 lg:p-12"
        >
          <div className="w-full max-w-md">
            <div className="lg:hidden">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                <Stethoscope
                  size={23}
                />
              </div>

              <p className="mt-4 text-lg font-semibold text-slate-800">
                CareTrack
              </p>
            </div>

            <div className="mt-9 lg:mt-0">
              <p className="text-sm font-semibold tracking-[0.16em] text-indigo-600">
                {register
                  ? "CLINIC SETUP"
                  : forgot
                    ? "ACCOUNT RECOVERY"
                    : reset
                      ? "VERIFY CODE"
                      : "WELCOME BACK"}
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-800">
                {register
                  ? "Create your clinic account"
                  : forgot
                    ? "Forgot password"
                    : reset
                      ? "Set new password"
                      : "Sign in to your clinic"}
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                {register
                  ? "Create the first authorized clinic account."
                  : forgot
                    ? "Enter your clinic email to receive a 6-digit reset code."
                    : reset
                      ? "Enter the code sent to your email and choose a new password."
                      : "Enter your secure clinic credentials to continue."}
              </p>
            </div>

            <form
              className="mt-8 space-y-5"
              onSubmit={handleSubmit}
            >
              {register && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Your name
                  </label>

                  <input
                    name="name"
                    value={
                      formData.name
                    }
                    onChange={
                      handleChange
                    }
                    required
                    placeholder="Dr. Name"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={19}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    name="email"
                    type="email"
                    value={
                      formData.email
                    }
                    onChange={
                      handleChange
                    }
                    readOnly={reset}
                    required
                    placeholder="doctor@clinic.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {reset && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      6-digit code
                    </label>

                    <div className="relative">
                      <KeyRound
                        size={19}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        name="otp"
                        value={
                          formData.otp
                        }
                        onChange={
                          handleChange
                        }
                        required
                        inputMode="numeric"
                        maxLength={6}
                        pattern="[0-9]{6}"
                        placeholder="000000"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm tracking-[0.3em] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      />
                    </div>
                  </div>

                  {[
                    [
                      "newPassword",
                      "New password",
                    ],
                    [
                      "confirmPassword",
                      "Confirm new password",
                    ],
                  ].map(
                    ([name, label]) => (
                      <div key={name}>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          {label}
                        </label>

                        <input
                          name={name}
                          type="password"
                          minLength={8}
                          value={
                            formData[
                              name
                            ]
                          }
                          onChange={
                            handleChange
                          }
                          required
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        />
                      </div>
                    ),
                  )}
                </>
              )}

              {!forgot &&
                !reset && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Password
                    </label>

                    <div className="relative">
                      <LockKeyhole
                        size={19}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        name="password"
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        value={
                          formData.password
                        }
                        onChange={
                          handleChange
                        }
                        required
                        placeholder={
                          register
                            ? "At least 8 characters"
                            : "Enter your password"
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-12 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (current) =>
                              !current,
                          )
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400"
                      >
                        {showPassword ? (
                          <EyeOff
                            size={18}
                          />
                        ) : (
                          <Eye
                            size={18}
                          />
                        )}
                      </button>
                    </div>
                  </div>
                )}

              {mode === "login" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      onModeChange?.(
                        "forgot",
                      )
                    }
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 disabled:opacity-60"
              >
                {loading
                  ? register
                    ? "Creating account..."
                    : forgot
                      ? "Sending code..."
                      : reset
                        ? "Resetting password..."
                        : "Signing in..."
                  : register
                    ? "Create clinic account"
                    : forgot
                      ? "Send reset code"
                      : reset
                        ? "Reset password"
                        : "Sign in securely"}

                {!loading && (
                  <ArrowRight
                    size={18}
                  />
                )}
              </button>
            </form>

            {(forgot || reset) && (
              <button
                type="button"
                onClick={() =>
                  onModeChange?.(
                    "login",
                  )
                }
                className="mt-4 w-full text-sm font-semibold text-indigo-600"
              >
                Back to sign in
              </button>
            )}

            {!forgot &&
              !reset &&
              (register ||
                registrationAllowed) && (
                <button
                  type="button"
                  onClick={() =>
                    onModeChange?.(
                      mode ===
                        "login"
                        ? "register"
                        : "login",
                    )
                  }
                  className="mt-4 w-full text-sm font-semibold text-indigo-600"
                >
                  {mode === "login"
                    ? "Set up a new clinic account"
                    : "Already have an account? Sign in"}
                </button>
              )}

            <p className="mt-8 text-center text-xs text-slate-400">
              Authorized clinic access
              only.
            </p>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
