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
  console.log("Searching for job with normalized title:", normalizedTitle);
  console.log("Available jobs:", jobDescriptions.map(job => job.title));
  
  // First try exact match
  const exactMatch = jobDescriptions.find(job => 
    job.title.toLowerCase() === normalizedTitle
  );
  if (exactMatch) {
    console.log("Found exact match:", exactMatch.title);
    return exactMatch;
  }

  // Then try partial match
  const partialMatch = jobDescriptions.find(job => 
    normalizedTitle.includes(job.title.toLowerCase()) || 
    job.title.toLowerCase().includes(normalizedTitle)
  );
  if (partialMatch) {
    console.log("Found partial match:", partialMatch.title);
    return partialMatch;
  }

  // Third: Fuzzy match using Fuse.js
  const fuse = new Fuse(jobDescriptions, {
    keys: ['title'],
    threshold: 0.3, // lower = more strict, higher = more lenient
  });
  console.log("fuse", fuse);

  const fuzzyResults = fuse.search(normalizedTitle);
  if (fuzzyResults.length > 0) {
    const bestMatch = fuzzyResults[0].item;
    console.log("Found fuzzy match:", bestMatch.title);
    return bestMatch;
  }

  console.log("No match found for title:", normalizedTitle);
  return undefined;
}

function findSalaryByJobCode(jobCode: string): Salary | undefined {
  return salaries.find(salary => salary["Job Code"] === jobCode);
}

function extractJobTitle(query: string): string {
  console.log("Original query:", query);
  
  let title = query.toLowerCase();
  console.log("After lowercase:", title);

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
  for (const pattern of phrasePatterns) {
    if (pattern.test(title)) {
      title = title.replace(pattern, '').trim();
      console.log("After removing phrase pattern:", pattern, "Result:", title);
      break;
    }
  }

  // Get unique jurisdictions from job descriptions
  const jurisdictions = [...new Set(jobDescriptions.map(job => job.jurisdiction.toLowerCase()))];
  console.log("Found jurisdictions:", jurisdictions);

  // Regex patterns for position-related words and jurisdictions
  const positionPatterns = [
    // Remove position words
    /\b(?:position|job|role|county|department)\b/g,
    // Remove jurisdiction words and variations
    ...jurisdictions.map(j => new RegExp(`\\b${j}\\b`, 'g')),
    ...jurisdictions.map(j => new RegExp(`\\bin\\s+${j}\\b`, 'g')),
    ...jurisdictions.map(j => new RegExp(`\\b${j}\\s+county\\b`, 'g')),
    // Remove "san diego" specifically since it's a special case
    /\bsan\s+diego\b/g,
    // Remove knowledge, skills, abilities
    /\b(?:knowledge|skills|abilities)\b/g
  ];

  // Remove position and jurisdiction related words
  for (const pattern of positionPatterns) {
    title = title.replace(pattern, '').trim();
    console.log("After removing position pattern:", pattern, "Result:", title);
  }

  // Split into words and remove stop words
  const words = title.split(/\s+/);
  const customStopWords = ['knowledge', 'skills', 'abilities', 'for', 'in', 'the', 'a', 'an', 'and', 'of', 'what', 'are'];
  const filteredWords = removeStopwords(words, customStopWords);
  title = filteredWords.join(' ');
  console.log("After removing stop words:", title);

  // Clean up the result
  title = title
    .replace(/\?/g, '') // Remove question marks
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/^the\s+/i, '') // Remove 'the' from start
    .replace(/\s+the$/i, '') // Remove 'the' from end
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '') // Remove punctuation
    .trim();

  console.log("Final extracted title:", title);
  return title;
}

async function generateResponse(query: string): Promise<string> {
  const jobTitle = extractJobTitle(query);
  const job = findJobByTitle(jobTitle);
  console.log("query", query);
  console.log("jobTitle", jobTitle);
  console.log("job", job);
  if (!job) {
    return "I couldn't find information about that job. Please try rephrasing your question or specify the job title more clearly.";
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
  console.log("jobInfo", jobInfo);
  try {
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

    console.log("API Response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error response:", errorText);
      throw new Error(`Failed to get response from LLM: ${errorText}`);
    }

    const data = await response.json();
    console.log("API Response data:", data);
    return data.response;
  } catch (error) {
    console.error('Error calling LLM API:', error);
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

    // Add human message
    setMessages(prev => [...prev, { text: inputText, isAI: false }]);
    setIsLoading(true);
    
    try {
      // Generate AI response
      const response = await generateResponse(inputText);
      setMessages(prev => [...prev, { text: response, isAI: true }]);
    } catch (error) {
      console.error('Error generating response:', error);
      setMessages(prev => [...prev, { 
        text: "I apologize, but I'm having trouble processing your request right now. Please try again later.", 
        isAI: true 
      }]);
    } finally {
      setIsLoading(false);
      setInputText('');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-black p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-white">Job Information Assistant</h1>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.isAI ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.isAI
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-black'
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[70%] rounded-lg p-3 bg-blue-500 text-white">
              Thinking...
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
