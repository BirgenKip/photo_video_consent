const express = require("express");
const { PDFDocument, StandardFonts } = require("pdf-lib");

const app = express();
app.use(express.json({ limit: "10mb" }));

app.post("/generate-pdf", async (req, res) => {
  const {
    eventName,
    venue,
    eventDate,
    fullName,
    forSelf,
    forChild,
    signature
  } = req.body;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  let y = 800;

  const draw = (text, size = 11) => {
    page.drawText(text, { x: 50, y, size, font });
    y -= size + 8;
  };

  draw("PHOTOGRAPHY AND VIDEO CONSENT FORM", 16);
  y -= 10;

  draw(`Event Name: ${eventName}`);
  draw(`Venue: ${venue}`);
  draw(`Date: ${eventDate}`);
  y -= 15;

  draw("Purpose and Intended Use", 13);
  y -= 5;

  const consentText = `
Photographers and/or videographers have been assigned to this event to capture
imagery and videos that will be used for future promotion and marketing purposes
by AAR Insurance – Kenya Ltd (AIK) and its affiliated third parties.

Your image or appearance may be used in printed publications, press releases,
social media channels, presentations, website and advertising media.

The photographs and/or videos will remain the property of AAR Insurance – Kenya Ltd (AIK)
and your other personal data will remain confidential.
  `;

  consentText.split("\n").forEach(line => draw(line.trim()));

  y -= 10;
  draw(`Consent Given For: ${forSelf ? "Self " : ""}${forChild ? " Child(ren)" : ""}`);
  y -= 10;

  draw(`Full Name: ${fullName}`);
  draw(`Signed On: ${new Date().toLocaleString()}`);
  y -= 20;

  // Signature
  const sigImage = await pdf.embedPng(signature);
  page.drawImage(sigImage, {
    x: 50,
    y: y - 40,
    width: 150,
    height: 50
  });

  const pdfBytes = await pdf.save();

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": "attachment; filename=Photography_Video_Consent.pdf"
  });

  res.send(Buffer.from(pdfBytes));
});

app.listen(3000, () => console.log("Server running on port 3000"));
