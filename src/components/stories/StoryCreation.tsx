import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Camera, X, Loader2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

interface StoryCreationProps {
  onCancel: () => void;
  onSuccess: () => void;
}

const StoryCreation: React.FC<StoryCreationProps> = ({
  onCancel,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image or video file.",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setMediaFile(file);
    setMediaType(isImage ? "image" : "video");

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!mediaFile) {
      toast({
        title: "Media required",
        description: "Please upload an image or video for your story.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);

      // Upload media file to storage
      const fileExt = mediaFile.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `stories/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(filePath, mediaFile);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from("media")
        .getPublicUrl(filePath);

      const mediaUrl = publicUrlData.publicUrl;

      // Calculate expiry time (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Create story record in database
      const { error: insertError } = await supabase.from("stories").insert({
        user_id: user.id,
        media_url: mediaUrl,
        media_type: mediaType || "image",
        content: content || null,
        expires_at: expiresAt.toISOString(),
        viewed_by: [],
      });

      if (insertError) {
        throw insertError;
      }

      toast({
        title: "Story created",
        description: "Your story has been published successfully.",
      });

      onSuccess();
    } catch (error: any) {
      console.error("Error creating story:", error);
      toast({
        title: "Error creating story",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Create New Story
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Media Upload */}
        <div className="space-y-2">
          <Label htmlFor="media">Media (Required)</Label>
          {mediaPreview ? (
            <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
              {mediaType === "image" ? (
                <img
                  src={mediaPreview}
                  alt="Preview"
                  className="w-full h-64 object-cover"
                />
              ) : (
                <video
                  src={mediaPreview}
                  className="w-full h-64 object-cover"
                  controls
                />
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 rounded-full"
                onClick={clearMedia}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center justify-center">
                <div className="p-3 rounded-full bg-[#00b4d8]/10 mb-2">
                  <ImageIcon className="h-6 w-6 text-[#00b4d8]" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                  Click to upload image or video
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  JPG, PNG, GIF, MP4 (max 10MB)
                </p>
              </div>
              <Input
                id="media"
                type="file"
                ref={fileInputRef}
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Caption */}
        <div className="space-y-2">
          <Label htmlFor="content">Caption (Optional)</Label>
          <Textarea
            id="content"
            placeholder="Add a caption to your story..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="resize-none"
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-[#00b4d8] hover:bg-[#00b4d8]/80 text-white"
            disabled={!mediaFile || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Create Story"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default StoryCreation;
