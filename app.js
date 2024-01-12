import express from "express";
import QuizzersRouter from "./src/routes/quizzes.router.js";
import MembersRouter from "./src/routes/members.router.js";
import DebatesRouter from "./src/routes/debates.router.js";
import CommentsRouter from "./src/routes/comments.router.js";
import errorHandlingMiddleware from "./src/middlewares/error.handling.middleware.js";


const app = express();
const port = 3000;

app.use(express.json());
const router = express.Router();
router.get("/", (req, res) => {
    return res.json({ message: "hello world" });
  });
app.use('/api', [QuizzersRouter, MembersRouter, DebatesRouter, CommentsRouter]);
// app.use(errorHandlingMiddleware);

app.listen(port, () => {
    console.log(port, "서버가 열렸습니다.")
})