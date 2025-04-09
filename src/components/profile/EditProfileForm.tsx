import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Pencil, Loader2 } from "lucide-react";

interface EditProfileFormProps {
  profile: {
    name: string;
    location: string;
    email: string;
    phone: string;
    avatar: string;
    bio?: string;
    showEmail?: boolean;
    showPhone?: boolean;
  };
  onUpdate: (updatedProfile: any) => void;
  onCancel: () => void;
}

const EditProfileForm: React.FC<EditProfileFormProps> = ({
  profile,
  onUpdate,
  onCancel,
}) => {
  const { user } = useAuth();
  const [name, setName] = useState(profile.name);
  const [location, setLocation] = useState(profile.location || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar);
  const [showEmail, setShowEmail] = useState(profile.showEmail || false);
  const [showPhone, setShowPhone] = useState(profile.showPhone || false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length) return;

    const file = e.target.files[0];
    const fileExt = file.name.split(".").pop();
    const fileName = `${user?.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    setIsUploading(true);

    try {
      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

      if (data) {
        setAvatarUrl(data.publicUrl);
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Error uploading avatar!");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);

    try {
      const updates = {
        id: user.id,
        name,
        location,
        phone,
        bio,
        avatar_url: avatarUrl,
        email: profile.email, // Include email from profile
        show_email: showEmail,
        show_phone: showPhone,
        updated_at: new Date().toISOString(),
      };

      // First check if the profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 means no rows returned, which is fine for a new profile
        throw fetchError;
      }

      // Use upsert to either update or insert the profile
      const { error } = await supabase
        .from("profiles")
        .upsert(updates)
        .select();

      if (error) throw error;

      onUpdate({
        name,
        location,
        email: profile.email,
        phone,
        avatar: avatarUrl,
        bio,
        showEmail,
        showPhone,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error updating profile: " + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div className="flex flex-col items-center mb-6">
        <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg mb-4">
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
          <label
            htmlFor="avatar-upload"
            className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Pencil className="h-4 w-4" />
            )}
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
            disabled={isUploading}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Name
          </label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium mb-1">
            Location
          </label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, Country"
          />
        </div>

        <div className="flex items-center space-x-2 mt-2">
          <label htmlFor="email-privacy" className="text-sm font-medium">
            Show email on profile
          </label>
          <input
            id="email-privacy"
            type="checkbox"
            checked={showEmail}
            onChange={(e) => setShowEmail(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1">
            Phone
          </label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 234 567 8900"
          />
        </div>

        <div className="flex items-center space-x-2 mt-2">
          <label htmlFor="phone-privacy" className="text-sm font-medium">
            Show phone on profile
          </label>
          <input
            id="phone-privacy"
            type="checkbox"
            checked={showPhone}
            onChange={(e) => setShowPhone(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium mb-1">
            Bio
          </label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself"
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
};

export default EditProfileForm;
