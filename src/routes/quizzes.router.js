import express from "express";
import upload from '../../assets/AWS.S3.js'
import memberMiddleware from "../middlewares/member.middleware.js";
import { prisma } from "../utils/index.js";

const router = express.Router();

// 퀴즈 등록 api
router.post('/quizzes', upload.single('image'), memberMiddleware, async (req, res, next) => {
    try {
        const { title, content } = req.body;
        const member = req.member;
        req.body.image = req.file.location;
        const quiz = await prisma.Quizzes.create({
            data: {
                UserId: member.userId,
                title,
                content,
                imageURL: req.file.location,
            }
        });
        return res.status(200).json({ message: " done.", data: quiz });
    } catch (error) {
        return res.status(400).json({ message: "다시." });
    }
});

// 퀴즈 등록 api
// router.post('/quizzes', memberMiddleware, upload.single("image"), async (req, res, next) => {
//     try {
//         const { title, content } = req.body;
//         req.body.image = req.file.location
//         const member =
//         // 유효성 검사 실행
//         await schema.validateAsync({ title, content });
//         // body로부터 아래의 값을 올바르게 전달받지 못한다면 400에러를 호출합니다.
//         if (!title || !content) {
//             return next(new Error("400"));
//         }
//         // 퀴즈를 등록하는 기능
//         await prisma.quizzes.create({
//             data: { title, content, imageURL: req.file.location }
//         })
//         return res.status(201).json({ Message: "퀴즈를 등록하였습니다." });
//     } catch (error) {
//         console.error(error);
//         return next(new Error("500")); };
// });

export default router;


// 작성, 수정, 삭제, 상세보기, 목록,

// Joi를 쓴다면?
//     title       String
//     content     String
//     imageURL    String      

