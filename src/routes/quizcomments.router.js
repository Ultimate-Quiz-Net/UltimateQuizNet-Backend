import express from "express";
// import upload from '../../assets/AWS.S3.js'
import memberMiddleware from "../middlewares/member.middleware.js";
import { prisma } from "../utils/index.js";
import Joi from "joi";

const router = express.Router();

// 유효성 검사 추가함.
const checkComments = Joi.object({
    content: Joi.string().min(1) // 댓글을 달려면 최소 1글자 이상 입력해야 합니다.
})

// 퀴즈 게시물의 댓글 등록 api
router.post('/quizzes/:quizId/quizComments', memberMiddleware, async (req, res, next) => {
    try {
        // 로그인 된 사용자ID
        const userId = req.member.userId;

        // 퀴즈id, 댓글 내용을 요청에서 받아옵니다.
        const { quizId } = req.params;
        // const { content } = req.body;

        // 유효성 검사
        const { content } = await checkComments.validateAsync(req.body)

        // 그 퀴즈 게시물이 존재하는가?
        const existingQuiz = await prisma.quizzes.findUnique({ where: { quizId: +quizId } });
        if (!existingQuiz) { return res.status(404).json({ message: "퀴즈를 찾을 수 없습니다." }) };

        // 퀴즈에 댓글을 등록
        const newComment = await prisma.quizComments.create({ data: { QuizId: +quizId, UserId: userId, content } });

        return res.status(201).json({ message: "댓글이 등록되었습니다.", data: newComment });

    } catch (error) { next(error) }
});

// 퀴즈 게시물의 댓글 수정 api
router.patch('/quizzes/:quizId/quizComments/:commentId', memberMiddleware, async (req, res, next) => {
    try {
        // 로그인 된 사용자ID
        const userId = req.member.userId;

        // 퀴즈id, 댓글id를 요청에서 받아옵니다. (수정할 내용을 요청함)
        const { quizId, commentId } = req.params;
        // const { content } = req.body;

        // 유효성 검사
        const { content } = await checkComments.validateAsync(req.body)

        // 해당 퀴즈 게시물이 존재하는지 확인
        const existingQuiz = await prisma.quizzes.findUnique({ where: { quizId: +quizId } });
        if (!existingQuiz) {
            return res.status(404).json({ message: "퀴즈를 찾을 수 없습니다." });
        }

        // 해당 댓글이 존재하는지 확인
        const existingComment = await prisma.quizComments.findUnique({
            where: { quizCommentId: +commentId }
        });
        if(!existingComment) {
            return res.status(404).json({ message: " 댓글이 존재 하지 않습니다. " })
        }
        

        // 댓글이 없거나, 로그인한 사용자가 댓글 작성자가 아니면 에러 반환
        if (!existingComment || existingComment.UserId !== userId) {
            return res.status(403).json({ message: "댓글을 수정할 권한이 없습니다." });
        }

        // 댓글 수정
        const updatedComment = await prisma.quizComments.update({
            where: { quizCommentId: +commentId },
            data: { content }
        });

        return res.status(200).json({ message: "댓글이 수정되었습니다.", data: updatedComment });
    } catch (error) { next(error); }
});

// 퀴즈 게시물의 댓글 삭제 api
router.delete('/quizzes/:quizId/quizComments/:commentId', memberMiddleware, async (req, res, next) => {
    try {
        const userId = req.member.userId; // 로그인 된 사용자 ID
        const { quizId, commentId } = req.params; // 퀴즈 ID와 댓글 ID를 요청에서 받아옵니다.

        // 댓글이 존재하는지 확인
        const existingComment = await prisma.quizComments.findUnique({
            where: { quizCommentId: +commentId },
        });

        // 댓글이 없거나, 로그인한 사용자가 댓글 작성자가 아니면 에러 반환
        if (!existingComment || existingComment.UserId !== userId) {
            return res.status(403).json({ message: "댓글을 삭제할 권한이 없습니다." });
        }

        // 댓글 소프트 삭제
        const deletedComment = await prisma.quizComments.update({
            where: { quizCommentId: +commentId },
            data: { deletedAt: new Date() },
        });

        return res.status(200).json({ message: "댓글이 삭제되었습니다.", data: deletedComment });

    } catch (error) {
        next(error);
    }
});

//  퀴즈 게시물의 댓글 목록 api
router.get('/quizzes/:quizId/quizComments', memberMiddleware, async (req, res, next) => {
    try {
        const { quizId } = req.params;
        const comments = await prisma.quizComments.findMany({
            where: {
                QuizId: +quizId,
                deletedAt: null, //삭제된 댓글은 불러오지 않음
            }
            // 댓글목록 불러올 때 댓글 작성자의 정보를 불러옵니다. 이 부분은 이용자 입장에서 쓸모없으므로 주석처리
            // include: {
            //     User: true, 
            // }
        });

        return res.status(200).json({ comments });
    } catch (error) { next(error) }
});

export default router;