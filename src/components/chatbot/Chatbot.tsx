import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import SparkleIcon from "@/components/ui/sparkle-icon";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { getChatCompletion, Message as ChatMessage } from "@/lib/chatgpt";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface ChatbotProps {
  onBack?: () => void;
}

const Chatbot: React.FC<ChatbotProps> = ({ onBack = () => {} }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add welcome message when component mounts
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Hello! How can I help you today?",
        timestamp: new Date(),
      },
    ]);

    // Load chat history from Supabase if available
    const loadChatHistory = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error loading chat history:", error);
          return;
        }

        if (data && data.length > 0) {
          const formattedMessages = data.map((msg) => ({
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            timestamp: new Date(msg.created_at),
          }));
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };

    loadChatHistory();
  }, [user]);

  useEffect(() => {
    // Scroll to bottom whenever messages change
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Save user message to Supabase if user is logged in
      if (user) {
        await supabase.from("chat_messages").insert({
          user_id: user.id,
          role: "user",
          content: userMessage.content,
          created_at: userMessage.timestamp.toISOString(),
        });
      }

      // Call the ChatGPT API to get a response
      try {
        // Convert our messages to the format expected by the API
        const apiMessages: ChatMessage[] = [
          {
            role: "system",
            content:
              "You are a helpful assistant for FRYCOM, a social media platform. You help users with posting content, finding friends, and navigating the platform. Keep responses concise and friendly.",
          },
          ...messages
            .filter((msg) => msg.id !== "welcome") // Filter out the welcome message
            .map((msg) => ({
              role: msg.role as "user" | "assistant" | "system",
              content: msg.content,
            })),
          {
            role: "user",
            content: userMessage.content,
          },
        ];

        // Get response from ChatGPT API
        const responseContent = await getChatCompletion(apiMessages);

        const aiResponse: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: responseContent,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiResponse]);

        // Save AI response to Supabase if user is logged in
        if (user) {
          await supabase.from("chat_messages").insert({
            user_id: user.id,
            role: "assistant",
            content: aiResponse.content,
            created_at: aiResponse.timestamp.toISOString(),
          });
        }
      } catch (error) {
        console.error("Error getting AI response:", error);
        const errorResponse: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content:
            "I'm having trouble connecting to my brain right now. Please try again later.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorResponse]);
      } finally {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#0d1015] rounded-[40px]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 p-4">
        <div className="flex items-center gap-3">
          <button
            className="w-10 h-10 rounded-md bg-gray-200 dark:bg-gray-800 flex items-center justify-center"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-semibold">AI Assistant</h1>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${message.role === "user" ? "bg-[#00b4d8] text-white" : "bg-white dark:bg-gray-800 shadow"}`}
              >
                {message.role === "assistant" && (
                  <div className="flex items-center mb-2">
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage
                        src="https://api.dicebear.com/7.x/bottts/svg?seed=frycom-ai"
                        alt="AI"
                      />
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-semibold">FRYCOM AI</span>
                  </div>
                )}
                <p className="text-sm">{message.content}</p>
                <div
                  className={`text-xs mt-1 ${message.role === "user" ? "text-blue-100" : "text-gray-400"}`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-3 bg-white dark:bg-gray-800 shadow">
                <div className="flex items-center mb-2">
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage
                      src="https://api.dicebear.com/7.x/bottts/svg?seed=frycom-ai"
                      alt="AI"
                    />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-semibold">FRYCOM AI</span>
                </div>
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            size="icon"
            className="h-10 w-10 rounded-full bg-[#00b4d8] hover:bg-[#00a0c2]"
          >
            {isLoading ? (
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
          className="flex items-center justify-center h-12 w-12 rounded-full hover:bg-emerald-500 shadow-lg bg-[#00b4d8] -mt-6 absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        >
          <Plus className="h-6 w-6" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="flex items-center justify-center h-14 w-16 text-[#00b4d8]"
        >
          <SparkleIcon className="h-6 w-6" />
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

export default Chatbot;
