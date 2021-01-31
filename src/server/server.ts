import express from "express";
import path from "path";

const app = express();
const port = 8080;

app.use(express.static(path.join(__dirname, "static")));

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
