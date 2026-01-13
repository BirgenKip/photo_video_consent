const express = require("express");
const path = require("path");
const fs = require("fs");
const { PDFDocument, StandardFonts } = require("pdf-lib");

console.log("🚀 Starting server...");

const app = express();

// Middleware
console.log("📦 Setting up middleware...");
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "../public")));
const QRCode = require("qrcode");
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

  try {
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
      childSignature = null   // <-- added
    } = req.body;

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
      page.drawImage(logoImage, { x: marginX, y: 800, width: 120, height: 50 });
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
          ensureSpace(lineHeight);
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
    ensureSpace(20);
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
3. Your image or appearance in photography and video footage may be used in our printed publications for promotional purposes, in press releases, on our social media channels, in presentation materials and on our website. It may also appear in our advertising in the media or may be used by AAR Insurance – Kenya Ltd (AIK) contracted third parties for event-related promotion and marketing.
4. It is likely that your image or appearance in photography video footage will be published on our online platforms and as such will be subject to international data transfer. This means that it can be viewed and accessed from anywhere in the world and potentially from a country that does not have adequate data protection laws in place.
5. The photographs and/or videos will remain the property of AAR Insurance – Kenya Ltd (AIK) and will only be used for promotional and marketing purposes.
6. Your other personal data will remain strictly confidential.
`.trim());

    y -= 20;

    // ===== CONSENT =====
    page.drawText("Individual Consent", { x: marginX, y, size: 13, font: bold });
    y -= 18;

    drawParagraph(`
I hereby provide my consent for the photos and/or video footage to be used in the Group’s promotional and marketing communications and publications relating to the event including on the AAR Insurance – Kenya Ltd (AIK) website, social media, press releases, print and advertising media.
`.trim());

    y -= 10;
    page.drawText(`[${forSelf ? "X" : " "}] For self`, { x: marginX, y, size: 11, font });
    y -= 15;
    page.drawText(`[${forChild ? "X" : " "}] For the child(ren) under my care`, { x: marginX, y, size: 11, font });
    y -= 25;

    // ===== DECLARATION =====
    drawParagraph(`I understand that:
1. I have the right to withdraw this consent at any time by sending an email to communications@aar.co.ke. If this consent is withdrawn, AAR Insurance – Kenya Ltd will not use your photo and/or video footage in any new publications or materials.
2. If the photos and/or video has already been published on print or social media prior to the withdrawal of this consent, they may be retained on existing publications and materials where it is not possible for AAR Insurance – Kenya Ltd (AIK) to withdraw/recall such publications and materials.
3. I will not receive any compensation, royalties or any other form of payment for the use of the photos and/or video footage.
4. The photos and/or video footage will be held by the AAR Insurance – Kenya Ltd (AIK) in accordance with the Data Protection Act, 2019.
`);

    y -= 20;

    // ===== SIGNATURE =====
    page.drawText(`Full Name: ${fullName}`, { x: marginX, y, size: 11, font });
    y -= 25;

    if (signature?.startsWith("data:image/png;base64,")) {
      const sigImage = await pdf.embedPng(Buffer.from(signature.split(",")[1], "base64"));
      ensureSpace(60);
      page.drawImage(sigImage, { x: marginX, y: y - 40, width: 160, height: 50 });
      y -= 60;
    }

    page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: marginX, y, size: 11, font });
    y -= 25;

    // ===== UNDER 18 CONSENT =====
    if (forChild) {
      ensureSpace(120);

      page.drawText("IF SUBJECT IS UNDER 18 YEARS OF AGE:", { x: marginX, y, size: 13, font: bold });
      y -= 18;

      page.drawText(
        "I confirm that I am the legal guardian of the child(ren) named below",
        { x: marginX, y, size: 11, font }
        );
        y -= 14; // move down for next line

        // Second line
        page.drawText(
        "and therefore authorized to provide consent on behalf of the child(ren).",
        { x: marginX, y, size: 11, font }
        );
y -= 18; // move down for next content
      y -= 25;

      page.drawText(`Name of Child(ren): ${childNames}`, { x: marginX, y, size: 11, font });
      y -= 18;

      page.drawText(`Name of Guardian: ${guardianName}`, { x: marginX, y, size: 11, font });
      y -= 18;

      page.drawText(`Relationship to Child(ren): ${relationship}`, { x: marginX, y, size: 11, font });
      y -= 18;

      // ===== CHILD SIGNATURE =====
      if (childSignature?.startsWith("data:image/png;base64,")) {
        const childSigImage = await pdf.embedPng(Buffer.from(childSignature.split(",")[1], "base64"));
        ensureSpace(60);
        page.drawImage(childSigImage, { x: marginX, y: y - 40, width: 160, height: 50 });
        y -= 60;
      }

      page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: marginX, y, size: 11, font });
      y -= 25;
    }


    // ===== SAVE & SEND =====
    const pdfBytes = await pdf.save();

    await transporter.sendMail({
      from: '"Consent System" <aaronboarding@aar.co.ke>',
      to: "godfreykipbirgen@gmail.com",
      subject: "Signed Photography & Video Consent Form",
      text: "Attached is the signed consent form.",
      attachments: [{
        filename: "Photography_Video_Consent.pdf",
        content: Buffer.from(pdfBytes),
        contentType: "application/pdf"
      }]
    });

    res.json({ message: "Submitted" });
    

  } catch (err) {
    console.error("❌ PDF generation failed:", err);
    res.status(500).send("Failed to generate PDF");
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

