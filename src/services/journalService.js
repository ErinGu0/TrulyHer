// Simple localStorage-based data service
export const journalService = {
  // Save a new journal entry
  async createEntry(entryData) {
    try {
      const entries = JSON.parse(localStorage.getItem('journalEntries') || '[]');
      const newEntry = { 
        id: Date.now().toString(),
        ...entryData,
        entry_date: new Date().toISOString()
      };
      entries.unshift(newEntry);
      localStorage.setItem('journalEntries', JSON.stringify(entries));
      return newEntry;
    } catch (error) {
      console.error('Error saving entry:', error);
      throw error;
    }
  },

  // Get all journal entries
  async getEntries(limit = 100) {
    try {
      const entries = JSON.parse(localStorage.getItem('journalEntries') || '[]');
      return entries.slice(0, limit);
    } catch (error) {
      console.error('Error loading entries:', error);
      return [];
    }
  },

  // Get user data
  async getUser() {
    try {
      const user = JSON.parse(localStorage.getItem('currentUser') || '{"badges": []}');
      return user;
    } catch (error) {
      console.error('Error loading user:', error);
      return { badges: [] };
    }
  },

  // Update user data
  async updateUser(userData) {
    try {
      localStorage.setItem('currentUser', JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  // Get entries from last 7 days
  async getRecentEntries(days = 7) {
    const entries = await this.getEntries();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return entries.filter(entry => new Date(entry.entry_date) >= cutoffDate);
  }
};