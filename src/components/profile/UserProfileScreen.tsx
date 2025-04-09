import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Share2,
  MoreVertical,
  MapPin,
  Loader2,
  UserPlus,
  UserCheck,
  HomeIcon,
  Search,
  Plus,
  User,
} from "lucide-react";
import MediaDisplay from "@/components/feed/MediaDisplay";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

interface UserProfileScreenProps {
  userId: string;
  onBack?: () => void;
}

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({
  userId,
  onBack = () => {},
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          return;
        }

        if (data) {
          setProfile({
            id: data.id,
            name: data.name || "",
            location: data.location || "",
            email: data.show_email ? data.email : "",
            phone: data.show_phone ? data.phone : "",
            avatar:
              data.avatar_url ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
            bio: data.bio || "",
          });
        }

        // Check if current user is following this profile
        if (user) {
          try {
            // Check following status
            const { data: followData, error: followError } = await supabase
              .from("follows")
              .select("*")
              .eq("follower_id", user.id)
              .eq("followed_id", userId);

            if (!followError && followData && followData.length > 0) {
              setIsFollowing(true);
            } else {
              setIsFollowing(false);
            }

            // Get followers count
            const { count: followersCountData, error: followersError } =
              await supabase
                .from("follows")
                .select("*", { count: "exact" })
                .eq("followed_id", userId);

            if (!followersError) {
              setFollowersCount(followersCountData || 0);
            }

            // Get following count
            const { count: followingCountData, error: followingError } =
              await supabase
                .from("follows")
                .select("*", { count: "exact" })
                .eq("follower_id", userId);

            if (!followingError) {
              setFollowingCount(followingCountData || 0);
            }
          } catch (error) {
            console.error("Error checking follow status:", error);
          }
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, user]);

  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!userId) return;

      try {
        setLoadingPosts(true);
        // Fetch posts by this user
        const { data: postsData, error } = await supabase
          .from("posts")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching user posts:", error);
          return;
        }

        if (!postsData || postsData.length === 0) {
          setUserPosts([]);
          setLoadingPosts(false);
          return;
        }

        // Format posts
        const formattedPosts = await Promise.all(
          postsData.map(async (post) => {
            // Get comments count
            const { count: commentsCount } = await supabase
              .from("comments")
              .select("id", { count: "exact" })
              .eq("post_id", post.id);

            // Get likes count
            const { count: likesCount } = await supabase
              .from("likes")
              .select("id", { count: "exact" })
              .eq("post_id", post.id);

            // Check if current user liked this post
            let isLiked = false;
            if (user) {
              const { data: likeData } = await supabase
                .from("likes")
                .select("*")
                .eq("post_id", post.id)
                .eq("user_id", user.id)
                .single();

              isLiked = !!likeData;
            }

            return {
              id: post.id,
              content: post.content,
              media: post.media_url
                ? {
                    type: post.media_type || "image",
                    src: post.media_url,
                    alt: "Post media",
                  }
                : undefined,
              timestamp: formatDistanceToNow(new Date(post.created_at), {
                addSuffix: true,
              }),
              likes: likesCount || 0,
              comments: commentsCount || 0,
              shares: 0,
              isLiked,
            };
          }),
        );

        setUserPosts(formattedPosts);
      } catch (error) {
        console.error("Error fetching user posts:", error);
      } finally {
        setLoadingPosts(false);
      }
    };

    fetchUserPosts();
  }, [userId, user]);

  const handleFollow = async () => {
    if (!user || user.id === userId) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow - first check if the follow relationship exists
        const { data: followData } = await supabase
          .from("follows")
          .select("*")
          .eq("follower_id", user.id)
          .eq("followed_id", userId);

        if (followData && followData.length > 0) {
          const { error } = await supabase
            .from("follows")
            .delete()
            .eq("follower_id", user.id)
            .eq("followed_id", userId);

          if (error) {
            console.error("Error unfollowing:", error);
            throw error;
          }

          setIsFollowing(false);
          setFollowersCount((prev) => Math.max(0, prev - 1));
          toast({
            title: "Unfollowed",
            description: `You are no longer following ${profile?.name}`,
          });
        }
      } else {
        // Follow - first check if the follow relationship already exists
        const { data: existingFollow } = await supabase
          .from("follows")
          .select("*")
          .eq("follower_id", user.id)
          .eq("followed_id", userId);

        if (!existingFollow || existingFollow.length === 0) {
          const followData = {
            follower_id: user.id,
            followed_id: userId,
            created_at: new Date().toISOString(),
          };

          const { error } = await supabase.from("follows").insert(followData);

          if (error) {
            console.error("Error following:", error);
            throw error;
          }

          setIsFollowing(true);
          setFollowersCount((prev) => prev + 1);
          toast({
            title: "Following",
            description: `You are now following ${profile?.name}`,
          });
        }
      }
    } catch (error) {
      console.error("Error updating follow status:", error);
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive",
      });
    } finally {
      setFollowLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;

    // Find the post and toggle its like status
    const updatedPosts = [...userPosts];
    const postIndex = updatedPosts.findIndex((p) => p.id === postId);

    if (postIndex === -1) return;

    const post = updatedPosts[postIndex];
    const newIsLiked = !post.isLiked;

    // Update UI optimistically
    updatedPosts[postIndex] = {
      ...post,
      isLiked: newIsLiked,
      likes: newIsLiked ? post.likes + 1 : post.likes - 1,
    };

    setUserPosts(updatedPosts);

    try {
      if (newIsLiked) {
        // Add like to database
        await supabase.from("likes").insert({
          post_id: postId,
          user_id: user.id,
          created_at: new Date().toISOString(),
        });
      } else {
        // Remove like from database
        await supabase
          .from("likes")
          .delete()
          .match({ post_id: postId, user_id: user.id });
      }
    } catch (error) {
      console.error("Error updating like:", error);
      // Revert UI change on error
      setUserPosts(userPosts);
    }
  };

  const handleStartChat = () => {
    if (!userId) return;
    navigate(`/chat/${userId}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white dark:bg-[#0d1015] rounded-[40px] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-gray-500">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#0d1015] rounded-[40px]">
      {/* Header */}
      <div className="flex justify-between items-center p-4">
        <button
          className="w-12 h-12 rounded-md bg-gray-200 dark:bg-gray-800 flex items-center justify-center"
          onClick={onBack}
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold">Profile</h1>
        <div className="w-12 h-12"></div> {/* Empty div for spacing */}
      </div>

      {/* Profile Info */}
      <div className="flex flex-col items-center px-6 py-8">
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
          <img
            src={profile?.avatar}
            alt={profile?.name}
            className="w-full h-full object-cover"
          />
        </div>

        <h2 className="text-2xl font-bold mt-4">{profile?.name}</h2>
        {profile?.location && (
          <div className="flex items-center text-gray-500 mt-1">
            <MapPin className="h-4 w-4 mr-1" />
            <p>{profile.location}</p>
          </div>
        )}

        <div className="flex items-center space-x-6 mt-4">
          <div className="text-center">
            <p className="font-bold">{userPosts.length}</p>
            <p className="text-sm text-gray-500">Posts</p>
          </div>
          <div className="text-center">
            <p className="font-bold">{followersCount}</p>
            <p className="text-sm text-gray-500">Followers</p>
          </div>
          <div className="text-center">
            <p className="font-bold">{followingCount}</p>
            <p className="text-sm text-gray-500">Following</p>
          </div>
        </div>

        {user && user.id !== userId && (
          <div className="flex space-x-2 mt-4">
            <Button
              onClick={handleFollow}
              variant={isFollowing ? "outline" : "default"}
              className="flex items-center gap-2"
              disabled={followLoading}
            >
              {followLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isFollowing ? (
                <>
                  <UserCheck className="h-4 w-4" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Follow
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleStartChat}
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Message
            </Button>
          </div>
        )}

        <div className="w-full mt-6 space-y-4">
          {profile?.email && (
            <div className="flex items-center">
              <span className="text-gray-600">{profile.email}</span>
            </div>
          )}
          {profile?.bio && (
            <div className="mt-2">
              <p className="text-gray-600">{profile.bio}</p>
            </div>
          )}
        </div>
      </div>

      {/* User Posts */}
      <div className="flex-1 px-4 py-6">
        <h2 className="text-xl font-semibold mb-4">Posts</h2>

        {loadingPosts ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : userPosts.length > 0 ? (
          <div className="space-y-4">
            {userPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
              >
                <div className="flex items-start p-4">
                  <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                    <img
                      src={profile?.avatar}
                      alt={profile?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-semibold">{profile?.name}</h3>
                        <p className="text-xs text-gray-500">
                          {post.timestamp}
                        </p>
                      </div>
                      <button className="h-8 w-8 flex items-center justify-center">
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </div>

                    {post.content && <p className="mt-2">{post.content}</p>}

                    {post.media && (
                      <div className="mt-3 rounded-lg overflow-hidden">
                        <MediaDisplay
                          type={post.media.type}
                          src={post.media.src}
                          alt={post.media.alt || "Post media"}
                        />
                      </div>
                    )}

                    <div className="flex items-center mt-3">
                      <button
                        className="flex items-center gap-1 p-2"
                        onClick={() => handleLike(post.id)}
                      >
                        <Heart
                          className={`h-5 w-5 ${post.isLiked ? "fill-red-500 text-red-500" : ""}`}
                        />
                        <span>{post.likes}</span>
                      </button>
                      <button className="flex items-center gap-1 p-2">
                        <MessageSquare className="h-5 w-5" />
                        <span>{post.comments}</span>
                      </button>
                      <button className="flex items-center gap-1 p-2">
                        <Share2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400">No posts yet.</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around items-center p-2 z-20 shadow-lg">
        <Button
          variant="ghost"
          size="icon"
          className="flex items-center justify-center h-14 w-16"
          onClick={() => navigate("/feed")}
        >
          <HomeIcon className="h-6 w-6" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="flex items-center justify-center h-14 w-16"
          onClick={() => navigate("/search")}
        >
          <Search className="h-6 w-6" />
        </Button>

        {/* Create Post Button (Centered) */}
        <Button
          onClick={() => navigate("/create-post")}
          className="flex items-center justify-center h-12 w-12 rounded-full hover:bg-emerald-500 shadow-lg bg-[#00b4d8] absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
        >
          <Plus className="h-6 w-6" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="flex items-center justify-center h-14 w-16"
          onClick={() => navigate("/chats")}
        >
          <MessageSquare className="h-6 w-6" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="flex items-center justify-center h-14 w-16"
          onClick={() => navigate("/profile")}
        >
          <User className="h-6 w-6" />
        </Button>
      </div>

      {/* Add padding at the bottom to account for the navigation bar */}
      <div className="h-16"></div>
    </div>
  );
};

export default UserProfileScreen;
