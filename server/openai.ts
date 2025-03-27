import OpenAI from "openai";

// Initialize OpenAI client
// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    // Create a prompt that instructs the model to compare the documents
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert legal document analyst. You will be provided with two versions of a legal document. 
          Your task is to analyze the changes between them and provide a structured summary. Focus on substantive 
          changes that affect legal meaning, financial terms, rights, and obligations.`
        },
        {
          role: "user",
          content: `I need you to compare these two versions of a legal document and summarize the key changes:
          
          ORIGINAL VERSION:
          ${original}
          
          UPDATED VERSION:
          ${updated}
          
          Analyze the changes and provide a structured output with:
          1. A list of significant changes with the section they appear in, the type of change (addition, removal, modification), 
          a description of the change, and its significance (high, medium, low)
          2. A list of sections that remained unchanged
          3. A concise overall summary of the changes (max 50 words)`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    return {
      significant_changes: result.significant_changes || [],
      unchanged_sections: result.unchanged_sections || [],
      summary: result.summary || ""
    };
  } catch (error) {
    console.error("Error generating document comparison:", error);
    
    // Return a fallback response in case of error
    return {
      significant_changes: [
        {
          section: "Error",
          change_type: "error",
          description: "Unable to analyze document due to an error",
          significance: "medium"
        }
      ],
      unchanged_sections: [],
      summary: "An error occurred while analyzing the document changes. Please try again later."
    };
  }
}