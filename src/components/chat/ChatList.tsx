import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Search,
  Plus,
  User,
  HomeIcon,
  Loader2,
  MessageSquare,
  Bell,
  Eye, // Icon für "Unread"
} from "lucide-react";
import { useNotifications } from "@/routes";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";

interface ChatListProps {
  onBack?: () => void;
}

interface ChatPreview {
  userId: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
}

const ChatList: React.FC<ChatListProps> = ({ onBack = () => {} }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasUnreadNotifications, refreshNotifications } = useNotifications();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    if (!user) {
      console.log("No user found in ChatList");
      return;
    }

    console.log("ChatList initialized with user:", user.id);

    refreshNotifications();

    const fetchChats = async () => {
      setLoading(true);
      try {
        const { data: sentMessages, error: sentError } = await supabase
          .from("private_messages")
          .select("receiver_id, content, created_at")
          .eq("sender_id", user.id)
          .order("created_at", { ascending: false });

        const { data: receivedMessages, error: receivedError } = await supabase
          .from("private_messages")
          .select("sender_id, content, created_at")
          .eq("receiver_id", user.id)
          .order("created_at", { ascending: false });

        if (sentError || receivedError) {
          console.error("Error fetching messages:", sentError || receivedError);
          return;
        }

        const userIds = new Set<string>();
        sentMessages?.forEach((msg) => userIds.add(msg.receiver_id));
        receivedMessages?.forEach((msg) => userIds.add(msg.sender_id));

        const userProfiles: { [key: string]: any } = {};
        for (const id of userIds) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, name, avatar_url")
            .eq("id", id)
            .single();

          if (profile) {
            userProfiles[id] = profile;
          }
        }

        const chatPreviews: ChatPreview[] = [];
        for (const userId of userIds) {
          const { data: lastMessages, error: lastMessageError } = await supabase
            .from("private_messages")
            .select("*")
            .or(
              `and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`,
            )
            .order("created_at", { ascending: false })
            .limit(1);

          if (lastMessageError) {
            console.error("Error fetching last message:", lastMessageError);
            continue;
          }

          const lastMessage =
            lastMessages && lastMessages.length > 0 ? lastMessages[0] : null;

          const { count: unreadCount, error: unreadError } = await supabase
            .from("private_messages")
            .select("*", { count: "exact" })
            .eq("sender_id", userId)
            .eq("receiver_id", user.id)
            .eq("read", false);

          if (unreadError) {
            console.error("Error counting unread messages:", unreadError);
          }

          if (lastMessage && userProfiles[userId]) {
            chatPreviews.push({
              userId,
              name: userProfiles[userId].name || "Unknown User",
              avatar:
                userProfiles[userId].avatar_url ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
              lastMessage: lastMessage.content,
              timestamp: formatDistanceToNow(new Date(lastMessage.created_at), {
                addSuffix: true,
              }),
              unread: unreadCount || 0,
            });
          }
        }

        chatPreviews.sort((a, b) => {
          if (a.unread > 0 && b.unread === 0) return -1;
          if (a.unread === 0 && b.unread > 0) return 1;

          const timeA = a.timestamp.replace(" ago", "");
          const timeB = b.timestamp.replace(" ago", "");

          return timeA.localeCompare(timeB);
        });

        setChats(chatPreviews);
      } catch (error) {
        console.error("Error fetching chats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();

    const subscription = supabase
      .channel("private_messages_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "private_messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          fetchChats();
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const filteredChats = chats.filter((chat) => {
    const matchesSearch = chat.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    if (activeFilter === "all") return matchesSearch;
    if (activeFilter === "unread") return matchesSearch && chat.unread > 0;

    return matchesSearch;
  });

  const handleChatClick = (userId: string) => {
    console.log("Navigating to chat with user ID:", userId);
    navigate(`/chat/${userId}`);
  };

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f0ff] dark:bg-[#0d1015] rounded-[40px]">
      {/* Header */}
      <div className="sticky top-0 z-10 dark:bg-gray-900 p-4 rounded-b-3xl shadow-md bg-[#86a0d7]">
        <div className="flex items-center gap-3">
          <button
            className="w-10 h-10 rounded-md bg-gray-200 dark:bg-gray-800 flex items-center justify-center"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Messages
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your conversations
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 relative mb-2">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search conversations..."
            className="pl-10 pr-4 py-3 w-full rounded-full bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-[#00b4d8] transition-all text-gray-900 dark:text-gray-100 placeholder-gray-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      {/* Chat List */}
      <div className="flex-1 p-4">
        {/* Filter Tabs */}
        <div className="flex space-x-2 mb-4 overflow-x-auto py-2 px-1">
          <button
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-sm transition-all duration-200 ${
              activeFilter === "all"
                ? "bg-[#00b4d8] text-white scale-105"
                : "bg-white dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 hover:bg-gray-50/80 dark:hover:bg-gray-700/80"
            }`}
            onClick={() => handleFilterChange("all")}
          >
            <MessageSquare
              className={`h-5 w-5 ${
                activeFilter === "all" ? "text-white" : "text-[#00b4d8]"
              }`}
            />
            <span className="font-medium">All Chats</span>
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-sm transition-all duration-200 ${
              activeFilter === "unread"
                ? "bg-[#00b4d8] text-white scale-105"
                : "bg-white dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 hover:bg-gray-50/80 dark:hover:bg-gray-700/80"
            }`}
            onClick={() => handleFilterChange("unread")}
          >
            <Eye
              className={`h-5 w-5 ${
                activeFilter === "unread" ? "text-white" : "text-[#00b4d8]"
              }`}
            />
            <span className="font-medium">Unread</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-[#00b4d8]" />
          </div>
        ) : filteredChats.length > 0 ? (
          <div className="space-y-2">
            {filteredChats.map((chat) => (
              <div
                key={chat.userId}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors mb-3"
                onClick={() => handleChatClick(chat.userId)}
              >
                <div className="flex items-center">
                  <div className="relative">
                    <Avatar className="h-14 w-14 mr-3 border-2 border-[#00b4d8] p-0.5">
                      <AvatarImage src={chat.avatar} alt={chat.name} />
                      <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {chat.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {chat.unread > 0 && (
                      <div className="absolute -top-1 -right-1 bg-[#00b4d8] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-md">
                        {chat.unread}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-semibold truncate text-gray-900 dark:text-gray-100">
                        {chat.name}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                        {chat.timestamp}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                      {chat.lastMessage}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : searchQuery ? (
          <div className="text-center py-10">
            <p className="text-gray-500 dark:text-gray-400">
              No conversations found matching "{searchQuery}"
            </p>
          </div>
        ) : (
          <div className="text-center py-10">
            <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No conversations yet
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Start a chat by visiting a user's profile
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
          <HomeIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
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
          className="flex h-14 w-14 justify-center items-center relative text-[#00b4d8]"
          onClick={() => navigate("/chats")}
        >
          <MessageSquare className="h-6 w-6" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="flex items-center justify-center h-14 w-14 relative"
          onClick={() => navigate("/profile")}
        >
          <User className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        </Button>
      </div>
      {/* Add padding at the bottom to account for the navigation bar */}
      <div className="h-20"></div>
    </div>
  );
};

export default ChatList;
