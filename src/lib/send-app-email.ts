import { apiClient } from "./api-client";

export interface MailSendResult {
  delivered: boolean;
  mode: "smtp" | "preview";
  message: string;
}

export type EmailCategory =
  | "invoice"
  | "credit_note"
  | "return"
  | "report"
  | "ca_invite"
  | "referral"
  | "support"
  | "general";

export async function sendAppEmail(input: {
  to: string;
  cc?: string;
  subject: string;
  category?: EmailCategory;
  heading?: string;
  intro?: string;
  note?: string;
  actionUrl?: string;
  actionLabel?: string;
  companyName?: string;
  details?: Array<{ label: string; value: string }>;
  text: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    contentBase64: string;
    contentType?: string;
  }>;
}): Promise<MailSendResult> {
  return apiClient.post<MailSendResult>("/mail/send", input);
}

export function mailResultMessage(result: MailSendResult, lang: "en" | "gu" = "en"): string {
  if (result.delivered) {
    return lang === "gu" ? "ઈમેલ મોકલાઈ ગયો." : "Email sent.";
  }
  return lang === "gu"
    ? "ઈમેલ સર્વર ગોઠવેલું નથી, તેથી સંદેશ ઇનબોક્સમાં પહોંચ્યો નથી. SMTP સેટિંગ્સ ઉમેરો."
    : result.message || "Email was not delivered because SMTP is not configured.";
}
