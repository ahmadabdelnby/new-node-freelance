const fs = require("fs");
const pdf = require("pdf-parse");
const OpenAI = require("openai");

require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function parseCV(filePath) {
  try {
    // 1. قراءة ملف الـ PDF واستخراج النص
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdf(dataBuffer);
    const cvText = pdfData.text;

    // 2. تجهيز الـ Prompt
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // نموذج أحدث ومتوفر
      messages: [
        {
          role: "system",
          content: `You are a helpful HR assistant. 
                    Extract the following details from the resume text: 
                    - fullName
                    - email
                    - phone
                    - skills (array of strings)
                    - summary (brief description)
                    
                    Return the result ONLY in valid JSON format.`,
        },
        {
          role: "user",
          content: cvText,
        },
      ],
      response_format: { type: "json_object" }, // ميزة مهمة عشان تضمن إن الرد يجي JSON
    });

    // 3. استلام البيانات
    const extractedData = JSON.parse(completion.choices[0].message.content);
    console.log(extractedData);
    return extractedData;
  } catch (error) {
    console.error("Error processing CV:", error);
  }
}

// تشغيل الدالة
// استخدم المسار الكامل للملف أو ضع cv.pdf في المجلد الحالي
const path = require("path");
const cvPath = path.join(__dirname, "..", "cv.pdf"); // يبحث عن cv.pdf في المجلد الرئيسي للمشروع
parseCV(cvPath);
