import React from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  showBackButton = false,
  onBackClick = () => {},
}) => {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950 p-4 pt-6">
      {showBackButton && (
        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 rounded-md bg-gray-200 dark:bg-gray-800 mb-12 self-start"
          onClick={onBackClick}
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
      )}

      <div className="flex flex-col flex-1 max-w-md mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100">
            {title}
          </h1>
          {subtitle && (
            <p className="text-gray-500 dark:text-gray-400 mt-2">{subtitle}</p>
          )}
        </div>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
};

export default AuthLayout;
