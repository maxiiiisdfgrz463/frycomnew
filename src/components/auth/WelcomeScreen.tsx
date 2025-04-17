import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface WelcomeScreenProps {
  onGetStarted?: () => void;
  onLogin?: () => void;
  onBack?: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onGetStarted = () => {},
  onLogin = () => {},
  onBack = () => {},
}) => {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#0d1015] p-6 rounded-[40px]">
      <button
        onClick={onBack}
        className="w-12 h-12 rounded-md bg-gray-200 dark:bg-gray-800 mb-12 self-start flex static justify-center items-center"
      >
        <ArrowLeft className="h-6 w-6" />
      </button>
      <div className="flex-1 flex flex-col items-center text-center pt-8">
        <div className="mb-12">
          <img
            src="/public/Group.svg"
            alt="FRYCOM Logo"
            className="w-48 h-48 mx-auto"
          />
        </div>
        <h1 className="text-5xl mb-4 font-bold flex text-[#00b4d8]">FRYCOM</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-16">
          Where every thought finds a home.
        </p>
        <div className="w-full max-w-md space-y-4">
          <Button
            onClick={onGetStarted}
            className="w-full h-14 text-lg text-white rounded-[10px] bg-[#00b4d8]"
          >
            Getting Started
          </Button>

          <div className="text-center mt-8">
            <p className="text-gray-600 dark:text-gray-400">
              Already have an Account?{" "}
              <Button
                variant="link"
                className="p-0 h-auto font-semibold text-[#00b4d8]"
                onClick={onLogin}
              >
                Login
              </Button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
