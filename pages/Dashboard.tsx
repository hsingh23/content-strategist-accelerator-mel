import React, { useState, useRef, useEffect } from 'react';
import { TOOLS } from '../constants';
import { ToolDef, ToolCategory, BusinessContext, GeneratedResult } from '../types';
import { streamText, generateSpeech } from '../services/geminiService';
import { saveResult, getHistory } from '../services/storageService';
import { Button } from '../components/ui/Button';
import * as Icons from 'lucide-react';
import MarkdownRenderer from '../components/MarkdownRenderer';
import LivePricingSimulator from '../components/LivePricingSimulator';

interface DashboardProps {
  context: BusinessContext;
}

// Audio Helper
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const Dashboard: React.FC<DashboardProps> = ({ context }) => {
  const [selectedTool, setSelectedTool] = useState<ToolDef | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [showVoiceSim, setShowVoiceSim] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  // Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  // History State
  const [allHistory, setAllHistory] = useState<GeneratedResult[]>([]);
  
  // Refinement State
  const [refinementInput, setRefinementInput] = useState('');
  const resultEndRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  useEffect(() => {
    loadHistory();
    return () => stopAudio(); // Cleanup audio on unmount
  }, []);

  const loadHistory = async () => {
    const h = await getHistory();
    setAllHistory(h);
  };

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (isGenerating && resultEndRef.current) {
      resultEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [result, isGenerating]);

  // Group tools by category
  const groupedTools = TOOLS.reduce((acc, tool) => {
    if (!acc[tool.category]) acc[tool.category] = [];
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<ToolCategory, ToolDef[]>);

  const handleToolClick = (tool: ToolDef) => {
    stopAudio();
    setSelectedTool(tool);
    setResult(null);
    setRefinementInput('');
    setIsCopied(false);
    setShowVoiceSim(false);
  };

  const handleLoadHistoryItem = (content: string) => {
    stopAudio();
    setResult(content);
  };

  const handleGenerate = async (refinePrompt?: string) => {
    if (!selectedTool) return;
    
    stopAudio();
    
    if (selectedTool.isVoice && !refinePrompt) {
      setShowVoiceSim(true);
      return;
    }

    setIsGenerating(true);
    setIsCopied(false);
    
    let prompt: string;
    let systemInstruction = selectedTool.systemInstruction;

    if (refinePrompt && result) {
      // Refinement Mode
      prompt = `Here is the previous result I generated:
      """
      ${result}
      """
      
      The user wants to refine this with the following instruction: "${refinePrompt}".
      
      Rewrite the content incorporating this change. Return the full updated content.`;
    } else {
      // Fresh Generation Mode
      prompt = selectedTool.promptTemplate(context);
    }

    try {
      setResult(""); // Clear previous if new, or start empty for stream
      
      const finalContent = await streamText(
        'gemini-3-flash-preview',
        prompt,
        systemInstruction,
        (chunk) => setResult(chunk)
      );
      
      // Save to local history automatically
      await saveResult({
        id: Date.now().toString(),
        toolId: selectedTool.id,
        timestamp: Date.now(),
        content: finalContent
      });
      
      // Refresh history list
      await loadHistory();
      
      setRefinementInput(''); // Clear input after success
      
    } catch (e) {
      setResult(prev => (prev || "") + "\n\n[Error generating response. Please check API key.]");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!result || !selectedTool) return;
    const blob = new Blob([result], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTool.name.replace(/\s+/g, '_')}_Strategy.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const stopAudio = () => {
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleListen = async () => {
    if (isPlaying) {
      stopAudio();
      return;
    }
    
    if (!result) return;

    setIsSynthesizing(true);
    try {
      const base64Audio = await generateSpeech(result.substring(0, 4000)); // Limit length for TTS to avoid massive generation
      
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      
      const audioData = decode(base64Audio);
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData.buffer);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsPlaying(false);
      
      sourceRef.current = source;
      source.start();
      setIsPlaying(true);
      
    } catch (e) {
      console.error("TTS Failed", e);
      alert("Could not generate audio. Please try a shorter text.");
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Icon Helper
  const getIcon = (name: string) => {
    const Icon = (Icons as any)[name];
    return Icon ? <Icon size={24} /> : <Icons.Box size={24} />;
  };

  const getToolHistory = () => {
    if (!selectedTool) return [];
    return allHistory.filter(h => h.toolId === selectedTool.id);
  };

  const toolHistory = getToolHistory();

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-100px)]">
      {/* Left: Tool Selection */}
      <div className="lg:w-1/3 flex-shrink-0 overflow-y-auto pr-2 pb-20 custom-scrollbar">
        <h2 className="text-2xl font-bold text-white mb-6">Course Toolkit</h2>
        <div className="space-y-8">
          {Object.entries(groupedTools).map(([category, tools]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-3">{category}</h3>
              <div className="grid gap-3">
                {tools.map(tool => {
                   const isVoice = tool.isVoice;
                   const isSelected = selectedTool?.id === tool.id;
                   
                   return (
                    <button
                      key={tool.id}
                      onClick={() => handleToolClick(tool)}
                      className={`w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden ${
                        isSelected
                          ? 'bg-indigo-600/10 border-indigo-500 shadow-lg shadow-indigo-900/20'
                          : isVoice 
                            ? 'bg-gradient-to-r from-slate-800 to-indigo-900/20 border-indigo-500/30 hover:border-indigo-400/50' 
                            : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {isVoice && (
                         <div className="absolute top-0 right-0 p-1">
                            <span className="bg-red-500/20 text-red-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded-bl-lg">
                               Live Sim
                            </span>
                         </div>
                      )}
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-500 text-white' : isVoice ? 'bg-indigo-900/50 text-indigo-300' : 'bg-slate-700 text-slate-300'}`}>
                          {getIcon(tool.icon)}
                        </div>
                        <div>
                          <div className={`font-semibold ${isVoice ? 'text-indigo-200' : 'text-slate-100'}`}>{tool.name}</div>
                          <div className="text-xs text-slate-400 mt-1 line-clamp-1">{tool.description}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Work Area */}
      <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
        {!selectedTool ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
            <Icons.LayoutDashboard size={48} className="mb-4 opacity-50" />
            <h3 className="text-xl font-medium text-slate-300">Select a module to begin</h3>
            <p className="max-w-md mt-2">Choose a tool from the left to access AI-powered strategies based on the course material.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    {getIcon(selectedTool.icon)}
                    {selectedTool.name}
                  </h2>
                  <p className="text-slate-400 mt-1">{selectedTool.description}</p>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 rounded-full bg-slate-800 text-xs font-medium text-slate-300 border border-slate-700">
                    {selectedTool.category.split(':')[0]}
                  </span>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-950 relative group custom-scrollbar">
               {result ? (
                 <>
                  <div className="sticky top-0 flex justify-end gap-2 mb-4 z-10 pointer-events-none">
                    <div className="pointer-events-auto flex gap-2">
                      <Button variant="secondary" onClick={() => setResult(null)} className="text-xs py-1 shadow-xl bg-slate-800/90 backdrop-blur">
                        <Icons.ArrowLeft size={14} className="mr-1" /> Back
                      </Button>
                      
                      {!selectedTool.isVoice && (
                        <Button 
                            variant="secondary" 
                            onClick={handleListen} 
                            isLoading={isSynthesizing}
                            className={`text-xs py-1 shadow-xl backdrop-blur ${isPlaying ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-800/90'}`}
                        >
                            {isPlaying ? (
                                <><Icons.Square size={14} className="mr-1" /> Stop Audio</>
                            ) : (
                                <><Icons.Volume2 size={14} className="mr-1" /> Listen</>
                            )}
                        </Button>
                      )}

                      <Button variant="secondary" onClick={handleDownload} className="text-xs py-1 shadow-xl bg-slate-800/90 backdrop-blur">
                         <Icons.Download size={14} className="mr-1" /> Export
                      </Button>

                      <Button variant="secondary" onClick={handleCopy} className="text-xs py-1 shadow-xl bg-slate-800/90 backdrop-blur">
                        {isCopied ? <Icons.Check size={14} className="mr-1" /> : <Icons.Copy size={14} className="mr-1" />}
                        {isCopied ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                   <MarkdownRenderer content={result} />
                   <div ref={resultEndRef} />
                 </>
               ) : (
                 <div className="h-full flex flex-col">
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                      <Icons.Sparkles size={32} className="mb-4 opacity-20" />
                      <p>Ready to generate insights for <strong>{context.name}</strong>.</p>
                    </div>

                    {/* Quick History List */}
                    {toolHistory.length > 0 && (
                      <div className="mt-auto pt-6 border-t border-slate-800/50">
                        <h4 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                          <Icons.History size={14} /> Previous Versions
                        </h4>
                        <div className="grid gap-2">
                          {toolHistory.slice(0, 3).map(h => (
                            <button 
                              key={h.id}
                              onClick={() => handleLoadHistoryItem(h.content)}
                              className="text-left text-sm text-slate-300 p-3 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 transition-colors truncate"
                            >
                              {new Date(h.timestamp).toLocaleDateString()} - {h.content.slice(0, 60)}...
                            </button>
                          ))}
                          {toolHistory.length > 3 && (
                            <p className="text-xs text-center text-slate-500 mt-2">
                              + {toolHistory.length - 3} more in History tab
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                 </div>
               )}
            </div>

            {/* Actions Footer */}
            <div className="p-6 border-t border-slate-800 bg-slate-900 flex-shrink-0">
              {result && !selectedTool.isVoice ? (
                <div className="flex gap-2 items-center">
                  <input 
                    type="text" 
                    value={refinementInput}
                    onChange={(e) => setRefinementInput(e.target.value)}
                    placeholder="Refine this result (e.g., 'Make it shorter', 'Add more pricing details')"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleGenerate(refinementInput)}
                    disabled={isGenerating}
                  />
                  <Button 
                    onClick={() => handleGenerate(refinementInput)} 
                    isLoading={isGenerating}
                    disabled={isGenerating || !refinementInput.trim()}
                    className="flex-shrink-0"
                  >
                    <Icons.Send size={18} />
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => handleGenerate()} 
                  className={`w-full py-3 text-lg ${selectedTool.isVoice ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500' : ''}`}
                  isLoading={isGenerating}
                  disabled={isGenerating}
                >
                  {selectedTool.isVoice ? (
                    <><Icons.Mic className="mr-2" /> Start Voice Roleplay</>
                  ) : (
                    <><Icons.Wand2 className="mr-2" /> Generate Strategy</>
                  )}
                </Button>
              )}
            </div>
          </>
        )}
        
        {/* Voice Modal Overlay */}
        {showVoiceSim && selectedTool && (
          <LivePricingSimulator 
            apiKey={process.env.API_KEY || ''}
            tool={selectedTool}
            onClose={() => setShowVoiceSim(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;