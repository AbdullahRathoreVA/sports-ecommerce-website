/** Contact details a visitor typed into the website chat themselves (a plain helper, not a server action). */
export function contactFromChat(messages: { role: string; content: string }[]) {
  const said = messages.filter((m) => m.role === "user").map((m) => m.content).join("\n");
  const email = said.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() ?? null;
  const phone = said.match(/(?:\+|00)?\d[\d\s().-]{7,}\d/)?.[0]?.replace(/\s+/g, " ").trim() ?? null;
  return { email, phone };
}
