//imports
const dotenv = require("dotenv");
//dotenv config - must be at top before any other imports
dotenv.config();

const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const swaggerUi = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const { initializeSocket } = require("./services/socketService");
const { initializeTransporter } = require("./services/emailService");
const { apiLimiter } = require("./middleware/rateLimiter");
const { startDeadlineMonitoring } = require("./check-contract-deadlines");

const userRoute = require('./Routes/userRout');
const authRoute = require('./Routes/authRoute');
const specialtyRoute = require('./Routes/specialtyRoute');
const jobRoute = require('./Routes/jobRoute');
const skillRoute = require('./Routes/skillRoute');
const notificationRoutes = require('./Routes/notificationRoute');
const proposalRoute = require('./Routes/proposalRoute');
const reviewRoute = require("./Routes/ReviewRoute");
const contractRoute = require("./Routes/contractRoute");
const categoryRoute = require("./Routes/categoryRoute");
const countryRoute = require("./Routes/countryRoute");
const adminRoutes = require('./Routes/adminRoute');
const favoriteRoute = require('./Routes/favoriteRoute');
const portfolioRoute = require('./Routes/portfolioRoute');
const uploadRoute = require('./Routes/uploadRoute');
const chatRoute = require('./Routes/chatRoute');
const paymentRoute = require('./Routes/paymentRoute');
const statisticsRoute = require('./Routes/statisticsRoute');
const fundsRoute = require('./Routes/fundsRoute');
const messageRoute = require('./Routes/messageRoute');
const convRoute = require('./Routes/conversationRoute');

//middleware /must be added at the top
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5000', 'http://localhost:5173', 'http://localhost:3001', 'http://localhost:4200'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow images to be loaded
  contentSecurityPolicy: false, // Disable CSP for now (configure properly in production)
}));
// app.use(mongoSanitize()); // Prevent NoSQL injection - DISABLED: causing errors with query params
app.use(apiLimiter); // Rate limiting

//public folder for images
app.use("/public", express.static("public"));
app.use("/uploads", express.static("public/uploads")); // Serve uploaded files

const swagger = swaggerJsDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Freelancing API",
      version: "1.0.0",
      description: "API documentation for the Freelancing platform",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token in the format :Bearer <token>",
        },
      },
      responses: {
        BadRequest: {
          description: "Bad request",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        Unauthorized: {
          description: "Unauthorized",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        NotFound: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        ServerError: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./app.js", "./Routes/*.js"],
});

app.use("/Freelancing/api-docs", swaggerUi.serve, swaggerUi.setup(swagger));

//routes
app.use('/Freelancing/api/v1/auth', authRoute);
app.use('/Freelancing/api/v1/users', userRoute);
app.use('/Freelancing/api/v1/specialties', specialtyRoute);
app.use('/Freelancing/api/v1/jobs', jobRoute);
app.use('/Freelancing/api/v1/skills', skillRoute);
app.use('/Freelancing/api/v1/notifications', notificationRoutes);
app.use('/Freelancing/api/v1/proposals', proposalRoute);
app.use("/Freelancing/api/v1/reviews", reviewRoute);
app.use("/Freelancing/api/v1/contracts", contractRoute);
app.use("/Freelancing/api/v1/categories", categoryRoute);
app.use("/Freelancing/api/v1/countries", countryRoute);
app.use('/Freelancing/api/v1/admin', adminRoutes);
app.use('/Freelancing/api/v1/favorites', favoriteRoute);
app.use('/Freelancing/api/v1/portfolio', portfolioRoute);
app.use('/Freelancing/api/v1/upload', uploadRoute);
app.use('/Freelancing/api/v1/chat', chatRoute);
app.use('/Freelancing/api/v1/payments', paymentRoute);
app.use('/Freelancing/api/v1/statistics', statisticsRoute);
app.use('/Freelancing/api/v1/funds', fundsRoute);
app.use('/Freelancing/api/v1/messages', messageRoute);
app.use('/Freelancing/api/v1/getconversations', convRoute);
app.use('/Freelancing/api/v1/cleanup', require('./Routes/cleanupRoute'));

//mongoose connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    // Initialize email service
    initializeTransporter();

    // 🔥 Start automated deadline monitoring
    startDeadlineMonitoring().catch(err => {
      console.error("⚠️ Failed to start deadline monitoring:", err.message);
    });
  })
  .catch((err) => console.log(err));

// Initialize Socket.io
initializeSocket(server);

server.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});
