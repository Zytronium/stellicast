# User Data
This document outlines out user data will be tracked and used.  
**Note:** None of this data will be sold or used for third-party marketing.

## Why Data is Tracked
We track certain data to provide base functionality and improve user experience.
For example, we track which videos you've liked so that you can see whether
you've liked the video or not when you come back to it, and so we know whether
to add or remove a like when you hit the like button. Another example is that
we may track which videos you've watched in order to show you your watch history
and, if not opted out, to enhance the recommendation algorithm based on your
history (or rather, will do so in the future when the recommendation algorithm
gets implemented). We do not sell any of this data to third parties.

## Statistics Tracked and How They're Used
We track the following statistics: (non-exhaustive list; crossed-out items are planned but not tracked yet) 
- ~~Videos you've clicked on (watch history)~~
  - Used to build a list of videos you've watched recently that you can view. Also used to enhance the recommendation algorithm if not opted out, once implemented.
- ~~How long you've watched a video~~ (currently tracked client-side only and not retained on our systems)
  - Used to decide when you've watched enough of a video to star it. Will be used to allow resuming videos roughly where left off and to get a rough idea of how much you liked the video (to help enhance video recommendations once implemented) 
- Liked videos
  - Used so that you can see whether you've liked the video or not when you come back to it, and so we know whether to add or remove a like when you hit the like button. Also may be used to enhance the recommendation algorithm once it is implemented, if you are not opted out.
- Disliked videos
  - Same as liked videos.
- Starred videos
  - Same as Liked and Disliked videos.
- Comments and replies you've made
  - Used to display comments and replies you've made and associate them with you so people know who made the comments and so you can edit or delete them.
- Liked comments & replies
  -  Used so that you can see whether you've liked the comment/reply or not when displaying the comment section of a video to you, and so we know whether to add or remove a like when you hit the like button on a comment/reply.
- Disliked comments & replies
  - Same as liked comments & replies.
- Videos you've uploaded and all data on those videos such as title, thumbnail, views, likes, etc.
  - Used for basic functionality such as displaying videos to you and other users.
- ~~Interests you explicitly specify you have~~
  - Used in the recommendation algorithm once implemented if not disabled
- ~~Interests the system learns you might have based on your watch history and liked/starred videos, if not opted out~~
  - Used to enhance the recommendation algorithm once implemented if not opted out of the advanced algorithm
- ~~Videos you've watched multiple times recently~~
  - Used in advanced recommendation algorithm, once implemented, to recommend videos you have frequently rewatched recently
- ~~Creators and Studios you follow~~
  - Used to display videos from channels you follow in your recommendations even if the algorithm is disabled. Also will be used to notify you when one of these channels uploads a video. Also used to display to you who you've followed.
- Channels you own
  - Used to allow you to manage your own channel and to let you and others see a list of your channels on your profile.
- Settings you change in the Settings page
  - Used to remember your preferences and change application settings such as appearance or data privacy.
- Temporary logs of your IP address (anonymous, not linked to your account)
  - Used to rate limit certain actions such as counting a view, liking/disliking a video, or commenting/replying.
- Your account info such as email, encrypted password, join date, last login date, etc.
  - Default data tracked by Supabase Auth used for authentication, displaying basic statistics, and allowing future implementations to measure account activity
- Your user and channel info
  - Used to manage and display your user data and channel data such as number of followers, profile picture, and banner image.
- Any other data not listed
  - Likely used for base functionality and not privacy invasive