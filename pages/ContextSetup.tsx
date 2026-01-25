import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BusinessContext } from '../types';
import { saveContext } from '../services/storageService';
import { generateText } from '../services/geminiService';
import { Button } from '../components/ui/Button';
import { Wand2 } from 'lucide-react';

interface ContextSetupProps {
  setContext: (ctx: BusinessContext) => void;
}

const DEFAULT_DESCRIPTION = `I am selling a tool that is basically Bhajan's helper and Bhajan is a devotional song the target niche is the different devotional singing communities and my clients are the organizers who create these group chats where lyrics and audio is shared and the offer is a way to basically help people like learn all the songs together and they can have like an instrumental backing track that they can sing along and they have like tools to show the lyrics and they have tools to like have everything in one place where they can have like uh tan pura and tabla in the background as they're singing to help them along with the backing track and they have all kinds of you know ways to adjust their pitch and you know they can see you know how they're singing they can transpose the backing track etc so it basically is a tool that helps them all do these things the target price point is like I don't know help me figure out what that is I think it's probably like 30 bucks per seat biggest current cycle is figuring out the right personas and doing market research`;

const ContextSetup: React.FC<ContextSetupProps> = ({ setContext }) => {
  const navigate = useNavigate();
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setError(null);

    try {
      // 1. Use AI to extract structured data from the blob of text
      const extractionPrompt = `
        Analyze the following business description and extract these specific fields into a JSON object:
        - name: (Suggest a creative, short, professional name for this product/business)
        - niche: (The specific market segment)
        - targetAudience: (The specific person buying)
        - coreOfferIdea: (Concise description of the product)
        - pricePointTarget: (The price mentioned, or a suggested high-ticket price if unsure)
        - currentStruggle: (The main problem they are facing)

        Description: "${description}"

        Return ONLY the raw JSON object. Do not use Markdown code blocks.
      `;

      // Updated model to gemini-3-flash-preview
      const jsonStr = await generateText('gemini-3-flash-preview', extractionPrompt, 'You are a data extraction bot. Output valid JSON only.');
      
      // Clean up potential markdown formatting from LLM
      const cleanedJsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(cleanedJsonStr);

      const newContext: BusinessContext = {
        id: Date.now().toString(),
        name: data.name || 'My Business',
        niche: data.niche || 'General',
        targetAudience: data.targetAudience || 'Clients',
        coreOfferIdea: data.coreOfferIdea || 'Services',
        pricePointTarget: data.pricePointTarget || '$2000',
        currentStruggle: data.currentStruggle || 'Growth'
      };

      // 2. Save to IndexedDB
      await saveContext(newContext);
      
      // 3. Update App state
      setContext(newContext);
      navigate('/');

    } catch (err) {
      console.error("Extraction failed", err);
      setError("Could not analyze the text. Please try again or check your API Key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-4">Initialize Your Strategy</h1>
        <p className="text-slate-400 max-w-xl mx-auto">
          Instead of filling out a boring form, just dump your brain below. Describe your product, your customers, your price ideas, and your struggles. 
          The AI will organize it for you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-950 border border-slate-800 p-8 rounded-xl shadow-xl space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Describe your business, offer, and challenges:
          </label>
          <textarea 
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none min-h-[300px] leading-relaxed" 
            placeholder="e.g. I help real estate agents get more leads..."
          />
        </div>

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="pt-2">
          <Button 
            type="submit" 
            className="w-full py-4 text-lg" 
            isLoading={isAnalyzing}
            disabled={isAnalyzing}
          >
            <Wand2 className="mr-2" />
            Analyze & Build Strategy
          </Button>
          <p className="text-center text-xs text-slate-500 mt-4">
            Your answers will be securely saved in your browser (IndexedDB).
          </p>
        </div>
      </form>
    </div>
  );
};

export default ContextSetup;