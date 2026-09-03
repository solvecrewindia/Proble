/**
 * AI Reason Evaluation Service
 * Evaluates student answers and explanations for Proble Originals tests.
 */

export interface QuestionEvaluationInput {
    id: number;
    dbId?: string;
    question: string;
    type?: string;
    selectedAnswer: any;
    selectedAnswerText?: string;
    correctAnswer: any;
    correctAnswerText?: string;
    isOptionCorrect: boolean;
    studentReason: string;
}

export interface QuestionEvaluationResult {
    id: number;
    score: number; // 0, 0.5, or 1.0
    status: 'full' | 'half' | 'zero';
    feedback: string;
    isOptionCorrect: boolean;
}

export interface TestEvaluationResponse {
    evaluations: Record<number, QuestionEvaluationResult>;
    totalScore: number;
    maxScore: number;
    percentage: number;
}

export async function evaluateTestWithAI(
    questions: QuestionEvaluationInput[]
): Promise<TestEvaluationResponse> {
    const rawApiKey =
        import.meta.env.VITE_GROQ_API_KEYS ||
        import.meta.env.VITE_GROQ_API_KEY ||
        import.meta.env.GROQ_API_KEYS;

    const apiKey = rawApiKey
        ? rawApiKey.trim().replace(/,$/, '').replace(/^["']|["']$/g, '')
        : '';

    // If no questions or no API key, use resilient heuristic evaluation fallback
    if (!apiKey || questions.length === 0) {
        return fallbackLocalEvaluation(questions);
    }

    try {
        const payload = questions.map(q => ({
            id: q.id,
            stem: q.question,
            type: q.type || 'mcq',
            selectedAnswer: q.selectedAnswerText || String(q.selectedAnswer ?? 'Skipped'),
            correctAnswer: q.correctAnswerText || String(q.correctAnswer ?? ''),
            isOptionCorrect: q.isOptionCorrect,
            reason: (q.studentReason || '').trim()
        }));

        const systemPrompt = `You are an expert AI Academic Examiner evaluating student answers and written explanations/reasoning for an exam.

GRADING CRITERIA FOR EACH QUESTION:
1. If isOptionCorrect is false:
   - score: 0
   - status: "zero"
   - feedback: "The selected answer is incorrect."
2. If isOptionCorrect is true:
   - If reason is empty, meaningless gibberish, copy of the question, or less than 10 characters of real thought:
     - score: 0
     - status: "zero"
     - feedback: "The answer is correct, but no valid reasoning was provided."
   - If reason is vague, incomplete, or partially explains the concept without full justification:
     - score: 0.5
     - status: "half"
     - feedback: Provide a concise sentence noting what was correct and what key explanation was missing.
   - If reason is clear, sound, and accurately explains WHY the answer is correct:
     - score: 1.0
     - status: "full"
     - feedback: Provide a brief 1-sentence validation of the reasoning.

OUTPUT FORMAT:
Return ONLY a valid JSON object with the following format:
{
  "evaluations": [
    {
      "id": 1,
      "score": 1.0,
      "status": "full",
      "feedback": "..."
    }
  ]
}`;

        const model = import.meta.env.VITE_GROQ_MODEL || 'qwen/qwen3.8-27b';

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: JSON.stringify(payload) }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.2
            })
        });

        if (!response.ok) {
            console.warn(`AI evaluation API failed with status ${response.status}. Using fallback evaluation.`);
            return fallbackLocalEvaluation(questions);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
            return fallbackLocalEvaluation(questions);
        }

        const parsed = JSON.parse(content);
        const evalList: any[] = Array.isArray(parsed.evaluations)
            ? parsed.evaluations
            : Array.isArray(parsed)
            ? parsed
            : [];

        const evaluations: Record<number, QuestionEvaluationResult> = {};
        let totalScore = 0;

        questions.forEach(q => {
            const matched = evalList.find(e => e.id === q.id || e.id === Number(q.id));
            if (matched) {
                const rawScore = Number(matched.score);
                const score = !isNaN(rawScore) ? Math.min(Math.max(rawScore, 0), 1) : q.isOptionCorrect ? 1 : 0;
                const status = (score >= 1 ? 'full' : score >= 0.5 ? 'half' : 'zero') as 'full' | 'half' | 'zero';

                evaluations[q.id] = {
                    id: q.id,
                    score,
                    status,
                    feedback: matched.feedback || (score > 0 ? 'Correct answer & reasoning.' : 'Incorrect reasoning or option.'),
                    isOptionCorrect: q.isOptionCorrect
                };
                totalScore += score;
            } else {
                // Fallback for this individual question if not in list
                const defaultScore = q.isOptionCorrect ? ((q.studentReason || '').trim().length >= 20 ? 1 : 0.5) : 0;
                evaluations[q.id] = {
                    id: q.id,
                    score: defaultScore,
                    status: defaultScore >= 1 ? 'full' : defaultScore >= 0.5 ? 'half' : 'zero',
                    feedback: q.isOptionCorrect ? 'Option correct.' : 'Option incorrect.',
                    isOptionCorrect: q.isOptionCorrect
                };
                totalScore += defaultScore;
            }
        });

        const maxScore = questions.length;
        const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 1000) / 10 : 0;

        return {
            evaluations,
            totalScore,
            maxScore,
            percentage
        };
    } catch (err) {
        console.error('Error during AI Reason Evaluation:', err);
        return fallbackLocalEvaluation(questions);
    }
}

/**
 * Local heuristic fallback if network/API is unavailable
 */
function fallbackLocalEvaluation(questions: QuestionEvaluationInput[]): TestEvaluationResponse {
    const evaluations: Record<number, QuestionEvaluationResult> = {};
    let totalScore = 0;

    questions.forEach(q => {
        let score = 0;
        let status: 'full' | 'half' | 'zero' = 'zero';
        let feedback = 'Option is incorrect.';

        const reason = (q.studentReason || '').trim();

        if (q.isOptionCorrect) {
            if (reason.length >= 30) {
                score = 1.0;
                status = 'full';
                feedback = 'Correct option selected with substantive reasoning.';
            } else if (reason.length >= 10) {
                score = 0.5;
                status = 'half';
                feedback = 'Correct option with partial explanation provided.';
            } else {
                score = 0.0;
                status = 'zero';
                feedback = 'Correct option selected, but explanation is too short or missing.';
            }
        }

        evaluations[q.id] = {
            id: q.id,
            score,
            status,
            feedback,
            isOptionCorrect: q.isOptionCorrect
        };
        totalScore += score;
    });

    const maxScore = questions.length;
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 1000) / 10 : 0;

    return {
        evaluations,
        totalScore,
        maxScore,
        percentage
    };
}
