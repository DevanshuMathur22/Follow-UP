"use client";

import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import LoginForm from "../components/sections/login/LoginForm";
import {
  getRegistrationStatus,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPasswordWithOtp,
} from "../services/authService";

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] =
    useState(false);
  const [mode, setMode] =
    useState("login");
  const [
    registrationAllowed,
    setRegistrationAllowed,
  ] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkRegistration() {
      try {
        const data =
          await getRegistrationStatus();

        if (active) {
          setRegistrationAllowed(
            data.registrationAllowed ===
              true,
          );
        }
      } catch {
        if (active) {
          setRegistrationAllowed(false);
        }
      }
    }

    void checkRegistration();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(
    formData,
  ) {
    try {
      setLoading(true);

      if (mode === "forgot") {
        const data =
          await requestPasswordReset(
            formData.email,
          );

        toast.success(
          data.message ||
            "Reset code sent",
        );

        setMode("reset");
        return;
      }

      if (mode === "reset") {
        if (
          formData.newPassword !==
          formData.confirmPassword
        ) {
          toast.error(
            "New passwords do not match",
          );
          return;
        }

        const data =
          await resetPasswordWithOtp({
            email: formData.email,
            otp: formData.otp,
            newPassword:
              formData.newPassword,
          });

        toast.success(
          data.message ||
            "Password reset successfully",
        );

        setMode("login");
        return;
      }

      const data =
        mode === "register"
          ? await registerUser(formData)
          : await loginUser(formData);

      localStorage.removeItem(
        "caretrack-token",
      );

      localStorage.setItem(
        "caretrack-user",
        JSON.stringify(data.user),
      );

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
            : mode === "forgot"
              ? "Unable to send reset code"
              : mode === "reset"
                ? "Unable to reset password"
                : "Unable to sign in"),
      );
    } finally {
      setLoading(false);
    }
  }

  function handleModeChange(
    nextMode,
  ) {
    if (
      nextMode === "register" &&
      !registrationAllowed
    ) {
      return;
    }

    setMode(nextMode);
  }

  return (
    <LoginForm
      onSubmit={handleSubmit}
      loading={loading}
      mode={mode}
      onModeChange={
        handleModeChange
      }
      registrationAllowed={
        registrationAllowed
      }
    />
  );
}
