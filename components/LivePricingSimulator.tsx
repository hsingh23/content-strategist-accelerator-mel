import React, { useRef, useState, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Button } from './ui/Button';
import { Mic, MicOff, Volume2, XCircle } from 'lucide-react';
import { ToolDef } from '../types';

interface LivePricingSimulatorProps {
  apiKey: string;
  tool: ToolDef;
  onClose: () => void;
}

// Helper for PCM creation
const createBlob = (data: Float32Array): Blob => {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return new Blob([int16], { type: 'audio/pcm' });
};

// Helper for Audio Decoding
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const LivePricingSimulator: React.FC<LivePricingSimulatorProps> = ({ apiKey, tool, onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  
  // Refs for audio handling
  const nextStartTime = useRef(0);
  const inputAudioContext = useRef<AudioContext | null>(null);
  const outputAudioContext = useRef<AudioContext | null>(null);
  const inputNode = useRef<GainNode | null>(null);
  const outputNode = useRef<GainNode | null>(null);
  const sources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromise = useRef<Promise<any> | null>(null); 
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  // Stop everything
  const stopSession = () => {
    // 1. Close Session
    if (sessionPromise.current) {
        sessionPromise.current.then(session => {
            try { session.close(); } catch(e) {}
        });
        sessionPromise.current = null;
    }
    
    // 2. Stop Tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // 3. Disconnect Nodes
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current.onaudioprocess = null;
        scriptProcessorRef.current = null;
    }

    // 4. Close Contexts
    if (inputAudioContext.current && inputAudioContext.current.state !== 'closed') {
        inputAudioContext.current.close().catch(console.error);
    }
    if (outputAudioContext.current && outputAudioContext.current.state !== 'closed') {
        outputAudioContext.current.close().catch(console.error);
    }
    
    // 5. Clear Sources
    sources.current.forEach(s => {
        try { s.stop(); } catch(e) {}
    });
    sources.current.clear();
    
    setIsActive(false);
    setStatus('idle');
  };

  const startSession = async () => {
    if (isActive) return; // Prevent double start
    setStatus('connecting');
    
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      // Initialize Audio Contexts
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      inputAudioContext.current = new AudioCtx({sampleRate: 16000});
      outputAudioContext.current = new AudioCtx({sampleRate: 24000});
      
      inputNode.current = inputAudioContext.current.createGain();
      outputNode.current = outputAudioContext.current.createGain();
      outputNode.current.connect(outputAudioContext.current.destination);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sp = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            console.log("Live Session Open");
            setStatus('connected');
            setIsActive(true);
            
            // Connect Mic to Model
            if (!inputAudioContext.current) return;
            const source = inputAudioContext.current.createMediaStreamSource(stream);
            const processor = inputAudioContext.current.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const uint8 = new Uint8Array(int16.buffer);
              
              let binary = '';
              const len = uint8.byteLength;
              for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(uint8[i]);
              }
              const base64Data = btoa(binary);

              sessionPromise.current?.then(session => {
                  session.sendRealtimeInput({
                      media: {
                          mimeType: 'audio/pcm;rate=16000',
                          data: base64Data
                      }
                  });
              });
            };
            
            source.connect(processor);
            processor.connect(inputAudioContext.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Out
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContext.current && outputNode.current) {
                const ctx = outputAudioContext.current;
                nextStartTime.current = Math.max(nextStartTime.current, ctx.currentTime);
                
                try {
                    const audioBuffer = await decodeAudioData(
                        decode(base64Audio),
                        ctx,
                        24000,
                        1
                    );
                    
                    const source = ctx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputNode.current);
                    source.addEventListener('ended', () => {
                        sources.current.delete(source);
                    });
                    
                    source.start(nextStartTime.current);
                    nextStartTime.current += audioBuffer.duration;
                    sources.current.add(source);
                } catch (e) {
                    console.error("Audio decode error", e);
                }
            }
            
            if (message.serverContent?.interrupted) {
                sources.current.forEach(s => {
                   try { s.stop(); } catch(e) {} 
                });
                sources.current.clear();
                nextStartTime.current = 0;
            }
          },
          onerror: (e) => {
            console.error("Live API Error", e);
            setStatus('error');
          },
          onclose: () => {
            console.log("Session Closed");
            setIsActive(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: tool.systemInstruction,
          speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
          }
        }
      });
      
      sessionPromise.current = sp;

    } catch (err) {
      console.error("Setup Error", err);
      setStatus('error');
      // If setup failed, ensure we clean up any partial state
      stopSession(); 
    }
  };

  useEffect(() => {
    return () => stopSession();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl max-w-lg w-full shadow-2xl flex flex-col items-center text-center">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all ${
           status === 'connected' ? 'bg-green-500/20 text-green-400 animate-pulse' : 
           status === 'connecting' ? 'bg-yellow-500/20 text-yellow-400' :
           'bg-slate-800 text-slate-400'
        }`}>
          {status === 'connected' ? <Volume2 size={40} /> : <Mic size={40} />}
        </div>

        <h3 className="text-2xl font-bold text-white mb-2">{tool.name}</h3>
        <p className="text-slate-400 mb-8">
            {status === 'idle' && "Click start to begin the roleplay. Make sure your microphone is ready."}
            {status === 'connecting' && "Connecting to Gemini Live..."}
            {status === 'connected' && "Session Active. Speak clearly. 'Alex' is listening."}
            {status === 'error' && "Connection failed. Please check permissions and try again."}
        </p>

        <div className="flex gap-4">
          {!isActive ? (
            <Button onClick={startSession} variant="primary" className="w-32">
              <Mic className="mr-2" size={18} /> Start
            </Button>
          ) : (
             <Button onClick={stopSession} className="bg-red-600 hover:bg-red-700 w-32 text-white">
              <MicOff className="mr-2" size={18} /> End
            </Button>
          )}
          
          <Button onClick={onClose} variant="ghost">Close</Button>
        </div>
      </div>
    </div>
  );
};

export default LivePricingSimulator;