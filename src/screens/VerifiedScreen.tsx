import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User } from "lucide-react";

interface VerifiedScreenProps {
  onBack?: () => void;
}

const VerifiedScreen: React.FC<VerifiedScreenProps> = ({
  onBack = () => {},
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#0d1015] rounded-[40px]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg p-6 shadow-sm rounded-b-3xl">
        <div className="flex items-center gap-4">
          <button
            className="w-12 h-12 rounded-full bg-gray-200/50 dark:bg-gray-800/50 flex items-center justify-center hover:bg-gray-300/50 dark:hover:bg-gray-700/50 transition-colors"
            onClick={onBack}
          >
            <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Verifizierung
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="bg-white/50 dark:bg-gray-800/50 rounded-2xl p-6 shadow-sm">
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
            Möchtest du dein Konto verifizieren? Ein verifiziertes Konto erhöht
            dein Vertrauen in der Community und schaltet zusätzliche Funktionen
            frei.
          </p>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Kontaktiere unser Support-Team oder folge den Anweisungen in deinem
            Profil, um den Verifizierungsprozess zu starten.
          </p>
        </div>

        {/* Call to Action */}
        <div className="mt-8 text-center">
          <Button
            className="rounded-full bg-[#00b4d8] text-white hover:bg-[#00a3c4] transition-colors"
            onClick={() => navigate("/profile")} // Beispiel: Zurück zum Profil
          >
            Zurück zum Profil
          </Button>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-4 left-4 right-4 bg-cyan-200/30 dark:bg-cyan-900/30 backdrop-blur-lg border border-cyan-300/40 dark:border-cyan-800/40 flex justify-between items-center p-2 z-20 shadow-xl rounded-[40px]">
        <Button
          variant="ghost"
          size="icon"
          className="flex items-center justify-center h-14 w-14"
          onClick={() => navigate("/feed")}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="flex items-center justify-center h-14 w-14"
          onClick={() => navigate("/search")}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="flex items-center justify-center h-14 w-14 bg-[#00b4d8] rounded-full"
          onClick={() => navigate("/create-post")}
        >
          <svg
            className="h-6 w-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="flex h-14 w-14 justify-center items-center relative"
          onClick={() => navigate("/chats")}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="flex items-center justify-center h-14 w-14"
          onClick={() => navigate("/profile")}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </Button>
      </div>

      {/* Add padding at the bottom to account for the navigation bar */}
      <div className="h-20"></div>
    </div>
  );
};

export default VerifiedScreen;
