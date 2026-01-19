// Queue for managing rate-limited interactions with proper deduplication
type InteractionAction = 'like' | 'dislike' | 'star' | 'comment-like' | 'comment-dislike';

interface PendingInteraction {
  id: string;
  type: InteractionAction;
  itemId: string;  // video ID or comment ID
  timestamp: number;
  retryFn: () => Promise<void>;
  onError: (error: string) => void;
  onSuccess?: () => void;
}

interface InFlightRequest {
  promise: Promise<void>;
  timestamp: number;
}

class InteractionQueue {
  private pendingInteractions: Map<string, PendingInteraction> = new Map();
  private retryTimers: Map<string, NodeJS.Timeout> = new Map();
  private inFlightRequests: Map<string, InFlightRequest> = new Map();

  /**
   * Check if there's already a request in flight for this action
   */
  isRequestInFlight(type: InteractionAction, itemId: string): boolean {
    const key = `${type}:${itemId}`;
    return this.inFlightRequests.has(key);
  }

  /**
   * Wait for in-flight request to complete
   */
  async waitForInFlight(type: InteractionAction, itemId: string): Promise<void> {
    const key = `${type}:${itemId}`;
    const inFlight = this.inFlightRequests.get(key);
    if (inFlight) {
      try {
        await inFlight.promise;
      } catch {
        // Ignore errors, caller will retry
      }
    }
  }

  /**
   * Register a request as in-flight
   */
  registerInFlight(
    type: InteractionAction,
    itemId: string,
    promise: Promise<void>
  ): void {
    const key = `${type}:${itemId}`;
    this.inFlightRequests.set(key, {
      promise,
      timestamp: Date.now()
    });

    // Clean up when done
    promise.finally(() => {
      this.inFlightRequests.delete(key);
    });
  }

  /**
   * Queue an interaction for retry after rate limit
   */
  queueForRetry(
    type: InteractionAction,
    itemId: string,
    retryFn: () => Promise<void>,
    onError: (error: string) => void,
    onSuccess?: () => void
  ): void {
    const key = `${type}:${itemId}`;

    // Clear existing retry timer and pending action
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
      onError,
      onSuccess
    });

    // Schedule retry after the rate limit cooldown (1-3 seconds depending on action)
    const retryDelay = type === 'star' ? 3100 : 1100; // Slightly more than server cooldown
    const timer = setTimeout(() => {
      this.retryInteraction(key);
    }, retryDelay);

    this.retryTimers.set(key, timer);
  }

  private async retryInteraction(key: string): Promise<void> {
    const interaction = this.pendingInteractions.get(key);
    if (!interaction)
      return;

    try {
      await interaction.retryFn();
      // Success
      this.pendingInteractions.delete(key);
      this.retryTimers.delete(key);
      interaction.onSuccess?.();
    } catch (error: any) {
      if (error.message?.includes('rate') || error.status === 429) {
        // Still rate limited, retry again
        const retryDelay = interaction.type === 'star' ? 3100 : 1100;
        const timer = setTimeout(() => {
          this.retryInteraction(key);
        }, retryDelay);
        this.retryTimers.set(key, timer);
      } else {
        // Other error
        interaction.onError(error.message || 'Failed to complete action');
        this.pendingInteractions.delete(key);
        this.retryTimers.delete(key);
      }
    }
  }

  /**
   * Clear all pending interactions
   */
  clearAll(): void {
    this.retryTimers.forEach(timer => clearTimeout(timer));
    this.retryTimers.clear();
    this.pendingInteractions.clear();
    this.inFlightRequests.clear();
  }
}

export const interactionQueue = new InteractionQueue();
