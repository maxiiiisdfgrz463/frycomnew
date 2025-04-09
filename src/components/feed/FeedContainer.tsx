import React, { useState, useEffect, useRef } from "react";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import PostCard from "./PostCard";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface Post {
  id: string;
  author: {
    name: string;
    username: string;
    avatar: string;
  };
  content: string;
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
}

interface FeedContainerProps {
  initialPosts?: Post[];
  loading?: boolean;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
}

const FeedContainer: React.FC<FeedContainerProps> = ({
  initialPosts = [],
  loading = false,
  onLoadMore = async () => {},
  hasMore = true,
}) => {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [isLoading, setIsLoading] = useState<boolean>(loading);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const isDesktop = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    console.log("FeedContainer rendered with posts:", initialPosts);
  }, []);

  const handleLike = (postId: string) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            }
          : post,
      ),
    );
  };

  const handleComment = (postId: string) => {
    // This would typically open the comment section or focus the comment input
    console.log(`Comment on post ${postId}`);
  };

  const handleShare = (postId: string) => {
    // This would typically open a share dialog
    console.log(`Share post ${postId}`);
  };

  const loadMorePosts = async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      await onLoadMore();
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading more posts:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Set up intersection observer for infinite scroll
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && hasMore) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isLoading, hasMore]);

  // Update posts when initialPosts change
  useEffect(() => {
    console.log("Initial posts updated:", initialPosts);
    setPosts(initialPosts);
  }, [initialPosts]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-background">
      <div
        className={`grid gap-6 ${isDesktop ? "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}
      >
        {posts.map((post) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <PostCard
              post={post}
              onLike={handleLike}
              onComment={handleComment}
              onShare={handleShare}
            />
          </motion.div>
        ))}
      </div>

      <div ref={loadMoreRef} className="w-full flex justify-center my-8">
        {isLoading ? (
          <Button
            disabled
            variant="outline"
            className="flex items-center gap-2"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading more posts...
          </Button>
        ) : hasMore ? (
          <Button onClick={loadMorePosts} variant="outline">
            Load more posts
          </Button>
        ) : (
          <p className="text-muted-foreground text-sm">No more posts to load</p>
        )}
      </div>
    </div>
  );
};

export default FeedContainer;
