import { supabase } from "./supabase";

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function subscribeToPushNotifications(
  subscription: PushSubscription,
) {
  const user = supabase.auth.getUser();
  const userId = (await user).data.user?.id;

  if (!userId) {
    throw new Error(
      "User must be logged in to subscribe to push notifications",
    );
  }

  // Store the subscription in the database
  const { error } = await supabase
    .from("push_notification_subscriptions")
    .upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });

  if (error) {
    console.error("Error saving push subscription:", error);
    throw error;
  }

  return { success: true };
}

export async function unsubscribeFromPushNotifications(endpoint: string) {
  const user = supabase.auth.getUser();
  const userId = (await user).data.user?.id;

  if (!userId) {
    throw new Error(
      "User must be logged in to unsubscribe from push notifications",
    );
  }

  const { error } = await supabase
    .from("push_notification_subscriptions")
    .delete()
    .match({ user_id: userId, endpoint });

  if (error) {
    console.error("Error removing push subscription:", error);
    throw error;
  }

  return { success: true };
}

export async function setupNotificationListener() {
  const user = supabase.auth.getUser();
  const userId = (await user).data.user?.id;

  if (!userId) return;

  // Subscribe to new notifications
  return supabase
    .channel("notifications")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const notification = payload.new;
        // Display the notification to the user
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("New Activity on FRYCOM", {
            body: notification.content,
            icon: "/Group.svg",
          });
        }
      },
    )
    .subscribe();
}
