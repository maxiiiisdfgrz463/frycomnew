import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Bell, Home, Search, User, PlusCircle, Loader2 } from "lucide-react";
import { ThemeToggle } from "./ui/theme-toggle";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import FeedContainer from "./feed/FeedContainer";
import { Link } from "react-router-dom";

interface Post {
  id: string;
  content: string;
  created_at: string;
  media_url: string | null;
  media_type: string | null;
  user_id: string;
  likes_count: number | null;
  comments_count: number | null;
  author?: {
    name: string;
    username?: string;
    avatar_url: string | null;
  };
}

const HomePage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const postsPerPage = 6;

  const fetchPosts = async (pageNum = 1) => {
    try {
      setLoading(true);

      // Fetch posts with pagination
      const from = (pageNum - 1) * postsPerPage;
      const to = from + postsPerPage - 1;

      // If there's a search query, filter posts by content
      let query = supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.ilike("content", `%${searchQuery}%`);
      }

      const { data: postsData, error } = await query.range(from, to);

      if (error) {
        console.error("Error fetching posts:", error);
        throw error;
      }

      console.log("Fetched posts:", postsData);

      if (!postsData || postsData.length < postsPerPage) {
        setHasMore(false);
      }

      if (!postsData || postsData.length === 0) {
        console.log("No posts found");
        setLoading(false);
        return;
      }

      // Fetch user likes if user is logged in
      let likedPostIds = new Set();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user;
      if (currentUser) {
        const { data: likesData } = await supabase
          .from("likes")
          .select("post_id")
          .eq("user_id", currentUser.id);

        likedPostIds = new Set(likesData?.map((like) => like.post_id) || []);
      }

      // Fetch author details for each post
      const postsWithAuthors = await Promise.all(
        postsData.map(async (post) => {
          const { data: authorData, error: authorError } = await supabase
            .from("profiles")
            .select("name, avatar_url")
            .eq("id", post.user_id)
            .single();

          if (authorError) {
            console.error("Error fetching author:", authorError);
          }

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

          return {
            ...post,
            author: authorData || {
              name: "Unknown User",
              avatar_url: null,
            },
            likes_count: likesCount || 0,
            comments_count: commentsCount || 0,
            isLiked: likedPostIds.has(post.id),
          };
        }),
      );

      console.log("Posts with authors:", postsWithAuthors);

      if (pageNum === 1) {
        setPosts(postsWithAuthors);
      } else {
        setPosts((prev) => [...prev, ...postsWithAuthors]);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      await fetchPosts(nextPage);
    }
  };

  useEffect(() => {
    console.log("Fetching initial posts");
    fetchPosts();
  }, [searchQuery]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
    setHasMore(true);
  };

  // Convert database posts to the format expected by FeedContainer
  const formattedPosts = posts.map((post) => ({
    id: post.id,
    author: {
      name: post.author?.name || "Unknown User",
      username: `@${post.author?.name?.toLowerCase().replace(/\s+/g, "") || "unknown"}`,
      avatar:
        post.author?.avatar_url ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.id}`,
    },
    content: post.content,
    media: post.media_url
      ? {
          type: (post.media_type || "image") as "image" | "video",
          src: post.media_url,
          alt: "Post media",
        }
      : undefined,
    timestamp: formatDistanceToNow(new Date(post.created_at), {
      addSuffix: true,
    }),
    likes: post.likes_count || 0,
    comments: post.comments_count || 0,
    shares: 0,
    isLiked: (post as any).isLiked || false,
    user_id: post.user_id,
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d1015]">
      {/* Header/Navigation */}
      <header className="sticky top-0 z-10 bg-white dark:bg-[#161b22] border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-primary">SocialFeed</h1>
              <ThemeToggle />
            </div>

            {/* Search */}
            <div className="hidden md:block flex-1 max-w-md mx-8">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
              </div>
            </div>

            {/* Navigation Icons */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="relative">
                <Home className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800"></span>
              </Button>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Create Post Button (Mobile) */}
          <div className="md:hidden mb-4">
            <Link to="/create-post">
              <Button className="w-full flex items-center justify-center gap-2">
                <PlusCircle className="h-5 w-5" />
                Create New Post
              </Button>
            </Link>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar (Desktop only) */}
            <div className="hidden md:block w-64 flex-shrink-0">
              <div className="bg-white dark:bg-[#161b22] rounded-lg shadow p-4 sticky top-20">
                <nav className="space-y-1">
                  <Link
                    to="/"
                    className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-primary text-white"
                  >
                    <Home className="mr-3 h-5 w-5" />
                    Home
                  </Link>
                  <Link
                    to="/profile"
                    className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <User className="mr-3 h-5 w-5" />
                    Profile
                  </Link>
                  <a
                    href="#"
                    className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Bell className="mr-3 h-5 w-5" />
                    Notifications
                  </a>
                </nav>

                <div className="mt-6">
                  <Link to="/create-post">
                    <Button className="w-full flex items-center justify-center gap-2">
                      <PlusCircle className="h-5 w-5" />
                      Create New Post
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Feed */}
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {/* Feed Container */}
                <div className="bg-white dark:bg-[#161b22] rounded-lg shadow">
                  <div className="p-4">
                    <h2 className="text-xl font-semibold mb-4">
                      {searchQuery
                        ? `Search Results for "${searchQuery}"`
                        : "Your Feed"}
                    </h2>

                    {loading && posts.length === 0 ? (
                      <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : posts.length > 0 ? (
                      <>
                        <div className="mb-4 text-sm text-gray-500">
                          Showing {posts.length} posts{" "}
                          {searchQuery && "matching your search"}
                        </div>
                        <FeedContainer
                          initialPosts={formattedPosts}
                          loading={loading}
                          onLoadMore={loadMorePosts}
                          hasMore={hasMore}
                        />
                      </>
                    ) : (
                      <div className="text-center py-10">
                        <p className="text-gray-500 dark:text-gray-400">
                          {searchQuery
                            ? `No posts found matching "${searchQuery}"`
                            : "No posts found. Be the first to create a post!"}
                        </p>
                        <Link to="/create-post" className="mt-4 inline-block">
                          <Button>Create Post</Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Sidebar (Desktop only) */}
            <div className="hidden lg:block w-80 flex-shrink-0">
              <div className="bg-white dark:bg-[#161b22] rounded-lg shadow p-4 sticky top-20">
                <h2 className="text-lg font-semibold mb-4">
                  Suggested for you
                </h2>

                {/* Suggested Users */}
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`}
                          alt={`Suggested user ${i}`}
                          className="h-10 w-10 rounded-full"
                        />
                        <div>
                          <p className="text-sm font-medium">User Name {i}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            @username{i}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Follow
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Trending Topics */}
                <div className="mt-6">
                  <h2 className="text-lg font-semibold mb-4">
                    Trending Topics
                  </h2>
                  <div className="space-y-3">
                    {[
                      "#photography",
                      "#travel",
                      "#coding",
                      "#food",
                      "#music",
                    ].map((topic, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center"
                      >
                        <div>
                          <p className="text-sm font-medium">{topic}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {1000 + i * 234} posts
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-[#161b22] border-t border-gray-200 dark:border-gray-700 mt-8">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              &copy; {new Date().getFullYear()} SocialFeed. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a
                href="#"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Terms
              </a>
              <a
                href="#"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Privacy
              </a>
              <a
                href="#"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Help
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
