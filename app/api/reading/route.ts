import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

const SYSTEM_PROMPT = `Sen Pollux Astro'nun tarot okuyucususun. Adın Lyra.

Seni bir AI gibi değil, derin sezgili bir rehber gibi hissettiriyorsun.
Türkçe konuşuyorsun — sıcak, özgün, bazen şiirsel.

Kuralların:
- Kehanet dili yok: "olacak", "olacaksın" yerine → "bu enerji", "kart sana şunu yansıtıyor", "içinde zaten biliyorsun"
- Kullanıcının ismini, doğum kartını ve geçmiş okumalarını organik olarak kullan
- Her kartı hem sembolik hem psikolojik hem spiritüel açıdan yorumla
- Soru sormaya teşvik et — okuma bitmez, derinleşir
- Asla klişe ve genel cümleler kurma. Her yorum o kişiye özel hissettirmeli
- Yanıtları paragraflar halinde ver, başlık koyma`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, cards, spreadName, question, userContext, conversation, isDeep } = body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ reading: generateFallbackReading(body) });
    }

    const model = isDeep ? "claude-sonnet-4-6" : "claude-haiku-4-5-20251001";
    const maxTokens = isDeep ? 1200 : 500;

    // ── MOD 1: İlk okuma ──────────────────────────────────────────────────
    if (mode === "initial") {
      const cardDescriptions = cards
        .map((item: { card: { nameTR: string; keywordsTR: string[]; upright: { meaningTR: string }; reversed: { meaningTR: string } }; position: string; isReversed: boolean }) =>
          `${item.position}: ${item.card.nameTR} (${item.isReversed ? "Ters" : "Düz"}) — ${item.card.keywordsTR.join(", ")}`
        )
        .join("\n");

      const prompt = `${userContext ? `[Kullanıcı Bağlamı]\n${userContext}\n\n` : ""}[Okuma]
Spread: ${spreadName}
${question ? `Soru/Niyet: "${question}"` : "Genel okuma"}

Kartlar:
${cardDescriptions}

${isDeep
  ? "Bu derin bir okuma. Her kart için ayrı paragraf yaz, kartlar arasındaki temayı bağla, ve sonunda kullanıcıya bir yansıma sorusu sor."
  : "Akıcı, bütünleşik bir yorum yaz. Kısa ama güçlü olsun."
}`;

      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      });

      return NextResponse.json({
        reading: response.content[0].type === "text" ? response.content[0].text : "",
      });
    }

    // ── MOD 2: Devam sohbeti ──────────────────────────────────────────────
    if (mode === "chat") {
      const messages = (conversation || []).map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const systemWithContext = userContext
        ? `${SYSTEM_PROMPT}\n\n[Kullanıcı Bağlamı]\n${userContext}`
        : SYSTEM_PROMPT;

      const response = await client.messages.create({
        model,
        max_tokens: 600,
        system: systemWithContext,
        messages,
      });

      return NextResponse.json({
        reading: response.content[0].type === "text" ? response.content[0].text : "",
      });
    }

    // ── MOD 3: Günlük niyet ───────────────────────────────────────────────
    if (mode === "intention") {
      const { intention, cardName, moonPhase } = body;
      const prompt = `${userContext ? `[Kullanıcı Bağlamı]\n${userContext}\n\n` : ""}Kullanıcı bugün için şu niyeti belirledi: "${intention}"
Bugünün kartı: ${cardName}
Ay fazı: ${moonPhase}

Bu niyet için kişisel, güçlü ve kısa (2-3 cümle) bir mantra/affirmation yaz.
"Ben..." ile başlasın, şimdiki zamanda olsun, kullanıcının ismini kullan.`;

      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 150,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      });

      return NextResponse.json({
        reading: response.content[0].type === "text" ? response.content[0].text : "",
      });
    }

    // ── MOD 4: Haftalık özet ──────────────────────────────────────────────
    if (mode === "weekly") {
      const { cardsSummary, avgMood, dominantSuit } = body;
      const prompt = `${userContext ? `[Kullanıcı Bağlamı]\n${userContext}\n\n` : ""}Bu hafta kullanıcının okumalarında şu kartlar çıktı: ${cardsSummary}
Dominant element/suit: ${dominantSuit}
Ortalama ruh hali (1-5): ${avgMood}

Bu haftanın spiritüel temasını 3-4 cümleyle özetle.
Tekrarlayan kartların ortak mesajını bul. Gelecek hafta için bir niyet öner.`;

      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      });

      return NextResponse.json({
        reading: response.content[0].type === "text" ? response.content[0].text : "",
      });
    }

    return NextResponse.json({ error: "Geçersiz mod" }, { status: 400 });

  } catch (error) {
    console.error("Reading API error:", error);
    return NextResponse.json({ error: "Okuma yapılırken hata oluştu" }, { status: 500 });
  }
}

function generateFallbackReading(body: {
  cards?: Array<{ card: { nameTR: string; keywordsTR: string[]; upright: { meaningTR: string } }; position: string; isReversed: boolean }>;
  spreadName?: string;
  question?: string;
  userContext?: string;
  mode?: string;
  intention?: string;
  cardName?: string;
}) {
  if (body.mode === "intention") {
    return `Ben bu niyeti taşıyarak güne başlıyorum — "${body.intention}" — ve ${body.cardName}'in enerjisi bana rehberlik ediyor. Bugün içimdeki sesi dinleyeceğim.`;
  }

  if (body.mode === "weekly") {
    return "Bu hafta kartların sana tekrar eden bir mesaj taşıdı. Temayı sindirmek için biraz zaman ayır — haftanın enerjisi hâlâ seninle.";
  }

  if (!body.cards?.length) return "";

  const intro = body.question
    ? `"${body.question}" sorusuyla açılan bu okumada...`
    : `Bu ${body.spreadName || "okuma"} sana şunları fısıldıyor:`;

  const cardReadings = body.cards.map(item =>
    `**${item.position} — ${item.card.nameTR}**\n${item.card.upright.meaningTR}`
  ).join("\n\n");

  return `${intro}\n\n${cardReadings}\n\nBu üç enerji birlikte sana tek bir şey söylüyor: zaten bildiğin cevap içinde. Kartlar sadece aynayı tutuyor.`;
}
