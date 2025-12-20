'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ThumbsUp, ThumbsDown, Star, Search, Plus, X } from 'lucide-react';
import VideoPlayer from '@/components/VideoPlayer';

export type Video = {
  id: string;
  title: string;
  creator: string;
  description: string;
  thumbnail: string;
  src: string;
};

type Comment = {
  id: string;
  user: string;
  text: string;
  likes: number;
  dislikes: number;
  timestamp: string;
  replies?: Comment[];
};

const mockComments: Comment[] = [
  {
    id: '1',
    user: 'TechEnthusiast',
    text: 'This is exactly what I was looking for! Thanks for making this tutorial.',
    likes: 24,
    dislikes: 1,
    timestamp: '2 days ago',
    replies: [
      {
        id: '1-1',
        user: 'VideoCreator',
        text: 'Glad it helped! More tutorials coming soon.',
        likes: 12,
        dislikes: 0,
        timestamp: '2 days ago'
      },
      {
        id: '1-2',
        user: 'AnotherViewer',
        text: 'Same here, very helpful content!',
        likes: 5,
        dislikes: 0,
        timestamp: '1 day ago'
      }
    ]
  },
  {
    id: '2',
    user: 'CodeMaster99',
    text: 'Could you make a follow-up video covering advanced techniques?',
    likes: 18,
    dislikes: 0,
    timestamp: '1 day ago',
    replies: [
      {
        id: '2-1',
        user: 'VideoCreator',
        text: "That's on my list! Should be out next week.",
        likes: 8,
        dislikes: 0,
        timestamp: '1 day ago'
      }
    ]
  },
  {
    id: '3',
    user: 'NewbieDev',
    text: 'As someone just starting out, this was incredibly clear and easy to follow. Keep up the great work!',
    likes: 31,
    dislikes: 0,
    timestamp: '12 hours ago'
  },
  {
    id: '4',
    user: 'SkepticalUser',
    text: "I don't think this approach is the best way to handle this problem. There are better alternatives.",
    likes: 3,
    dislikes: 15,
    timestamp: '8 hours ago',
    replies: [
      {
        id: '4-1',
        user: 'DefenderUser',
        text: 'What alternatives would you suggest? This worked perfectly for my use case.',
        likes: 7,
        dislikes: 1,
        timestamp: '6 hours ago'
      }
    ]
  }
];

