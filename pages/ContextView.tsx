import React, { useEffect, useState } from 'react';
import { BusinessContext, GeneratedResult } from '../types';
import { getHistory, deleteResult, saveContext } from '../services/storageService';
import { TOOLS } from '../constants';
import * as Icons from 'lucide-react';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { Button } from '../components/ui/Button';

interface ContextViewProps {
  context: BusinessContext;
}

const ContextView: React.FC<ContextViewProps> = ({ context }) => {
  const [history, setHistory] = useState<GeneratedResult[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<BusinessContext>(context);

  useEffect(() => {
    getHistory().then(setHistory);
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this saved strategy?')) {
      await deleteResult(id);
      const updatedHistory = await getHistory();
      setHistory(updatedHistory);
    }
  };

  const handleSaveEdit = async () => {
    await saveContext(editForm);
    setIsEditing(false);
    window.location.reload(); // Simple reload to refresh app state
  };

  const getToolName = (toolId: string) => {
    return TOOLS.find(t => t.id === toolId)?.name || 'Unknown Tool';
  };

  const getToolIcon = (toolId: string) => {
    const iconName = TOOLS.find(t => t.id === toolId)?.icon || 'FileText';
    const Icon = (Icons as any)[iconName];
    return Icon ? <Icon size={20} /> : <Icons.FileText size={20} />;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      
      {/* Business Identity Card */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 shadow-xl relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        <div className="absolute top-6 right-6 z-10">
          {!isEditing ? (
            <Button variant="ghost" onClick={() => setIsEditing(true)}>
              <Icons.Edit3 size={18} className="mr-2" /> Edit Context
            </Button>
          ) : (
             <div className="flex gap-2">
                <Button variant="ghost" onClick={() => { setIsEditing(false); setEditForm(context); }}>Cancel</Button>
                <Button variant="primary" onClick={handleSaveEdit}>Save Changes</Button>
             </div>
          )}
        </div>

        {!isEditing ? (
          <>
            <div className="flex items-center justify-between mb-8 pr-32 relative z-10">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">{context.name}</h1>
                <p className="text-lg text-indigo-400 font-medium">{context.niche} Content Strategist</p>
              </div>
              <div className="hidden md:block bg-slate-900/50 px-6 py-3 rounded-xl border border-slate-800 text-slate-300 text-center">
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Price Target</div>
                <div className="text-xl font-bold text-white">{context.pricePointTarget}</div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 relative z-10">
              <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-2 mb-3 text-indigo-400">
                  <Icons.Target size={18} />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Dream Client</h3>
                </div>
                <p className="text-slate-300 leading-relaxed">{context.targetAudience}</p>
              </div>
              <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-2 mb-3 text-indigo-400">
                  <Icons.Package size={18} />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Core Offer</h3>
                </div>
                <p className="text-slate-300 leading-relaxed">{context.coreOfferIdea}</p>
              </div>
              <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-2 mb-3 text-indigo-400">
                  <Icons.TrendingUp size={18} />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Current Focus</h3>
                </div>
                <p className="text-slate-300 leading-relaxed">{context.currentStruggle}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-6 pt-2 relative z-10 animate-in fade-in duration-300">
             <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-sm font-medium text-slate-400">Business Name</label>
                   <input 
                      className="w-full bg-slate-900/50 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 p-3 rounded-lg text-white outline-none transition-all" 
                      value={editForm.name} 
                      onChange={e => setEditForm({...editForm, name: e.target.value})} 
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-sm font-medium text-slate-400">Niche Market</label>
                   <input 
                      className="w-full bg-slate-900/50 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 p-3 rounded-lg text-white outline-none transition-all" 
                      value={editForm.niche} 
                      onChange={e => setEditForm({...editForm, niche: e.target.value})} 
                   />
                </div>
             </div>
             
             <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Target Audience (Dream Client)</label>
                <input 
                   className="w-full bg-slate-900/50 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 p-3 rounded-lg text-white outline-none transition-all" 
                   value={editForm.targetAudience} 
                   onChange={e => setEditForm({...editForm, targetAudience: e.target.value})} 
                />
             </div>

             <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Core Offer Idea</label>
                <textarea 
                   className="w-full bg-slate-900/50 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 p-3 rounded-lg text-white outline-none h-24 transition-all" 
                   value={editForm.coreOfferIdea} 
                   onChange={e => setEditForm({...editForm, coreOfferIdea: e.target.value})} 
                />
             </div>

             <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-sm font-medium text-slate-400">Price Target</label>
                   <input 
                      className="w-full bg-slate-900/50 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 p-3 rounded-lg text-white outline-none transition-all" 
                      value={editForm.pricePointTarget} 
                      onChange={e => setEditForm({...editForm, pricePointTarget: e.target.value})} 
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-sm font-medium text-slate-400">Current Struggle</label>
                   <input 
                      className="w-full bg-slate-900/50 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 p-3 rounded-lg text-white outline-none transition-all" 
                      value={editForm.currentStruggle} 
                      onChange={e => setEditForm({...editForm, currentStruggle: e.target.value})} 
                   />
                </div>
             </div>
          </div>
        )}
      </div>

      {/* History Timeline */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Icons.History /> Strategy Library
        </h2>

        {history.length === 0 ? (
          <div className="text-center py-16 bg-slate-950 rounded-2xl border border-dashed border-slate-800">
            <Icons.Ghost className="mx-auto h-12 w-12 text-slate-700 mb-4" />
            <h3 className="text-lg font-medium text-slate-300">No strategies generated yet</h3>
            <p className="text-slate-500 mt-2">Go to the Dashboard and start using the toolkit.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <div 
                key={item.id} 
                className={`bg-slate-950 border rounded-xl overflow-hidden transition-all duration-200 ${
                  expandedId === item.id 
                    ? 'border-indigo-500 ring-1 ring-indigo-500/50 shadow-2xl shadow-indigo-900/20' 
                    : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/30'
                }`}
              >
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${expandedId === item.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-indigo-400'}`}>
                      {getToolIcon(item.toolId)}
                    </div>
                    <div>
                      <h3 className={`font-bold ${expandedId === item.id ? 'text-white' : 'text-slate-200'}`}>
                        {getToolName(item.toolId)}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(item.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} 
                        {' • '} 
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 hidden md:block uppercase tracking-wider font-medium">
                      {expandedId === item.id ? 'Close View' : 'View Details'}
                    </span>
                    <Button 
                      variant="ghost" 
                      onClick={(e) => handleDelete(item.id, e)}
                      className="text-slate-600 hover:text-red-400 hover:bg-red-950/20 p-2 h-auto"
                    >
                      <Icons.Trash2 size={18} />
                    </Button>
                  </div>
                </div>

                {expandedId === item.id && (
                  <div className="p-8 border-t border-slate-800 bg-slate-950/50">
                    <MarkdownRenderer content={item.content} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContextView;