import express from "express";
import ingestRouter from "./routes/ingest.route";

const PORT = Bun.env.PORT || 5000;
const app = express();

//middlewares
app.use(express.json())
app.use(express.urlencoded({ extended:true }))

//health route
app.get("/", async(req, res) => {
  res.status(200).json({
    "ok":true,
    "message":"server is healthy"
  })
})

//ingest route
app.use(ingestRouter)

//server starting point 
app.listen(PORT, () => {
  console.log(`server is running on http://localhost:${PORT}`)
})