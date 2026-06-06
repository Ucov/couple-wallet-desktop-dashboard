import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || '');

export interface ReceiptItem {
  name: string;
  price: number;
}

export interface ScannedResult {
  merchant: string;
  categoryId: string | null;
  items: ReceiptItem[];
}

export async function extractReceiptItems(file: File, categories: {id: string, name: string}[]): Promise<ScannedResult> {
  if (!apiKey) throw new Error('No Gemini API key found');
  
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  const base64EncodedData = await base64EncodedDataPromise;

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
    Analiza este ticket de compra o recibo.
    1. Extrae el nombre del comercio (merchant).
    2. Asigna la categoría que mejor encaje con la compra basándote en esta lista de categorías disponibles:
       ${JSON.stringify(categories)}
       Si ninguna encaja bien, devuelve null. Devuelve el ID de la categoría (categoryId).
    3. Extrae todos los productos o conceptos comprados y sus precios. Asegúrate de ignorar subtotales, totales, impuestos o propinas.

    Devuelve ÚNICAMENTE un objeto JSON válido, sin markdown ni texto extra, con la estructura exacta:
    {
      "merchant": "Nombre del comercio",
      "categoryId": "id_de_la_categoria",
      "items": [
        { "name": "Nombre producto", "price": 12.34 }
      ]
    }
  `;

  const imageParts = [
    {
      inlineData: {
        data: base64EncodedData,
        mimeType: file.type
      }
    }
  ];

  const result = await model.generateContent([prompt, ...imageParts]);
  const response = await result.response;
  let text = response.text();
  
  text = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  try {
    return JSON.parse(text) as ScannedResult;
  } catch (err) {
    console.error("Failed to parse JSON from Gemini:", text);
    throw new Error('No se pudo extraer la información del ticket. Formato inválido.');
  }
}
