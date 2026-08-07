import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import LoginForm from "../components/sections/login/LoginForm";
import { loginUser, registerUser } from "../services/authService";

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login");

  async function handleSubmit(formData) {
    try {
      setLoading(true);

      const data = mode === "register" ? await registerUser(formData) : await loginUser(formData);

      localStorage.setItem("caretrack-token", data.token);
      localStorage.setItem("caretrack-user", JSON.stringify(data.user));
      toast.success(data.isDemo ? "Demo workspace opened" : mode === "register" ? "Clinic account created" : "Login successful");
      router.replace("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || (mode === "register" ? "Unable to create account. Try again." : "Unable to sign in. Try again."));
    } finally {
      setLoading(false);
    }
  }

  return <LoginForm onSubmit={handleSubmit} loading={loading} mode={mode} onModeChange={setMode} />;
}
