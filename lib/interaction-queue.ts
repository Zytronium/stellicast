// Queue for managing rate-limited interactions
// When an action is rate-limited, we queue it and retry after a delay
// We discard older pending actions for the same item

type InteractionAction = 'like' | 'dislike' | 'star' | 'comment-like' | 'comment-dislike';

interface PendingInteraction {
  id: string;
  type: InteractionAction;
  itemId: string;  // video ID or comment ID
  timestamp: number;
  retryFn: () => Promise<void>;
  onError: (error: string) => void;
}

class InteractionQueue {
  private pendingInteractions: Map<string, PendingInteraction> = new Map();
  private retryTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Queue an interaction for retry after rate limit
   * Discards any previous pending actions for the same item and type
   */
  queueForRetry(
    type: InteractionAction,
    itemId: string,
    retryFn: () => Promise<void>,
    onError: (error: string) => void
  ): void {
    const key = `${type}:${itemId}`;

    // Clear existing retry timer and pending action for this item
    if (this.retryTimers.has(key)) {
      clearTimeout(this.retryTimers.get(key)!);
      this.retryTimers.delete(key);
    }

    // Store the pending interaction
    this.pendingInteractions.set(key, {
      id: key,
      type,
      itemId,
      timestamp: Date.now(),
      retryFn,
      onError
    });

    // Schedule retry after 1 second
    const timer = setTimeout(() => {
      this.retryInteraction(key);
    }, 1000);

    this.retryTimers.set(key, timer);
  }

  private async retryInteraction(key: string): Promise<void> {
    const interaction = this.pendingInteractions.get(key);
    if (!interaction)
      return;

    try {
      await interaction.retryFn();
      // Success: remove from pending
      this.pendingInteractions.delete(key);
      this.retryTimers.delete(key);
    } catch (error: any) {
      // Check if it's still rate limited'
      if (error.message?.includes('rate') || error.status === 429) {
        // Queue for another retry
        const timer = setTimeout(() => {
          this.retryInteraction(key);
        }, 1000);
        this.retryTimers.set(key, timer);
      } else {
        // Other error: notify user and remove from queue
        interaction.onError(error.message || 'Failed to complete action');
        this.pendingInteractions.delete(key);
        this.retryTimers.delete(key);
      }
    }
  }

  /**
   * Clear all pending interactions (for when navigating away)
   */
  clearAll(): void {
    this.retryTimers.forEach(timer => clearTimeout(timer));
    this.retryTimers.clear();
    this.pendingInteractions.clear();
  }
}

export const interactionQueue = new InteractionQueue();
