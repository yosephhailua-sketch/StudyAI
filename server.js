require("dotenv").config();

const express = require("express");
const OpenAI = require("openai");

const { PDFParse } = require("pdf-parse");
const app = express();
const multer = require("multer");
const { rateLimit } = require("express-rate-limit");
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.use(express.json());
app.use(express.static(__dirname));
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

app.set("trust proxy", 1);

const askLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        error: "För många frågor. Vänta en stund och försök igen."
    }
});
app.post("/ask", askLimiter, upload.single("pdfFile"), async (req, res) => {
    try {
        const question = req.body.question;
let pdfText = "";

if (req.file) {
    const parser = new PDFParse({
        data: req.file.buffer
    });

    const pdfData = await parser.getText();
    pdfText = pdfData.text;

    await parser.destroy();
    }
        const response = await client.responses.create({
            model: "gpt-5-mini",
input: `Svara pedagogiskt på samma språk som användarens fråga.
Använd tydliga rubriker och punktlistor.
När du skriver matematiska eller kemiska formler ska du alltid använda KaTeX-kompatibel LaTeX.
Skriv fristående formler mellan \\[ och \\].
Skriv formler inne i meningar mellan \\( och \\).
Skriv aldrig LaTeX-formler utan dessa avgränsare.

${pdfText ? `Innehåll från användarens PDF:\n${pdfText}` : ""}

Fråga: ${question}`


        });

        res.json({
            answer: response.output_text
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Något gick fel med StudyAI."
        });
    }
});

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`StudyAI körs på http://localhost:${PORT}`);
});
// Hantera fel vid PDF-uppladdning
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({
            error: "PDF-filen är för stor. Maxstorleken är 10 MB."
        });
    }

    console.error(error);

    res.status(500).json({
        error: "Ett fel uppstod vid uppladdningen."
    });
});