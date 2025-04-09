import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowLeft,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  Video as VideoIcon,
  X,
  Loader2,
} from "lucide-react";

interface CreatePostScreenProps {
  onBack?: () => void;
  onPost?: (content: string, media?: { type: string; url: string }) => void;
}

const CreatePostScreen: React.FC<CreatePostScreenProps> = ({
  onBack = () => {},
  onPost = () => {},
}) => {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [userProfile, setUserProfile] = useState({
    name: "",
    avatar: "",
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!authUser) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("name, avatar_url")
          .eq("id", authUser.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          setUserProfile({
            name: authUser.email?.split("@")[0] || "User",
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.email || authUser.id}`,
          });
          return;
        }

        if (data) {
          setUserProfile({
            name: data.name || authUser.email?.split("@")[0] || "User",
            avatar:
              data.avatar_url ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.email || authUser.id}`,
          });
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };

    fetchUserProfile();
  }, [authUser]);

  const handleImageClick = () => {
    imageInputRef.current?.click();
  };

  const handleVideoClick = () => {
    videoInputRef.current?.click();
  };

  const handleMediaChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaFile(file);
    setMediaType(type);

    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setMediaPreview(null);
    setMediaFile(null);
    setMediaType(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handlePost = async () => {
    if (!content.trim() && !mediaFile) {
      toast({
        title: "Error",
        description: "Please add some content or media to your post",
        variant: "destructive",
      });
      return;
    }

    if (!authUser?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to post",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      let mediaUrl = null;
      let mediaTypeValue = null;

      // Upload media if exists
      if (mediaFile) {
        const fileExt = mediaFile.name.split(".").pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${authUser.id}/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from("media")
          .upload(filePath, mediaFile);

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("media").getPublicUrl(filePath);

        mediaUrl = publicUrl;
        mediaTypeValue = mediaType;
      }

      // Create post in database
      const { error } = await supabase.from("posts").insert({
        content: content.trim(),
        user_id: authUser.id,
        media_url: mediaUrl,
        media_type: mediaTypeValue,
      });

      if (error) throw new Error(error.message);

      // Success
      toast({
        title: "Success",
        description: "Your post has been published!",
      });

      // Reset form
      setContent("");
      removeMedia();

      // Call onPost callback
      onPost(
        content,
        mediaUrl ? { type: mediaType || "image", url: mediaUrl } : undefined,
      );
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create post",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#0d1015] rounded-[40px]">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800">
        <button
          className="w-12 h-12 rounded-md flex items-center justify-center"
          onClick={onBack}
          disabled={isLoading}
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold">Create Post</h1>
        <div className="w-12"></div> {/* Spacer for alignment */}
      </div>
      {/* Post Creator */}
      <div className="flex-1 p-4">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 rounded-full overflow-hidden mr-3">
            <img
              src={userProfile.avatar}
              alt={userProfile.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <h3 className="font-semibold">{userProfile.name}</h3>
            <button
              className="text-sm text-gray-500 flex items-center gap-1"
              onClick={() => setIsPublic(!isPublic)}
              type="button"
            >
              {isPublic ? "Public" : "Private"}
            </button>
          </div>
        </div>

        {/* Text Editor */}
        <div className="mb-4">
          <div className="bg-gray-200 dark:bg-gray-800 rounded-t-md p-2 flex items-center space-x-2">
            <button className="h-8 w-8 flex items-center justify-center">
              <Bold className="h-4 w-4" />
            </button>
            <button className="h-8 w-8 flex items-center justify-center">
              <Italic className="h-4 w-4" />
            </button>
            <div className="flex-1"></div>
            <button className="h-8 w-8 flex items-center justify-center">
              <AlignLeft className="h-4 w-4" />
            </button>
            <button className="h-8 w-8 flex items-center justify-center">
              <AlignCenter className="h-4 w-4" />
            </button>
            <button className="h-8 w-8 flex items-center justify-center">
              <AlignRight className="h-4 w-4" />
            </button>
          </div>

          <Textarea
            placeholder="What is happening?!"
            className="min-h-[200px] text-lg border-0 rounded-t-none focus-visible:ring-0 resize-none"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* Media Preview */}
        {mediaPreview && (
          <div className="relative mb-4 border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden">
            <button
              onClick={removeMedia}
              className="absolute top-2 right-2 bg-gray-800 bg-opacity-70 rounded-full p-1"
              disabled={isLoading}
              type="button"
            >
              <X className="h-5 w-5 text-white" />
            </button>
            {mediaType === "image" ? (
              <img
                src={mediaPreview}
                alt="Preview"
                className="w-full max-h-[300px] object-contain"
              />
            ) : (
              <video
                src={mediaPreview}
                controls
                className="w-full max-h-[300px] object-contain"
              />
            )}
          </div>
        )}

        {/* Media Options */}
        <div className="border border-gray-200 dark:border-gray-800 rounded-md p-4 mb-6">
          <p className="text-lg font-medium mb-4">Add to your Post</p>
          <div className="flex space-x-4">
            <button
              className="h-12 w-12 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
              onClick={handleImageClick}
              disabled={isLoading || !!mediaPreview}
              type="button"
            >
              <ImageIcon className="h-6 w-6" />
            </button>
            <input
              type="file"
              ref={imageInputRef}
              onChange={(e) => handleMediaChange(e, "image")}
              accept="image/*"
              className="hidden"
              disabled={isLoading}
            />

            <button
              className="h-12 w-12 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
              onClick={handleVideoClick}
              disabled={isLoading || !!mediaPreview}
              type="button"
            >
              <VideoIcon className="h-6 w-6" />
            </button>
            <input
              type="file"
              ref={videoInputRef}
              onChange={(e) => handleMediaChange(e, "video")}
              accept="video/*"
              className="hidden"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Post Button */}
        <Button
          onClick={handlePost}
          disabled={isLoading || (!content.trim() && !mediaFile)}
          className="w-full h-14 text-lg hover:bg-emerald-500 text-white rounded-full bg-[#00b4d8]"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Posting...
            </>
          ) : (
            "Post"
          )}
        </Button>
      </div>
    </div>
  );
};

export default CreatePostScreen;
