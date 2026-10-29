import { PDFDocument, StandardFonts } from "pdf-lib";
import { TERMS, TERMS_VERSION } from "./terms";

const ascii = (s: string) => s.replace(/[^\x20-\x7E]/g, "?");

export async function buildAgreementPdf(o: {
  name: string; signaturePng: Uint8Array; ip: string; signedAt: Date; bookingId: string;
}) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([612, 792]);
  let y = 740;
  const ensure = (need: number) => { if (y < need) { page = pdf.addPage([612, 792]); y = 740; } };
  const write = (text: string, size = 11, f = font) => {
    let line = "";
    const flush = () => { ensure(80); page.drawText(line, { x: 56, y, size, font: f }); y -= size + 5; line = ""; };
    for (const w of text.split(" ")) {
      const next = line ? `${line} ${w}` : w;
      if (f.widthOfTextAtSize(next, size) > 500) { flush(); line = w; } else line = next;
    }
    if (line) flush();
  };

  write("Anchor Management Destin - Rental Agreement", 16, bold); y -= 8;
  TERMS.forEach((t) => { write(t); y -= 4; });
  ensure(200); y -= 10;
  const sig = await pdf.embedPng(o.signaturePng);
  const scale = Math.min(220 / sig.width, 80 / sig.height);
  page.drawImage(sig, { x: 56, y: y - sig.height * scale, width: sig.width * scale, height: sig.height * scale });
  y -= sig.height * scale + 16;
  write(`Signed by: ${ascii(o.name)}`, 11, bold);
  write(`Date: ${o.signedAt.toISOString()}`, 10);
  write(`IP address: ${ascii(o.ip)}   Terms version: ${TERMS_VERSION}   Booking: ${o.bookingId}`, 9);
  return pdf.save();
}
