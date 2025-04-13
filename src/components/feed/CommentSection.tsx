import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Heart, Send, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  user_id: string;
}

interface CommentSectionProps {
  postId: string;
  onAddComment?: (content: string) => void;
  onLikeComment?: (commentId: string) => void;
}

const CommentSection = ({
  postId,
  onAddComment = () => {},
  onLikeComment = () => {},
}: CommentSectionProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Funktion zum Abrufen der Kommentare
  const fetchComments = useCallback(async () => {
    if (!postId) return;

    setLoading(true);
    try {
      // Fetch comments for this post
      const { data: commentsData, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching comments:", error);
        return;
      }

      if (!commentsData || commentsData.length === 0) {
        setLocalComments([]);
        setLoading(false);
        return;
      }

      // Fetch user likes for comments if user is logged in
      let likedCommentIds = new Set();
      if (user) {
        const { data: likesData } = await supabase
          .from("comment_likes")
          .select("comment_id")
          .eq("user_id", user.id);

        likedCommentIds = new Set(
          likesData?.map((like) => like.comment_id) || [],
        );
      }

      // Get all unique user IDs from comments to fetch profiles in batch
      const userIds = [
        ...new Set(commentsData.map((comment) => comment.user_id)),
      ];

      // Fetch all profiles in a single query
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds);

      // Create a map of user profiles for quick lookup
      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach((profile) => {
          profilesMap.set(profile.id, {
            name: profile.name || "Unknown User",
            avatar_url:
              profile.avatar_url ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`,
          });
        });
      }

      // Get all comment IDs to fetch likes counts in batch
      const commentIds = commentsData.map((comment) => comment.id);

      // Fetch all like counts in a single query
      const { data: likesCountData } = await supabase
        .from("comment_likes")
        .select("comment_id, id")
        .in("comment_id", commentIds);

      // Create a map of like counts for quick lookup
      const likesCountMap = new Map();
      if (likesCountData) {
        likesCountData.forEach((like) => {
          const count = likesCountMap.get(like.comment_id) || 0;
          likesCountMap.set(like.comment_id, count + 1);
        });
      }

      // Format comments with author info
      const formattedComments = commentsData.map((comment) => {
        const profile = profilesMap.get(comment.user_id) || {
          name: "Unknown User",
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user_id}`,
        };

        return {
          id: comment.id,
          author: {
            name: profile.name,
            avatar: profile.avatar_url,
          },
          content: comment.content,
          timestamp: formatDistanceToNow(new Date(comment.created_at), {
            addSuffix: true,
          }),
          likes: likesCountMap.get(comment.id) || 0,
          isLiked: likedCommentIds.has(comment.id),
          user_id: comment.user_id,
        };
      });

      setLocalComments(formattedComments);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching comments:", error);
      setLoading(false);
    }
  }, [postId, user]);

  // Initial fetch of comments
  useEffect(() => {
    let isMounted = true;
    fetchComments();

    return () => {
      isMounted = false;
    };
  }, [fetchComments]);

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user || submitting) return;

    setSubmitting(true);
    try {
      // Add comment to database
      const { data: commentData, error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment.trim(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding comment:", error);
        return;
      }

      if (commentData) {
        // Call the callback
        onAddComment(newComment);

        // Fetch updated comments from the database
        await fetchComments();

        // Clear the input
        setNewComment("");
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      // Delete comment from database
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id); // Ensure user can only delete their own comments

      if (error) {
        console.error("Error deleting comment:", error);
        return;
      }

      // Fetch updated comments from the database
      await fetchComments();
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;

    // Find the comment and toggle its like status
    const updatedComments = [...localComments];
    const commentIndex = updatedComments.findIndex((c) => c.id === commentId);

    if (commentIndex === -1) return;

    const comment = updatedComments[commentIndex];
    const newIsLiked = !comment.isLiked;

    // Update UI optimistically
    updatedComments[commentIndex] = {
      ...comment,
      isLiked: newIsLiked,
      likes: newIsLiked ? comment.likes + 1 : comment.likes - 1,
    };

    setLocalComments(updatedComments);

    try {
      if (newIsLiked) {
        // Add like to database
        await supabase.from("comment_likes").insert({
          comment_id: commentId,
          user_id: user.id,
        });
      } else {
        // Remove like from database
        await supabase
          .from("comment_likes")
          .delete()
          .match({ comment_id: commentId, user_id: user.id });
      }

      onLikeComment(commentId);
    } catch (error) {
      console.error("Error updating comment like:", error);
      // Revert UI change on error
      setLocalComments(localComments);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-md">
      {loading ? (
        <div className="flex justify-center items-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-[#00b4d8]" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Comment list */}
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {localComments.length > 0 ? (
              localComments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex gap-3 p-2 border-b border-gray-100 dark:border-gray-700"
                >
                  <Avatar
                    className="h-8 w-8 cursor-pointer"
                    onClick={() => navigate(`/user/${comment.user_id}`)}
                  >
                    <AvatarImage
                      src={comment.author.avatar}
                      alt={comment.author.name}
                    />
                    <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {comment.author.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p
                          className="font-medium text-sm cursor-pointer hover:underline text-gray-900 dark:text-gray-100"
                          onClick={() => navigate(`/user/${comment.user_id}`)}
                        >
                          {comment.author.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {comment.timestamp}
                        </p>
                      </div>
                      <div className="flex items-center">
                        {user && user.id === comment.user_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-auto mr-1"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            <Trash2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-auto"
                          onClick={() => handleLikeComment(comment.id)}
                        >
                          <Heart
                            className={`h-4 w-4 ${comment.isLiked ? "fill-red-500 text-red-500" : "text-gray-500 dark:text-gray-400"}`}
                          />
                          <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                            {comment.likes}
                          </span>
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm mt-1 text-gray-900 dark:text-gray-100">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                No comments yet. Be the first to comment!
              </p>
            )}
          </div>

          {/* Comment input */}
          <div className="flex gap-3 mt-3">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={
                  user?.user_metadata?.avatar_url ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || user?.id || "user"}`
                }
                alt="Current User"
              />
              <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-2">
              <Textarea
                placeholder="Add a comment..."
                className="min-h-[40px] text-sm resize-none bg-gray-100/50 dark:bg-gray-700/50 border-gray-200/50 dark:border-gray-600/50 text-gray-900 dark:text-gray-100"
                value={newComment}
                onChange={handleCommentChange}
              />
              <Button
                size="sm"
                className="self-end bg-[#00b4d8] hover:bg-[#00b4d8]/80"
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentSection;
