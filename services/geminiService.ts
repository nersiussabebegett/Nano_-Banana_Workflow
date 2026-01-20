
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { PromptConfig, MediaType } from "../types";

export class GeminiService {
  private static getAi() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  static async optimizePrompt(config: PromptConfig): Promise<string> {
    const ai = this.getAi();
    // Menggunakan gemini-3-flash-preview untuk performa terbaik dan limit gratis yang luas
    const systemPrompt = `Anda adalah pakar prompt engineering tingkat dunia untuk AI media generatif. 
    Tugas Anda adalah mengubah konsep sederhana menjadi prompt yang sangat detail, artistik, dan KONSISTEN.
    Gunakan struktur: [Subjek Utama], [Detail Aksi/Pose], [Gaya Artistik: ${config.style}], [Pencahayaan: ${config.lighting}], [Kamera/Lensa], [Kualitas Render].
    
    PERHATIAN KHUSUS PENCAHAYAAN: Jika pencahayaan adalah '${config.lighting}' yang bertema Natural, gunakan deskripsi seperti "soft organic shadows", "realistic light bounce", "natural light falloff", dan "accurate global illumination".
    
    Pastikan prompt dalam Bahasa Inggris untuk hasil AI Media yang maksimal.
    HANYA berikan teks prompt akhir, tanpa penjelasan atau tanda kutip.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Konsep: ${config.concept}`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.8,
      },
    });

    return response.text?.trim() || config.concept;
  }

  static async generateImage(prompt: string, aspectRatio: string): Promise<string> {
    const ai = this.getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any || "1:1",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Gagal mengambil data gambar");
  }

  static async generateVideo(prompt: string, aspectRatio: string): Promise<string> {
    const ai = this.getAi();
    
    // Fitur Veo memerlukan pemilihan API Key berbayar sesuai regulasi
    if (!(await (window as any).aistudio?.hasSelectedApiKey())) {
       await (window as any).aistudio?.openSelectKey();
    }

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio as any || '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 8000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Generasi video gagal");
    
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
}
