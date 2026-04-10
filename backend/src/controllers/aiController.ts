import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const generateContent = async (req: Request, res: Response) => {
  try {
    const { prompt, systemInstruction, base64Image } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    // Determine the model
    let model;
    if (systemInstruction) {
      model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction
      });
    } else {
      // ✅ تم إزالة كلمة const لكي يتم التعديل على المتغير الخارجي
      model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    }

    // Generate content
    let content: any = prompt;
    if (base64Image) {
      content = [
        { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
        { text: prompt }
      ];
    }

    // ✅ الآن المتغير model سيكون معرفاً دائماً ولن ينهار السيرفر
    const result = await model.generateContent(content);
    const text = result.response.text();

    return res.status(200).json({ success: true, text });
  } catch (error: any) {
    console.error('❌ AI Generation Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An error occurred during AI generation'
    });
  }
};