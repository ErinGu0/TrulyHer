// Mock AI service that simulates real AI analysis
export const mockAiService = {
  async analyzeJournalEntry(content, audioAnalysis = null) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const lowerContent = content.toLowerCase();
    
    // Mood analysis based on keywords
    let moodScore = 6; // Default neutral
    
    if (lowerContent.includes('happy') || lowerContent.includes('good') || lowerContent.includes('great') || lowerContent.includes('wonderful')) {
      moodScore = 8 + Math.floor(Math.random() * 2); // 8-9
    } else if (lowerContent.includes('sad') || lowerContent.includes('bad') || lowerContent.includes('tired') || lowerContent.includes('exhausted')) {
      moodScore = 3 + Math.floor(Math.random() * 2); // 3-4
    } else if (lowerContent.includes('angry') || lowerContent.includes('frustrated') || lowerContent.includes('mad') || lowerContent.includes('upset')) {
      moodScore = 2 + Math.floor(Math.random() * 2); // 2-3
    } else if (lowerContent.includes('excited') || lowerContent.includes('amazing') || lowerContent.includes('love') || lowerContent.includes('awesome')) {
      moodScore = 9; // Maximum
    }

    // Emotion detection
    const emotions = [];
    const emotionKeywords = {
      'happy': ['happy', 'joy', 'excited', 'good', 'great'],
      'sad': ['sad', 'unhappy', 'depressed', 'down'],
      'angry': ['angry', 'mad', 'frustrated', 'upset'],
      'anxious': ['anxious', 'worried', 'nervous', 'stressed'],
      'calm': ['calm', 'peaceful', 'relaxed', 'chill'],
      'tired': ['tired', 'exhausted', 'fatigued', 'sleepy'],
      'grateful': ['grateful', 'thankful', 'appreciative'],
      'confused': ['confused', 'unsure', 'uncertain']
    };

    Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        emotions.push(emotion);
      }
    });

    // Ensure we have at least 2 emotions
    if (emotions.length < 2) {
      emotions.push('thoughtful', 'reflective');
    }

    // Critical alerts detection
    const critical_alerts = [];
    if (lowerContent.includes('imposter') || lowerContent.includes('fraud') || lowerContent.includes('don\'t deserve') || lowerContent.includes('not good enough')) {
      critical_alerts.push('imposter_syndrome');
    }
    if (lowerContent.includes('depressed') || lowerContent.includes('hopeless') || lowerContent.includes('worthless') || lowerContent.includes('empty')) {
      critical_alerts.push('depression');
    }

    // Generate appropriate insights
    const insights = this.generateInsights(lowerContent, moodScore, emotions);
    
    // Suggest appropriate task
    const suggested_task = this.generateTask(moodScore, emotions, critical_alerts);

    return {
      mood_score: moodScore,
      emotions: emotions.slice(0, 4),
      insights: insights,
      critical_alerts: critical_alerts,
      suggested_task: suggested_task
    };
  },

  generateInsights(content, moodScore, emotions) {
    const insights = {
      high: [
        "It's wonderful to see you experiencing such positive emotions! Celebrating these good moments helps build resilience for more challenging times.",
        "Your positive energy is contagious! Remember to savor these moments of happiness—they're important for your emotional well-being."
      ],
      medium: [
        "Thank you for sharing your reflections. It takes courage to be honest with yourself, and this self-awareness is a powerful tool for growth.",
        "I appreciate you taking the time to reflect. Every emotion you experience is valid and offers valuable insights into your inner world."
      ],
      low: [
        "I hear the challenges you're facing. Remember that difficult emotions are temporary, and acknowledging them is the first step toward healing.",
        "It sounds like you're going through a tough time. Please know that your feelings are valid, and there's strength in vulnerability."
      ]
    };

    let category = 'medium';
    if (moodScore >= 8) category = 'high';
    else if (moodScore <= 4) category = 'low';

    const categoryInsights = insights[category];
    return categoryInsights[Math.floor(Math.random() * categoryInsights.length)];
  },

  generateTask(moodScore, emotions, critical_alerts) {
    if (critical_alerts.includes('imposter_syndrome')) {
      return {
        title: "Evidence Against Imposter Feelings",
        description: "Challenge imposter thoughts by gathering evidence of your capabilities",
        steps: [
          "List 3 recent accomplishments, no matter how small",
          "Write down positive feedback you've received recently",
          "Identify specific skills you used successfully this week",
          "Remember: feelings are not facts - you are capable and deserving"
        ]
      };
    }

    if (moodScore <= 4 || emotions.includes('sad') || emotions.includes('angry')) {
      return {
        title: "Grounding Exercise",
        description: "Reconnect with the present moment when feeling overwhelmed",
        steps: [
          "Find a comfortable position and take 3 deep breaths",
          "Name 5 things you can see around you",
          "Identify 4 things you can touch and feel their texture",
          "Notice 3 things you can hear in your environment",
          "Acknowledge 2 things you can smell or like the smell of",
          "Think of 1 thing you can taste or would enjoy tasting"
        ]
      };
    }

    if (emotions.includes('anxious')) {
      return {
        title: "Box Breathing for Calm",
        description: "Calm your nervous system with rhythmic breathing",
        steps: [
          "Breathe in slowly through your nose for 4 seconds",
          "Hold your breath comfortably for 4 seconds",
          "Exhale slowly through your mouth for 4 seconds",
          "Hold empty for 4 seconds before next inhale",
          "Repeat this cycle 5-10 times",
          "Notice how your body feels more relaxed with each cycle"
        ]
      };
    }

    // Default task for positive or neutral states
    return {
      title: "Gratitude Moment",
      description: "Cultivate positivity by focusing on appreciation",
      steps: [
        "Think of one specific thing you're grateful for today",
        "Write down why this thing/person/experience matters to you",
        "Notice how focusing on gratitude makes you feel physically and emotionally",
        "Consider sharing your gratitude with someone else"
      ]
    };
  }
};