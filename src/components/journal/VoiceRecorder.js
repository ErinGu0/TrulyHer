import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "../ui/Button";
import { Mic, MicOff, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function VoiceRecorder({ onLiveTranscription, onAudioAnalysis, isRecording, setIsRecording, currentContent }) {
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }, []);

  const setupRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError("Speech recognition not supported in this browser");
      return null;
    }

    cleanup();

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setError(null);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      const fullTranscript = currentContent + finalTranscript + interimTranscript;
      onLiveTranscription(fullTranscript);

      // Mock audio analysis
      if (onAudioAnalysis && finalTranscript) {
        const mockAnalysis = {
          decibel_level: 65 + Math.random() * 20,
          stress_level: ["calm", "moderate stress", "high stress"][Math.floor(Math.random() * 3)],
          agitation_level: ["low", "moderate", "high"][Math.floor(Math.random() * 3)],
          vocal_stress_indicators: "Voice analysis completed",
          movement_pattern: "Stable voice patterns detected"
        };
        onAudioAnalysis(mockAnalysis);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setError(`Speech recognition error: ${event.error}`);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    return recognition;
  }, [currentContent, onLiveTranscription, onAudioAnalysis, cleanup, setIsRecording]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    return cleanup;
  }, [cleanup]);

  const toggleRecording = async () => {
    if (isRecording) {
      cleanup();
      setIsRecording(false);
    } else {
      setError(null);
      
      try {
        const recognition = setupRecognition();
        if (recognition) {
          recognitionRef.current = recognition;
          recognition.start();
          setIsRecording(true);
        }
      } catch (err) {
        console.error('Recording error:', err);
        setError("Could not start recording");
      }
    }
  };

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
          <AlertCircle className="w-8 h-8 text-gray-400" />
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Voice recording not supported</p>
          <p className="text-xs text-gray-400">Please try Chrome or Edge browser</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-4 bg-gray-50 rounded-xl">
      <Button
        onClick={toggleRecording}
        className={`rounded-full w-16 h-16 border-2 transition-all duration-300 flex items-center justify-center ${
          isRecording 
            ? "border-red-500 bg-red-100 text-red-600" 
            : "border-pink-500 bg-pink-100 text-pink-600"
        }`}
      >
        <motion.div
          animate={isRecording ? { scale: [1, 1.2, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1 }}
        >
          {isRecording ? (
            <MicOff className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </motion.div>
      </Button>
      
      <div className="text-center">
        {error ? (
          <div className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">
            {error}
          </div>
        ) : isRecording ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Listening...</span>
          </motion.div>
        ) : (
          <div className="space-y-1">
            <span className="text-sm text-gray-500">Tap to record your voice</span>
            <p className="text-xs text-gray-400">Speak your thoughts instead of typing</p>
          </div>
        )}
      </div>
    </div>
  );
}