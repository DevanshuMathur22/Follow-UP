"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import LoginForm from "../components/sections/login/LoginForm";
import {
  getRegistrationStatus,
  loginUser,
  registerUser,
} from "../services/authService";

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login");
  const [registrationAllowed, setRegistrationAllowed] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkRegistration() {
      try {
        const data = await getRegistrationStatus();

        if (active) {
          setRegistrationAllowed(data.registrationAllowed === true);
        }
      } catch {
        if (active) setRegistrationAllowed(false);
      }
    }

    void checkRegistration();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(formData) {
    try {
      setLoading(true);

      const data =
        mode === "register"
          ? await registerUser(formData)
          : await loginUser(formData);

      localStorage.removeItem("caretrack-token");
      localStorage.setItem("caretrack-user", JSON.stringify(data.user));

      toast.success(
        mode === "register"
          ? "Clinic account created"
          : "Login successful",
      );

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          (mode === "register"
            ? "Unable to create account"
            : "Unable to sign in"),
      );
    } finally {
      setLoading(false);
    }
  }

  function handleModeChange(nextMode) {
    if (nextMode === "register" && !registrationAllowed) return;
    setMode(nextMode);
  }

  return (
    <LoginForm
      onSubmit={handleSubmit}
      loading={loading}
      mode={mode}
      onModeChange={handleModeChange}
      registrationAllowed={registrationAllowed}
    />
  );
}
