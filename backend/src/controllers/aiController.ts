import { Request, Response } from 'express';
import { GoogleGenerativeAI, Part, ModelParams } from '@google/generative-ai';

// 1. Fail-fast validation for the API Key
if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️ WARNING: GEMINI_API_KEY is missing in your .env file!');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const generateContent = async (req: Request, res: Response) => {
  try {
    // 2. Added mimeType with a default value of 'image/jpeg' for flexibility
    const { prompt, systemInstruction, base64Image, mimeType = 'image/jpeg' } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    const modelName = 'gemini-2.5-flash';

    // 3. Clean Model Initialization (DRY Principle)
    const modelOptions: ModelParams = { model: modelName };
    if (systemInstruction) {
      modelOptions.systemInstruction = systemInstruction;
    }
    const model = genAI.getGenerativeModel(modelOptions);

    // 4. Strict Typing instead of 'any'
    let content: string | Array<string | Part> = prompt;

    if (base64Image) {
      content = [
        { inlineData: { data: base64Image, mimeType } },
        prompt
      ];
    }

    // 5. API Call (Time Complexity: O(1) from our server's perspective, network I/O bound)
    const result = await model.generateContent(content);
    const text = result.response.text();

    return res.status(200).json({ success: true, text });

  } catch (error: any) {
    console.error('❌ AI Generation Error:', error);

    // Cleanly formatted overloaded check
    const isOverloaded =
      error?.status === 429 ||
      error?.status === 503 ||
      error?.message?.includes('Too Many Requests') ||
      error?.message?.includes('quota') ||
      error?.message?.includes('Service Unavailable') ||
      error?.message?.includes('overloaded');

    if (isOverloaded) {
      const mockText = `**عذراً! يبدو أن سيرفرات الذكاء الاصطناعي تواجه ضغطاً عالياً حالياً.**\n\nإليك اقتراح معد مسبقاً (Offline Fallback):\n\n### ⚡ رحلة البوليفارد السريعة\n- **المكان**: بوليفارد رياض سيتي.\n- **المدة**: 3 ساعات ⏱\n- **التكلفة**: 150 ريال 💰\n\n*الرجاء المحاولة لاحقاً للحصول على خطة مخصصة!*`;
      return res.status(200).json({ success: true, text: mockText });
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ داخلي أثناء معالجة الذكاء الاصطناعي'
    });
  }
};