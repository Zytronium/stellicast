# Tasks

## 0. Accounts

### 0.1. Create account system
Use Supabase Auth to create an account system and link it
to the website.

**Status:** Done

### 0.2. Create signin/signup page
Create a login / sign-up page for users to create new
accounts or log in. Ensure emails are verified before 
users can access their account

**Status:** Done

### 0.3. Account dropdown
Show logged in user info in account dropdown when logged
in. Show a signin/signup button when not logged in.

**Status:** Done

### 0.4. User profiles
Create a public user profile page for every user.

**Status:** Todo

### 0.4.5. Channel profiles
Create public channel profiles that show videos uploaded by
that channel.

**Status:** Done

### 0.5. Edit profile
Allow users to edit their profiles. Add certain buttons 
on the profile page when that user is logged in.

**Status:** Todo

### 0.6. Channel creation
Allow users to create new Creator channels.

**Status:** Done

### 0.7. Studio conversion
Allow Creators who qualify to convert their Creator channel
into a Studio channel.

**Status:** Todo

### 0.8. Forced Studio conversion
When a Creator meets certain criteria, they are required to
fill out a short servey about their team, and depending on
the results, they must convert into a Studio channel.

**Status:** Todo

### 0.9. Followers
Allow users to follow channels.

**Status:** Todo

### 0.10. Upload notifications
Send notifications to suers when a channel they follow
uploads a new video.

**Status:** Todo

## 1. Video Uploads

### 1.1. Video upload page
Create a video upload page for channels to upload videos.

**Status:** Done

### 1.2. Create video database
Create a database to store videos and meta data about them.

**Status:** Done

### 1.3. Link video database
Use the video database to stream videos efficiently to users.
Use stored video to auto-generate thumbnails on upload.
Use stored metadata to show info about videos on video cards
and watch page, such as video length. This is separate from
data like title, description, thumbnail src, likes, upload date,
etc.

**Status:** Done

## 2. Redesigned Watch Page

### 2.1 Create new design
Sketch a new watch page design.

**Status:** Done

### 2.2. Implement new design
Implement the new watch page design.

**Status:** Done

### 2.3. Redesign video player
Redesign the video player to match the new design.

**Status:** Done

### 2.4. Add functionalities
Add new functionalities to the watch page for likes, dislikes,
stars, follows, comments, etc.

**Status:** In Progress

## 3. Home Feed

### 3.1. Add video thumbnails
Add video thumbnails to the home feed that are not placeholders.

**Status:** Done

### 3.2. Add real videos from the database
Add real videos from the database to the home feed. Include
metadata like title, description, thumbnail src, likes, upload date,
channel name, etc.

**Status:** Done

### 3.3. Filters
Make the filters from the sidebar actually work

**Status:** Todo

### 3.4. Search
Make the search bar work.

**Status:** Todo

### 3.5. Infinite scroll
Make the home feed load more videos as the user scrolls down.

**Status:** Todo

### 3.6. Genre chips
Either delete them or make them filter the home feed by genere
when clicked.

**Status:** Todo

### 3.7. The algorithm
Create an algorithm that shows the user mostly content from
channels they follow, but also content it programmatically
determines they should see based on their history, without
using AI to analyze their tastes.

The algorithm should factor in the following factors, in order from most important to least important:
- Who the user follows (especially if the user recently followed them)
- Channels the user watches most often
- Which tags and genres of videos the user likes and stars most often
- Which tags and genres of videos the user watches most often
- Genres and tags the user often dislikes (filter these out)
- Videos the user has rewatched multiple times recently
- Videos that are trending right now (small factor; leave for Trending and Explore pages)

Users should be able to disable the algorithm to track less of their data.
Disabling the algorithm should pause tracking of:
- Genres and tags the user often watches for a decent percentage of the video duration
- Genres and tags the user often likes or stars
- Genres and tags the user often dislikes

Disabling the algorithm will not affect tracking of the following data:
- Channels the user follows
- Videos the user watches
- Videos the user dislikes, likes, or stars 
- Channels the user often watches videos from (though this can probably still be programmatically determined based on watch history if the user has it enabled)

However, these factors will not affect what gets recommended to them. Instead, 
users with the algorithm disabled will only see videos from channels they follow
and, if watch history is enabled, videos they have repeatedly rewatched recently.

**Status:** Todo

## 4. Explore Page

### 4.1. Use home feed as a template
Duplicate the home feed page and make it the explore page.

**Status:** Todo

### 4.2. Adjust the algorithm 
Adjust the Explore page's filters to show the user mostly
videos from channels they have not seen.

**Status:** Todo

## 5. More Page

### 5.1. Create a More page
Create a "More" page for mobile that contains miscellaneous
things that normally go on the sidebar, such as library,
subscriptions, etc. Ensure it is mobile-first design, but
looks good on desktop too.

**Status:** Todo

### 5.2. Remove sidebar on mobile
Remove the sidebar on mobile as the More page now contains
all the sidebar's content except filters.

**Status:** Todo

### 5.3. Mobile filters
Add filters on home feed and explore pages for mobile

**Status:** Todo

## 6. Settings

### 6.1. Add settings page
Add a settings page for users to change their app settings.

**Status:** Todo

### 6.2. Add theme switcher
Add a theme switcher to the settings page.

**Status:** Todo

### 6.3. Add layout switcher
Add a layout switcher to the settings page.

**Status:** Todo

### 6.4. Make code compatible with themes
Make the code compatible with themes by using CSS variables.

**Status:** Todo

### 6.5. Made code compatible with layouts
Make the code compatible with custom layouts somehow.

**Status:** Todo

### 6.6. Implement more themes
Implement more themes for the app and put them in the theme
switcher.

**Status:** Todo

### 6.7. Implement more layouts
Implement more layouts for the app and put them in the layout
switcher.

**Status:** Todo

## 7. Sectors

### 7.1. Add sectors page
Add a Sectors page that displays a unique layout showing many
different sectors.

**Status:** Todo

## 8. Admin Panel

### 8.1. Add admin panel
Add an admin panel page for the website to manage users, channels,
videos, etc. It must display all data for each user and channel, 
music email and password.

**Status:** Todo
