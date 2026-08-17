// src/services/journalService.js
//
// Remote-first storage with a localStorage mirror.
//
// The mirror is not legacy cruft -- it is what keeps the journal usable when
// the network is down, when DATABASE_URL is unset, and during local `npm start`
// without the serverless functions. Losing an entry someone just wrote about a
// hard day is the worst failure this app can have, so writes always land
// locally even when the remote write succeeds.

import { identityHeaders } from './deviceIdentity';

const ENTRIES_KEY = 'journalEntries';
const USER_KEY = 'currentUser';

// ---------------------------------------------------------------------------
// localStorage mirror
// ---------------------------------------------------------------------------

function readLocalEntries() {
  try {
    return JSON.parse(localStorage.getItem(ENTRIES_KEY) || '[]');
  } catch (error) {
    console.error('Error reading local entries:', error);
    return [];
  }
}

function writeLocalEntries(entries) {
  try {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('Error writing local entries:', error);
  }
}

function upsertLocalEntry(entry) {
  const entries = readLocalEntries().filter((e) => e.id !== entry.id);
  entries.unshift(entry);
  writeLocalEntries(entries);
  return entry;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const journalService = {
  /**
   * Persist an entry.
   *
   * /api/analyze already writes the entry and its embedding server-side, so
   * when it hands back a row id we only mirror it locally. `remoteId` is that
   * id; without one the entry exists only in this browser and will be uploaded
   * the next time analysis succeeds.
   */
  async createEntry(entryData, remoteId = null) {
    const newEntry = {
      id: remoteId || Date.now().toString(),
      synced: Boolean(remoteId),
      ...entryData,
      entry_date: entryData.entry_date || new Date().toISOString()
    };
    return upsertLocalEntry(newEntry);
  },

  /**
   * Most recent entries. Falls back to the mirror whenever the server cannot
   * answer, so callers never have to handle an offline case themselves.
   */
  async getEntries(limit = 100) {
    try {
      const response = await fetch(`/api/entries?limit=${limit}`, {
        headers: identityHeaders()
      });
      if (!response.ok) throw new Error(`Status ${response.status}`);

      const result = await response.json();
      if (result.remote && Array.isArray(result.entries)) {
        // Refresh the mirror so an offline reload still shows recent history.
        writeLocalEntries(result.entries.slice(0, 200));
        return result.entries;
      }
    } catch (error) {
      console.warn('Falling back to local entries:', error.message);
    }

    return readLocalEntries().slice(0, limit);
  },

  /**
   * Semantic search over the user's own history.
   *
   * Degrades to substring matching when the memory layer is unavailable, which
   * is worse but not broken.
   */
  async searchEntries(query, limit = 25) {
    if (!query || !query.trim()) return this.getEntries(limit);

    try {
      const response = await fetch(
        `/api/entries?q=${encodeURIComponent(query)}&limit=${limit}`,
        { headers: identityHeaders() }
      );
      if (!response.ok) throw new Error(`Status ${response.status}`);

      const result = await response.json();
      if (result.remote && Array.isArray(result.entries)) {
        return result.entries;
      }
    } catch (error) {
      console.warn('Semantic search unavailable, using substring match:', error.message);
    }

    const needle = query.toLowerCase();
    return readLocalEntries()
      .filter((entry) => (entry.content || '').toLowerCase().includes(needle))
      .slice(0, limit);
  },

  async getRecentEntries(days = 7) {
    try {
      const response = await fetch(`/api/entries?days=${days}`, {
        headers: identityHeaders()
      });
      if (!response.ok) throw new Error(`Status ${response.status}`);

      const result = await response.json();
      if (result.remote && Array.isArray(result.entries)) return result.entries;
    } catch (error) {
      console.warn('Falling back to local recent entries:', error.message);
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return readLocalEntries().filter((entry) => new Date(entry.entry_date) >= cutoff);
  },

  // Badges and streaks stay local; they are derived UI state, not journal data.
  async getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || '{"badges": []}');
    } catch (error) {
      console.error('Error loading user:', error);
      return { badges: [] };
    }
  },

  async updateUser(userData) {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
};
