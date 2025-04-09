import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Mail, Lock, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

interface SignupFormProps {
  onSignup?: (name: string, email: string, password: string) => void;
  onNavigateToLogin?: () => void;
  onBack?: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({
  onSignup = () => {},
  onNavigateToLogin = () => {},
  onBack = () => {},
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log("Submitting signup form with:", { name, email });
      // Add a small delay to ensure Supabase has time to process
      await new Promise((resolve) => setTimeout(resolve, 500));

      const result = await signUp(email, password, name);

      if (result.error) {
        console.error("Signup error:", result.error);
        toast({
          variant: "destructive",
          title: "Signup failed",
          description: result.error.message,
        });
      } else {
        console.log("Signup successful:", result.data);
        toast({
          title: "Account created",
          description: "Your account has been created successfully!",
        });
        // Add a small delay before redirecting
        await new Promise((resolve) => setTimeout(resolve, 1000));
        onSignup(name, email, password);
      }
    } catch (err) {
      console.error("Unexpected error in signup form:", err);
      toast({
        variant: "destructive",
        title: "Signup failed",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#0d1015] p-6 rounded-[40px]">
      <button
        onClick={onBack}
        className="w-12 h-12 rounded-md bg-gray-200 dark:bg-gray-800 mb-12 self-start flex items-center justify-center"
      >
        <ArrowLeft className="h-6 w-6" />
      </button>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100">
          Let's
          <br />
          Get Started
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Please fill the details to create an account
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
            <User className="h-5 w-5" />
          </div>
          <Input
            type="text"
            placeholder="Enter your name"
            className="pl-12 h-14 text-base bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

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

        <Button
          type="submit"
          className="w-full h-14 text-lg  text-white rounded-full mt-8 bg-[#00b4d8]"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Creating account...
            </>
          ) : (
            "Sign up"
          )}
        </Button>

        <div className="text-center mt-8">
          <p className="text-gray-600 dark:text-gray-400">
            Already have an Account?{" "}
            <Button
              variant="link"
              className="p-0 h-auto font-semibold text-[#00b4d8]"
              onClick={onNavigateToLogin}
            >
              Login
            </Button>
          </p>
        </div>
      </form>
    </div>
  );
};

export default SignupForm;
