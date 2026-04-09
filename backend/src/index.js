require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/payment", require("./routes/payment"));
app.use("/api/proof", require("./routes/proof"));
app.use("/api/release", require("./routes/release"));

// Health check
app.get("/", (_, res) => res.json({ status: "ZK B2B Payments API running" }));

app.listen(process.env.PORT || 3001, () => {
  console.log(`Backend running on port ${process.env.PORT || 3001}`);
});