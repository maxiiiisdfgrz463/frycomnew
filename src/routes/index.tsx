import React, { useState, useEffect, createContext, useContext } from "react";
import {
  Routes,
  Route,
  useNavigate,
  Navigate,
  useParams,
} from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import WelcomeScreen from "@/components/auth/WelcomeScreen";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";
import FeedScreen from "@/components/feed/FeedScreen";
import ProfileScreen from "@/components/profile/ProfileScreen";
import UserProfileScreen from "@/components/profile/UserProfileScreen";
import SearchScreen from "@/components/search/SearchScreen";
import Chatbot from "@/components/chatbot/Chatbot";
import PrivateChat from "@/components/chat/PrivateChat";
import ChatList from "@/components/chat/ChatList";
import { supabase } from "@/lib/supabase";

// Create notification context
interface NotificationContextType {
  hasUnreadMessages: boolean;
  hasUnreadNotifications: boolean;
  refreshNotifications: () => void;
}

export const NotificationContext = createContext<NotificationContextType>({
  hasUnreadMessages: false,
  hasUnreadNotifications: false,
  refreshNotifications: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

// Wrapper component to properly get URL params
const UserProfileWrapper = ({
  navigateToFeed,
}: {
  navigateToFeed: () => void;
}) => {
  const { userId } = useParams();
  return <UserProfileScreen userId={userId || ""} onBack={navigateToFeed} />;
};
import CreatePostScreen from "@/components/feed/CreatePostScreen";
import NotificationsScreen from "@/components/notifications/NotificationsScreen";
import { ArrowLeft } from "lucide-react";

const AppRoutes: React.FC = () => {
  const navigate = useNavigate();
  const { user, signIn, signOut, isLoading } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      setIsAuthenticated(true);
      checkUnreadMessages();
      checkUnreadNotifications();
      setupRealtimeSubscriptions();
    } else {
      setIsAuthenticated(false);
    }
  }, [user]);

  const checkUnreadMessages = async () => {
    if (!user) return;

    try {
      const { count, error } = await supabase
        .from("private_messages")
        .select("*", { count: "exact" })
        .eq("receiver_id", user.id)
        .eq("read", false);

      if (error) {
        console.error("Error checking unread messages:", error);
        return;
      }

      setHasUnreadMessages(count > 0);
    } catch (error) {
      console.error("Error checking unread messages:", error);
    }
  };

  const checkUnreadNotifications = async () => {
    if (!user) return;

    try {
      // For now, we'll just check for new follows as notifications
      const { data, error } = await supabase
        .from("follows")
        .select("*")
        .eq("followed_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error checking notifications:", error);
        return;
      }

      // For simplicity, we'll consider any follows in the last 24 hours as unread
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const hasRecent = data.some((follow) => {
        const followDate = new Date(follow.created_at);
        return followDate > oneDayAgo;
      });

      setHasUnreadNotifications(hasRecent);
    } catch (error) {
      console.error("Error checking notifications:", error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    // Subscribe to new messages
    const messageSubscription = supabase
      .channel("new-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "private_messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          setHasUnreadMessages(true);
        },
      )
      .subscribe();

    // Subscribe to new follows
    const followSubscription = supabase
      .channel("new-follows")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "follows",
          filter: `followed_id=eq.${user.id}`,
        },
        () => {
          setHasUnreadNotifications(true);
        },
      )
      .subscribe();

    return () => {
      messageSubscription.unsubscribe();
      followSubscription.unsubscribe();
    };
  };

  const refreshNotifications = () => {
    checkUnreadMessages();
    checkUnreadNotifications();
  };

  // Auth handlers
  const handleLogin = async (email: string, password: string) => {
    const result = await signIn(email, password);
    if (!result.error) {
      navigate("/feed");
      return { success: true };
    }
    return result;
  };

  const handleSignup = async (
    name: string,
    email: string,
    password: string,
  ) => {
    // After signup, we need to log the user in
    console.log("Handling post-signup login for:", email);
    const { error } = await signIn(email, password);

    if (error) {
      console.error("Error logging in after signup:", error);
      return;
    }

    navigate("/feed");
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  // Navigation handlers
  const navigateToLogin = () => navigate("/login");
  const navigateToSignup = () => navigate("/signup");
  const navigateToWelcome = () => navigate("/");
  const navigateBack = () => window.history.back();
  const navigateToFeed = () => navigate("/feed");
  const navigateToProfile = () => navigate("/profile");
  const navigateToCreatePost = () => navigate("/create-post");
  const navigateToNotifications = () => navigate("/notifications");
  const navigateToChatbot = () => navigate("/chatbot");
  const navigateToChats = () => navigate("/chats");
  const navigateToUserProfile = (userId: string) => navigate(`/user/${userId}`);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <NotificationContext.Provider
      value={{
        hasUnreadMessages,
        hasUnreadNotifications,
        refreshNotifications,
      }}
    >
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/feed" replace />
            ) : (
              <WelcomeScreen
                onGetStarted={navigateToSignup}
                onLogin={navigateToLogin}
                onBack={navigateBack}
              />
            )
          }
        />
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/feed" replace />
            ) : (
              <LoginForm
                onLogin={handleLogin}
                onNavigateToSignup={navigateToSignup}
                onBack={navigateToWelcome}
              />
            )
          }
        />
        <Route
          path="/signup"
          element={
            isAuthenticated ? (
              <Navigate to="/feed" replace />
            ) : (
              <SignupForm
                onSignup={handleSignup}
                onNavigateToLogin={navigateToLogin}
                onBack={navigateToWelcome}
              />
            )
          }
        />
        <Route
          path="/feed"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <FeedScreen
                onCreatePost={navigateToCreatePost}
                onProfile={navigateToProfile}
                onNotifications={navigateToNotifications}
              />
            )
          }
        />
        <Route
          path="/profile"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <ProfileScreen onBack={navigateToFeed} onLogout={handleLogout} />
            )
          }
        />
        <Route
          path="/notifications"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <NotificationsScreen onBack={navigateToFeed} />
            )
          }
        />
        <Route
          path="/search"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <SearchScreen
                onBack={navigateToFeed}
                onProfile={navigateToProfile}
                onNotifications={navigateToNotifications}
                onCreatePost={navigateToCreatePost}
              />
            )
          }
        />
        <Route
          path="/create-post"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <CreatePostScreen
                onBack={navigateToFeed}
                onPost={(content, media) => {
                  console.log("New post:", { content, media });
                  navigateToFeed();
                }}
              />
            )
          }
        />
        <Route
          path="/user/:userId"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <UserProfileWrapper navigateToFeed={navigateToFeed} />
            )
          }
        />
        <Route
          path="/chatbot"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <Chatbot onBack={navigateToFeed} />
            )
          }
        />
        <Route
          path="/chats"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <ChatList onBack={navigateToFeed} />
            )
          }
        />
        <Route
          path="/chat/:userId"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <PrivateChat onBack={navigateToChats} />
            )
          }
        />
      </Routes>
    </NotificationContext.Provider>
  );
};

export default AppRoutes;
