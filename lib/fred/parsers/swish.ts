export type SwishData = {
  amount?: number;
  phone?: string;
  message?: string;
  ocr?: string;
};

export function parseSwish(text: string): SwishData | null {
  const amount = text.match(/(\d+[,.]?\d*)\s?kr/i)?.[1]?.replace(",", ".");
  const phone = text.match(/(07[0-9]-?\d{3}\s?\d{2}\s?\d{2})|(123\s?\d{3}\s?\d{2}\s?\d{2})/)?.[0];
  const ocr = text.match(/ocr[:\s]*(\d{2,20})/i)?.[1];
  const message = text.match(/meddelande[:\s]*(.+)/i)?.[1];

  if (!amount && !phone) return null;

  return {
    amount: amount ? parseFloat(amount) : undefined,
    phone: phone?.replace(/[-\s]/g, ""),
    message: message?.trim(),
    ocr,
  };
}
