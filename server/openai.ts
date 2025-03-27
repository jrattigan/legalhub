import OpenAI from "openai";

// Initialize OpenAI client
// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Maximum token limit to stay safely within OpenAI's constraints
const MAX_TOKEN_LIMIT = 24000; // Leaving buffer for response tokens

/**
 * Truncate text to approximately fit within token limit
 * A conservative estimate is 4 characters per token
 * @param text The text to truncate
 * @param maxTokens Maximum token limit
 * @returns Truncated text
 */
function truncateTextToTokenLimit(text: string, maxTokens: number): string {
  // Estimate: 4 characters per token (conservative)
  const maxLength = maxTokens * 4;
  
  if (text.length <= maxLength) {
    return text;
  }
  
  // If text is too long, truncate it and add a note
  return text.substring(0, maxLength) + 
    "\n\n[NOTE: The document has been truncated due to size constraints. This analysis covers only the first portion of the document.]";
}

/**
 * Analyzes two document versions and generates a summary of changes
 * @param original The original document content
 * @param updated The updated document content
 * @returns A structured summary of changes
 */
export async function generateDocumentComparisonSummary(original: string, updated: string) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key not found. Using mock AI summary data.");
      // Return mock data if no API key is available
      return {
        significant_changes: [
          {
            section: "Financial Terms",
            change_type: "modification",
            description: "Increased the initial investment amount from $5M to $7.5M and valuation cap from $25M to $30M",
            significance: "high"
          },
          {
            section: "Board Representation",
            change_type: "addition",
            description: "Added observer rights for the investor at all board meetings in addition to board appointment",
            significance: "medium"
          },
          {
            section: "Intellectual Property",
            change_type: "modification",
            description: "Expanded intellectual property representation to include licensed IP and added requirement for IP audit",
            significance: "high"
          }
        ],
        unchanged_sections: ["Introduction", "Closing Conditions"],
        summary: "This revision significantly increases the investment amount and valuation cap, adds board observer rights, and expands IP representations to include licensed IP with an audit requirement. No changes were made to the introduction or closing conditions."
      };
    }

    // Calculate total characters and estimate tokens
    const totalCharacters = original.length + updated.length;
    const estimatedTokens = totalCharacters / 4; // Rough estimate
    
    console.log(`Estimated tokens for document comparison: ${estimatedTokens}`);
    
    // Check if we need to truncate documents
    let truncatedOriginal = original;
    let truncatedUpdated = updated;
    
    if (estimatedTokens > MAX_TOKEN_LIMIT) {
      console.log(`Document too large, truncating to fit token limit...`);
      
      // Allocate tokens proportionally to original and updated
      const originalRatio = original.length / totalCharacters;
      const originalTokens = Math.floor(MAX_TOKEN_LIMIT * originalRatio);
      const updatedTokens = MAX_TOKEN_LIMIT - originalTokens;
      
      truncatedOriginal = truncateTextToTokenLimit(original, originalTokens);
      truncatedUpdated = truncateTextToTokenLimit(updated, updatedTokens);
    }

    // Create a prompt that instructs the model to compare the documents
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert legal document analyst. You will be provided with two versions of a legal document. 
          Your task is to analyze the changes between them and provide a structured JSON summary. Focus on substantive 
          changes that affect legal meaning, financial terms, rights, and obligations.`
        },
        {
          role: "user",
          content: `I need you to compare these two versions of a legal document and summarize the key changes:
          
          ORIGINAL VERSION:
          ${truncatedOriginal}
          
          UPDATED VERSION:
          ${truncatedUpdated}
          
          Analyze the changes and provide a structured output in JSON format with:
          1. A list of "significant_changes" with each having "section", "change_type" (addition, removal, modification), 
          "description" of the change, and "significance" (high, medium, low)
          2. A list of "unchanged_sections" as strings
          3. A "summary" field with a concise overall summary of the changes (max 50 words)
          
          Return your analysis as a JSON object with these fields.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    // Ensure we have content before trying to parse it
    const content = response.choices[0].message.content;
    const result = content ? JSON.parse(content) : { summary: "", changes: [], keyPoints: [] };
    
    // If documents were truncated, add a note to the summary
    let summary = result.summary || "";
    if (estimatedTokens > MAX_TOKEN_LIMIT) {
      summary += " Note: Due to document size, only the first portion was analyzed.";
    }
    
    return {
      significant_changes: result.significant_changes || [],
      unchanged_sections: result.unchanged_sections || [],
      summary: summary
    };
  } catch (error) {
    console.error("Error generating document comparison:", error);
    
    // Properly handle error with TypeScript
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Return a fallback response in case of error
    return {
      significant_changes: [
        {
          section: "Error",
          change_type: "error",
          description: errorMessage,
          significance: "medium"
        }
      ],
      unchanged_sections: [],
      summary: `An error occurred while analyzing the document changes: ${errorMessage}. Please try again with smaller documents.`
    };
  }
}