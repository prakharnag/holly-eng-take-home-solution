import OpenAI from "openai";
import { NextResponse } from 'next/server';

// console.log('All env variables:', process.env);
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
//console.log('NEXT_PUBLIC_OPENAI_API_KEY exists:', !!process.env.NEXT_PUBLIC_OPENAI_API_KEY);

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

console.log('API Key exists:', !!process.env.OPENAI_API_KEY);
console.log('API Key length:', process.env.OPENAI_API_KEY.length);

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

console.log("API Key Used:", openai.apiKey);
export async function POST(req: Request) {
  try {
    const { query, jobInfo } = await req.json();

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful HR assistant that provides information about job positions and salaries. Use the provided job information to answer questions naturally and conversationally. Focus on extracting and presenting relevant information from the job details provided."
        },
        {
          role: "user",
          content: `Here is the job information: ${JSON.stringify(jobInfo)}\n\nUser question: ${query}`
        }
      ]
    });
    
    console.log("from routeresponse", response);
    return NextResponse.json({ response: response.choices[0].message.content });
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process the request' },
      { status: 500 }
    );
  }
} 