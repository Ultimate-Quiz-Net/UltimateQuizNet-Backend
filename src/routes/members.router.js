import express from "express";
import Joi from "joi";
import jwt from "jsonwebtoken"
import { prisma } from "../utils/index.js"

const router = express.Router();

// 아이디 유효성 검사 부분.
const memberSchema = Joi.object({
    username: Joi.string().pattern(new RegExp("^[a-zA-Z0-9]{2,15}$")).required(),
    nickname: Joi.string().min(2).max(15).required(),
    password: Joi.string().pattern(new RegExp("^[a-zA-Z0-9]{5,20}$")).required(),
})


    // 회원 가입 API 
router.post("/sign-up", async (req, res, next) => {
    try {
        // 여기서 유효성 검사.
        const { username, nickname, password  } = await memberSchema.validateAsync(req.body)

        // 에러 처리 부분.
        if(password.includes(username)) throw { name : "Duplication"}
        if(!nickname || !password || !username) throw { name: "ValidationError" }
        const isExistMember = await prisma.Members.findFirst({ where: { username } })
        if (isExistMember) throw { name: "ExistMember" }
        const isExistNickName = await prisma.Members.findFirst({ where: { nickname } })
        if (isExistNickName) throw { name: "ExistNickName" }
        // 여기서 최종적으로 디비에 저장.
        const member = await prisma.Members.create({
            data: { username, nickname, password  }
        })
        return res.status(200).json({ message: " 회원 가입이 완료 되었습니다. ", data: member })

    } catch (err) {
        next(err)
    }
})

// 로그인 API
router.post("/sign-in", async (req, res, next) => {
    try {
        const { username, password } = req.body;
        
        // 에러 처리 부분.
        if(!username || !password) throw { name: "ValidationError" }

        const member = await prisma.Members.findFirst({ where: { username } })
        
        if(username !== member.username) throw { name: "nameError" }
        if(password !== member.password) throw { name: "passWordError" }

        //어떤 정보를 토큰에 저장할지.
        const token = jwt.sign(
            {
                name: member.username, // 멤버의 user.name 을 -> name 에 담는다.
            },
            process.env.JWT_ACCESS_SECRET_KEY
        )
            res.cookie("authorization", `Bearer ${token}`);
            return res.status(200).json({ message: "로그인 성공." })
    } catch (err) {
        next(err)
    }
})


export default router;