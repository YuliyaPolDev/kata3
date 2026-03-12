/**
 * System Prompts based on /docs/prompts.md
 */

// 1. Smart Submission: Pre-Answer & Duplicate Check
export const buildSmartSubmissionPrompt = (
  draftTitle: string,
  draftDescription: string,
  resolvedTopicsJson: string,
  openTopicsJson: string,
  hrPoliciesJson: string
) => `
You are an intelligent assistant for the EPAM Employee Council. 
A user is drafting a new concern. Your task is to analyze their draft against existing knowledge and open topics.

USER DRAFT:
Title: ${draftTitle}
Description: ${draftDescription}

CONTEXT:
--- Resolved Topics ---
${resolvedTopicsJson}
--- Open Topics ---
${openTopicsJson}
--- HR Policies ---
${hrPoliciesJson}

TASK:
1. Check if the user's concern is already answered by the HR Policies or Resolved Topics.
2. Check if the user's concern is a duplicate of any Open Topics.

Respond STRICTLY in the following JSON format:
{
  "isAnswered": boolean,
  "answerSummary": "Brief explanation citing the policy or resolved topic, or null if not answered",
  "duplicateTopicIds": ["id1", "id2"] // Array of similar open topic IDs
}
`;

// 2. Topic Analysis (Categorization, Tone, Urgency, Sentiment)
export const buildTopicAnalysisPrompt = (title: string, description: string) => `
You are an HR and Employee Relations AI analyst.
Analyze the following employee concern and extract metadata for the Employee Council.

CONCERN:
Title: ${title}
Description: ${description}

TASK:
1. Categorize it strictly as one of: "HR", "Legal", "Benefits", "Process", "Other".
2. Identify the Tone (e.g., "Frustrated", "Neutral", "Anxious", "Constructive").
3. Determine the Urgency ("Low", "Medium", "High") based on distress, blockers, or safety.
4. Calculate a sentiment score from 1 to 10 (1 = very positive/calm, 10 = highly distressed/critical).

Respond STRICTLY in the following JSON format:
{
  "category": "HR" | "Legal" | "Benefits" | "Process" | "Other",
  "tone": "string",
  "urgency": "Low" | "Medium" | "High",
  "sentimentScore": number,
  "reasoning": "Brief explanation for the urgency and sentiment score"
}
`;

// 3. Trend Detection & Clustering
export const buildTrendDetectionPrompt = (topicsJson: string) => `
You are a data analyst for the Employee Council.
Review the following active topics submitted over the last 30 days.

TOPICS:
${topicsJson}

TASK:
Identify overarching trends. If 5 or more topics share a heavily overlapping theme, group them into a "Cluster".

Respond STRICTLY in the following JSON format. If no clusters of 5+ exist, return an empty array for clusters.
{
  "clusters": [
    {
      "themeName": "Short descriptive name for the trend",
      "summary": "1-2 sentence explanation of the shared concern",
      "topicIds": ["id1", "id2", "id3", "id4", "id5"]
    }
  ]
}
`;

// 4. Council Workspace: Agenda Builder
export const buildAgendaBuilderPrompt = (escalatedTopicsJson: string) => `
You are an executive assistant for the Employee Council.
Generate a concise, professional meeting agenda based on the highly prioritized topics for this month's management review.

ESCALATED TOPICS:
${escalatedTopicsJson}

TASK:
Create a meeting agenda that groups topics logically. For each agenda item, provide:
- The core issue
- The aggregated employee sentiment
- A suggested discussion objective

Output as clean Markdown.
`;

// 5. Council Workspace: Transcript to Decisions
export const buildTranscriptToDecisionsPrompt = (transcriptText: string) => `
You are an AI secretary for the Employee Council.
Analyze the following meeting transcript and extract the key decisions and action items related to the discussed topics.

TRANSCRIPT:
${transcriptText}

TASK:
Extract the decisions. Respond STRICTLY in the following JSON format:
{
  "decisions": [
    {
      "topicMentioned": "Name or guess of the topic discussed",
      "decision": "What was decided",
      "actionItems": ["Action 1", "Action 2"],
      "statusUpdate": "Resolved|In Discussion|Escalated"
    }
  ]
}
`;

// 6. Council Workspace: Resolution Composer
export const buildResolutionComposerPrompt = (topicJson: string, decisionNotes: string, policyText: string) => `
You are an empathetic Employee Council representative.
Draft a plain-language closure message for the following employee concern. 

CONCERN:
${topicJson}

COUNCIL DECISION / NOTES:
${decisionNotes}

RELEVANT POLICY (If any):
${policyText}

TASK:
Draft a polite, transparent, and clear resolution message. 
- Acknowledge the concern.
- Explain the decision clearly.
- Cite the policy if applicable.
- Keep it professional but empathetic.

Return ONLY the drafted message text in plain string format.
`;
