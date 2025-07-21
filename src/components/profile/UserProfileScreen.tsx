import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Share2,
  MoreVertical,
  MapPin,
  Loader2,
  UserPlus,
  UserCheck,
  HomeIcon,
  Search,
  Plus,
  User,
} from "lucide-react";
import MediaDisplay from "@/components/feed/MediaDisplay";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { useNotifications } from "@/routes"; // For notification status

interface UserProfileScreenProps {
  userId: string;
  onBack?: () => void;
}

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({
  userId,
  onBack = () => {},
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { hasUnreadMessages } = useNotifications(); // Neu: Für ungelesene Nachrichten
  const [profile, setProfile] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null); // Neu: Für Profilbild

  // Neu: Profilbild des eingeloggten Benutzers abrufen
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
          console.error("Fehler beim Abrufen des Profilbildes:", error);
          return;
        }

        setUserProfileImage(
          profileData?.avatar_url ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || user?.id || "user"}`,
        );
      } catch (error) {
        console.error("Fehler beim Abrufen des Profilbildes:", error);
        setUserProfileImage(
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || user?.id || "user"}`,
        );
      }
    };

    fetchUserProfileImage();
  }, [user]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        toast({
          title: "Fehler",
          description: "Keine Benutzer-ID angegeben",
          variant: "destructive",
        });
        return;
      }

      try {
        setLoading(true);
        // Profil des Benutzers abrufen
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("Fehler beim Abrufen des Profils:", error);
          toast({
            title: "Fehler",
            description: "Profil konnte nicht geladen werden",
            variant: "destructive",
          });
          return;
        }

        if (data) {
          setProfile({
            id: data.id,
            name: data.name || "Unbekannter Benutzer",
            location: data.location || "",
            email: data.show_email ? data.email : "",
            phone: data.show_phone ? data.phone : "",
            avatar:
              data.avatar_url ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
            bio: data.bio || "",
          });
        }

        // Follow-Status und Statistiken abrufen
        if (user) {
          // Prüfen, ob der aktuelle Benutzer diesem Profil folgt
          const { data: followData, error: followError } = await supabase
            .from("follows")
            .select("*")
            .eq("follower_id", user.id)
            .eq("followed_id", userId);

          if (followError) {
            console.error("Fehler beim Prüfen des Follow-Status:", followError);
          } else {
            setIsFollowing(followData && followData.length > 0);
          }

          // Anzahl der Follower abrufen
          const { count: followersCountData, error: followersError } =
            await supabase
              .from("follows")
              .select("*", { count: "exact" })
              .eq("followed_id", userId);

          if (followersError) {
            console.error(
              "Fehler beim Abrufen der Follower-Anzahl:",
              followersError,
            );
          } else {
            setFollowersCount(followersCountData || 0);
          }

          // Anzahl der gefolgten Benutzer abrufen
          const { count: followingCountData, error: followingError } =
            await supabase
              .from("follows")
              .select("*", { count: "exact" })
              .eq("follower_id", userId);

          if (followingError) {
            console.error(
              "Fehler beim Abrufen der Following-Anzahl:",
              followingError,
            );
          } else {
            setFollowingCount(followingCountData || 0);
          }
        }
      } catch (error) {
        console.error("Allgemeiner Fehler beim Laden des Profils:", error);
        toast({
          title: "Fehler",
          description: "Ein unerwarteter Fehler ist aufgetreten",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, user, toast]);

  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!userId) return;

      try {
        setLoadingPosts(true);
        // Posts des Benutzers abrufen
        const { data: postsData, error } = await supabase
          .from("posts")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Fehler beim Abrufen der Posts:", error);
          toast({
            title: "Fehler",
            description: "Posts konnten nicht geladen werden",
            variant: "destructive",
          });
          return;
        }

        if (!postsData || postsData.length === 0) {
          setUserPosts([]);
          setLoadingPosts(false);
          return;
        }

        // Posts formatieren
        const formattedPosts = await Promise.all(
          postsData.map(async (post) => {
            const { count: commentsCount } = await supabase
              .from("comments")
              .select("id", { count: "exact" })
              .eq("post_id", post.id);

            const { count: likesCount } = await supabase
              .from("likes")
              .select("id", { count: "exact" })
              .eq("post_id", post.id);

            let isLiked = false;
            if (user) {
              const { data: likeData } = await supabase
                .from("likes")
                .select("*")
                .eq("post_id", post.id)
                .eq("user_id", user.id)
                .single();

              isLiked = !!likeData;
            }

            return {
              id: post.id,
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
              isLiked,
            };
          }),
        );

        setUserPosts(formattedPosts);
      } catch (error) {
        console.error("Fehler beim Laden der Posts:", error);
        toast({
          title: "Fehler",
          description: "Ein Fehler ist beim Laden der Posts aufgetreten",
          variant: "destructive",
        });
      } finally {
        setLoadingPosts(false);
      }
    };

    fetchUserPosts();
  }, [userId, user, toast]);

  const handleFollow = async () => {
    if (!user || user.id === userId) {
      toast({
        title: "Fehler",
        description:
          "Du kannst dir selbst nicht folgen oder bist nicht eingeloggt",
        variant: "destructive",
      });
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        console.log(`Versuche, ${userId} zu entfolgen...`);
        const { error: deleteError } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("followed_id", userId);

        if (deleteError) {
          console.error("Fehler beim Entfolgen:", deleteError);
          throw deleteError;
        }

        setIsFollowing(false);
        setFollowersCount((prev) => Math.max(0, prev - 1));
        toast({
          title: "Entfolgt",
          description: `Du folgst ${profile?.name} nicht mehr`,
        });
      } else {
        // Follow
        console.log(`Versuche, ${userId} zu folgen...`);
        const followData = {
          follower_id: user.id,
          followed_id: userId,
          created_at: new Date().toISOString(),
        };

        const { error: insertError } = await supabase
          .from("follows")
          .insert(followData);

        if (insertError) {
          console.error("Fehler beim Folgen:", insertError);
          throw insertError;
        }

        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
        toast({
          title: "Folge",
          description: `Du folgst jetzt ${profile?.name}`,
        });
      }
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Follow-Status:", error);
      toast({
        title: "Fehler",
        description: "Follow-Status konnte nicht aktualisiert werden",
        variant: "destructive",
      });
    } finally {
      setFollowLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      toast({
        title: "Fehler",
        description: "Du musst eingeloggt sein, um zu liken",
        variant: "destructive",
      });
      return;
    }

    const updatedPosts = [...userPosts];
    const postIndex = updatedPosts.findIndex((p) => p.id === postId);

    if (postIndex === -1) return;

    const post = updatedPosts[postIndex];
    const newIsLiked = !post.isLiked;

    updatedPosts[postIndex] = {
      ...post,
      isLiked: newIsLiked,
      likes: newIsLiked ? post.likes + 1 : post.likes - 1,
    };

    setUserPosts(updatedPosts);

    try {
      if (newIsLiked) {
        await supabase.from("likes").insert({
          post_id: postId,
          user_id: user.id,
          created_at: new Date().toISOString(),
        });
      } else {
        await supabase
          .from("likes")
          .delete()
          .match({ post_id: postId, user_id: user.id });
      }
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Likes:", error);
      setUserPosts(userPosts);
      toast({
        title: "Fehler",
        description: "Like konnte nicht gespeichert werden",
        variant: "destructive",
      });
    }
  };

  const handleStartChat = () => {
    if (!userId) return;
    navigate(`/chat/${userId}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white dark:bg-[#0d1015] rounded-[40px] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-gray-500">Profil wird geladen...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#0d1015] rounded-[40px]">
      {/* Header */}
      <div className="flex justify-between items-center p-4">
        <button
          className="w-12 h-12 rounded-md bg-gray-200 dark:bg-gray-800 flex items-center justify-center"
          onClick={onBack}
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold">Profil</h1>
        <div className="w-12 h-12"></div>
      </div>

      {/* Profil-Informationen */}
      <div className="flex flex-col items-center px-6 py-8">
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
          <img
            src={profile?.avatar}
            alt={profile?.name}
            className="w-full h-full object-cover"
          />
        </div>

        <h2 className="text-2xl font-bold mt-4">{profile?.name}</h2>
        {profile?.location && (
          <div className="flex items-center text-gray-500 mt-1">
            <MapPin className="h-4 w-4 mr-1" />
            <p>{profile.location}</p>
          </div>
        )}

        <div className="flex items-center space-x-6 mt-4">
          <div className="text-center">
            <p className="font-bold">{userPosts.length}</p>
            <p className="text-sm text-gray-500">Posts</p>
          </div>
          <div className="text-center">
            <p className="font-bold">{followersCount}</p>
            <p className="text-sm text-gray-500">Follower</p>
          </div>
          <div className="text-center">
            <p className="font-bold">{followingCount}</p>
            <p className="text-sm text-gray-500">Folge ich</p>
          </div>
        </div>

        {user && user.id !== userId && (
          <div className="flex space-x-2 mt-4">
            <Button
              onClick={handleFollow}
              variant={isFollowing ? "outline" : "default"}
              className="flex items-center gap-2"
              disabled={followLoading}
            >
              {followLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isFollowing ? (
                <>
                  <UserCheck className="h-4 w-4" />
                  Folge ich
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Folgen
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleStartChat}
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Nachricht
            </Button>
          </div>
        )}

        <div className="w-full mt-6 space-y-4">
          {profile?.email && (
            <div className="flex items-center">
              <span className="text-gray-600">{profile.email}</span>
            </div>
          )}
          {profile?.bio && (
            <div className="mt-2">
              <p className="text-gray-600">{profile.bio}</p>
            </div>
          )}
        </div>
      </div>

      {/* Benutzer-Posts */}
      <div className="flex-1 px-4 py-6">
        <h2 className="text-xl font-semibold mb-4">Posts</h2>

        {loadingPosts ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : userPosts.length > 0 ? (
          <div className="space-y-4">
            {userPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
              >
                <div className="flex items-start p-4">
                  <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                    <img
                      src={profile?.avatar}
                      alt={profile?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-semibold">{profile?.name}</h3>
                        <p className="text-xs text-gray-500">
                          {post.timestamp}
                        </p>
                      </div>
                      <button className="h-8 w-8 flex items-center justify-center">
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </div>

                    {post.content && <p className="mt-2">{post.content}</p>}

                    {post.media && (
                      <div className="mt-3 rounded-lg overflow-hidden">
                        <MediaDisplay
                          type={post.media.type}
                          src={post.media.src}
                          alt={post.media.alt || "Post media"}
                        />
                      </div>
                    )}

                    <div className="flex items-center mt-3">
                      <button
                        className="flex items-center gap-1 p-2"
                        onClick={() => handleLike(post.id)}
                      >
                        <Heart
                          className={`h-5 w-5 ${post.isLiked ? "fill-red-500 text-red-500" : ""}`}
                        />
                        <span>{post.likes}</span>
                      </button>
                      <button className="flex items-center gap-1 p-2">
                        <MessageSquare className="h-5 w-5" />
                        <span>{post.comments}</span>
                      </button>
                      <button className="flex items-center gap-1 p-2">
                        <Share2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400">
              Noch keine Posts.
            </p>
          </div>
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
          <MessageSquare className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          {hasUnreadMessages && (
            <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full"></span>
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="flex items-center justify-center h-14 w-14"
          onClick={() => navigate("/profile")}
        >
          {userProfileImage ? (
            <Avatar className="h-8 w-8 border-2 border-[#00b4d8]/20">
              <AvatarImage src={userProfileImage} alt="User Profile" />
              <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {user?.user_metadata?.name?.charAt(0).toUpperCase() ||
                  user?.email?.charAt(0).toUpperCase() ||
                  "U"}
              </AvatarFallback>
            </Avatar>
          ) : (
            <User className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          )}
        </Button>
      </div>
      {/* Add padding at the bottom to account for the navigation bar */}
      <div className="h-20"></div>
    </div>
  );
};

export default UserProfileScreen;
