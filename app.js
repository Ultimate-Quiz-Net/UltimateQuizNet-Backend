import express from "express";
import QuizzersRouter from "./src/routes/quizzes.router.js";
import MembersRouter from "./src/routes/members.router.js";
import DebatesRouter from "./src/routes/debates.router.js";
import errorHandlingMiddleware from "./src/middlewares/error.handling.middleware.js";
import cookieParser from "cookie-parser";
import expressSession from "express-session";


const app = express();
const port = 3000;

app.use(express.json());
app.use(cookieParser())
app.use(
  expressSession({
    secret: "custom_key",
    resave: false, 
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    }
  })
)
app.use(express.urlencoded({ extended: true }));

const router = express.Router();

router.get("/", (req, res) => {
    return res.json({ message: "hello world" });
  });

app.use('/api', [QuizzersRouter, MembersRouter, DebatesRouter]);
app.use(errorHandlingMiddleware);

app.listen(port, () => {
    console.log(port, "서버가 열렸습니다.")
})