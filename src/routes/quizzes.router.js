import express from "express";
import Joi from "joi";
import { prisma } from '../utils/index.js';
import memberMiddleware from '../middlewares/member.middleware.js';
import upload from '../../assets/AWS.S3.js';
// import { createAccessToken, createRefreshToken } from "../routes/members.router.js";

const router = express.Router();

// 유효성 검사 (Joi 스키마 정의)
const schema = Joi.object({
    title: Joi.string().required(),
    content: Joi.string().required(),
    imageURL: Joi.string().required()
})


// 퀴즈 등록 api
router.post('/quizzes', memberMiddleware, upload.single("imageURL"), async (req, res, next) => {
    try {
        const { title, content, imageURL } = req.body;

        // 유효성 검사 실행
        await schema.validateAsync({ title, content, imageURL });

        // body로부터 아래의 값을 올바르게 전달받지 못한다면 400에러를 호출합니다.
        if (!title || !content) {
            return next(new Error("400"));
        }

        // 퀴즈를 등록하는 기능
        await prisma.quizzes.create({
            data: { title, content, imageURL: req.file.location }
        })
        return res.status(201).json({ Message: "퀴즈를 등록하였습니다." });
    } catch (error) {
        console.error(error);
        return next(new Error("500")); };
});

// 퀴즈 수정 api
router.patch('/quizzes/:quizId', memberMiddleware, async (req, res, next) => {
    try {
        // URL에서 quizId를 추출
        const { quizId } = req.params;

        // 본문 body로부터 아래의 값을 전달받습니다.
        const { title, content, imageURL } = req.body;

        // 유효성 검사 실행
        await schema.validateAsync({ title, content, imageURL });

        // body로부터 아래의 값을 올바르게 전달받지 못한다면 400에러를 호출합니다.
        if (!title || !content || !imageURL) {
            return next(new Error("400"));
        }

        // quizzes 모델에서 아래의 내용을 업데이트 합니다.
        await prisma.quizzes.update({
            // quizId 를 기준으로 수정할 퀴즈를 찾습니다.
            // 이때 params로 받은 quizId는 문자열이므로 정수로 변환.
            where: { quizId: parseInt(quizId, 10) },
            data: { title, content, imageURL }
        });

        return res.status(200).json({ Message: "퀴즈를 수정하였습니다." });
    } catch (error) { return next(new Error("500")); };
});

// 퀴즈 삭제 api
router.delete('/quizzes/:quizId', memberMiddleware, async (req, res, next) => {
    try {
        // URL에서 quizId를 추출
        const { quizId } = req.params;

        // 소프트삭제를 위해 daletedAt 필드 설정
        const deletedQuiz = await prisma.quizzes.update({
            where: { quizId: parseInt(quizId, 10) },
            data: { deletedAt: true }
        });

        // 삭제할 퀴즈가 없다면
        if (!deletedQuiz) {
            return res.status(404).json({ message: "존재하지 않는 게시물입니다." });
        }

        return res.status(200).json({ data: "퀴즈를 삭제하였습니다." });
    } catch (error) { return next(new Error("500")); };
});

// 해당 퀴즈 상세보기 api
router.get('/quizzes/:quizId', memberMiddleware, async (req, res, next) => {
    try {
        // URL에서 quizId를 추출
        const { quizId } = req.params;

        const quiz = await prisma.quizzes.findUnique({
            where: {
                quizId: +quizId,
                deletedAt: null, // 소프트 삭제된 퀴즈를 제외하고
            },
            select: {
                title: true,
                content: true,
                imageURL: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        // 상세보기할 퀴즈 게시물이 존재하지 않을 경우
        if (!quiz) {
            return res.status(404).json({ error: "존재하지 않는 게시물입니다." });
        }

        return res.status(200).json({ data: quiz });

    } catch (error) { return next(new Error("500")); };
});

// 퀴즈 게시물 목록 조회 API
router.get('/quizzes', memberMiddleware, async (req, res, next) => {
    try {
        // quizId를 사용하지 않으므로 관련 내용을 삭제합니다.
        // prisma -> quizzes 모델에서 등록된 퀴즈를 찾습니다.
        const quiz = await prisma.quizzes.findMany({
            orderBy: {
                order: "asc", // 순서에 따라 오름차순으로 정렬합니다.
            },
            select: {
                title: true,
                content: true,
                imageURL: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        // 배열 quizzes 의 길이가 0인지 확인합니다.
        // 퀴즈 목록이 비어있다면 (조회된 퀴즈가 하나도 없다면) 아래와 같은 메시지를 반환
        if (quiz.length === 0) {
            return next(new Error("404"));
        }

        return res.status(200).json({ data: quiz });
    } catch (error) { return next(new Error("500")); };
});

export default router;


// 작성, 수정, 삭제, 상세보기, 목록,

// Joi를 쓴다면?
//     title       String
//     content     String
//     imageURL    String      

