const express = require("express");
const path = require("path");
const fs = require("fs");
const { PDFDocument, StandardFonts } = require("pdf-lib");

console.log("🚀 Starting server...");

const app = express();

// Middleware
console.log("📦 Setting up middleware...");
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static(path.join(__dirname, "../public")));
const QRCode = require("qrcode");
const router = express.Router();
const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false, // ✅ MUST be false for 587
  auth: {
    user: "aaronboarding@aar.co.ke",
    pass: "Kenya@2050!"
  },
  tls: {
    ciphers: "SSLv3"
  }
});



// Home route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});


app.post("/generate-pdf", async (req, res) => {
  console.log("➡️ POST /generate-pdf");
  console.log("BODY RECEIVED:", req.body);

  try {
    // ✅ SAFETY: ensure req.body exists
    const body = req.body || {};

    // ===== DESTRUCTURE REQUEST BODY =====
    const {
      eventName = "",
      venue = "",
      eventDate = "",
      fullName = "",
      forSelf = false,
      forChild = false,
      signature = null,
      childNames = "",
      guardianName = "",
      relationship = "",
      childSignature = null
    } = body;

    // ===== BASIC VALIDATION =====
    if (!eventName || !fullName || !signature) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ===== CREATE PDF =====
    const pdf = await PDFDocument.create();
    const pageSize = [595, 842];
    const topMargin = 800;
    const bottomMargin = 60;
    const marginX = 50;
    const maxWidth = 495;

    let page = pdf.addPage(pageSize);
    let y = topMargin;

    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    // ===== LOAD LOGO =====
    const logoPath = path.join(process.cwd(), "public", "images", "AAR Logo.png");
    const logoBytes = fs.readFileSync(logoPath);
    const logoImage = await pdf.embedPng(logoBytes);

    // ===== HEADER =====
    const drawHeader = () => {
      page.drawImage(logoImage, { x: marginX, y: 790, width: 120, height: 50 });
      page.drawText("PHOTOGRAPHY AND VIDEO CONSENT FORM", {
        x: marginX + 140,
        y: 800,
        size: 16,
        font: bold
      });
      y = 740;
    };
    drawHeader();

    // ===== PAGE BREAK HELPER =====
    const ensureSpace = (space = 20) => {
      if (y - space < bottomMargin) {
        page = pdf.addPage(pageSize);
        drawHeader();
      }
    };

    // ===== PARAGRAPH HELPER =====
    const drawParagraph = (text, size = 11, lineHeight = 16) => {
      text.split("\n").forEach(paragraph => {
        if (!paragraph.trim()) {
          y -= lineHeight;
          return;
        }

        let line = "";
        paragraph.split(" ").forEach(word => {
          const testLine = line + word + " ";
          if (font.widthOfTextAtSize(testLine, size) > maxWidth) {
            ensureSpace(lineHeight);
            page.drawText(line, { x: marginX, y, size, font });
            y -= lineHeight;
            line = word + " ";
          } else {
            line = testLine;
          }
        });

        if (line) {
          ensureSpace(lineHeight);
          page.drawText(line, { x: marginX, y, size, font });
          y -= lineHeight;
        }
      });
    };

    // ===== EVENT DETAILS =====
    page.drawText(`EVENT NAME: ${eventName}`, { x: marginX, y, size: 11, font });
    y -= 18;
    page.drawText(`VENUE: ${venue}`, { x: marginX, y, size: 11, font });
    y -= 18;
    page.drawText(`DATE: ${eventDate}`, { x: marginX, y, size: 11, font });
    y -= 30;

    // ===== PURPOSE =====
    page.drawText("Purpose and Intended Use", { x: marginX, y, size: 13, font: bold });
    y -= 18;

    drawParagraph(`
1. Photographers and/or videographers have been assigned to this event to capture imagery and videos that will be used for future promotion and marketing purposes by AAR Insurance – Kenya Ltd (AIK) and its affiliated third parties.
2. This form asks you to consent to the use of photographs and video footage that features you, or a child in your care, in our communications.
3. Your image or appearance may be used in print, social media, press releases, presentations, advertising, and online platforms.
4. Online publication may involve international data transfer.
5. All photos/videos remain the property of AAR Insurance – Kenya Ltd (AIK).
6. Other personal data will remain confidential.
`.trim());

    y -= 20;

    // ===== CONSENT =====
    page.drawText("Individual Consent", { x: marginX, y, size: 13, font: bold });
    y -= 18;

    drawParagraph(`
I hereby provide my consent for the photos and/or video footage to be used for promotional and marketing communications by AAR Insurance – Kenya Ltd (AIK).
`.trim());

    y -= 10;
    page.drawText(`[${forSelf ? "X" : " "}] For self`, { x: marginX, y, size: 11, font });
    y -= 15;
    page.drawText(`[${forChild ? "X" : " "}] For the child(ren) under my care`, { x: marginX, y, size: 11, font });
    y -= 25;

    // ===== DECLARATION =====
    drawParagraph(`
I understand that:
1. I may withdraw consent at any time.
2. Previously published materials may not be withdrawn.
3. No compensation will be received.
4. Data will be handled in accordance with the Data Protection Act, 2019.
`.trim());

    y -= 20;

    // ===== SIGNATURE =====
    page.drawText(`Full Name: ${fullName}`, { x: marginX, y, size: 11, font });
    y -= 25;

    if (signature?.startsWith("data:image/png;base64,")) {
      const sigImage = await pdf.embedPng(Buffer.from(signature.split(",")[1], "base64"));
      page.drawImage(sigImage, { x: marginX, y: y - 40, width: 160, height: 50 });
      y -= 60;
    }

    page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: marginX, y, size: 11, font });
    y -= 30;

    // ===== UNDER 18 SECTION =====
    if (forChild) {
      page.drawText("IF SUBJECT IS UNDER 18 YEARS OF AGE:", { x: marginX, y, size: 13, font: bold });
      y -= 18;

      page.drawText(
        "I confirm that I am the legal guardian of the child(ren) named below",
        { x: marginX, y, size: 11, font }
      );
      y -= 14;
      page.drawText(
        "and therefore authorized to provide consent on behalf of the child(ren).",
        { x: marginX, y, size: 11, font }
      );
      y -= 20;

      page.drawText(`Name of Child(ren): ${childNames}`, { x: marginX, y, size: 11, font });
      y -= 18;
      page.drawText(`Name of Guardian: ${guardianName}`, { x: marginX, y, size: 11, font });
      y -= 18;
      page.drawText(`Relationship: ${relationship}`, { x: marginX, y, size: 11, font });
      y -= 25;

      if (childSignature?.startsWith("data:image/png;base64,")) {
        const childSigImage = await pdf.embedPng(Buffer.from(childSignature.split(",")[1], "base64"));
        page.drawImage(childSigImage, { x: marginX, y: y - 40, width: 160, height: 50 });
        y -= 60;
      }

      page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: marginX, y, size: 11, font });
    }

    // ===== SAVE & EMAIL =====
    const pdfBytes = await pdf.save();

    await transporter.sendMail({
      from: '"Consent System" <aaronboarding@aar.co.ke>',
      to: "rmuthami@aar.co.ke",
      subject: "Signed Photography & Video Consent Form",
      text: "Attached is the signed consent form.",
      attachments: [{
        filename: "Photography_Video_Consent.pdf",
        content: Buffer.from(pdfBytes),
        contentType: "application/pdf"
      }]
    });

    return res.json({ message: "Submitted" });

  } catch (err) {
    console.error("❌ PDF generation failed:", err);
    return res.status(500).json({ message: "Failed to generate PDF" });
  }
});


// ===== QR CODE ROUTE (UNCHANGED & CORRECT) =====
app.get("/generate-qr", async (req, res) => {
  try {
    const formURL = "https://media-consent.aar-insurance.com/";
    const qrDataURL = await QRCode.toDataURL(formURL);

    res.send(`
      <div style="text-align:center; margin-top:50px;">
        <h2>Scan QR to Access Consent Form</h2>
        <img src="${qrDataURL}" />
        <p><a href="${formURL}" target="_blank">${formURL}</a></p>
      </div>
    `);
  } catch (err) {
    res.status(500).send("Failed to generate QR code");
  }
});

// Start server
const PORT = process.env.PORT || 3012;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running at http://0.0.0.0:${PORT}`);
});

