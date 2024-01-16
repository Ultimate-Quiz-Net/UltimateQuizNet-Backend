import express from "express";
import upload from '../../assets/AWS.S3.js'
import memberMiddleware from "../middlewares/member.middleware.js";
import { prisma } from "../utils/index.js";
import Joi from "joi";

const router = express.Router();

// 유효성 검사 추가함.
const checkQuizzes = Joi.object({
    title: Joi.string().min(2).max(30),
    content: Joi.string().min(5)
})

// 퀴즈 등록 api
router.post('/quizzes', upload.single('image'), memberMiddleware, async (req, res, next) => {
    try {
        const { title, content } = await checkQuizzes.validateAsync(req.body)
        if(!title || !content) throw { name: "ValidationError" } // 추가함.
        // memberMiddleware 를 통해 설정된 req.member 에서 사용자 정보를 가져오기
        const member = req.member;
        // 업로드된 이미지 파일의 위치를 요청 본문의 image 필드에 할당
        req.body.image = req.file.location;
        // prisma를 사용하여 퀴즈를 db에 저장
        const quiz = await prisma.quizzes.create({
            data: {
                UserId: member.userId,
                title,
                content,
                imageURL: req.file.location,
            }
        });
        return res.status(200).json({ message: "퀴즈를 등록하였습니다.", data: quiz });
    } catch (err) {
        next(err) // 수정
    }
});

// 퀴즈 수정 api
router.patch('/quizzes/:quizId', upload.single('image'), memberMiddleware, async (req, res, next) => {
    try {
        const { title, content } = await checkQuizzes.validateAsync(req.body) // body로부터 수정된 title과 content을 받음
        const { quizId } = req.params; // URL에서 quizId를 추출

        // 수정하기 위한 필수 데이터 체크
        if (!quizId) throw { name: "ValidationError" } // 수정

        // 게시된 퀴즈가 있는지 존재 여부를 확인
        let quiz = await prisma.quizzes.findUnique({
            where: { quizId: +quizId },
        });
        if (!quiz) throw { name: "NoneData" } // 수정

        // 퀴즈 수정을 위한 데이터 준비
        const updateQuiz = {
            title: title || quiz.title, // 새로운 제목을 입력하면 사용하고, 그렇지 않다면 이전 제목을 유지
            content: content || quiz.content, // 새로운 내용을 입력하면 사용하고, 그렇지 않다면 이전 내용을 유지
            imageURL: req.file ? req.file.location : quiz.imageURL, // 새로운 이미지로 변경하면 사용하고, 그렇지 않다면 이전 이미지를 유지
        };

        // 퀴즈를 업데이트
        quiz = await prisma.quizzes.update({
            where: { quizId: +quizId },
            data: updateQuiz,
        });

        // 클라이언트에게 응답
        return res.status(200).json({ message: "퀴즈를 수정하였습니다.", data: quiz });

    } catch (err) {
        next(err) // 수정
    }
});

// 퀴즈 삭제 api
router.delete('/quizzes/:quizId', memberMiddleware, async (req, res) => {
    try {
        const { quizId } = req.params; // params로부터 삭제할 quizId를 받습니다.

        // URL에서 추출한 quizId를 이용하여 퀴즈를 찾습니다.
        const quiz = await prisma.quizzes.findUnique({
            where: { quizId: +quizId },
        });

        // 해당 quizId에 해당하는 퀴즈가 없는 경우 404 에러를 반환합니다.
        if (!quiz) throw { name: "NoneData" } // 추가.

        // 이미 삭제된 퀴즈인 경우에는 이미 삭제되었다고 응답합니다.
        if (quiz.deletedAt !== null) {
            return res.status(200).json({ message: "퀴즈가 이미 삭제되었습니다." });
        }

        // 소프트 삭제를 위해 deletedAt 필드를 현재 시간으로 업데이트합니다.
        const softDeletedQuiz = await prisma.quizzes.update({
            where: { quizId: +quizId },
            data: { deletedAt: new Date() },
        });

        // 클라이언트에게 응답합니다.
        return res.status(200).json({ message: "퀴즈를 삭제하였습니다.", data: softDeletedQuiz });
    } catch (err) {
        next(err) // 수정
    }
});

// 퀴즈 목록 api
router.get('/quizzes', memberMiddleware, async (req, res, next) => {
    try {
        // prisma를 사용하여 등록된 퀴즈 목록을 가져오기
        // 퀴즈를 찾을건데 = prisma의 quizzes에서, 다수의 퀴즈를 찾을거야.
        const quizzes = await prisma.quizzes.findMany({
            where: { // 어디서 갖고올건데? ('어떤 조건을 가진' 퀴즈가 속한 위치를 정할거야.)
                deletedAt: null, //소프트 삭제되지 않은 퀴즈만 조회
            },
            select: { // 내가 가져올 퀴즈의 필드
                quizId: true,
                title: true,
                imageURL: true,
                content: true,
            },
        });
        // 클라이언트에게 찾은 퀴즈목록을 보여줍니다.
        return res.status(200).json({ data: quizzes });
    } catch (err) {
        next(err)
    }
});

// 목록에서 선택한 퀴즈의 상세보기 api
router.get('/quizzes/:quizId', memberMiddleware, async (req, res, next) => {
    try {
        const { quizId } = req.params; 
        const quiz = await prisma.Quizzes.findUnique({
            where: {
                quizId: +quizId, deletedAt: null // 추출한 상세보기하려는 퀴즈의 주소값을 정수화합니다.
            },
            select: {
                title: true,
                imageURL: true,
                content: true,
            }
        });
        // 해당 id의 퀴즈가 없다면?
        if (!quiz) throw { name: "NoneData" } // 수정.
        // 퀴즈를 상세보기합니다.
        return res.status(200).json(quiz);
    } catch (err) {
        next(err)
    }
});

// 상세보기 했을 때 해당 퀴즈의 삭제 api



export default router;


// 작성v, 수정v, 삭제v, 상세보기v, 목록v,

// 작성 post, 수정 patch, 삭제 deletd, 상세보기 get, 목록 get 

