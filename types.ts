// Data Models

export interface BusinessContext {
  id: string;
  name: string;
  niche: string;
  targetAudience: string;
  coreOfferIdea: string;
  pricePointTarget: string;
  currentStruggle: string;
}

export enum ToolCategory {
  FOUNDATION = "Foundation & Mindset",
  WEEK1 = "Week 1: Value & Assets",
  WEEK2 = "Week 2: Mega-Value Marketing",
  WEEK3 = "Week 3: Sales & Pricing",
  WEEK4 = "Week 4: Contracts & Systems",
  BONUS = "Bonus & Resources"
}

export interface ToolDef {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: string; // Lucide icon name
  promptTemplate: (context: BusinessContext) => string;
  systemInstruction: string;
  isVoice?: boolean;
}

export interface GeneratedResult {
  id: string;
  toolId: string;
  timestamp: number;
  content: string;
}