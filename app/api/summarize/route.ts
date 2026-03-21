import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { transcript } = await req.json();

    if (!transcript || transcript.length === 0) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
    }

    // Format the transcript into a readable conversation format
    const formattedTranscript = transcript
      .map((t: { sender: string; text: string }) => `${t.sender}: ${t.text}`)
      .join('\n');

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Groq API Key not configured' }, { status: 500 });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are an intelligent AI meeting assistant. Your job is to read the provided meeting transcript and write a concise, professional summary. Include key discussion points, important decisions made, and a bulleted list of actionable items (if any). Format your response in clean Markdown.',
          },
          {
            role: 'user',
            content: `Here is the meeting transcript:\n\n${formattedTranscript}\n\nPlease summarize it.`,
          },
        ],
        temperature: 0.5,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Groq API Error:', errorData);
      return NextResponse.json({ error: 'Failed to generate summary from Groq' }, { status: 500 });
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || 'No summary generated.';

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('API Summarize Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
