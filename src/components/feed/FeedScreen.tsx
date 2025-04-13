import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Heart,
  MessageSquare,
  Share2,
  MoreVertical,
  Plus,
  Loader2,
  ArrowLeft,
  Search,
  Home as HomeIcon,
  Bell,
  User,
  Trash2,
  Flag,
} from "lucide-react";
import { useNotifications } from "@/routes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion"; // Für die Like-Animation
import CommentSection from "./CommentSection";

interface FeedScreenProps {
  onCreatePost?: () => void;
  onProfile?: () => void;
  onNotifications?: () => void;
  posts?: Array<{
    id: string;
    author: {
      name: string;
      username: string;
      avatar: string;
    };
    content?: string;
    media?: {
      type: "image" | "video";
      src: string;
      alt?: string;
    };
    timestamp: string;
    likes: number;
    comments: number;
    shares: number;
    isLiked: boolean;
  }>;
}

const FeedScreen: React.FC<FeedScreenProps> = ({
  onCreatePost = () => {},
  onProfile = () => {},
  onNotifications = () => {},
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasUnreadMessages, hasUnreadNotifications } = useNotifications();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedComments, setExpandedComments] = useState<{
    [key: string]: boolean;
  }>({});
  const [videoPlaying, setVideoPlaying] = useState<{ [key: string]: boolean }>(
    {},
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null);
  const [likeAnimation, setLikeAnimation] = useState<{
    [key: string]: boolean;
  }>({}); // Zustand für die Like-Animation
  const [lastTap, setLastTap] = useState<{ [key: string]: number }>({}); // Für Double-Tap-Erkennung

  // Fetch the user's profile image from the profiles table
  useEffect(() => {
    const fetchUserProfileImage = async () => {
      if (!user) return;

      try {
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching user profile image:", error);
          return;
        }

        setUserProfileImage(
          profileData?.avatar_url ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || user?.id || "user"}`,
        );
      } catch (error) {
        console.error("Error fetching user profile image:", error);
        setUserProfileImage(
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || user?.id || "user"}`,
        );
      }
    };

    fetchUserProfileImage();
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    const fetchPosts = async () => {
      if (!user) return;

      try {
        setLoading(true);

        let query = supabase
          .from("posts")
          .select("*")
          .order("created_at", { ascending: false });

        if (searchQuery) {
          query = query.ilike("content", `%${searchQuery}%`);
        }

        const { data: postsData, error: postsError } = await query;

        if (postsError) {
          console.error("Error fetching posts:", postsError);
          return;
        }

        if (!postsData || postsData.length === 0) {
          if (isMounted) {
            setPosts([]);
            setLoading(false);
          }
          return;
        }

        const { data: likesData } = await supabase
          .from("likes")
          .select("post_id")
          .eq("user_id", user.id);

        const likedPostIds = new Set(
          likesData?.map((like) => like.post_id) || [],
        );

        const formattedPosts = await Promise.all(
          postsData.map(async (post) => {
            const { data: authorData } = await supabase
              .from("profiles")
              .select("name, avatar_url")
              .eq("id", post.user_id)
              .single();

            const { count: commentsCount } = await supabase
              .from("comments")
              .select("id", { count: "exact" })
              .eq("post_id", post.id);

            const { count: likesCount } = await supabase
              .from("likes")
              .select("id", { count: "exact" })
              .eq("post_id", post.id);

            const isOwnPost = post.user_id === user.id;

            return {
              id: post.id,
              author: {
                name: authorData?.name || "Unknown User",
                username: formatDistanceToNow(new Date(post.created_at), {
                  addSuffix: true,
                }),
                avatar:
                  authorData?.avatar_url ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.id}`,
              },
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
              isLiked: likedPostIds.has(post.id),
              user_id: post.user_id,
              isOwnPost: isOwnPost,
            };
          }),
        );

        if (isMounted) {
          setPosts(formattedPosts);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching feed data:", error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPosts();

    return () => {
      isMounted = false;
    };
  }, [user, searchQuery]);

  const handleLike = async (postId: string) => {
    if (!user) return;

    const updatedPosts = [...posts];
    const postIndex = updatedPosts.findIndex((p) => p.id === postId);

    if (postIndex === -1) return;

    const post = updatedPosts[postIndex];
    const newIsLiked = !post.isLiked;

    // Nur Animation auslösen, wenn der Post geliked wird (nicht unliked)
    if (!post.isLiked) {
      setLikeAnimation((prev) => ({ ...prev, [postId]: true }));
    }

    updatedPosts[postIndex] = {
      ...post,
      isLiked: newIsLiked,
      likes: newIsLiked ? post.likes + 1 : post.likes - 1,
    };

    setPosts(updatedPosts);

    try {
      if (newIsLiked) {
        await supabase.from("likes").insert({
          post_id: postId,
          user_id: user.id,
        });
      } else {
        await supabase
          .from("likes")
          .delete()
          .match({ post_id: postId, user_id: user.id });
      }
    } catch (error) {
      console.error("Error updating like:", error);
      setPosts(posts);
    }
  };

  // Double-Tap Handler
  const handleDoubleTap = (postId: string) => {
    const now = Date.now();
    const lastTapTime = lastTap[postId] || 0;
    const DOUBLE_TAP_THRESHOLD = 300; // Zeitfenster für Double-Tap (in Millisekunden)

    if (now - lastTapTime < DOUBLE_TAP_THRESHOLD) {
      // Double-Tap erkannt
      const post = posts.find((p) => p.id === postId);
      if (post && !post.isLiked) {
        // Nur liken, wenn der Post noch nicht geliked ist
        handleLike(postId);
      }
    }

    setLastTap((prev) => ({ ...prev, [postId]: now }));
  };

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handleVideoPlay = (postId: string) => {
    setVideoPlaying((prev) => ({
      ...prev,
      [postId]: true,
    }));
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;

    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deleting post:", error);
        return;
      }

      setPosts(posts.filter((post) => post.id !== postId));
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const handleAddComment = async (postId: string, content: string) => {
    if (!user || !content.trim()) return;

    try {
      await supabase.from("comments").insert({
        post_id: postId,
        user_id: user.id,
        content: content.trim(),
      });

      const updatedPosts = posts.map((post) => {
        if (post.id === postId) {
          return { ...post, comments: post.comments + 1 };
        }
        return post;
      });

      setPosts(updatedPosts);
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#0d1015] rounded-[40px]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg p-4 rounded-b-3xl shadow-sm">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#00b4d8]">FRYCOM</h1>

          <div className="flex items-center space-x-4">
            <button
              className="h-10 w-10 flex items-center justify-center relative"
              onClick={onNotifications}
            >
              <Bell className="h-6 w-6 text-gray-600 dark:text-gray-300" />
              {hasUnreadNotifications && (
                <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full"></span>
              )}
            </button>
            <button
              className="h-10 w-10 flex items-center justify-center"
              onClick={onCreatePost}
            >
              <Plus className="h-6 w-6 text-gray-600 dark:text-gray-300" />
            </button>
            <Avatar
              className="h-10 w-10 border-2 border-[#00b4d8]/20 hover:scale-105 transition-transform duration-200 cursor-pointer"
              onClick={onProfile}
            >
              <AvatarImage src={userProfileImage || ""} alt="User Profile" />
              <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {user?.user_metadata?.name?.charAt(0).toUpperCase() ||
                  user?.email?.charAt(0).toUpperCase() ||
                  "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4 relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search posts..."
            className="pl-10 pr-4 py-2 w-full rounded-full bg-gray-100/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 focus:ring-2 focus:ring-[#00b4d8] focus:border-transparent transition-all text-gray-900 dark:text-gray-100 placeholder-gray-500"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>
      {/* Feed */}
      <div className="flex-1 p-4 space-y-4">
        {searchQuery && (
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {posts.length > 0 ? (
              <p>Showing results for "{searchQuery}"</p>
            ) : (
              <p>No results found for "{searchQuery}"</p>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-[#00b4d8]" />
          </div>
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <div
              key={post.id}
              className={`relative bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden ${post.isOwnPost ? "border-l-4 border-[#00b4d8]" : ""}`}
              onClick={() => handleDoubleTap(post.id)} // Double-Tap-Handler hinzufügen
            >
              {/* Like-Animation */}
              <AnimatePresence>
                {likeAnimation[post.id] && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 2 }}
                    exit={{ opacity: 0, scale: 2.5 }}
                    transition={{ duration: 0.5 }}
                    onAnimationComplete={() =>
                      setLikeAnimation((prev) => ({
                        ...prev,
                        [post.id]: false,
                      }))
                    }
                  >
                    <Heart className="h-16 w-16 text-red-500 fill-red-500" />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-start p-4">
                <Avatar
                  className="w-10 h-10 mr-3 cursor-pointer"
                  onClick={() => navigate(`/user/${post.user_id}`)}
                >
                  <AvatarImage
                    src={post.author.avatar}
                    alt={post.author.name}
                  />
                  <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {post.author.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex justify-between">
                    <div>
                      <h3
                        className="font-semibold cursor-pointer hover:underline"
                        onClick={() => navigate(`/user/${post.user_id}`)}
                      >
                        {post.author.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {post.timestamp}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-8 w-8 flex items-center justify-center">
                          <MoreVertical className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {post.isOwnPost && (
                          <DropdownMenuItem
                            className="text-red-500 focus:text-red-500"
                            onClick={() => handleDeletePost(post.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <Flag className="h-4 w-4 mr-2" />
                          Report
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {post.content && (
                    <p className="mt-2 text-gray-900 dark:text-gray-100">
                      {post.content}
                    </p>
                  )}

                  {post.media && (
                    <div className="mt-3 rounded-lg overflow-hidden">
                      {post.media.type === "image" ? (
                        <img
                          src={post.media.src}
                          alt={post.media.alt || "Post image"}
                          className="h-auto object-cover w-full"
                        />
                      ) : (
                        <div className="relative">
                          <video
                            src={post.media.src}
                            className="h-auto w-full object-cover"
                            controls
                            playsInline
                            poster={`${post.media.src}#t=0.5`}
                            onPlay={() => handleVideoPlay(post.id)}
                          />
                          {!videoPlaying[post.id] && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="bg-black bg-opacity-30 rounded-full p-4">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="white"
                                  stroke="white"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-8 w-8"
                                >
                                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center mt-3">
                    <button
                      className="flex items-center gap-1 p-2"
                      onClick={() => handleLike(post.id)}
                    >
                      <Heart
                        className={`h-5 w-5 ${post.isLiked ? "fill-red-500 text-red-500" : "text-gray-600 dark:text-gray-300"}`}
                      />
                      <span className="text-gray-600 dark:text-gray-300">
                        {post.likes}
                      </span>
                    </button>
                    <button
                      className="flex items-center gap-1 p-2"
                      onClick={() => toggleComments(post.id)}
                    >
                      <MessageSquare className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                      <span className="text-gray-600 dark:text-gray-300">
                        {post.comments}
                      </span>
                    </button>
                    <button className="flex items-center gap-1 p-2">
                      <Share2 className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </button>
                  </div>

                  {expandedComments[post.id] && (
                    <div className="mt-2 border-t border-gray-100 dark:border-gray-700 pt-2">
                      <CommentSection
                        postId={post.id}
                        onAddComment={(content) =>
                          handleAddComment(post.id, content)
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery
                ? `No posts found matching "${searchQuery}"`
                : "No posts yet. Create your first post!"}
            </p>
            {!searchQuery && (
              <Button
                className="mt-4 rounded-full bg-[#00b4d8] text-white hover:bg-[#00b4d8]/80"
                onClick={onCreatePost}
              >
                Create Post
              </Button>
            )}
          </div>
        )}
      </div>
      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-4 left-4 right-4 bg-cyan-200/30 dark:bg-cyan-900/30 backdrop-blur-lg border border-cyan-300/40 dark:border-cyan-800/40 flex justify-between items-center p-2 z-20 shadow-xl rounded-[40px]">
        <Button
          variant="ghost"
          size="icon"
          className="flex items-center justify-center h-14 w-14"
        >
          <HomeIcon className="h-6 w-6 text-[#00b4d8]" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="flex items-center justify-center h-14 w-14"
          onClick={() => navigate("/search")}
        >
          <Search className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="flex items-center justify-center h-14 w-14 bg-[#00b4d8] rounded-full"
          onClick={onCreatePost}
        >
          <Plus className="h-6 w-6 text-white" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="flex h-14 w-14 justify-center items-center relative"
          onClick={() => navigate("/chats")}
        >
          <MessageSquare className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          {hasUnreadMessages && (
            <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full"></span>
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="flex items-center justify-center h-14 w-14"
          onClick={onProfile}
        >
          <User className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        </Button>
      </div>
      {/* Add padding at the bottom to account for the navigation bar */}
      <div className="h-20"></div>
    </div>
  );
};

export default FeedScreen;
