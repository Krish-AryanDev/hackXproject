import { Groq } from 'groq-sdk';
import env from '../../config/env.js';

// Initialize Groq client if key is configured
let groqClient = null;
if (env.GROQ_API_KEY) {
    groqClient = new Groq({ apiKey: env.GROQ_API_KEY });
}

/**
 * Intelligent Fallback Rule Engine when Groq API key is not configured or during offline testing
 */
const fallbackRuleEngine = (existingCargo, newCargo) => {
    const text1 = `${existingCargo.category || ''} ${existingCargo.description || ''}`.toLowerCase();
    const text2 = `${newCargo.category || ''} ${newCargo.description || ''}`.toLowerCase();

    const isFood1 = /food|grain|flour|biscuit|vegetable|fruit|edible|wheat|rice|grocery|snack/i.test(text1);
    const isFood2 = /food|grain|flour|biscuit|vegetable|fruit|edible|wheat|rice|grocery|snack/i.test(text2);

    const isChemical1 = /chemical|pesticide|fertilizer|paint|toxic|hazardous|petroleum|solvent|acid/i.test(text1);
    const isChemical2 = /chemical|pesticide|fertilizer|paint|toxic|hazardous|petroleum|solvent|acid/i.test(text2);

    const isOdor1 = /spice|rubber|leather|perfume|tobacco|raw hide|fish|onion|garlic/i.test(text1);
    const isOdor2 = /spice|rubber|leather|perfume|tobacco|raw hide|fish|onion|garlic/i.test(text2);

    const isLiquid1 = /liquid|oil|water|milk|juice|syrup|beverage/i.test(text1);
    const isLiquid2 = /liquid|oil|water|milk|juice|syrup|beverage/i.test(text2);

    const isMoistureSensitive1 = /cement|paper|cotton|textile|electronics|dry powder/i.test(text1);
    const isMoistureSensitive2 = /cement|paper|cotton|textile|electronics|dry powder/i.test(text2);

    // Hazard: Chemicals + Food
    if ((isFood1 && isChemical2) || (isChemical1 && isFood2)) {
        return {
            is_compatible: false,
            compatibility_score: 15,
            safety_level: 'HAZARDOUS',
            hazards_identified: ['Severe toxicity and contamination risk between chemicals and food products'],
            special_handling_instructions: 'Strictly prohibited from co-loading. Requires dedicated transportation.',
            reasoning: 'Chemical fumes and possible leakage can contaminate consumables, violating food safety regulations.',
        };
    }

    // Odor contamination risk: Strong Odor + Food or Sensitive Textiles
    if ((isOdor1 && (isFood2 || isMoistureSensitive2)) || (isOdor2 && (isFood1 || isMoistureSensitive1))) {
        return {
            is_compatible: true,
            compatibility_score: 65,
            safety_level: 'RESTRICTED',
            hazards_identified: ['Cross-odor aroma transfer risk to porous goods'],
            special_handling_instructions: 'Ensure airtight secondary packaging and physical separation with partition.',
            reasoning: 'Goods can be co-loaded provided appropriate barrier packaging is used to prevent aroma absorption.',
        };
    }

    // Liquid + Moisture Sensitive Dry Goods
    if ((isLiquid1 && isMoistureSensitive2) || (isLiquid2 && isMoistureSensitive1)) {
        return {
            is_compatible: true,
            compatibility_score: 70,
            safety_level: 'RESTRICTED',
            hazards_identified: ['Liquid leakage or condensation damage risk'],
            special_handling_instructions: 'Place dry goods on elevated pallets away from liquid drums. Ensure liquid containers are sealed.',
            reasoning: 'Compatible with adequate spill containment and physical separation.',
        };
    }

    // Default: Safe Dry Goods / General Cargo
    return {
        is_compatible: true,
        compatibility_score: 92,
        safety_level: 'SAFE',
        hazards_identified: [],
        special_handling_instructions: 'Standard freight securing and strapping recommended.',
        reasoning: 'Both cargo types are compatible dry freight with no chemical, biological, or odor transfer hazards.',
    };
};

