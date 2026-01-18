import { createSupabaseServerClient } from '@/../lib/supabase-server';
import { redirect } from 'next/navigation';
import SettingsGroup from '@/components/SettingsGroup';

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: userData } = await supabase
    .from('users')
    .select('preferences, notification_preferences')
    .eq('id', user.id)
    .single();

  const preferences = userData?.preferences || {};
  const notificationPreferences = userData?.notification_preferences || {};

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="ml-1 text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="ml-1 text-sm text-muted-foreground">Manage your account preferences</p>
      </header>

      <div className="p-4 rounded-lg bg-gradient-to-r from-warning/20 to-warning/30 border-2 border-warning/50">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-warning" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-warning">Settings Not Yet Implemented</h3>
            <p className="mt-1 text-sm text-warning-foreground/90">
              These settings are currently under development. While you can change and save them, they do not affect the application yet, <strong>with the exception of Theme</strong>. Changes will take effect once the features are fully implemented.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        <SettingsGroup
          title="Appearance"
          groupType="appearance"
          initialPreferences={preferences}
          settings={{
            "Theme": {
              "options": ["space blue (dark)", "volcanic (dark)", "alien (dark)", "royalty (dark)", "rose (dark)", "simple dark", "moonshine (dim)", "moonset (dim)", "forestry (dim)", "lava lamp (dim)", "simple dim", "palewhite (light)", "rose quartz (light)", "simple light", "colormatic"],
              "type": "dropdown",
              "settingName": "theme",
              "info": "Beta feature"
            },
            "Layout": {
              "options": ["default"],
              "type": "dropdown",
              "settingName": "layout",
              "disabled": true
            },
            "Reduce Animations": {
              "options": ["true", "false"],
              "type": "boolean",
              "settingName": "reduceAnimations",
              "info": "Uses fewer visual animations across the user interface"
            }
          }}
        />

        <hr className="border-border"/>

        <SettingsGroup
          title="Data Privacy"
          initialPreferences={preferences}
          settings={{
            "Enable Recommendation Algorithm": {
              "options": ["true", "false"],
              "type": "boolean",
              "settingName": "algorithm",
              "info": "Disabling this completely disregards all expressed and learned interests, watch history, liked/disliked/starred videos, etc. when choosing what videos to recommend, and instead shows a feed of mostly channels you follow and trending content."
            },
            "Enable Advanced Algorithm": {
              "options": ["true", "false"],
              "type": "boolean",
              "settingName": "advancedAlgorithm",
              "dependsOn": { "Enable Recommendation Algorithm": true },
              "info": "Analyzes additional information to improve your recommendations, including types of videos you like and star often, types of videos you often watch longer, interests learned based on your activity, and more. Disabling this prevents tracking of some of this data, but not all."
            },
            "Save Watch History": {
              "options": ["true", "false"],
              "type": "boolean",
              "settingName": "saveHistory",
              "info": "Saves history of videos you've watched recently. Used to enhance recommendation algorithm. When disabled, no history is deleted unless older than specified history retention."
            },
            "Auto-Delete History Older Than": {
              "options": ["1", "3", "7", "14", "30", "90", "180", "270", "365", "1095", "1825", "-1"],
              "type": "dropdown",
              "settingName": "historyRetention",
              "dependsOn": { "Save Watch History": true },
              "info": "Automatically deletes watch history after a given period of time. This includes history from before you changed this setting."
            },
            "Learn Interests Based on Activity": {
              "options": ["true", "false"],
              "type": "boolean",
              "settingName": "learnInterests",
              "info": "Learn Interests Based on Activity without using AI. (Enhances Recommendation Algorithm)"
            }
          }}
        />

        <hr className="border-border"/>

        <SettingsGroup
          title="Notifactions"
          initialPreferences={notificationPreferences}
          showUnsubscribeButtons={true}
          settings={{
            "Security Emails": {
              "options": ["true"],
              "type": "boolean",
              "settingName": "security",
              "disabled": true,
              "forceValue": true,
              "info": "Get notifications when your password is changed; password reset requested; account disabled, deleted, or moderated; data breach announcements, etc. This cannot be disabled."
            },
            "Followed Channel Uploads": {
              "options": ["email", "in-app"],
              "type": "multi-select",
              "settingName": "followedUploads",
              "info": "Get notified when a channel you follow uploads a video"
            },
            "Occasional Video Recommendation": {
              "options": ["email", "in-app"],
              "type": "multi-select",
              "settingName": "recommendations",
              "info": "Get notified occasionally when we find a video we think you might be interested in. These notifications would be once a week on average."
            },
            "Trending Videos": {
              "options": ["email", "in-app"],
              "type": "multi-select",
              "settingName": "trending",
              "info": "Get notified of one some of the top trending videos on the platform. These notifications would be once a week on average."
            },
            "Weekly Recaps": {
              "options": ["email", "in-app"],
              "type": "multi-select",
              "settingName": "recaps",
              "info": "Get notified each weekend about the top 10 most popular videos from your followed channels and interests. If you run a channel, you'll also see the performance on your videos uploaded in the last week."
            },
            "New Followers": {
              "options": ["email", "in-app"],
              "type": "multi-select",
              "settingName": "followers",
              "info": "Get notified when someone follows your channel(s) (emails limited to 1 per day for this category)"
            },
            "Development Updates": {
              "options": ["email", "in-app"],
              "type": "multi-select",
              "settingName": "devUpdates",
              "info": "Receive in-depth updates on what's changed after major updates or read about upcoming features."
            },
            "Site-wide Announcements": {
              "options": ["email", "in-app"],
              "type": "multi-select",
              "settingName": "announcements",
              "info": "Receive announcements such as huge feature changes, milestone celebrations, and various miscellaneous announcements."
            },
            "Promotional Offers and Deals": {
              "options": ["email", "in-app"],
              "type": "multi-select",
              "settingName": "promotional",
              "info": "Get notified of promotional offers and deals such as a limited time sale for a paid feature or the occasional giveaway."
            }
          }}
        />
      </div>
    </div>
  );
}
