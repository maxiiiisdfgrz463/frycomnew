import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signUp: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{
    error: Error | null;
    data: any | null;
  }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{
    error: Error | null;
    data: any | null;
  }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: any) => Promise<{
    error: Error | null;
    data: any | null;
  }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    setIsLoading(true);

    try {
      console.log("Attempting to sign up with:", { email, name });

      // Sign up the user with email confirmation disabled for testing
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
          emailRedirectTo: window.location.origin + "/feed",
        },
      });

      if (error) {
        console.error("Error signing up:", error);
        return { error, data: null };
      }

      console.log("Signup response:", data);

      // If successful and we have a user, create a profile in the profiles table
      if (data.user) {
        console.log("Creating profile for user:", data.user.id);

        const profileData = {
          id: data.user.id,
          name,
          email,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
          created_at: new Date().toISOString(),
        };

        console.log("Profile data to insert:", profileData);

        const { error: profileError } = await supabase
          .from("profiles")
          .upsert([profileData]);

        if (profileError) {
          console.error("Error creating profile:", profileError);
          return { error: new Error("Failed to create profile"), data: null };
        }

        console.log("Profile created successfully");
      }

      return { data, error: null };
    } catch (err) {
      console.error("Unexpected error during signup:", err);
      return {
        error: err instanceof Error ? err : new Error(String(err)),
        data: null,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log("AuthContext: Attempting to sign in with:", email);

      const result = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (result.error) {
        console.error("Sign in error:", result.error);
      } else {
        console.log("Sign in successful:", result.data);

        // Check if user has a profile, create one if not
        if (result.data.user) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", result.data.user.id)
            .single();

          if (profileError && profileError.code === "PGRST116") {
            // No profile found, create one
            console.log("No profile found for user, creating default profile");

            const defaultProfile = {
              id: result.data.user.id,
              name: email.split("@")[0],
              email: email,
              avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
              created_at: new Date().toISOString(),
            };

            const { error: insertError } = await supabase
              .from("profiles")
              .upsert([defaultProfile]);

            if (insertError) {
              console.error("Error creating default profile:", insertError);
            } else {
              console.log("Default profile created successfully");
            }
          }
        }
      }

      return result;
    } catch (err) {
      console.error("Unexpected error during sign in:", err);
      return {
        data: null,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setIsLoading(false);
  };

  const updateProfile = async (updates: any) => {
    if (!user) {
      return { error: new Error("No user logged in"), data: null };
    }

    const { data, error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, ...updates, updated_at: new Date().toISOString() })
      .select();

    return { data, error };
  };

  const value = {
    session,
    user,
    isLoading,
    signUp,
    signIn,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
