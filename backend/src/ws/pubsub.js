/**
 * Pub/Sub Adapter Interface for WebSocket Broadcasting.
 *
 * In the current single-instance deployment, in-memory Map registries are used.
 * When scaling horizontally across multiple Node.js instances or container replicas,
 * this interface can be backed by Redis (via ioredis) or PostgreSQL LISTEN/NOTIFY.
 */

export class PubSubAdapter {
  /**
   * Publish an event to a match channel or global channel.
   * @param {string} channel - e.g. "match:1" or "matches:all"
   * @param {object} message - Message payload to broadcast
   */
  async publish(channel, message) {
    throw new Error("publish() must be implemented by adapter");
  }

  /**
   * Subscribe to messages on a specific channel.
   * @param {string} channel
   * @param {Function} handler - (message) => void
   */
  async subscribe(channel, handler) {
    throw new Error("subscribe() must be implemented by adapter");
  }

  /**
   * Unsubscribe from a channel.
   * @param {string} channel
   * @param {Function} handler
   */
  async unsubscribe(channel, handler) {
    throw new Error("unsubscribe() must be implemented by adapter");
  }
}
