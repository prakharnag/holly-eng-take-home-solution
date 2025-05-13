'use client';

import { useState } from 'react';
import Fuse from 'fuse.js';
import { removeStopwords } from 'stopword';
import jobDescriptions from '../../data/job-descriptions.json';
import salaries from '../../data/salaries.json';

interface Message {
  text: string;
  isAI: boolean;
}

interface JobDescription {
  jurisdiction: string;
  code: string;
  title: string;
  description: string;
}

interface Salary {
  "Jurisdiction": string;
  "Job Code": string;
  "Salary grade 1": string;
  "Salary grade 2": string;
  [key: string]: string | undefined;
}

function findJobByTitle(title: string): JobDescription | undefined {
  const normalizedTitle = title.toLowerCase().trim();
  
  // Create a Fuse instance with more lenient settings
  const fuse = new Fuse(jobDescriptions, {
    keys: ['title'],
    threshold: 0.4,
    includeScore: true,
    minMatchCharLength: 3,
    shouldSort: true,
    findAllMatches: true,
    location: 0,
    distance: 100,
    useExtendedSearch: true
  });

  // Try to find matches with the full title
  const searchResults = fuse.search(normalizedTitle);

  if (searchResults.length > 0) {
    return searchResults[0].item;
  }

  // If no match found, try to find partial matches
  const words = normalizedTitle.split(/\s+/).filter(word => word.length > 3);

  // Try to find jobs that contain any of these words
  const partialMatches = jobDescriptions.filter(job => {
    const jobTitleLower = job.title.toLowerCase();
    return words.some(word => jobTitleLower.includes(word));
  });

  if (partialMatches.length > 0) {
    // If we found multiple matches, use Fuse to rank them
    const fusePartial = new Fuse(partialMatches, {
      keys: ['title'],
      threshold: 0.6,
      includeScore: true
    });

    const rankedMatches = fusePartial.search(normalizedTitle);
    if (rankedMatches.length > 0) {
      return rankedMatches[0].item;
    }
  }

  return undefined;
}

function findSalaryByJobCode(jobCode: string): Salary | undefined {
  return salaries.find(salary => salary["Job Code"] === jobCode);
}

function extractJobTitle(query: string): string {
  
  let title = query.toLowerCase();

  // Regex patterns for common phrases to remove
  const phrasePatterns = [
    /^what\s+are\s+(?:the\s+)?(?:knowledge\s*,\s*)?skills\s+(?:and\s+)?(?:knowledge\s*,\s*)?abilities\s+(?:for\s+)?/i,
    /^what\s+are\s+(?:the\s+)?skills\s+(?:and\s+)?abilities\s+(?:for\s+)?/i,
    /^tell\s+me\s+(?:about\s+)?(?:the\s+)?salary\s+(?:of|for)\s+/i,
    /^tell\s+me\s+(?:about\s+)?/i,
    /^(?:show|find|search|look)\s+(?:me|for|up)\s+/i,
    /^what\s+is\s+(?:the\s+)?(?:salary\s+(?:of|for)\s+)?/i
  ];

  // Remove phrases from the start
  let previousTitle = title;
  for (const pattern of phrasePatterns) {
    if (pattern.test(title)) {
      title = title.replace(pattern, '').trim();
      if (title === previousTitle) {
        continue;
      }
      previousTitle = title;
    }
  }

  // Regex patterns for position-related words
  const positionPatterns = [
    // Remove position words
    /\b(?:position|job|role|county|department)\b/g,
    // Remove knowledge, skills, abilities
    /\b(?:knowledge|skills|abilities)\b/g
  ];

  // Remove position related words
  for (const pattern of positionPatterns) {
    title = title.replace(pattern, '').trim();
  }

  // Split into words and remove stop words
  const words = title.split(/\s+/);
  const customStopWords = ['knowledge', 'skills', 'abilities', 'for', 'in', 'the', 'a', 'an', 'and', 'of', 'what', 'are', 'salary'];
  const filteredWords = removeStopwords(words, customStopWords);
  title = filteredWords.join(' ');

  // Clean up the result
  title = title
    .replace(/\?/g, '') // Remove question marks
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/^the\s+/i, '') // Remove 'the' from start
    .replace(/\s+the$/i, '') // Remove 'the' from end
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '') // Remove punctuation
    .trim();

  
  return title;
}

async function generateResponse(query: string): Promise<string> {
  try {
    const jobTitle = extractJobTitle(query);
    const job = findJobByTitle(jobTitle);
    
    if (!job) {
      return "I couldn't find information about that job. Please try rephrasing your question or specify the job title and jurisdiction more clearly.";
    }

    const salary = findSalaryByJobCode(job.code);
    
    // Prepare job information for the LLM
    const jobInfo = {
      title: job.title,
      jurisdiction: job.jurisdiction,
      description: job.description,
      salary: salary ? {
        grade1: salary["Salary grade 1"],
        grade2: salary["Salary grade 2"]
      } : null
    };

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        jobInfo
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get response from LLM: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    // Log error for monitoring but return user-friendly message
    console.error('Error generating response:', error);
    return "I apologize, but I'm having trouble processing your request right now. Please try again later.";
  }
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const currentInput = inputText.trim();
    // Clear input immediately
    setInputText('');
    
    // Add human message
    setMessages(prev => [...prev, { text: currentInput, isAI: false }]);
    setIsLoading(true);
    
    try {
      // Generate AI response
      const response = await generateResponse(currentInput);
      setMessages(prev => [...prev, { text: response, isAI: true }]);
    } catch (error) {
      // Log error for monitoring but show user-friendly message
      console.error('Error in chat:', error);
      setMessages(prev => [...prev, { 
        text: "I apologize, but I'm having trouble processing your request right now. Please try again later.", 
        isAI: true 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-black p-4 shadow-sm flex justify-between items-center">
        <h1 className="text-xl font-semibold text-white">Job Information Assistant</h1>
        <button
          onClick={handleClearChat}
          className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          disabled={messages.length === 0}
        >
          Clear Chat
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.isAI ? 'justify-end' : 'justify-start'}`}
          >
            <div className="flex flex-col max-w-[70%]">
              {message.isAI && (
                <span className="text-sm text-gray-600 mb-1 ml-2">AI Assistant</span>
              )}
              <div
                className={`rounded-lg p-3 ${
                  message.isAI
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-black'
                }`}
              >
                {message.text}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-end">
            <div className="flex flex-col max-w-[70%]">
              <span className="text-sm text-gray-600 mb-1 ml-2">AI Assistant</span>
              <div className="rounded-lg p-3 bg-blue-500 text-white">
                Thinking...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="bg-white p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask about a job (e.g., What is the salary for Assistant Sheriff?)"
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`px-4 py-2 rounded-lg transition-colors ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
