import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface LoginFormProps {
  onLogin?: (email: string, password: string) => void;
  onNavigateToSignup?: () => void;
  onBack?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onLogin = () => {},
  onNavigateToSignup = () => {},
  onBack = () => {},
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log("Attempting login with:", email);
      // Add a small delay to ensure Supabase has time to process
      await new Promise((resolve) => setTimeout(resolve, 500));

      const result = await onLogin(email, password);

      if (
        result &&
        typeof result === "object" &&
        "error" in result &&
        result.error
      ) {
        console.error("Login error:", result.error);
        toast({
          variant: "destructive",
          title: "Login failed",
          description:
            (result.error as Error).message ||
            "Invalid email or password. Please try again.",
        });
      } else {
        console.log("Login successful");
      }
    } catch (error) {
      console.error("Unexpected error during login:", error);
      toast({
        variant: "destructive",
        title: "Login failed",
        description:
          error instanceof Error
            ? error.message
            : "Invalid email or password. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#0d1015] p-6 rounded-[40px]">
      <button
        onClick={onBack}
        className="w-12 h-12 rounded-md bg-gray-200 dark:bg-gray-800 mb-12 self-start flex static justify-center items-center"
      >
        <ArrowLeft className="h-6 w-6" />
      </button>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100">
          Hey,
          <br />
          Welcome Back
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Please login to continue
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
            <Mail className="h-5 w-5" />
          </div>
          <Input
            type="email"
            placeholder="Enter your email"
            className="pl-12 h-14 text-base bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
            <Lock className="h-5 w-5" />
          </div>
          <Input
            type="password"
            placeholder="Enter your password"
            className="pl-12 h-14 text-base bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-lg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end">
          <Button variant="link" className="text-right p-0 h-auto">
            Forgot Password?
          </Button>
        </div>

        <Button
          type="submit"
          className="w-full h-14 text-lg  text-white rounded-full bg-[#00b4d8]"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Logging in...
            </>
          ) : (
            "Login"
          )}
        </Button>

        <div className="text-center mt-8">
          <p className="text-gray-600 dark:text-gray-400">
            Don't have an Account?{" "}
            <Button
              variant="link"
              className="p-0 h-auto font-semibold text-[#00b4d8]"
              onClick={onNavigateToSignup}
            >
              Sign up
            </Button>
          </p>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;
