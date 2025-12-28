const path = require("path");
const fs = require("fs");
const pdf = require("pdf-parse");
const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Upload profile picture
const uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded",
            });
        }

        const fileUrl = `/uploads/profiles/${req.file.filename}`;

        res.status(200).json({
            message: "Profile picture uploaded successfully",
            fileUrl: fileUrl,
            filename: req.file.filename,
        });
    } catch (error) {
        console.error("Upload profile picture error:", error);
        res.status(500).json({
            message: "Server error",
            error: error.message,
        });
    }
};

// Upload portfolio images
const uploadPortfolioImages = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                message: "No files uploaded",
            });
        }

        const fileUrls = req.files.map(
            (file) => `/uploads/portfolio/${file.filename}`
        );

        res.status(200).json({
            message: "Portfolio images uploaded successfully",
            fileUrls: fileUrls,
            count: fileUrls.length,
        });
    } catch (error) {
        console.error("Upload portfolio images error:", error);
        res.status(500).json({
            message: "Server error",
            error: error.message,
        });
    }
};

// Upload attachments
const uploadAttachments = async (req, res) => {
  try {
    // Handle both single file and multiple files
    const files = req.files || (req.file ? [req.file] : []);

    if (files.length === 0) {
      return res.status(400).json({
        message: 'No files uploaded'
      });
    }

    const attachments = files.map((file) => ({
      url: `/uploads/attachments/${file.filename}`,
      path: `/uploads/attachments/${file.filename}`,
      fileName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    }));

    // If single file, return single object, otherwise return array
    const response = files.length === 1 ? attachments[0] : attachments;

    res.status(200).json({
      message: "Attachments uploaded successfully",
      ...response,
      count: attachments.length,
    });
  } catch (error) {
    console.error("Upload attachments error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete file
const deleteFile = async (req, res) => {
  try {
                const fs = require("fs");
                const { filePath } = req.body;

                if (!filePath) {
                    return res.status(400).json({
                        message: "File path is required",
                    });
                }

                // Remove leading slash and 'public' from path
                const fullPath = path.join(
                    __dirname,
                    "..",
                    filePath.replace("/public/", "Public/")
                );

                // Check if file exists
                if (!fs.existsSync(fullPath)) {
                    return res.status(404).json({
                        message: "File not found",
                    });
                }

                // Delete file
                fs.unlinkSync(fullPath);

                res.status(200).json({
                    message: "File deleted successfully",
                });
            } catch (error) {
                console.error("Delete file error:", error);
                res.status(500).json({
                    message: "Server error",
                    error: error.message,
                });
            }
        };

        // Parse CV and extract data
        const parseCV = async (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({
                        message: "No CV file uploaded",
                    });
                }

                // Read the uploaded PDF file
                const filePath = req.file.path;
                const dataBuffer = fs.readFileSync(filePath);
                const pdfData = await pdf(dataBuffer);
                const cvText = pdfData.text;

                // Use OpenAI to extract structured data
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
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
                    response_format: { type: "json_object" },
                });

                const extractedData = JSON.parse(completion.choices[0].message.content);

                // Delete the uploaded file after processing (optional)
                fs.unlinkSync(filePath);

                res.status(200).json({
                    message: "CV parsed successfully",
                    data: extractedData,
                });
            } catch (error) {
                console.error("Parse CV error:", error);

                // Clean up file if it exists
                if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }

                res.status(500).json({
                    message: "Error processing CV",
                    error: error.message,
                });
            }
        };

        module.exports = {
            uploadProfilePicture,
            uploadPortfolioImages,
            uploadAttachments,
            deleteFile,
            parseCV
        }
