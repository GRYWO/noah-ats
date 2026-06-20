// Authenticatie voor de altijd-aan machine (bot). De bot stuurt een gedeeld
// geheim mee in de header `x-bot-secret`, dat overeen moet komen met de
// BOT_SECRET omgevingsvariabele. Zonder ingestelde BOT_SECRET is de bot-API uit.
export function botGeautoriseerd(request: Request): boolean {
  const secret = process.env.BOT_SECRET;
  if (!secret) return false;
  return request.headers.get("x-bot-secret") === secret;
}