/**
 * Evaluate Cargo Compatibility using Groq API LLM (with heuristic rule fallback)
 * @param {object} existingCargo - { category: string, description: string, weightTons?: number }
 * @param {object} newCargo - { category: string, description: string, weightTons?: number, volumeCft?: number }
 * @returns {Promise<{is_compatible: boolean, compatibility_score: number, safety_level: string, hazards_identified: string[], special_handling_instructions: string, reasoning: string}>}
 */
export const evaluateCargoCompatibility = async (existingCargo = {}, newCargo = {}) => {
    // If no existing cargo on the truck, it's 100% safe
    if (!existingCargo.category && !existingCargo.description) {
        return {
            is_compatible: true,
            compatibility_score: 100,
            safety_level: 'SAFE',
            hazards_identified: [],
            special_handling_instructions: 'No existing cargo loaded. Standard loading procedures apply.',
            reasoning: 'Vehicle is currently empty; no co-loading cross-contamination possible.',
        };
    }

    // If Groq API key is not set, use the robust rule engine
    if (!groqClient || !env.GROQ_API_KEY) {
        console.log('ℹ️ [Groq AI Engine] Running local freight compatibility rule engine (GROQ_API_KEY not set)');
        return fallbackRuleEngine(existingCargo, newCargo);
    }

    try {
        const prompt = `
You are an expert Freight Safety and Dangerous Goods Co-Loading Safety Inspector.
Evaluate whether the following two cargo shipments can be safely co-loaded and transported in the same commercial truck compartment.

[EXISTING CARGO IN TRUCK]:
- Category: ${existingCargo.category || 'General Freight'}
- Description: ${existingCargo.description || 'Not specified'}

[NEW REQUESTED SHIPMENT]:
- Category: ${newCargo.category || 'General Freight'}
- Description: ${newCargo.description || 'Not specified'}
- Weight: ${newCargo.weight_tons || newCargo.weightTons || 'N/A'} tons

Evaluation Criteria:
1. Chemical & hazardous material interactions (toxic, flammable, explosive, oxidizer, corrosive).
2. Odor and aroma contamination (e.g., spices, rubber, paint, petroleum vs food, textiles, pharma).
3. Moisture and liquid leakage risk (liquids vs dry cement, flour, electronics).
4. Temperature & climate conflicts (ambient vs cold-chain).
5. Physical weight and crushing hazard.

Respond ONLY with a valid JSON object matching this exact schema:
{
  "is_compatible": boolean,
  "compatibility_score": integer between 0 and 100,
  "safety_level": "SAFE" | "RESTRICTED" | "HAZARDOUS",
  "hazards_identified": [ "list of specific hazard strings" ],
  "special_handling_instructions": "clear actionable loading/packaging guidelines",
  "reasoning": "concise 2-sentence explanation of the safety verdict"
}
`;

        const model = env.GROQ_MODEL || 'openai/gpt-oss-120b';



        const response = await groqClient.chat.completions.create({
            model,
            messages: [
                {
                    role: 'system',
                    content: 'You are a strict logistics freight safety inspector. Always respond with pure JSON only, without markdown fences.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.1,
            max_tokens: 2048,
            response_format: { type: 'json_object' },
        });


        const rawContent = response.choices[0]?.message?.content?.trim();
        const parsed = JSON.parse(rawContent);


        // Sanitize and normalize fields
        return {
            is_compatible: Boolean(parsed.is_compatible),
            compatibility_score: Math.min(100, Math.max(0, parseInt(parsed.compatibility_score, 10) || 75)),
            safety_level: ['SAFE', 'RESTRICTED', 'HAZARDOUS'].includes(parsed.safety_level)
                ? parsed.safety_level
                : parsed.is_compatible ? 'SAFE' : 'HAZARDOUS',
            hazards_identified: Array.isArray(parsed.hazards_identified) ? parsed.hazards_identified : [],
            special_handling_instructions: parsed.special_handling_instructions || 'Standard cargo securing required.',
            reasoning: parsed.reasoning || 'Evaluated for transportation safety.',
        };
    } catch (groqError) {
        console.warn('⚠️ [Groq AI Engine Error, falling back to rule engine]:', groqError.message);
        return fallbackRuleEngine(existingCargo, newCargo);
    }
};

export default {
    evaluateCargoCompatibility,
};
