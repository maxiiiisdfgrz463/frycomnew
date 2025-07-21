import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import StoriesTable from "./StoriesTable";
import StoryCreation from "./StoryCreation";

interface StoriesScreenProps {
  onBack: () => void;
}

const StoriesScreen: React.FC<StoriesScreenProps> = ({ onBack }) => {
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#0d1015] rounded-[40px]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg p-4 rounded-b-3xl shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </Button>
            <h1 className="text-2xl font-bold text-[#00b4d8]">Stories</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCreating(true)}
            className="bg-[#00b4d8] text-white rounded-full hover:bg-[#00b4d8]/80"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        {isCreating ? (
          <StoryCreation
            onCancel={() => setIsCreating(false)}
            onSuccess={() => setIsCreating(false)}
          />
        ) : (
          <StoriesTable />
        )}
      </div>
    </div>
  );
};

export default StoriesScreen;
