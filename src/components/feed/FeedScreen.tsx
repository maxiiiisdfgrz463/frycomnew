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
import { motion, AnimatePresence } from "framer-motion";
import CommentSection from "./CommentSection";

// Array für zufällige Winkel der Herzen
const getRandomAngle = () => Math.random() * 360;
const getRandomDistance = () => Math.random() * 100 + 50;
const getRandomDelay = () => Math.random() * 0.3;
const getRandomScale = () => Math.random() * 0.5 + 1.5;

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
    [key: string]: { x: number; y: number } | null;
  }>({});
  const [lastTap, setLastTap] = useState<{ [key: string]: number }>({});

  const [likeSound] = useState(() => new Audio("/sounds/like-sound.mp3"));

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
              .select("name, avatar_url, has_badge")
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
                has_badge: authorData?.has_badge || false,
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

    if (!post.isLiked) {
      likeSound.currentTime = 0;
      likeSound.play().catch((error) => {
        console.error("Error playing like sound:", error);
      });
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

  const handleDoubleTap = (
    postId: string,
    event: React.MouseEvent | React.TouchEvent,
  ) => {
    const now = Date.now();
    const lastTapTime = lastTap[postId] || 0;
    const DOUBLE_TAP_THRESHOLD = 300;

    if (now - lastTapTime < DOUBLE_TAP_THRESHOLD) {
      const post = posts.find((p) => p.id === postId);
      if (post && !post.isLiked) {
        const target = event.currentTarget as HTMLDivElement;
        const rect = target.getBoundingClientRect();
        let clientX, clientY;
        if ("touches" in event && event.touches.length > 0) {
          clientX = event.touches[0].clientX;
          clientY = event.touches[0].clientY;
        } else if ("clientX" in event) {
          clientX = event.clientX;
          clientY = event.clientY;
        } else {
          console.warn("Unable to determine click/touch coordinates");
          return;
        }
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        setLikeAnimation((prev) => ({ ...prev, [postId]: { x, y } }));
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
              className={`relative rounded-lg shadow overflow-hidden ${
                post.author.has_badge
                  ? "bg-gradient-to-b from-[#00b4d8]/10 via-[#e6f7fa] to-white dark:from-[#00b4d8]/20 dark:via-[#1e3a4f] dark:to-gray-800"
                  : "bg-white dark:bg-gray-800"
              } ${post.isOwnPost ? "border-l-4 border-[#00b4d8]" : ""}`}
              onClick={(e) => handleDoubleTap(post.id, e)}
            >
              {/* Like-Animation (sprudelnde Herzen) */}
              <AnimatePresence>
                {likeAnimation[post.id] && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{ transformOrigin: "top left" }}
                  >
                    {[...Array(8)].map((_, index) => {
                      const angle = getRandomAngle();
                      const distance = getRandomDistance();
                      const delay = getRandomDelay();
                      const scale = getRandomScale();
                      return (
                        <motion.div
                          key={index}
                          className="absolute"
                          style={{
                            left: likeAnimation[post.id]?.x ?? 0,
                            top: likeAnimation[post.id]?.y ?? 0,
                          }}
                          initial={{ opacity: 1, scale: 0 }}
                          animate={{
                            opacity: 0,
                            scale: [0, scale, scale * 0.8],
                            x: Math.cos((angle * Math.PI) / 180) * distance,
                            y: Math.sin((angle * Math.PI) / 180) * distance,
                          }}
                          transition={{ duration: 1, delay }}
                          onAnimationComplete={() =>
                            setLikeAnimation((prev) => ({
                              ...prev,
                              [post.id]: null,
                            }))
                          }
                        >
                          <Heart className="h-12 w-12 text-red-500 fill-red-500" />
                        </motion.div>
                      );
                    })}
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
                    <div className="flex items-center">
                      <h3
                        className="font-semibold cursor-pointer hover:underline"
                        onClick={() => navigate(`/user/${post.user_id}`)}
                      >
                        {post.author.name}
                      </h3>
                      {post.author.has_badge && (
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 1750 1749"
                          className="ml-3 text-[#00b4d8]"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-label="User Badge"
                        >
                          <path
                            d="M796.834 76.1716C840.327 33.7885 909.673 33.7885 953.166 76.1716L989.385 111.467C1019.45 140.768 1063.38 150.792 1103.19 137.434L1151.16 121.335C1208.74 102.011 1271.23 132.104 1292.02 189.172L1309.3 236.593C1323.68 276.052 1358.92 304.152 1400.59 309.379L1450.73 315.667C1511.02 323.228 1554.28 377.478 1548.24 437.935L1543.23 488.056C1539.05 529.863 1558.62 570.492 1593.92 593.284L1636.27 620.635C1687.33 653.604 1702.78 721.275 1671.08 773.132L1644.82 816.091C1622.91 851.947 1622.91 897.053 1644.82 932.909L1671.08 975.868C1702.78 1027.72 1687.33 1095.4 1636.27 1128.37L1593.92 1155.72C1558.62 1178.51 1539.05 1219.14 1543.23 1260.94L1548.24 1311.06C1554.28 1371.52 1511.02 1425.77 1450.73 1433.33L1400.59 1439.62C1358.92 1444.85 1323.68 1472.95 1309.3 1512.41L1292.02 1559.83C1271.23 1616.9 1208.74 1646.99 1151.16 1627.66L1103.19 1611.57C1063.38 1598.21 1019.45 1608.23 989.385 1637.53L953.166 1672.83C909.673 1715.21 840.327 1715.21 796.834 1672.83L760.615 1637.53C730.547 1608.23 686.617 1598.21 646.815 1611.57L598.845 1627.66C541.263 1646.99 478.772 1616.9 457.979 1559.83L440.7 1512.41C426.322 1472.95 391.077 1444.85 349.405 1439.62L299.267 1433.33C238.98 1425.77 195.717 1371.52 201.76 1311.06L206.769 1260.94C210.948 1219.14 191.377 1178.51 156.081 1155.72L113.726 1128.37C62.6693 1095.4 47.2234 1027.72 78.9185 975.868L105.175 932.909C127.09 897.053 127.09 851.947 105.175 816.091L78.9185 773.132C47.2235 721.275 62.6692 653.604 113.725 620.635L156.081 593.284C191.377 570.492 210.948 529.863 206.77 488.056L201.76 437.935C195.717 377.478 238.98 323.228 299.267 315.667L349.405 309.379C391.077 304.152 426.322 276.052 440.7 236.593L457.979 189.172C478.772 132.104 541.263 102.011 598.845 121.335L646.815 137.434C686.617 150.792 730.547 140.768 760.615 111.467L796.834 76.1716Z"
                            fill="currentColor"
                          />
                          <rect
                            x="623.883"
                            y="1249.58"
                            width="1092"
                            height="180"
                            rx="90"
                            transform="rotate(-50 623.883 1249.58)"
                            fill="white"
                          />
                          <rect
                            x="422.796"
                            y="853.031"
                            width="582"
                            height="180"
                            rx="90"
                            transform="rotate(40 422.796 853.031)"
                            fill="white"
                          />
                        </svg>
                      )}
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
      <div className="h-20"></div>
    </div>
  );
};

export default FeedScreen;

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
      has_badge?: boolean;
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
