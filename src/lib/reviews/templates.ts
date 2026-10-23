/**
 * Review-request wording (email + WhatsApp). Every template asks for HONEST
 * feedback — good, neutral or bad — offers nothing in return, and is sent
 * only to real customers about a real order. Placeholders: {name} {order}
 * {product} {link} {company}.
 */

export type ReviewTemplate = { id: string; label: string; when: string; subject?: string; email: string; whatsapp: string };

export const REVIEW_TEMPLATES: ReviewTemplate[] = [
  {
    id: "post-delivery",
    label: "After delivery",
    when: "7–14 days after the order arrives (time to check fit and quality).",
    subject: "How was your {company} order?",
    email:
      "Hi {name},\n\nThank you for ordering {product} from {company}. Now that you've had time to check the goods, we'd really value your honest feedback — what went well and what we could do better.\n\nIt takes about two minutes:\n{link}\n\nThis private link is for order {order}, so your review will be marked as a verified buyer. We read every review and publish critical ones too.\n\nThank you,\n{company}",
    whatsapp: "Hi {name}, thank you for your order ({order}) with {company}! When you have two minutes, could you tell us honestly how it went — good or bad? {link}",
  },
  {
    id: "post-sample",
    label: "After sample approval",
    when: "Right after the customer approves (or rejects) a sample.",
    subject: "Your feedback on the {company} sample",
    email:
      "Hi {name},\n\nThank you for reviewing your sample. Before bulk production, we'd like to know how the sample process felt — the communication, the turnaround and how closely it matched your design. Honest feedback helps us improve:\n{link}\n\n{company}",
    whatsapp: "Hi {name}, thanks for checking the sample. How did the sample process go for you? Honest feedback helps us: {link}",
  },
  {
    id: "bulk-complete",
    label: "Bulk order completed",
    when: "After a large / OEM order is delivered and checked.",
    subject: "Feedback on your bulk order {order}",
    email:
      "Hi {name},\n\nYour order {order} is complete. For a bigger order, every stage matters — the quotation, sample, production updates, quality and delivery. Could you tell us how each part went, honestly?\n{link}\n\nThank you for trusting {company}.",
    whatsapp: "Hi {name}, order {order} is complete — thank you! Could you share honest feedback on the quote, sample, production and delivery? {link}",
  },
  {
    id: "repeat",
    label: "Repeat customer",
    when: "When a returning customer's new order is delivered.",
    subject: "Thank you for ordering from {company} again",
    email:
      "Hi {name},\n\nThank you for coming back to {company}. Since you've ordered from us more than once, your view is especially useful to other buyers — how has working with us been over time? Anything we should change?\n{link}\n\n{company}",
    whatsapp: "Hi {name}, thanks for ordering with us again! As a returning customer, how has working with {company} been? Honest feedback welcome: {link}",
  },
  {
    id: "issue-followup",
    label: "Private follow-up after a problem",
    when: "After a complaint has been handled. This is NOT a review request — no link.",
    subject: "Following up on your order {order}",
    email:
      "Hi {name},\n\nWe wanted to check that the problem with order {order} has been resolved to your satisfaction. If anything is still not right, please reply to this email and we'll deal with it personally.\n\n{company}",
    whatsapp: "Hi {name}, just checking the issue with order {order} is fully sorted. If anything's still not right, please tell us and we'll fix it.",
  },
  {
    id: "reminder",
    label: "One reminder (send once, then stop)",
    when: "Once, about a week after the first request if there was no reply. Never more.",
    subject: "A quick reminder about your feedback",
    email:
      "Hi {name},\n\nA short reminder in case our earlier message got lost — if you have two minutes, your honest feedback on order {order} would help us and other buyers:\n{link}\n\nWe won't send another reminder.\n\n{company}",
    whatsapp: "Hi {name}, a gentle reminder (the last one, promise): your honest feedback on order {order} would help us. {link}",
  },
  {
    id: "permission",
    label: "Ask permission to publish feedback received privately",
    when: "When a customer praised or criticised you on WhatsApp/email and you'd like to show it.",
    subject: "May we show your feedback on our website?",
    email:
      "Hi {name},\n\nThank you for the feedback you sent us. Would you be happy for us to publish it on our website, word for word, with your name and company? If yes, the easiest way is to post it yourself here (it lets you edit it first):\n{link}\n\nIf you'd rather not, no problem at all.\n\n{company}",
    whatsapp: "Hi {name}, thank you for your message! Would you be OK with us showing your feedback on our website, word for word, with your name? If yes, you can post it yourself here: {link} — and if not, no problem at all.",
  },
  {
    id: "thanks-critical",
    label: "Thank you for constructive criticism",
    when: "Reply to a critical review (publicly in the review reply, or privately).",
    subject: "Thank you for your honest review",
    email:
      "Hi {name},\n\nThank you for your honest review. We're sorry the experience didn't fully meet your expectations. We've shared it with our team, and we'd like to make it right — please reply and tell us what would help.\n\n{company}",
    whatsapp: "Hi {name}, thank you for your honest review. We're sorry it wasn't perfect — please tell us what would help and we'll make it right.",
  },
];

export function fillTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}

/** Questions to help real customers write useful reviews in their own words — never pre-written answers. */
export const FEEDBACK_PROMPTS: { line: string; questions: string[] }[] = [
  { line: "Footballs", questions: ["Which type of ball did you order, and were the specifications clear?", "Did the customization (artwork, crest, colours) match what you asked for?", "What would have made ordering easier?"] },
  { line: "Goalkeeper gloves", questions: ["Which glove details mattered most to you (palm, cut, closure)?", "Was the sizing information enough to choose correctly?", "How did the gloves hold up in use?"] },
  { line: "Soccer uniforms", questions: ["Was the kit design process easy to follow?", "Were names, numbers, colours and logos exactly right?", "How did the sample approval go?"] },
  { line: "American football uniforms", questions: ["Were team specifications easy to coordinate with us?", "Did sizing and artwork come out as approved?", "What part of the process could be better?"] },
  { line: "Hoodies & training wear", questions: ["Did the fabric and garment information help you choose?", "Was the branding (print or embroidery) as approved?", "How was the fit across sizes?"] },
  { line: "Sports bags", questions: ["Were dimensions and compartments as described?", "How did the customization go?", "What should future buyers know?"] },
  { line: "Varsity & leather jackets", questions: ["Were style, material and sizing options explained well?", "Were the important specifications confirmed before production?", "How is the finish and stitching?"] },
  { line: "Motorbike & racing suits", questions: ["Were the measurement instructions clear?", "Were your design and sponsor logos placed as agreed?", "Did you get the documentation you needed?"] },
  { line: "Bulk & OEM orders", questions: ["Was the quotation easy to understand?", "Did you get enough production updates?", "Were key milestones confirmed in writing?", "What should we improve for your next order?"] },
  { line: "General", questions: ["What did you find most helpful?", "What could have been better?", "Would you order again, based on this experience?"] },
];
