import express from "express";
import Joi from "joi";
import { prisma } from "../utils/index.js";
import memberMiddleware from "../middlewares/member.middleware.js";

const router = express.Router();

// 토론 규격 설정.
// 제목: 3자 이상, 30자 이하.
// 내용: 10자 이상, 100자 이하.
const checkDebates = Joi.object({
  title: Joi.string().min(3).max(30).required(),
  content: Joi.string().min(10).max(100).required(),
});

// 댓글 규격 설정.
// 내용: 5자 이상, 50자 이하.
const checkComments = Joi.object({
  content: Joi.string().min(5).max(50).required(),
});

// 토론 생성 API ok
router.post(
  "/quizzess/:id/debates",
  memberMiddleware,
  async (req, res, next) => {
    try {
      const { title, content } = req.body;
      const member = req.member;
      const { id } = req.params;
      const debate = await prisma.debates.create({
        data: {
          UserId: member.userId,
          QuizId: +id,
          title,
          content,
        },
      });
      return res.status(200).json({ message: " done.", data: debate });
    } catch (error) {
      return res.status(400).json({ message: "다시." });
    }
  }
);

// 토론 조회 API //ok
router.get("/debates", memberMiddleware, async (req, res, next) => {
  try {
    // DB에서 토론글을 끄집어냄
    // 끄집어내는 데이터: 고유 ID 값, 제목, 생성날짜
    const data = await prisma.debates.findMany({
      select: {
        debateId: true,
        title: true,
        content: true,
        createdAt: true,
      },
      where: {
        deletedAt: null, // deletedAt 이 null 인것만 다 출력하게끔함
        // deletedAt is not null  하면 됨
      },
      // 내림차순으로 정렬되어서 나옴
      orderBy: { createdAt: "desc" },
    });
    //토론 글이 없을 시, 없다는 오류 메시지
    if (!data) {
      throw new Error("noDebates");
    }

    // 성공 시, 토론 목록을 클라이언트에게 전달
    return res.status(200).json({ data: data });
  } catch (error) {
    next(error);
  }
});

// 토론 상세 조회 & 포함된 댓글도 함께 조회 ok
router.get("/debates/:debateId", memberMiddleware, async (req, res, next) => {
  try {
    const { debateId } = req.params;
    const member = req.member;
    // DB에서 debateId에 근거하여 하나의 토론글만 끄집어냄
    // 끄집어내는 데이터: 고유 ID 값, 제목, 내용,생성날짜
    const data = await prisma.debates.findMany({
      where: { debateId: +debateId, deletedAt: null },
      select: {
        debateId: true,
        title: true,
        content: true,
        createdAt: true,
        Comments: {
          select: {
            UserId: true,
            content: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    const debate = data.map;
    //선택한 토론 글이 없을 시, 없다는 오류 메시지
    if (!data) {
      throw new Error("noDebates");
    }
    // 성공 시, 하나의 토론을 클라이언트에게 전달
    return res.status(200).json({ data: data });
  } catch (error) {
    next(error);
  }
});

// 토론글 편집 ok
router.patch("/debates/:debateId", memberMiddleware, async (req, res, next) => {
  try {
    // json으로 입력되는 데이터
    // title(제목)과 content(내용)이 있음.
    const { title, content } = req.body;
    const { debateId } = req.params;
    const member = req.member;
    // 제목과 내용이 없을 시 다음 오류를 반환.
    // if (!title || !content) {
    //   throw new Error("unQualified");
    // }
    // Joi 유효성 검사
    // await checkDebates.validateAsync(req.body);

    // 데이터를 DB에 입력
    await prisma.debates.update({
      where: { debateId: +debateId },
      data: {
        UserId: member.userId,
        title,
        content,
      },
    });

    // 입력 성공 시, 완료 메시지 전달.
    return res.status(200).json({ message: "게시글을 수정하였습니다." });
  } catch (error) {
    next(error);
  }
});

// 토론 글 삭제 API ok
router.delete(
  "/debates/:debateId",
  memberMiddleware,
  async (req, res, next) => {
    try {
      // 삭제할 Id를 params에서 가져옴.
      const { debateId } = req.params;
      // 제목과 내용이 없을 시 다음 오류를 반환.

      // 해당 데이터를 DB에 soft delete로 입력
      await prisma.debates.update({
        where: { debateId: +debateId },
        data: { deletedAt: new Date() }, // UTC 시간으로 저장됨  9시간 차이 -> 국제 시간 표준 -> 프론트에서 시간을 조정해야함.
        // data: { deleted: true },
      });
      // 입력 성공 시, 완료 메시지 전달.
      return res.status(202).json({ message: "게시글을 삭제하였습니다." });
    } catch (error) {
      next(error);
    }
  }
);

// 상세 조회된 토론글에 댓글 생성 API
router.post(
  "/debates/:debateId/comments",
  memberMiddleware,
  async (req, res, next) => {
    try {
      const { debateId } = req.params;
      const member = req.member;
      // json으로 입력되는 데이터
      // 댓글 내용(contents)이 있음.
      const { content } = req.body;
      // 댓글이 없을 시, 오류 메시지 전달
      // if (!content) {
      //   throw new Error("unQualified");
      // }

      // Joi 유효성 검사
      // await checkComments.validateAsync(req.body);

      // 댓글이 달리는 토론글을 가져옴.
      const debate = await prisma.debates.findFirst({
        where: { debateId: +debateId },
      });

      // 검사가 끝난 후 댓글을 DB에 등록
      const comment = await prisma.comments.create({
        data: {
          UserId: member.userId,
          DebateId: +debate.debateId,
          content,
        },
      });

      // 성공 시, 댓글을 등록했음을 클라이언트에게 전달
      return res
        .status(202)
        .json({ message: "댓글을 등록하였습니다.", data: comment });
    } catch (error) {
      next(error);
    }
  }
);

// 상세 조회된 토론글에 댓글 편집 API
router.post(
  "/debates/:debateId/comments/:commentId",
  memberMiddleware,
  async (req, res, next) => {
    try {
      const { debateId } = req.params;
      // json으로 입력되는 데이터
      // 댓글 내용(contents)이 있음.
      const { content } = req.body;

      // Joi 유효성 검사
      await checkComments.validateAsync(req.body);

      // 댓글이 달리는 토론글을 가져옴.
      const debate = await prisma.debates.findFirst({
        where: { debateId: +debateId },
      });

      // 검사가 끝난 후 댓글을 DB에 수정함
      await prisma.comments.update({
        data: {
          content,
        },
      });

      // 성공 시, 댓글을 수정하였음을 클라이언트에게 전달
      return res.status(200).json({ message: "댓글을 수정하였습니다." });
    } catch (error) {
      next(error);
    }
  }
);

// 댓글 삭제 API
router.delete(
  "/debates/:debateId/comments/:commentId",
  memberMiddleware,
  async (req, res, next) => {
    try {
      // 삭제할 Id를 params에서 가져옴.
      const { commentId } = req.params;
      // 제목과 내용이 없을 시 다음 오류를 반환.

      // 해당 데이터를 DB에 soft delete로 입력
      await prisma.comments.update({
        where: { commentId: +commentId },
        data: { deletedAt: new Date() }, // UTC 시간으로 저장됨  9시간 차이 -> 국제 시간 표준 -> 프론트에서 시간을 조정해야함.
      });

      // 입력 성공 시, 완료 메시지 전달.
      return res.status(202).json({ message: "댓글을 삭제하였습니다." });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
