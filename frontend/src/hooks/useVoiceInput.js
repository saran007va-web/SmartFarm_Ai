import { useCallback, useRef, useState, useEffect } from 'react';

/**
 * useVoiceInput - Web Speech API hook for speech recognition
 * Converts spoken words to text in the user's selected language.
 * Falls back gracefully when not supported.
 */
export function useVoiceInput({ language = 'en-US', onResult, onError, continuous = false, inactivityTimeoutMs = 5000 }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const lastInterimRef = useRef('');
  const inactivityTimerRef = useRef(null);
  const isFinalizedRef = useRef(false);
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  // Keep refs updated
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Initialize recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API not available in this browser');
      setIsSupported(false);
      return;
    }

    console.log('Initializing speech recognition for language:', language);
    setIsSupported(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event) => {
      if (isFinalizedRef.current) return;

      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          lastInterimRef.current = transcript;
        }
      }

      if (finalText) {
        isFinalizedRef.current = true;
        if (onResultRef.current) onResultRef.current(finalText, true);
        lastInterimRef.current = '';
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
          inactivityTimerRef.current = null;
        }
      } else if (onResultRef.current) {
        const interim = event.results[event.results.length - 1][0].transcript;
        lastInterimRef.current = interim;
        onResultRef.current(interim, false);

        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = setTimeout(() => {
          const last = lastInterimRef.current;
          if (last && !isFinalizedRef.current) {
            isFinalizedRef.current = true;
            if (onResultRef.current) onResultRef.current(last, true);
            lastInterimRef.current = '';
          }
          try { recognition.stop(); } catch (e) {}
          setIsListening(false);
          inactivityTimerRef.current = null;
        }, inactivityTimeoutMs);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      isFinalizedRef.current = false;
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      if (event?.error && event.error !== 'no-speech' && onErrorRef.current) {
        onErrorRef.current(event.error);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (e) {}
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, []); // Only run once on mount

  // Update language
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language;
    }
  }, [language]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;

    isFinalizedRef.current = false;
    lastInterimRef.current = '';
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      try {
        recognitionRef.current.stop();
      } catch (e2) {}
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
    } catch (e) {}

    isFinalizedRef.current = false;
    lastInterimRef.current = '';
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const updateLanguage = useCallback((lang) => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang;
    }
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    updateLanguage,
  };
}

/**
 * useTextToSpeech - Web Speech API hook for speech synthesis
 * Speaks text aloud in the user's selected language.
 */
export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef(null);

  const speak = useCallback((text, lang = 'en-US', rate = 0.95, pitch = 1.0) => {
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;

    const voices = window.speechSynthesis.getVoices();
    const matchVoice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
    if (matchVoice) {
      utterance.voice = matchVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return { speak, stop, isSpeaking };
}

/**
 * Language code to BCP-47 voice code mapping
 */
export const VOICE_CODES = {
  en: 'en-US',
  hi: 'hi-IN',
  bn: 'bn-BD',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  pa: 'pa-IN',
  ml: 'ml-IN',
  es: 'es-ES',
  pt: 'pt-BR',
  id: 'id-ID',
};

export const getVoiceCode = (lang) => VOICE_CODES[lang] || 'en-US';