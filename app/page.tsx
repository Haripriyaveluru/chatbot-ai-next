"use client";

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Volume2, VolumeX, Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isPlaying?: boolean;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result) => result.transcript)
            .join('');
          setTranscript(transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };
      }
    }

    // Initialize speech synthesis
    if (typeof window !== 'undefined') {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
    setIsListening(!isListening);
  };

  const speakResponse = (text: string, messageIndex: number) => {
    if ('speechSynthesis' in window) {
      stopSpeaking(); // Stop any current speech
      
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      
      // Get available voices and select a good one
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.lang.startsWith('en') && voice.name.includes('Female')
      ) || voices[0];
      
      utterance.voice = preferredVoice;
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setMessages(prev => prev.map((msg, idx) => 
          idx === messageIndex ? { ...msg, isPlaying: true } : msg
        ));
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setMessages(prev => prev.map((msg, idx) => 
          idx === messageIndex ? { ...msg, isPlaying: false } : msg
        ));
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setMessages(prev => prev.map((msg, idx) => 
          idx === messageIndex ? { ...msg, isPlaying: false } : msg
        ));
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const pauseSpeaking = () => {
    window.speechSynthesis.pause();
    setMessages(prev => prev.map(msg => 
      msg.isPlaying ? { ...msg, isPlaying: false } : msg
    ));
  };

  const resumeSpeaking = () => {
    window.speechSynthesis.resume();
    setMessages(prev => prev.map(msg => 
      msg.isPlaying === false ? { ...msg, isPlaying: true } : msg
    ));
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setMessages(prev => prev.map(msg => ({ ...msg, isPlaying: false })));
  };

  const handleSend = async () => {
    if (!transcript.trim()) return;

    const newMessage: Message = { role: 'user', content: transcript };
    setMessages((prev) => [...prev, newMessage]);
    setTranscript('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: transcript }),
      });

      const data = await response.json();
      
      // Add assistant's response
      const assistantMessage: Message = { 
        role: 'assistant',
        content: data.response,
        isPlaying: false
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Automatically speak the response
      speakResponse(data.response, messages.length + 1);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-gray-800 border-gray-700 p-6 rounded-xl shadow-xl">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-center flex-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              AI Voice Assistant
            </h1>
            {isSpeaking && (
              <Button
                variant="outline"
                size="icon"
                className="bg-red-500 text-white hover:bg-red-600"
                onClick={stopSpeaking}
              >
                <VolumeX className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <ScrollArea className="h-[400px] mb-6 rounded-lg bg-gray-900 p-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-100'
                    }`}
                  >
                    <p className="break-words">{message.content}</p>
                    {message.role === 'assistant' && (
                      <div className="flex gap-2 mt-2">
                        {message.isPlaying ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={pauseSpeaking}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => speakResponse(message.content, index)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => speakResponse(message.content, index)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="flex gap-4 items-center">
            <Button
              variant="outline"
              size="icon"
              className={`${
                isListening ? 'bg-red-500 text-white' : 'bg-gray-700'
              } hover:bg-gray-600`}
              onClick={toggleListening}
            >
              {isListening ? <MicOff /> : <Mic />}
            </Button>
            
            <div className="flex-1 bg-gray-700 rounded-lg p-3 min-h-[50px]">
              {transcript || 'Speak something...'}
            </div>

            <Button
              variant="default"
              size="icon"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleSend}
              disabled={!transcript.trim()}
            >
              <Send />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}