function CommentComponent({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) {
  const [showReplies, setShowReplies] = useState(true);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);

  return (
    <div className={isReply ? 'ml-12' : ''}>
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-sm font-bold">
          {comment.user[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{comment.user}</p>
            <span className="text-xs text-gray-500">{comment.timestamp}</span>
          </div>
          <p className="text-sm text-gray-300 mt-1">{comment.text}</p>
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => setLiked(!liked)}
              className={`flex items-center gap-1 text-xs ${liked ? 'text-blue-400' : 'text-gray-400'} hover:text-blue-400`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span>{comment.likes + (liked ? 1 : 0)}</span>
            </button>
            <button
              onClick={() => setDisliked(!disliked)}
              className={`flex items-center gap-1 text-xs ${disliked ? 'text-red-400' : 'text-gray-400'} hover:text-red-400`}
            >
              <ThumbsDown className="w-4 h-4" />
              <span>{comment.dislikes + (disliked ? 1 : 0)}</span>
            </button>
            <button className="text-xs text-gray-400 hover:text-white">Reply</button>
          </div>
          {comment.replies && comment.replies.length > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-xs text-blue-400 hover:text-blue-300 mt-2 flex items-center gap-1"
            >
              {showReplies ? '▼' : '▶'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      </div>
      {showReplies && comment.replies && (
        <div className="mt-4 space-y-4">
          {comment.replies.map(reply => (
            <CommentComponent key={reply.id} comment={reply} isReply={true} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function WatchPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const [video, setVideo] = useState<Video | null>(null);
  const [upNext, setUpNext] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [starred, setStarred] = useState(false);
  const [canStar, setCanStar] = useState(false);
  const [commentSearch, setCommentSearch] = useState('');
  const [filteredComments, setFilteredComments] = useState(mockComments);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    async function loadData() {
      const resolvedParams = await Promise.resolve(params);
      const { id } = resolvedParams;

      try {
        // Fetch current video
        const videoRes = await fetch(`/api/videos/${id}`);
        if (!videoRes.ok) {
          notFound();
          return;
        }
        const videoData = await videoRes.json();
        
        setVideo({
          ...videoData,
          src: videoData.video_url,
          creator: videoData.channels?.display_name || "Unknown Creator"
        });

        // Fetch all videos for up next
        const allRes = await fetch(`/api/videos`);
        if (allRes.ok) {
          const allData = await allRes.json();
          const videos = Array.isArray(allData.videos) ? allData.videos : [];
          setUpNext(videos.filter((v: Video) => v.id !== id).slice(0, 8));
        }

        // Simulate user watching 20% of video
        setTimeout(() => setCanStar(true), 3000);
      } catch (error) {
        console.error('Error loading video:', error);
        notFound();
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params]);

  useEffect(() => {
    if (commentSearch.trim() === '') {
      setFilteredComments(mockComments);
    } else {
      const searchLower = commentSearch.toLowerCase();
      const filtered = mockComments.filter(comment =>
        comment.text.toLowerCase().includes(searchLower) ||
        comment.user.toLowerCase().includes(searchLower) ||
        (comment.replies?.some(reply =>
          reply.text.toLowerCase().includes(searchLower) ||
          reply.user.toLowerCase().includes(searchLower)
        ))
      );
      setFilteredComments(filtered);
    }
  }, [commentSearch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!video) {
    notFound();
    return null;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-[1800px] mx-auto px-4">
      {/* Left side: Video Player and Info */}
      <div className="flex-1 min-w-0">
        {/* Video Player */}
        <VideoPlayer video={video} />

        {/* Video Title and Engagement */}
        <div className="mt-4 space-y-3">
          <h1 className="text-xl sm:text-2xl font-semibold">{video.title}</h1>

          {/* Engagement Row with Channel Widget */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
            {/* Channel Widget */}
            <div className="flex items-center justify-between sm:justify-start gap-4 rounded-2xl border border-gray-800 bg-[#0a0a0a] p-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white flex-shrink-0">
                  {video.creator?.[0]?.toUpperCase() ?? 'C'}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-100">{video.creator}</div>
                  <div className="text-xs text-gray-400">42 videos • 15.2k followers</div>
                </div>
              </div>

              <button
                type="button"
                className="rounded-full bg-blue-600 px-5 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 transition"
              >
                Follow
              </button>
            </div>

            {/* Engagement Buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Like/Dislike Buttons with Labels */}
              <div className="flex items-center gap-2">
                <div className="flex flex-col rounded-lg overflow-hidden border border-gray-800">
                  <button
                    onClick={() => {
                      setLiked(!liked);
                      if (disliked) setDisliked(false);
                    }}
                    className={`flex items-center justify-center px-3 py-2 text-sm transition ${
                      liked ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <div className="h-px bg-gray-800"></div>
                  <button
                    onClick={() => {
                      setDisliked(!disliked);
                      if (liked) setLiked(false);
                    }}
                    className={`flex items-center justify-center px-3 py-2 text-sm transition ${
                      disliked ? 'bg-red-600 text-white' : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-col text-xs text-gray-400 gap-0.5">
                  <span>{156 + (liked ? 1 : 0)} likes</span>
                  <span>{3 + (disliked ? 1 : 0)} dislikes</span>
                </div>
              </div>

              {/* Star Button with Label */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => canStar && setStarred(!starred)}
                  disabled={!canStar}
                  className={`transition ${
                    canStar ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed'
                  }`}
                  title={!canStar ? 'Watch 20% of the video to star it' : ''}
                >
                  <Star
                    className={`w-9 h-9 transition ${
                      starred ? 'text-yellow-500' : canStar ? 'text-gray-300' : 'text-gray-600'
                    }`}
                    fill={starred ? 'currentColor' : 'none'}
                    strokeWidth={starred ? 0 : 2}
                  />
                </button>
                <span className={`text-sm font-medium ${starred ? 'text-yellow-500' : canStar ? 'text-gray-300' : 'text-gray-600'}`}>
                  Star!
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-2xl border border-gray-800 bg-[#0a0a0a] p-4">
            <details open className="group">
              <summary className="cursor-pointer list-none text-sm font-semibold text-gray-100">
                Description
                <span className="ml-2 text-xs font-normal text-gray-400 group-open:hidden">
                  (click to expand)
                </span>
              </summary>
              <div className="mt-3 space-y-2">
                <p className="text-xs text-gray-400">2.1k views • Published 2 days ago</p>
                <div className="text-sm leading-relaxed text-gray-300">
                  {video.description.split('\n').map((line, i) => (
                    <p key={i} className={i === 0 ? '' : 'mt-3'}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* More Videos Section */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">More Videos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upNext.map((v) => (
              <Link key={v.id} href={`/watch/${v.id}`} className="bg-gray-900/50 rounded-lg overflow-hidden hover:bg-gray-900 transition">
                <div className="aspect-video bg-gray-800 relative">
                  <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium line-clamp-2">{v.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{v.creator} • 2.1k views</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Right side: Comments */}
      <div className="w-full lg:w-96 bg-gray-900/50 rounded-lg p-4 flex flex-col lg:h-[calc(100vh-8rem)] lg:sticky lg:top-4">
        {/* Header with Title and Search */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold">Comments ({mockComments.length})</h2>

          {/* Comment Search - Desktop */}
          <div className="hidden lg:block relative w-48">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={commentSearch}
              onChange={(e) => setCommentSearch(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* Comment Search - Mobile */}
        <div className="lg:hidden relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search comments..."
            value={commentSearch}
            onChange={(e) => setCommentSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-600"
          />
        </div>

        {/* Add Comment - Desktop */}
        <div className="hidden lg:block mb-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-600 resize-none"
            rows={3}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setNewComment('')}
              className="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Handle comment submission
                setNewComment('');
              }}
              disabled={!newComment.trim()}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition"
            >
              Comment
            </button>
          </div>
        </div>

        {/* Add Comment Button - Mobile */}
        <button
          onClick={() => setShowCommentModal(true)}
          className="lg:hidden flex items-center justify-center gap-2 w-full bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-500 transition mb-4"
        >
          <Plus className="w-4 h-4" />
          Add Comment
        </button>

        {/* Comments List */}
        <div className="space-y-6 overflow-y-auto flex-1">
          {filteredComments.length > 0 ? (
            filteredComments.map((comment) => (
              <CommentComponent key={comment.id} comment={comment} />
            ))
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No comments found</p>
          )}
        </div>
      </div>

      {/* Mobile Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end lg:hidden">
          <div className="bg-gray-900 rounded-t-2xl w-full p-6 animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add Comment</h3>
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setNewComment('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write your comment..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-600 resize-none mb-4"
              rows={5}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setNewComment('');
                }}
                className="flex-1 px-4 py-2 text-sm border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Handle comment submission
                  setShowCommentModal(false);
                  setNewComment('');
                }}
                disabled={!newComment.trim()}
                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition"
              >
                Post Comment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}