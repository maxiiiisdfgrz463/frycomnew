import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Heart, MessageSquare, Share2, MoreHorizontal } from "lucide-react";
import MediaDisplay from "./MediaDisplay";
import CommentSection from "./CommentSection";
import { motion } from "framer-motion";

interface PostCardProps {
  post?: {
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
  };
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({
  post = {
    id: "post-1",
    author: {
      name: "Jane Smith",
      username: "@janesmith",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane",
    },
    content:
      "Just discovered this amazing view during my hike today! Nature never ceases to amaze me. #hiking #nature #adventure",
    media: {
      type: "image",
      src: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80",
      alt: "Mountain landscape with forest and lake",
    },
    timestamp: "2 hours ago",
    likes: 124,
    comments: 18,
    shares: 5,
    isLiked: false,
  },
  onLike = () => {},
  onComment = () => {},
  onShare = () => {},
}) => {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likes);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    onLike(post.id);
  };

  const [showComments, setShowComments] = useState(false);

  const handleCommentClick = () => {
    setShowComments(!showComments);
    onComment(post.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full bg-background"
    >
      <Card className="overflow-hidden border-gray-200">
        <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={post.author.avatar} alt={post.author.name} />
              <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-sm">{post.author.name}</h3>
              <p className="text-xs text-muted-foreground">
                {post.author.username} · {post.timestamp}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-4 pt-2">
          <p className="text-sm mb-3">{post.content}</p>

          {post.media && (
            <div className="mb-3">
              <MediaDisplay
                type={post.media.type}
                src={post.media.src}
                alt={post.media.alt || "Post media"}
              />
            </div>
          )}
        </CardContent>

        <CardFooter className="p-0 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1"
              onClick={handleLike}
            >
              <Heart
                className={`h-4 w-4 ${isLiked ? "fill-red-500 text-red-500" : ""}`}
              />
              <span>{likeCount}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1"
              onClick={handleCommentClick}
            >
              <MessageSquare className="h-4 w-4" />
              <span>{post.comments}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => onShare(post.id)}
            >
              <Share2 className="h-4 w-4" />
              <span>{post.shares}</span>
            </Button>
          </div>

          {showComments && <CommentSection postId={post.id} />}
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default PostCard;
