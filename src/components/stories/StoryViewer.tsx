import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface StoryViewerProps {
  userId: string;
  onClose: () => void;
}

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  content: string | null;
  created_at: string;
  expires_at: string;
  viewed_by: string[] | null;
  author?: {
    name: string;
    avatar: string;
  };
}

const StoryViewer: React.FC<StoryViewerProps> = ({ userId, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchUserStories();
  }, [userId]);

  useEffect(() => {
    if (stories.length > 0) {
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            handleNext();
            return 0;
          }
          return prev + 1;
        });
      }, 50); // 5 seconds total (50ms * 100)

      return () => clearInterval(timer);
    }
  }, [currentIndex, stories]);

  const fetchUserStories = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // Get current time
      const now = new Date().toISOString();

      // Fetch stories for the specific user that haven't expired
      const { data: storiesData, error } = await supabase
        .from("stories")
        .select("*")
        .eq("user_id", userId)
        .gt("expires_at", now)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching stories:", error);
        setLoading(false);
        return;
      }

      if (!storiesData || storiesData.length === 0) {
        setStories([]);
        setLoading(false);
        return;
      }

      // Fetch user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", userId)
        .single();

      const authorInfo = {
        name: profileData?.name || "Unknown User",
        avatar:
          profileData?.avatar_url ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      };

      // Add author info to stories
      const storiesWithAuthor = storiesData.map((story) => ({
        ...story,
        author: authorInfo,
      }));

      setStories(storiesWithAuthor);
      markStoryAsViewed(storiesWithAuthor[0].id);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching user stories:", error);
      setLoading(false);
    }
  };

  const markStoryAsViewed = async (storyId: string) => {
    if (!user || !storyId) return;

    try {
      const { data: storyData } = await supabase
        .from("stories")
        .select("viewed_by")
        .eq("id", storyId)
        .single();

      const viewedBy = storyData?.viewed_by || [];
      if (!viewedBy.includes(user.id)) {
        viewedBy.push(user.id);

        await supabase
          .from("stories")
          .update({ viewed_by: viewedBy })
          .eq("id", storyId);
      }
    } catch (error) {
      console.error("Error marking story as viewed:", error);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
      markStoryAsViewed(stories[currentIndex - 1].id);
    } else {
      onClose();
    }
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
      markStoryAsViewed(stories[currentIndex + 1].id);
    } else {
      onClose();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center">
        <p className="text-white text-xl mb-4">No stories available</p>
        <Button onClick={onClose} variant="outline">
          Close
        </Button>
      </div>
    );
  }

  const currentStory = stories[currentIndex];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Close button */}
      <button
        className="absolute top-4 right-4 z-10 text-white p-2"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </button>

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 flex px-4 pt-2 gap-1">
        {stories.map((_, index) => (
          <div
            key={index}
            className="h-1 bg-gray-500 flex-1 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-white"
              style={{
                width:
                  index === currentIndex
                    ? `${progress}%`
                    : index < currentIndex
                      ? "100%"
                      : "0%",
              }}
            ></div>
          </div>
        ))}
      </div>

      {/* User info */}
      <div className="absolute top-8 left-4 flex items-center z-10">
        <Avatar className="h-10 w-10 mr-2 border border-white">
          <AvatarImage
            src={currentStory.author?.avatar}
            alt={currentStory.author?.name}
          />
          <AvatarFallback>
            {currentStory.author?.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-white font-medium">{currentStory.author?.name}</p>
          <p className="text-gray-300 text-xs">
            {formatDistanceToNow(new Date(currentStory.created_at), {
              addSuffix: true,
            })}
          </p>
        </div>
      </div>

      {/* Navigation buttons */}
      <button
        className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white p-2"
        onClick={handlePrevious}
      >
        <ChevronLeft className="h-8 w-8" />
      </button>
      <button
        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white p-2"
        onClick={handleNext}
      >
        <ChevronRight className="h-8 w-8" />
      </button>

      {/* Story content */}
      <div className="flex-1 flex items-center justify-center p-4">
        {currentStory.media_type === "image" ? (
          <img
            src={currentStory.media_url}
            alt="Story"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <video
            src={currentStory.media_url}
            className="max-h-full max-w-full object-contain"
            autoPlay
            playsInline
            muted
          />
        )}
      </div>

      {/* Caption */}
      {currentStory.content && (
        <div className="absolute bottom-8 left-0 right-0 px-4">
          <p className="text-white text-center bg-black bg-opacity-50 p-3 rounded-lg">
            {currentStory.content}
          </p>
        </div>
      )}
    </div>
  );
};

export default StoryViewer;
