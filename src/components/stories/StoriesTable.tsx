import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  content: string | null;
  created_at: string;
  expires_at: string;
  viewed_by: any[] | null;
  author?: {
    name: string;
    avatar: string;
  };
}

const StoriesTable: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchStories();
  }, [user]);

  const fetchStories = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get current time
      const now = new Date().toISOString();

      // Fetch stories that haven't expired yet
      const { data: storiesData, error } = await supabase
        .from("stories")
        .select("*")
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

      // Get unique user IDs from stories
      const userIds = [...new Set(storiesData.map((story) => story.user_id))];

      // Fetch user profiles for all story authors
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds);

      // Create a map of user profiles
      const profilesMap = new Map();
      profilesData?.forEach((profile) => {
        profilesMap.set(profile.id, {
          name: profile.name || "Unknown User",
          avatar:
            profile.avatar_url ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`,
        });
      });

      // Combine stories with author information
      const storiesWithAuthors = storiesData.map((story) => ({
        ...story,
        author: profilesMap.get(story.user_id) || {
          name: "Unknown User",
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${story.user_id}`,
        },
      }));

      // Check which stories the current user has viewed
      const viewed = new Set<string>();
      storiesWithAuthors.forEach((story) => {
        if (
          story.viewed_by &&
          Array.isArray(story.viewed_by) &&
          story.viewed_by.includes(user.id)
        ) {
          viewed.add(story.id);
        }
      });

      setViewedStories(viewed);
      setStories(storiesWithAuthors);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching stories:", error);
      setLoading(false);
    }
  };

  const handleStoryClick = async (storyId: string, userId: string) => {
    // Navigate to story view
    navigate(`/story/${userId}`);

    // Mark story as viewed if it's not already viewed
    if (!viewedStories.has(storyId) && user) {
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

          setViewedStories((prev) => new Set([...prev, storyId]));
        }
      } catch (error) {
        console.error("Error updating story view status:", error);
      }
    }
  };

  // Group stories by user
  const storiesByUser = stories.reduce(
    (acc, story) => {
      const userId = story.user_id;
      if (!acc[userId]) {
        acc[userId] = [];
      }
      acc[userId].push(story);
      return acc;
    },
    {} as Record<string, Story[]>,
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-[#00b4d8]" />
      </div>
    );
  }

  if (Object.keys(storiesByUser).length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500 dark:text-gray-400">
          No stories available. Create your first story!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
      {Object.entries(storiesByUser).map(([userId, userStories]) => {
        const story = userStories[0]; // Use first story for user info
        const hasUnviewedStories = userStories.some(
          (s) => !viewedStories.has(s.id),
        );

        return (
          <div
            key={userId}
            className="flex flex-col items-center cursor-pointer"
            onClick={() => handleStoryClick(userStories[0].id, userId)}
          >
            <div
              className={`p-0.5 rounded-full ${hasUnviewedStories ? "bg-gradient-to-tr from-[#00b4d8] to-[#0077b6]" : "bg-gray-300 dark:bg-gray-700"}`}
            >
              <Avatar className="w-16 h-16 border-2 border-white dark:border-gray-800">
                <AvatarImage
                  src={story.author?.avatar}
                  alt={story.author?.name}
                />
                <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {story.author?.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <p className="mt-2 text-xs text-center truncate w-full">
              {story.author?.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(new Date(story.created_at), {
                addSuffix: true,
              })}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default StoriesTable;
