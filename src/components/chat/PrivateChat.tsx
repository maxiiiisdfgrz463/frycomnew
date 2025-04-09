import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Send,
  Loader2,
  HomeIcon,
  Search,
  Plus,
  User,
  MessageSquare,
  Paperclip,
  Mic,
  Image,
  Video,
  File,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  sender?: {
    name: string;
    avatar_url: string;
  };
  attachment_url?: string;
  attachment_type?: string;
  read?: boolean;
}

interface PrivateChatProps {
  onBack?: () => void;
}

const PrivateChat: React.FC<PrivateChatProps> = ({ onBack = () => {} }) => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [receiverProfile, setReceiverProfile] = useState<any>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !userId) {
      console.log("Missing user or userId", { user, userId });
      return;
    }

    console.log("PrivateChat initialized with userId:", userId);

    // Make sure we have the correct userId from params
    console.log("Current userId from params:", userId);
    console.log("Current user ID:", user.id);

    const fetchReceiverProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("Error fetching receiver profile:", error);
          return;
        }

        setReceiverProfile(data);
      } catch (error) {
        console.error("Error:", error);
      }
    };

    fetchReceiverProfile();
    fetchMessages();

    // Mark messages as read when opening the chat
    const markMessagesAsRead = async () => {
      try {
        // First check if the read column exists in the table
        const { data: columnInfo, error: columnError } = await supabase
          .from("information_schema.columns")
          .select("column_name")
          .eq("table_name", "private_messages")
          .eq("column_name", "read");

        if (columnError) {
          console.error("Error checking for read column:", columnError);
          return;
        }

        // Only try to update the read status if the column exists
        if (columnInfo && columnInfo.length > 0) {
          const { error } = await supabase
            .from("private_messages")
            .update({ read: true })
            .eq("sender_id", userId)
            .eq("receiver_id", user.id)
            .eq("read", false);

          if (error) {
            console.error("Error marking messages as read:", error);
          }
        } else {
          console.log("Read column doesn't exist, skipping update");
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };

    markMessagesAsRead();

    // Set up real-time subscription for new messages
    const subscription = supabase
      .channel("private_messages_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "private_messages",
          filter: `sender_id=eq.${userId},receiver_id=eq.${user.id}`,
        },
        (payload) => {
          // Handle new message from the other user
          fetchMessages();
          // Mark the new message as read immediately
          if (payload.new && payload.new.id) {
            // Check if read column exists before updating
            supabase
              .from("information_schema.columns")
              .select("column_name")
              .eq("table_name", "private_messages")
              .eq("column_name", "read")
              .then(({ data, error }) => {
                if (error) {
                  console.error("Error checking for read column:", error);
                  return;
                }

                if (data && data.length > 0) {
                  supabase
                    .from("private_messages")
                    .update({ read: true })
                    .eq("id", payload.new.id)
                    .then(({ error }) => {
                      if (error)
                        console.error("Error marking message as read:", error);
                    });
                }
              });
          }
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, userId]);

  useEffect(() => {
    // Scroll to bottom whenever messages change
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    if (!user || !userId) {
      console.log("Cannot fetch messages: missing user or userId");
      return;
    }

    setIsLoading(true);
    try {
      console.log("Fetching messages between", user.id, "and", userId);

      // Fetch messages between the two users (in both directions)
      const { data, error } = await supabase
        .from("private_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      console.log("Fetched messages:", data);

      // For each message, get the sender profile info
      const messagesWithSenders = await Promise.all(
        (data || []).map(async (message) => {
          const { data: senderData } = await supabase
            .from("profiles")
            .select("name, avatar_url")
            .eq("id", message.sender_id)
            .single();

          return {
            ...message,
            sender: {
              name: senderData?.name || "Unknown User",
              avatar_url:
                senderData?.avatar_url ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.sender_id}`,
            },
          };
        }),
      );

      setMessages(messagesWithSenders || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !user || !userId || isSending) {
      console.log("Cannot send message - missing data:", {
        hasInput: !!input.trim(),
        hasUser: !!user,
        hasUserId: !!userId,
        isSending,
      });
      return;
    }

    console.log("Attempting to send message to:", userId);

    setIsSending(true);
    try {
      console.log("Sending message to userId:", userId);
      console.log("Current user ID:", user.id);

      // Create message data with only required fields
      const messageData = {
        sender_id: user.id,
        receiver_id: userId,
        content: input.trim(),
        created_at: new Date().toISOString(),
      };

      console.log("Message data to insert:", messageData);

      // Save message to database with only required fields
      const { error } = await supabase.from("private_messages").insert({
        sender_id: user.id,
        receiver_id: userId,
        content: input.trim(),
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Error sending message:", error);
        return;
      }

      // Get the current user's profile for the sender info
      const { data: profileData } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", user.id)
        .single();

      // Create a new message object to add to the UI immediately
      const newMessage = {
        id: Date.now().toString(), // Temporary ID until we refresh
        sender_id: user.id,
        receiver_id: userId,
        content: input.trim(),
        created_at: new Date().toISOString(),
        sender: {
          name: profileData?.name || user.user_metadata?.name || "You",
          avatar_url: profileData?.avatar_url || user.user_metadata?.avatar_url,
        },
      };

      // Clear input
      setInput("");

      // Add to messages state
      setMessages((prev) => [...prev, newMessage]);

      // Fetch messages to ensure everything is in sync
      setTimeout(() => fetchMessages(), 1000);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const toggleAttachMenu = () => {
    setShowAttachMenu(!showAttachMenu);
  };

  const handleAttachmentUpload = async (
    type: "image" | "video" | "file" | "audio",
  ) => {
    if (!user || !userId) return;

    // Create a file input element
    const fileInput = document.createElement("input");
    fileInput.type = "file";

    // Set accepted file types based on attachment type
    switch (type) {
      case "image":
        fileInput.accept = "image/*";
        break;
      case "video":
        fileInput.accept = "video/*";
        break;
      case "audio":
        fileInput.accept = "audio/*";
        break;
      case "file":
        // Accept all file types
        break;
    }

    // Trigger file selection dialog
    fileInput.click();

    // Handle file selection
    fileInput.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      const file = files[0];
      setIsSending(true);

      try {
        // Upload file to Supabase Storage
        const fileName = `${Date.now()}_${file.name}`;
        const filePath = `chat_attachments/${user.id}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("media")
          .upload(filePath, file);

        if (uploadError) {
          console.error("Error uploading file:", uploadError);
          return;
        }

        // Get public URL for the uploaded file
        const { data: urlData } = supabase.storage
          .from("media")
          .getPublicUrl(filePath);

        if (!urlData || !urlData.publicUrl) {
          console.error("Error getting public URL");
          return;
        }

        // Create message with attachment
        const attachmentType = type === "file" ? "file" : type;
        const messageContent = `[${attachmentType.toUpperCase()}] ${file.name}`;

        // Check if attachment columns exist
        const { data: columnInfo, error: columnError } = await supabase
          .from("information_schema.columns")
          .select("column_name")
          .eq("table_name", "private_messages")
          .in("column_name", ["attachment_url", "attachment_type"]);

        if (columnError) {
          console.error("Error checking for attachment columns:", columnError);
        }

        // Prepare message data based on available columns
        const hasAttachmentColumns = columnInfo && columnInfo.length === 2;

        // Save message to database with only fields that exist
        const messageData: any = {
          sender_id: user.id,
          receiver_id: userId,
          content: messageContent,
          created_at: new Date().toISOString(),
        };

        // Only add attachment fields if the columns exist
        if (hasAttachmentColumns) {
          messageData.attachment_url = urlData.publicUrl;
          messageData.attachment_type = attachmentType;
        }

        const { error } = await supabase
          .from("private_messages")
          .insert(messageData);

        if (error) {
          console.error("Error sending message with attachment:", error);
          return;
        }

        // Hide attachment menu
        setShowAttachMenu(false);

        // Fetch updated messages
        fetchMessages();
      } catch (error) {
        console.error("Error handling attachment:", error);
      } finally {
        setIsSending(false);
      }
    };
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f0ff] dark:bg-[#0d1015] rounded-[40px]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#6c5ce7] dark:bg-[#6c5ce7] p-4 rounded-b-3xl shadow-md">
        <div className="flex items-center gap-3">
          <button
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          {receiverProfile ? (
            <div className="flex items-center">
              <Avatar className="h-10 w-10 mr-2 border-2 border-white">
                <AvatarImage
                  src={
                    receiverProfile.avatar_url ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`
                  }
                  alt={receiverProfile.name}
                />
                <AvatarFallback>
                  {receiverProfile.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-semibold text-white">
                  {receiverProfile.name}
                </h1>
                <p className="text-xs text-white/70">Online</p>
              </div>
            </div>
          ) : (
            <h1 className="text-xl font-semibold text-white">Chat</h1>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 p-4 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwnMessage = message.sender_id === user?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] ${isOwnMessage ? "bg-[#6c5ce7] text-white rounded-t-2xl rounded-bl-2xl rounded-br-md" : "bg-white dark:bg-gray-800 shadow rounded-t-2xl rounded-br-2xl rounded-bl-md"} p-4 shadow-md`}
                  >
                    {!isOwnMessage && (
                      <div className="flex items-center mb-2">
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarImage
                            src={
                              message.sender?.avatar_url ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.sender_id}`
                            }
                            alt={message.sender?.name || "User"}
                          />
                          <AvatarFallback>
                            {message.sender?.name?.charAt(0).toUpperCase() ||
                              "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-semibold">
                          {message.sender?.name}
                        </span>
                      </div>
                    )}
                    {message.attachment_url ? (
                      <div className="mb-2">
                        {message.attachment_type === "image" ? (
                          <img
                            src={message.attachment_url}
                            alt="Image attachment"
                            className="rounded-lg max-w-full max-h-60 object-contain"
                          />
                        ) : message.attachment_type === "video" ? (
                          <video
                            src={message.attachment_url}
                            controls
                            className="rounded-lg max-w-full max-h-60"
                          />
                        ) : message.attachment_type === "audio" ? (
                          <audio
                            src={message.attachment_url}
                            controls
                            className="w-full"
                          />
                        ) : (
                          <div className="flex items-center bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
                            <File className="h-5 w-5 mr-2" />
                            <a
                              href={message.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline text-sm truncate"
                            >
                              {message.content.replace(/\[FILE\]\s/, "")}
                            </a>
                          </div>
                        )}
                      </div>
                    ) : null}
                    <p className="text-sm">
                      {message.attachment_url
                        ? message.content.replace(
                            /\[(IMAGE|VIDEO|AUDIO|FILE)\]\s/,
                            "",
                          )
                        : message.content}
                    </p>
                    <div
                      className={`text-xs mt-1 ${isOwnMessage ? "text-white/70" : "text-gray-400"}`}
                    >
                      {formatDistanceToNow(new Date(message.created_at), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <p className="text-gray-500 dark:text-gray-400">
              No messages yet. Start a conversation!
            </p>
          </div>
        )}
      </div>

      {/* Attachment Menu */}
      {showAttachMenu && (
        <div className="p-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full p-2"
            onClick={() => handleAttachmentUpload("image")}
            disabled={isSending}
          >
            <Image className="h-6 w-6 text-[#6c5ce7]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full p-2"
            onClick={() => handleAttachmentUpload("video")}
            disabled={isSending}
          >
            <Video className="h-6 w-6 text-[#6c5ce7]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full p-2"
            onClick={() => handleAttachmentUpload("file")}
            disabled={isSending}
          >
            <File className="h-6 w-6 text-[#6c5ce7]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full p-2"
            onClick={() => handleAttachmentUpload("audio")}
            disabled={isSending}
          >
            <Mic className="h-6 w-6 text-[#6c5ce7]" />
          </Button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-t-3xl shadow-inner">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-10 w-10 flex-shrink-0"
            onClick={toggleAttachMenu}
          >
            <Paperclip className="h-5 w-5 text-[#6c5ce7]" />
          </Button>
          <Input
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1 rounded-full bg-gray-100 dark:bg-gray-800 px-4 py-3 focus:ring-2 focus:ring-[#6c5ce7] transition-all"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isSending || !input.trim()}
            size="icon"
            className="h-12 w-12 rounded-full bg-[#6c5ce7] hover:bg-[#5b4ecc] ml-2 shadow-md"
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around items-center p-2 z-20 shadow-lg">
        <Button
          variant="ghost"
          size="icon"
          className="flex items-center justify-center h-14 w-16"
          onClick={() => navigate("/feed")}
        >
          <HomeIcon className="h-6 w-6" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="flex items-center justify-center h-14 w-16"
          onClick={() => navigate("/search")}
        >
          <Search className="h-6 w-6" />
        </Button>

        {/* Create Post Button (Centered) */}
        <Button
          onClick={() => navigate("/create-post")}
          className="flex items-center justify-center h-12 w-12 rounded-full hover:bg-emerald-500 shadow-lg bg-[#00b4d8] absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
        >
          <Plus className="h-6 w-6" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="flex items-center justify-center h-14 w-16 text-[#6c5ce7]"
          onClick={() => navigate("/chats")}
        >
          <MessageSquare className="h-6 w-6" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="flex items-center justify-center h-14 w-16"
          onClick={() => navigate("/profile")}
        >
          <User className="h-6 w-6" />
        </Button>
      </div>

      {/* Add padding at the bottom to account for the navigation bar */}
      <div className="h-16"></div>
    </div>
  );
};

export default PrivateChat;
