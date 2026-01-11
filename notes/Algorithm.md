# Algorithm
This document notes how the algorithm will function and what data it will use to recommend videos to users.

**Note:** Users can opt out of advanced personalization features while still receiving basic recommendations.

## Algorithm Status
The recommendation algorithm is currently **planned but not yet implemented**. 
This document describes the intended functionality.

## Data Used for Recommendations

### Primary Data Sources
- **Liked videos** - Identifies content types and topics users explicitly enjoy
- **Starred videos** - Identifies content types and topics users especially enjoyed much more than usual
- **Disliked videos** - Helps filter out unwanted content types
- **Watch history** - Tracks viewing patterns and interests over time, if not opted out; primarily looks at these video's channels and tags 
- **Watch duration** - Measures engagement level with different content types
- **Explicitly specified interests** - User-defined topics and categories
- **Learned interests** - System-inferred preferences based on viewing behavior, if not opted out
- **Recently frequently rewatched videos** - Identifies rewatchable content the user may want to rewatch again, such as a tutorial they often watch or a song they like
- **Followed channels** - Prioritizes content from followed channels

### Disliked Videos
Disliked videos are used to **reduce recommendations** of similar content to users who disliked it, not to punish channels in the algorithm.
(However, dislike count is still made public)

## Recommendation Tiers

### No Algorithm
- Mostly videos from followed channels
- Some popular and trending content (especially if user has not followed many channels)
- Few videos that are not popular/trending 
- Search filters
- No AI

### Basic Algorithm
Builds on the "No Algorithm" tier with:
- Videos with tags matching user-specified interests
- Rewatch pattern recognition
- No AI

### Advanced Mode
Builds on the Basic Algorithm with:
- Videos with tags matching learned interests (learned based on watch and engagement patterns such as duration watched and liked/disliked)
- Videos with matching tags to content most often found in recent watch history
- Content from channels most commonly watched, even if not followed
- Videos with tags matching videos you've watched longer portions of
- Videos with tags matching videos you've most often liked or starred
- Videos with comments containing keywords that match expressed and learned interests
- Videos with comments containing keywords that match videos you often like, star, or watch for long portions.
- Videos that mention channels you've followed in the title or description (small effect on algorithm to prevent abuse of this property)
- Time decay in watch history affects the determined relevancy of videos being considdered for recommendation (the longer ago you watched it, the less likely it is for the algorithm to think you still like that genre unless you watch that genre more recently too)
- Less likely to include videos with tags or channels matching videos or channels you've disliked or watched for small durations
- Still no AI

By default, users have advanced mode enabled.

## Privacy Controls
Users can disable advanced personalization in Settings while maintaining core functionality.
