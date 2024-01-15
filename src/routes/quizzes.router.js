import express from "express";
import { prisma } from '../utils/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();


// 퀴즈 등록 api
router.post('/quizzes', authMiddleware, async (req, res, next) => {
    try {
        await schema.validateAsync(req.body);
        // 퀴즈를 등록하기 위해 title~content를 body로부터 받고, schema에 따라 유효성 검사

        // body로부터 아래의 값을 올바르게 전달받지 못한다면 400에러를 호출합니다.
        if (!title || !content || !imageURL) {
            return next(new Error("400"));
        }

        await prisma.quizzes.create({
            data: { title, content, imageURL }
        })

        return res.status(201).json({ Message: "게시물을 등록하였습니다." }); 
    } catch (error) { return next(new Error("400")); };
});

// 퀴즈 수정 api
router.patch('/quizzes/:quizId', authMiddleware, async (req, res, next) => {
    try {
        await schema.validateAsync(req.body);
        // 퀴즈를 등록하기 위해 title~content를 body로부터 받고, schema에 따라 유효성 검사

        // body로부터 아래의 값을 올바르게 전달받지 못한다면 400에러를 호출합니다.
        if (!title || !content || !imageURL) {
            return next(new Error("400"));
        }

        await prisma.quizzes.create({
            data: { title, content, imageURL }
        })

        return res.status(201).json({ Message: "게시물을 등록하였습니다." }); 
    } catch (error) { return next(new Error("400")); };
});



export default router;


// 작성, 수정, 삭제, 상세보기, 목록,

// Joi를 쓴다면?
//     title       String
//     content     String
//     imageURL    String      

