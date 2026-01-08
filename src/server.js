const express = require("express");
const path = require("path");
const { PDFDocument, StandardFonts } = require("pdf-lib");

console.log("🚀 Starting server...");

const app = express();

// Middleware
console.log("📦 Setting up middleware...");
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "../public")));
const QRCode = require("qrcode");

// Home route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// PDF generation route
app.post("/generate-pdf", async (req, res) => {
  console.log("➡️  POST /generate-pdf");

  try {
    console.log("📥 Request body received:", Object.keys(req.body));

    const {
      eventName = "",
      venue = "",
      eventDate = "",
      fullName = "",
      forSelf = false,
      forChild = false,
      signature = null
    } = req.body;

    console.log("🧾 Form data:", {
      eventName,
      venue,
      eventDate,
      fullName,
      forSelf,
      forChild,
      hasSignature: !!signature
    });

    console.log("📄 Creating PDF...");
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);

    let y = 800;

    const draw = (text, size = 11) => {
      page.drawText(text, { x: 50, y, size, font });
      y -= size + 8;
    };

    // Header
    draw("PHOTOGRAPHY AND VIDEO CONSENT FORM", 16);
    y -= 10;

    // Event details
    draw(`Event Name: ${eventName}`);
    draw(`Venue: ${venue}`);
    draw(`Date: ${eventDate}`);
    y -= 15;

    // Consent section
    draw("Individual Consent", 13);
    draw(`Full Name: ${fullName}`);
    draw(
      `Consent For: ${
        forSelf ? "Self " : ""
      }${forChild ? "Child(ren)" : ""}`
    );
    draw(`Signed On: ${new Date().toLocaleString()}`);
    y -= 20;

    // Signature (optional but validated)
    if (signature && signature.startsWith("data:image/png;base64,")) {
      console.log("✍️ Embedding signature...");
      const base64 = signature.split(",")[1];
      const sigImage = await pdf.embedPng(
        Buffer.from(base64, "base64")
      );

      page.drawImage(sigImage, {
        x: 50,
        y: y - 40,
        width: 150,
        height: 50
      });
    } else {
      console.warn("⚠️ No valid signature provided");
      draw("Signature: __________________________");
    }

    console.log("💾 Saving PDF...");
    const pdfBytes = await pdf.save();

    console.log("📤 Sending PDF to client...");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Photography_Video_Consent.pdf"
    );

    res.send(Buffer.from(pdfBytes));

  } catch (err) {
    console.error("❌ PDF generation failed:");
    console.error(err.stack || err);
    res.status(500).send("Failed to generate PDF");
  }
});

app.get("/generate-qr", async (req, res) => {
  try {
    const formURL = "http://localhost:3000/"; // Change this to your live URL if deployed

    const qrDataURL = await QRCode.toDataURL(formURL);

    // Send the QR code as an image
    res.send(`
      <div style="text-align:center; margin-top:50px;">
        <h2>Scan QR to Access Consent Form</h2>
        <img src="${qrDataURL}" alt="QR Code" />
        <p><a href="${formURL}" target="_blank">${formURL}</a></p>
      </div>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to generate QR code");
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
