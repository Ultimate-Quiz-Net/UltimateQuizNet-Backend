import express from "express";
import QuizzersRouter from "./src/routes/quizzes.router.js";
import membersRouter from "./src/routes/members.router.js";
import DebatesRouter from "./src/routes/debates.router.js";
import errorHandlingMiddleware from "./src/middlewares/error.handling.middleware.js";
import cookieParser from "cookie-parser";
import expressSession from "express-session";

const app = express();
const port = 3000;

app.use(express.json());
app.use(cookieParser());
app.use(
  expressSession({
    secret: process.env.MY_SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      secure: true // https 일때 도 값이 잘 들어갈 수 있도록 배포시에 주석풀기.
    },
  })
);
app.use(express.urlencoded({ extended: true }));

const router = express.Router();

router.get("/", (req, res) => {
  return res.json({ message: "hello world" });
});

app.use("/api", [QuizzersRouter, membersRouter, DebatesRouter]);
app.use(errorHandlingMiddleware);

app.listen(port, () => {
  console.log(port, "서버가 열렸습니다.");
});
