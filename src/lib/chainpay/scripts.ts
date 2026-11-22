import type { Entry, Merchant } from "@/types/chainpay";
import { formatINR, MONTHS, parseISODate } from "./format";

/** What the Hindi voice agent says. Romanised Hindi, with an English gloss for the UI. */
export type Line = { text: string; translation: string };

function longDay(iso: string) {
  const { m, d } = parseISODate(iso);
  return `${d} ${MONTHS[m - 1]}`;
}

export function clientOpening(merchant: Merchant, payment: Entry): Line {
  const amount = formatINR(payment.amount);
  return {
    text: `Namaste ${payment.contactName}, main ${merchant.name} ki taraf se bol rahi hoon. Aapka ${amount} ka payment fail ho gaya. Kya wajah thi, aur aap kab tak bhej payenge?`,
    translation: `Hello ${payment.contactName}, I'm calling for ${merchant.name}. Your ${amount} payment failed. What happened, and when can you send it?`,
  };
}

/** Preset reply (PRD fallback when the mic or STT can't be used). */
export function sampleReply(promisedDate: string): Line {
  const { d } = parseISODate(promisedDate);
  return {
    text: `Bank mein issue tha, ${d} tarikh ko bhej dunga.`,
    translation: `There was a problem with the bank, I'll send it on the ${d}th.`,
  };
}

export function clientClosing(payment: Entry, newDate: string): Line {
  return {
    text: `Dhanyavaad ${payment.contactName}, ${longDay(newDate)} note kar liya hai.`,
    translation: `Thank you ${payment.contactName}, I've noted ${longDay(newDate)}.`,
  };
}

export function supplierWarning(
  merchant: Merchant,
  payout: Entry,
  newPayoutDate: string,
): Line {
  const amount = formatINR(payout.amount);
  return {
    text: `Namaste ${payout.contactName}, ${merchant.name} ka ${amount} ka payment thoda late hoga, ab ${longDay(newPayoutDate)} tak aayega. Asuvidha ke liye maafi.`,
    translation: `Hello ${payout.contactName}, ${merchant.name}'s ${amount} payment will be a little late. It will now arrive by ${longDay(newPayoutDate)}. Sorry for the trouble.`,
  };
}
