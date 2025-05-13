# Job Information Assistant

A Next.js application that provides an interactive chat interface for users to inquire about job positions, descriptions, and compensation information. The application uses natural language processing to understand user queries and provides relevant information from a predefined dataset of job descriptions and salaries.

## Features

- Interactive chat interface for job-related queries
- Intelligent job title extraction from natural language queries
- Fuzzy matching for job title recognition
- Detailed job descriptions and salary information
- Real-time responses using OpenAI's gpt-4o-mini
- Clean and modern UI with responsive design

## Technical Approach

### 1. Job Title Extraction
- Utilizes regex patterns to remove common phrases and stop words
- Implements fuzzy matching using Fuse.js for flexible job title recognition
- Handles partial matches and variations in job titles
- Removes jurisdiction and position-related words for cleaner results

### 2. Job Information Matching
- Multi-step matching process:
  1. Exact match attempt
  2. Fuzzy match with configurable threshold
  3. Partial word matching for complex queries
- Maintains a balance between accuracy and flexibility in matching

### 3. Natural Language Processing
- Uses OpenAI's gpt-4o-mini for generating natural, conversational responses
- Provides context-aware answers based on job information
- Handles various query formats and phrasings

### 4. Frontend Implementation
- Built with Next.js 13+ using the App Router
- React components for the chat interface
- Tailwind CSS for styling
- Responsive design for all screen sizes

### 5. API Implementation
The application uses Next.js API Routes (Route Handlers) instead of Server Actions for the following reasons:

1. **External API Integration**:
   - Better suited for handling external API calls (OpenAI)
   - Provides clear separation between client and server code
   - Easier to manage API keys and sensitive data

2. **Error Handling**:
   - Built-in support for HTTP status codes
   - More granular error control
   - Better error reporting and monitoring

3. **Future Extensibility**:
   - Easier to add middleware (rate limiting, authentication)
   - Better support for API monitoring and logging
   - More flexible for potential API extensions

4. **Security**:
   - API keys are only exposed on the server
   - Better control over request/response headers
   - Easier to implement security measures

While Server Actions are great for form submissions and database operations, API Routes provide better control and flexibility for our use case of handling external API calls and managing sensitive data.

## Prerequisites

- Node.js 18.17.0 or later (required for Next.js 13+)
- OpenAI API key

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd holly-eng-take-home-solution
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory and add your OpenAI API key:
```bash
OPENAI_API_KEY=your_api_key_here
```

## Running the Application

1. Start the development server:
```bash
npm run dev
# or
yarn dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

## Production Build

1. Create a production build:
```bash
npm run build
# or
yarn build
```

2. Start the production server:
```bash
npm start
# or
yarn start
```

## Project Structure

```
holly-eng-take-home-solution/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts
│   ├── chat/
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── data/
│   ├── job-descriptions.json
│   └── salaries.json
├── public/
├── .env.local
├── package.json
└── README.md
```

## Dependencies

- Next.js 13+
- React
- OpenAI
- Fuse.js (for fuzzy searching)
- stopword (for text processing)

## Error Handling

The application includes comprehensive error handling:
- API error handling for OpenAI requests
- Graceful fallbacks for job title matching
- User-friendly error messages
- Production-ready error logging

### User Feedback for Missing Information

When a job title or jurisdiction is not found in our predefined dataset, the system provides friendly and informative responses:

I couldn't find information about that job. Please try rephrasing your question or specify the job title and Jurisdiction more clearly.";
  

This approach ensures that users:
- Receive clear feedback when information isn't available
- Understand why their query might not have returned results
- Get suggestions for how to modify their query
- Don't encounter technical error messages

## Test Cases

Here are some example queries to test different scenarios:

1. Basic Job Title Queries:
   - "What is the salary for Assistant Sheriff?"
   - "Tell me about the Assistant Chief Probation Officer position"
   - "What are the skills and abilities for Deputy Sheriff?"

2. Queries with Jurisdictions:
   - "What is the salary for Assistant Sheriff in San Bernardino?"
   - "Tell me about the Assistant Chief Probation Officer in San Diego County"
   - "What are the skills for Deputy Sheriff in Los Angeles?"

3. Queries with Misspellings:
   - "What is the salary for Assistant Sherif in San Bernanrdino?"
   - "Tell me about the Assistant Chief Probation Officer in San Deigo"
   - "What are the skills for Deputy Sherif in Los Angeles?"

4. Complex Queries:
   - "What are the knowledge, skills, and abilities for the Assistant Sheriff position in San Bernardino County?"
   - "Tell me about the salary and requirements for Assistant Chief Probation Officer in San Diego"
   - "What are the skills and abilities needed for Deputy Sheriff in Los Angeles County?"

## Technical Challenges and Solutions

### Job Title Extraction and Jurisdiction Handling

One of the key challenges in this project was handling jurisdiction names in user queries. The initial approach of using static regex patterns and word lists proved insufficient because:

1. Jurisdiction names can often appear in different formats (e.g., "San Bernardino", "San Bernardino County", "Bernardino")
2. Users might misspell jurisdiction names
3. Some jurisdiction names contain common words that could be part of the job title

To address these challenges, we implemented a two-step approach:

1. **Title Extraction**:
   - Remove common phrases and stop words
   - Clean and normalize the text
   - Handle various query formats (questions, statements, etc.)

2. **Fuzzy Matching**:
   - Use Fuse.js for fuzzy string matching
   - Implement a lenient threshold (0.4) to handle misspellings
   - Support partial matches for better recall
   - Rank matches by relevance score

This approach allows the system to:
- Handle misspelled jurisdiction names
- Match job titles even when jurisdiction information is present
- Provide better results for partial matches
- Maintain accuracy while being flexible with user input

