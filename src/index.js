require("dotenv").config();
const express = require("express");
const cors = require("cors");

const userRoutes = require("./routes/userRoutes");
const episodeRoutes = require("./routes/episodeRoutes");
const adminRoutes = require("./routes/adminRoutes");
const orderRoutes = require("./routes/orderRoutes");
const clickWebhookRoutes = require("./routes/clickWebhookRoutes");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("CORS: ruxsat etilmagan origin -> " + origin));
    },
  })
);

// Click sends application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/users", userRoutes);
app.use("/api/episodes", episodeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments/click", clickWebhookRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server xatosi." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`SeoulFlix backend ${PORT}-portda ishga tushdi`));
