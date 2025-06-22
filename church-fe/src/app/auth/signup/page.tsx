"use client";
import { registerUser } from "@/controllers/signupController";
import { setUser } from "@/store/userSlice";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { useState } from "react";

function SignupPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    churchName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const data = await registerUser({
        email: form.email,
        churchName: form.churchName,
        password: form.password,
      });

      // console.log("Registration response:", data);
      console.log("Registration response user:", data.user);
      // console.log("Registration response:", data);

      if (data?.user && data?.token) {
        console.log("dispatch enter:", data.user)
        dispatch(setUser({
          id: data.user.id,
          email: data.user.email,
          token: data.token,
        }));
      }
      console.log("dispatch exit:", data.user)
      // router.push("/dashboard/admin");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900x flex items-center justify-center">
      <div className="max-w-lg mx-auto  bg-white dark:bg-gray-800 rounded-lg shadow-md px-8 py-10 flex flex-col items-center">
        <h1 className="text-xl font-bold text-center text-gray-700 dark:text-gray-200 mb-8">
          The United Church
        </h1>

        <form
          action="#"
          className="w-full flex flex-col gap-4"
          onSubmit={handleSubmit}
        >
          <div className="flex items-start flex-col justify-start">
            <label
              htmlFor="firstName"
              className="text-sm text-gray-700 dark:text-gray-200 mr-2"
            >
              Church Name:
            </label>
            <input
              type="text"
              id="firstName"
              name="churchName"
              value={form.churchName}
              onChange={handleChange}
              className="w-full px-3 dark:text-gray-200 dark:bg-gray-900 py-2 rounded-md border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-start flex-col justify-start">
            <label
              htmlFor="email"
              className="text-sm text-gray-700 dark:text-gray-200 mr-2"
            >
              Email:
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-3 dark:text-gray-200 dark:bg-gray-900 py-2 rounded-md border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-start flex-col justify-start">
            <label
              htmlFor="password"
              className="text-sm text-gray-700 dark:text-gray-200 mr-2"
            >
              Password:
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full px-3 dark:text-gray-200 dark:bg-gray-900 py-2 rounded-md border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-start flex-col justify-start">
            <label
              htmlFor="confirmPassword"
              className="text-sm text-gray-700 dark:text-gray-200 mr-2"
            >
              Confirm Password:
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full px-3 dark:text-gray-200 dark:bg-gray-900 py-2 rounded-md border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {error && (
            <div className="text-red-500 text-sm mb-2">{error}</div>
          )}
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md shadow-sm"
            disabled={loading}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <span className="text-sm text-gray-500 dark:text-gray-300">
            Already have an account?{" "}
          </span>
          <button
            type="button"
            onClick={() => router.push("/auth/login")}
            className="text-blue-500 hover:text-blue-600 underline bg-transparent border-none p-0 cursor-pointer"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;