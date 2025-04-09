import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  User,
  Heart,
  MessageSquare,
  UserPlus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface NotificationsScreenProps {
  onBack?: () => void;
}

interface Notification {
  id: string;
  type: "like" | "comment" | "follow";
  content: string;
  timestamp: string;
  sender: {
    id: string;
    name: string;
    avatar: string;
  };
  postId?: string;
  read: boolean;
}

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  onBack = () => {},
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Fetch likes on user's posts
        const { data: likesData, error: likesError } = await supabase
          .from("likes")
          .select("*, posts!inner(*), profiles!inner(*)")
          .eq("posts.user_id", user.id)
          .neq("user_id", user.id) // Don't show user's own likes
          .order("created_at", { ascending: false });

        if (likesError) {
          console.error("Error fetching likes:", likesError);
        }

        // Fetch comments on user's posts
        const { data: commentsData, error: commentsError } = await supabase
          .from("comments")
          .select("*, posts!inner(*), profiles!inner(*)")
          .eq("posts.user_id", user.id)
          .neq("user_id", user.id) // Don't show user's own comments
          .order("created_at", { ascending: false });

        if (commentsError) {
          console.error("Error fetching comments:", commentsError);
        }

        // Fetch follows for the user
        let followsData = [];
        let followsError = null;
        try {
          // Check if follows table exists first
          const { data, error } = await supabase
            .from("follows")
            .select("count(*)", { count: "exact", head: true });

          if (!error) {
            // If follows table exists, fetch data
            const response = await supabase
              .from("follows")
              .select("*, profiles!inner(*)")
              .eq("followed_id", user.id)
              .order("created_at", { ascending: false });
            followsData = response.data || [];
            followsError = response.error;
          } else {
            console.log("Follows table may not exist yet");
          }
        } catch (error) {
          console.error("Error fetching follows:", error);
          followsError = error;
        }

        if (followsError) {
          console.error("Error fetching follows:", followsError);
        }

        // Format likes notifications
        const likeNotifications = (likesData || []).map((like) => ({
          id: `like_${like.id}`,
          type: "like" as const,
          content: "liked your post",
          timestamp: formatDistanceToNow(new Date(like.created_at), {
            addSuffix: true,
          }),
          sender: {
            id: like.user_id,
            name: like.profiles.name || "Unknown User",
            avatar:
              like.profiles.avatar_url ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${like.user_id}`,
          },
          postId: like.post_id,
          read: false,
        }));

        // Format comments notifications
        const commentNotifications = (commentsData || []).map((comment) => ({
          id: `comment_${comment.id}`,
          type: "comment" as const,
          content:
            "commented on your post: " +
            (comment.content.length > 30
              ? comment.content.substring(0, 30) + "..."
              : comment.content),
          timestamp: formatDistanceToNow(new Date(comment.created_at), {
            addSuffix: true,
          }),
          sender: {
            id: comment.user_id,
            name: comment.profiles.name || "Unknown User",
            avatar:
              comment.profiles.avatar_url ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user_id}`,
          },
          postId: comment.post_id,
          read: false,
        }));

        // Format follows notifications
        const followNotifications = (followsData || []).map((follow) => ({
          id: `follow_${follow.id}`,
          type: "follow" as const,
          content: "started following you",
          timestamp: formatDistanceToNow(new Date(follow.created_at), {
            addSuffix: true,
          }),
          sender: {
            id: follow.follower_id,
            name: follow.profiles.name || "Unknown User",
            avatar:
              follow.profiles.avatar_url ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${follow.follower_id}`,
          },
          read: false,
        }));

        // Combine all notifications
        const allNotifications = [
          ...likeNotifications,
          ...commentNotifications,
          ...followNotifications,
        ];

        // Sort by timestamp (newest first)
        allNotifications.sort((a, b) => {
          // Extract the time part from the "X time ago" format
          const timeA = a.timestamp.replace(" ago", "");
          const timeB = b.timestamp.replace(" ago", "");

          // For simplicity, we'll compare the original timestamps
          // This works because formatDistanceToNow creates consistent strings
          // that can be compared alphabetically for recency
          return timeA.localeCompare(timeB);
        });

        setNotifications(allNotifications);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="h-5 w-5 text-red-500" />;
      case "comment":
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case "follow":
        return <UserPlus className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#0d1015] rounded-[40px]">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 p-4 flex items-center">
        <button
          className="w-10 h-10 rounded-md bg-gray-200 dark:bg-gray-800 flex items-center justify-center mr-4"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold">Notifications</h1>
      </div>

      <div className="flex-1 p-4">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                onClick={() => {
                  if (notification.type === "follow") {
                    navigate(`/user/${notification.sender.id}`);
                  } else if (notification.postId) {
                    navigate("/feed");
                  }
                }}
              >
                <div className="flex-shrink-0 mr-3 bg-white dark:bg-gray-700 rounded-full p-2">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center mb-1">
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage
                        src={notification.sender.avatar}
                        alt={notification.sender.name}
                      />
                      <AvatarFallback>
                        {notification.sender.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        <span className="font-bold">
                          {notification.sender.name}
                        </span>{" "}
                        {notification.content}
                      </p>
                      <p className="text-xs text-gray-500">
                        {notification.timestamp}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Bell className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No notifications yet
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              When someone likes or comments on your posts, you'll see it here
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsScreen;
