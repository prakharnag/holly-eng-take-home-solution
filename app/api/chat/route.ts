import OpenAI from "openai";
import { NextResponse } from 'next/server';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

interface JobInfo {
  title: string;
  jurisdiction: string;
  description: string;
  salary: {
    grade1: string;
    grade2: string;
  } | null;
}

interface RequestBody {
  query: string;
  jobInfo: JobInfo;
}

export async function POST(req: Request) {
  try {
    const { query, jobInfo } = await req.json() as RequestBody;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful HR assistant that provides information about job positions, job descriptions, and compensation. Use the provided job information to answer questions naturally and conversationally. Focus on extracting and presenting relevant information from the job details provided."
        },
        {
          role: "user",
          content: `Here is the job information: ${JSON.stringify(jobInfo)}\n\nUser question: ${query}`
        }
      ]
    });
    
    return NextResponse.json({ response: response.choices[0].message.content });
  } catch (error: unknown) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process the request' },
      { status: 500 }
    );
  }
} 