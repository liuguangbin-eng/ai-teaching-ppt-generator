const express = require('express');
const path = require('path');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/generate', async (req, res) => {
  const { apiKey, topic, hskLevel, language, content } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: 'OpenAI API key is required.' });
  }
  if (!topic && !content) {
    return res.status(400).json({ error: 'Please provide a topic or lesson content.' });
  }

  const openai = new OpenAI({ apiKey });

  const systemPrompt = buildSystemPrompt(hskLevel, language);
  const userPrompt = buildUserPrompt(topic, content, hskLevel, language);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4096
    });

    const raw = completion.choices[0].message.content;
    let slides;
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      slides = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(raw);
    } catch {
      return res.status(500).json({ error: 'Failed to parse AI response. Please try again.' });
    }

    res.json({ slides });
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message || 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

function buildSystemPrompt(hskLevel, language) {
  const langLabel = language === 'id' ? 'Indonesian' : 'English';
  return `You are an expert Chinese language teacher creating PPT slides for foreign students at ${hskLevel} level.
Your output must be a JSON array of slide objects. Each slide object has:
- "type": one of "title", "vocabulary", "sentence_patterns", "grammar", "practice", "application", "summary"
- "title": the slide title (in Chinese with ${langLabel} subtitle)
- "content": slide-specific structured content (see below)

Slide content structures:

For "title" slides:
  { "mainTitle": "...", "subtitle": "...", "level": "${hskLevel}" }

For "vocabulary" slides:
  { "words": [ { "chinese": "...", "pinyin": "...", "meaning": "...", "example": "...", "exampleTranslation": "...", "imagePrompt": "..." } ] }
  Include 4-6 words per slide. "meaning" should be in ${langLabel}. "imagePrompt" is a short English description for AI image generation.

For "sentence_patterns" slides:
  { "patterns": [ { "pattern": "...", "patternTranslation": "...", "examples": [ { "chinese": "...", "pinyin": "...", "translation": "..." } ] } ] }
  Include 2-3 patterns with 2 examples each.

For "grammar" slides:
  { "point": "...", "explanation": "...", "structure": "...", "examples": [ { "chinese": "...", "pinyin": "...", "translation": "...", "highlight": "..." } ], "tip": "..." }
  "explanation" in ${langLabel}. Keep it simple and intuitive.

For "practice" slides:
  { "exercises": [ { "type": "multiple_choice" | "fill_blank" | "speaking" | "matching", "instruction": "...", "question": "...", "options": ["..."] | null, "answer": "..." } ] }
  Include 3-4 exercises per slide. Mix types.

For "application" slides:
  { "scenario": "...", "dialogue": [ { "speaker": "A" | "B", "chinese": "...", "pinyin": "...", "translation": "..." } ], "task": "..." }

For "summary" slides:
  { "keyWords": [ { "chinese": "...", "pinyin": "...", "meaning": "..." } ], "keyPatterns": ["..."], "homework": "..." }

Generate a complete set of slides. Use ONLY valid JSON. Do not include markdown fences or extra text.`;
}

function buildUserPrompt(topic, content, hskLevel, language) {
  const langLabel = language === 'id' ? 'Indonesian' : 'English';
  let prompt = `Create a complete Chinese teaching PPT for ${hskLevel} level students. Translations should be in ${langLabel}.\n\n`;
  if (topic) prompt += `Topic: ${topic}\n`;
  if (content) prompt += `Lesson content / vocabulary:\n${content}\n`;
  prompt += `\nGenerate the following slides in order:
1. One title slide
2. 1-2 vocabulary slides (4-6 words each)
3. One sentence patterns slide
4. One grammar explanation slide
5. 1-2 practice slides (mixed exercise types)
6. One application slide (real-life dialogue scenario)
7. One summary slide

Make the content practical for real classroom teaching. Focus on real-life usage.`;
  return prompt;
}

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
