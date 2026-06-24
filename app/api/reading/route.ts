import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const { cards, spreadName, positions, question, focus, userName } = await req.json();

    if (!cards || cards.length === 0) {
      return NextResponse.json({ error: "Kart bilgisi eksik" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      // Demo mode - return structured placeholder reading
      return NextResponse.json({
        reading: generateDemoReading(cards, spreadName, positions, question, userName),
      });
    }

    const cardDescriptions = cards.map(
      (item: { card: { nameTR: string; keywordsTR: string[]; upright: { meaningTR: string }; reversed: { meaningTR: string } }; position: string; isReversed: boolean }) =>
        `• ${item.position}: ${item.card.nameTR} (${item.isReversed ? "Ters" : "Düz"})
   Anahtar kelimeler: ${item.card.keywordsTR.join(", ")}
   Temel anlam: ${item.isReversed ? item.card.reversed.meaningTR : item.card.upright.meaningTR}`
    ).join("\n\n");

    const focusContext = focus?.length > 0
      ? `Kullanıcının önem verdiği alanlar: ${focus.join(", ")}`
      : "";

    const systemPrompt = `Sen Pollux Astro'nun derin ve bilge tarot okuyucususun.
Türkçe konuşuyorsun.
Tarot okumalarını kehanet olarak değil, iç dünya yansıması ve spiritüel rehberlik olarak sunuyorsun.
"Sen şunu yapacaksın" gibi kehanet dili kullanmıyorsun.
"Bu kart sana şunu söylüyor", "Bu enerji..." gibi yansıtıcı bir dil kullanıyorsun.
Yanıtın kişisel, sıcak ve derin olsun. Her kart için pozisyona özel yorum yap.
Sonunda kartların arasındaki bağlantıyı ve genel mesajı açıkla.
${focusContext}`;

    const userMessage = `${userName || "Yolcu"} için ${spreadName} okuması:
${question ? `Soru/Niyet: ${question}` : "Genel bir okuma isteniyor"}

Çekilen kartlar:
${cardDescriptions}

Lütfen her kart için pozisyonuna özel bir yorum yap ve ardından kartlar arasındaki temayı ve genel mesajı açıkla. Toplam 300-500 kelime arası ol.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        { role: "user", content: userMessage }
      ],
      system: systemPrompt,
    });

    const reading = response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ reading });
  } catch (error) {
    console.error("Reading API error:", error);
    return NextResponse.json({ error: "Okuma yapılırken hata oluştu" }, { status: 500 });
  }
}

function generateDemoReading(
  cards: Array<{ card: { nameTR: string; upright: { meaningTR: string }; keywordsTR: string[] }; position: string; isReversed: boolean }>,
  spreadName: string,
  positions: string[],
  question: string | undefined,
  userName: string | undefined
): string {
  const name = userName || "Yolcu";
  const intro = question
    ? `${name}, "${question}" sorusuyla açılan bu ${spreadName} okumasında...`
    : `${name}, bu ${spreadName} okumasında evren sana şunları fısıldıyor:`;

  const cardReadings = cards.map((item) =>
    `**${item.position} — ${item.card.nameTR}${item.isReversed ? " (Ters)" : ""}**\n${item.card.upright.meaningTR}`
  ).join("\n\n");

  const themes = cards.flatMap(c => c.card.keywordsTR.slice(0, 2));
  const closing = `\n\n**Genel Mesaj**\nBu okumada öne çıkan temalar: ${themes.join(", ")}. Kartlar seni daha derin bir farkındalığa davet ediyor. İçine dön, gördüğün şeyleri hisset — evren zaten cevabın içinde.`;

  return `${intro}\n\n${cardReadings}${closing}`;
}
