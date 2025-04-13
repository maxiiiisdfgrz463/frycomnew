import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Search,
  User,
  FileText,
  Loader2,
  HomeIcon,
  Plus,
  Hash,
  Users,
} from "lucide-react";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface SearchScreenProps {
  onBack?: () => void;
  onProfile?: () => void;
  onNotifications?: () => void;
  onCreatePost?: () => void;
}

interface SearchResult {
  id: string;
  type: "user" | "post" | "hashtag";
  title: string;
  subtitle?: string;
  avatar?: string;
  content?: string;
  count?: number;
  tag?: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  avatar: string;
  likes: number;
}

const SearchScreen: React.FC<SearchScreenProps> = ({
  onBack = () => {},
  onProfile = () => {},
  onNotifications = () => {},
  onCreatePost = () => {},
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<
    "users" | "posts" | "hashtags"
  >("users");
  const [topPosts, setTopPosts] = useState<Post[]>([]);
  const [loadingTopPosts, setLoadingTopPosts] = useState(true);

  // Load search history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("searchHistory");
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Fetch top posts on mount
  useEffect(() => {
    async function fetchTopPosts() {
      setLoadingTopPosts(true);
      try {
        const { data: postsData, error } = await supabase
          .from("posts")
          .select("id, content, user_id, profiles(name, avatar_url)")
          .limit(5);

        if (error) {
          console.error("Error fetching top posts:", error);
          return;
        }

        const formattedPosts = await Promise.all(
          postsData.map(async (post) => {
            const { count: likesCount } = await supabase
              .from("likes")
              .select("id", { count: "exact" })
              .eq("post_id", post.id);

            return {
              id: post.id,
              title: post.profiles?.name || "Unknown User",
              content:
                post.content.length > 100
                  ? post.content.substring(0, 100) + "..."
                  : post.content,
              avatar:
                post.profiles?.avatar_url ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_id}`,
              likes: likesCount || 0,
            };
          }),
        );

        // Sort by likes in descending order
        const sortedPosts = formattedPosts.sort((a, b) => b.likes - a.likes);
        setTopPosts(sortedPosts);
      } catch (error) {
        console.error("Error fetching top posts:", error);
      } finally {
        setLoadingTopPosts(false);
      }
    }

    fetchTopPosts();
  }, []);

  // Update search history when a new search is performed
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      handleSearch();
      // Add to history
      const updatedHistory = [
        searchQuery,
        ...searchHistory.filter((item) => item !== searchQuery),
      ].slice(0, 4); // Keep only the last 4 searches
      setSearchHistory(updatedHistory);
      localStorage.setItem("searchHistory", JSON.stringify(updatedHistory));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, activeCategory]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      if (activeCategory === "users" || activeCategory === "posts") {
        // Search users
        const { data: usersData, error: usersError } = await supabase
          .from("profiles")
          .select("id, name, avatar_url, bio")
          .ilike("name", `%${searchQuery}%`)
          .limit(20);

        if (usersError) {
          console.error("Error searching users:", usersError);
        }

        // Search posts
        const { data: postsData, error: postsError } = await supabase
          .from("posts")
          .select(
            "id, content, user_id, created_at, profiles(name, avatar_url)",
          )
          .ilike("content", `%${searchQuery}%`)
          .limit(20);

        if (postsError) {
          console.error("Error searching posts:", postsError);
        }

        // Format results
        const userResults: SearchResult[] =
          activeCategory === "users"
            ? (usersData || []).map((user) => ({
                id: user.id,
                type: "user",
                title: user.name || "Unknown User",
                subtitle: user.bio?.substring(0, 50) || "",
                avatar:
                  user.avatar_url ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
              }))
            : [];

        const postResults: SearchResult[] =
          activeCategory === "posts"
            ? (postsData || []).map((post) => ({
                id: post.id,
                type: "post",
                title: post.profiles?.name || "Unknown User",
                subtitle: new Date(post.created_at).toLocaleDateString(),
                content:
                  post.content.length > 100
                    ? post.content.substring(0, 100) + "..."
                    : post.content,
                avatar:
                  post.profiles?.avatar_url ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_id}`,
              }))
            : [];

        // Combine results based on active category
        setSearchResults(
          activeCategory === "users" ? userResults : postResults,
        );
      } else if (activeCategory === "hashtags") {
        // Search for hashtags in posts
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .ilike("content", `%#${searchQuery}%`)
          .limit(20);

        if (error) {
          console.error("Error searching hashtags:", error);
          return;
        }

        // Extract unique hashtags from posts
        const hashtags = new Set<string>();
        data.forEach((post) => {
          const matches = post.content.match(/#\w+/g) || [];
          matches.forEach((tag: string) => {
            if (
              tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
              searchQuery === ""
            ) {
              hashtags.add(tag);
            }
          });
        });

        const hashtagResults: SearchResult[] = Array.from(hashtags).map(
          (tag) => ({
            id: tag,
            type: "hashtag",
            title: tag,
            count: data.filter((post) => post.content.includes(tag)).length,
            tag: tag,
          }),
        );

        setSearchResults(hashtagResults);
      }
    } catch (error) {
      console.error("Error during search:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.type === "user") {
      navigate(`/user/${result.id}`);
    } else if (result.type === "post") {
      navigate("/feed");
    } else if (result.type === "hashtag") {
      console.log(`Searching for posts with ${result.tag}`);
      navigate("/feed");
    }
  };

  const handleCategoryClick = (category: "users" | "posts" | "hashtags") => {
    setActiveCategory(category);
    if (searchQuery.trim()) {
      handleSearch();
    }
  };

  const handleHistoryClick = (term: string) => {
    setSearchQuery(term);
  };

  const handleTopPostClick = (postId: string) => {
    navigate("/feed"); // Ideally, scroll to the specific post
  };

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
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Search users, posts, or hashtags..."
              className="pl-12 pr-4 py-3 h-12 w-full rounded-full bg-gray-100/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 focus:ring-2 focus:ring-[#00b4d8] focus:border-transparent transition-all text-gray-900 dark:text-gray-100 placeholder-gray-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {searchQuery && isSearching ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-[#00b4d8]" />
          </div>
        ) : searchQuery && searchResults.length > 0 ? (
          <div className="space-y-4">
            {searchResults.map((result) => (
              <div
                key={`${result.type}-${result.id}`}
                className="bg-white dark:bg-gray-800/80 rounded-2xl p-5 shadow-sm cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-700/80 hover:scale-[1.02] transition-transform duration-200"
                onClick={() => handleResultClick(result)}
              >
                {result.type === "hashtag" ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-12 w-12 rounded-full bg-[#00b4d8]/10 dark:bg-[#00b4d8]/20 flex items-center justify-center mr-4">
                        <Hash className="h-6 w-6 text-[#00b4d8]" />
                      </div>
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                        {result.title}
                      </h3>
                    </div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {result.count} posts
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <div className="mr-4">
                      {result.type === "user" ? (
                        <Avatar className="h-14 w-14 border-2 border-[#00b4d8]/20">
                          <AvatarImage src={result.avatar} alt={result.title} />
                          <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            {result.title.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-14 w-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center border-2 border-[#00b4d8]/20">
                          <FileText className="h-7 w-7 text-gray-500 dark:text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                          {result.title}
                        </h3>
                        {result.type === "user" && (
                          <div className="px-2 py-1 bg-[#00b4d8]/10 dark:bg-[#00b4d8]/20 rounded-full text-xs font-medium text-[#00b4d8]">
                            <User className="h-3 w-3 inline mr-1" />
                            User
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {result.subtitle}
                      </p>
                      {result.content && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                          {result.content}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : searchQuery ? (
          <div className="text-center py-16 bg-white/50 dark:bg-gray-800/50 rounded-2xl shadow-sm">
            <Search className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
              No results found for "{searchQuery}"
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Try different keywords or check your spelling
            </p>
            <Button
              variant="outline"
              className="mt-4 rounded-full border-[#00b4d8]/50 text-[#00b4d8] hover:bg-[#00b4d8]/10"
              onClick={() => setSearchQuery("")}
            >
              Clear Search
            </Button>
          </div>
        ) : (
          <>
            {/* Search by Category */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Search by category
              </h2>
              <div className="flex flex-wrap gap-4">
                <button
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-sm transition-all duration-200 ${
                    activeCategory === "users"
                      ? "bg-[#00b4d8] text-white scale-105"
                      : "bg-white dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 hover:bg-gray-50/80 dark:hover:bg-gray-700/80"
                  }`}
                  onClick={() => handleCategoryClick("users")}
                >
                  <Users
                    className={`h-5 w-5 ${
                      activeCategory === "users"
                        ? "text-white"
                        : "text-[#00b4d8]"
                    }`}
                  />
                  <span className="font-medium">Users</span>
                </button>
                <button
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-sm transition-all duration-200 ${
                    activeCategory === "posts"
                      ? "bg-[#00b4d8] text-white scale-105"
                      : "bg-white dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 hover:bg-gray-50/80 dark:hover:bg-gray-700/80"
                  }`}
                  onClick={() => handleCategoryClick("posts")}
                >
                  <FileText
                    className={`h-5 w-5 ${
                      activeCategory === "posts"
                        ? "text-white"
                        : "text-[#00b4d8]"
                    }`}
                  />
                  <span className="font-medium">Posts</span>
                </button>
                <button
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-sm transition-all duration-200 ${
                    activeCategory === "hashtags"
                      ? "bg-[#00b4d8] text-white scale-105"
                      : "bg-white dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 hover:bg-gray-50/80 dark:hover:bg-gray-700/80"
                  }`}
                  onClick={() => handleCategoryClick("hashtags")}
                >
                  <Hash
                    className={`h-5 w-5 ${
                      activeCategory === "hashtags"
                        ? "text-white"
                        : "text-[#00b4d8]"
                    }`}
                  />
                  <span className="font-medium">Hashtags</span>
                </button>
              </div>
            </div>

            {/* Your History */}
            {searchHistory.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Your history
                </h2>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((term) => (
                    <button
                      key={term}
                      className="px-4 py-2 rounded-full bg-[#00b4d8]/10 dark:bg-[#00b4d8]/20 text-[#00b4d8] font-medium text-sm hover:bg-[#00b4d8]/20 dark:hover:bg-[#00b4d8]/30 transition-colors"
                      onClick={() => handleHistoryClick(term)}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Top Posts */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Top Posts
              </h2>
              {loadingTopPosts ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-[#00b4d8]" />
                </div>
              ) : topPosts.length > 0 ? (
                <div className="space-y-4">
                  {topPosts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-white dark:bg-gray-800/80 rounded-2xl p-5 shadow-sm cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-700/80 hover:scale-[1.02] transition-transform duration-200"
                      onClick={() => handleTopPostClick(post.id)}
                    >
                      <div className="flex items-center">
                        <div className="mr-4">
                          <Avatar className="h-14 w-14 border-2 border-[#00b4d8]/20">
                            <AvatarImage src={post.avatar} alt={post.title} />
                            <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                              {post.title.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                            {post.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                            {post.content}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {post.likes} Likes
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white/50 dark:bg-gray-800/50 rounded-2xl shadow-sm">
                  <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
                    No top posts available
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-4 left-4 right-4 bg-cyan-200/30 dark:bg-cyan-900/30 backdrop-blur-lg border border-cyan-300/40 dark:border-cyan-800/40 flex justify-between items-center p-2 z-20 shadow-xl rounded-[40px]">
        <Button
          variant="ghost"
          size="icon"
          className="flex items-center justify-center h-14 w-14"
          onClick={() => navigate("/feed")}
        >
          <HomeIcon className="h-6 w-6" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="flex items-center justify-center h-14 w-14 text-[#00b4d8]"
          onClick={() => navigate("/search")}
        >
          <Search className="h-6 w-6" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="flex items-center justify-center h-14 w-14 bg-[#00b4d8] rounded-full"
          onClick={() => navigate("/create-post")}
        >
          <Plus className="h-6 w-6 text-white" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="flex h-14 w-14 justify-center items-center relative"
          onClick={() => navigate("/chats")}
        >
          <MessageSquare className="h-6 w-6" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="flex items-center justify-center h-14 w-14"
          onClick={() => navigate("/profile")}
        >
          <User className="h-6 w-6" />
        </Button>
      </div>

      {/* Add padding at the bottom to account for the navigation bar */}
      <div className="h-20"></div>
    </div>
  );
};

export default SearchScreen;
