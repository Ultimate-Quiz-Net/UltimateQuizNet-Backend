import express from "express";
import Joi from "joi";
import * as bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/index.js";
import memberMiddleware from "../middlewares/member.middleware.js";

const membersRouter = express.Router();

// 아이디 유효성 검사 부분.
const memberSchema = Joi.object({
  username: Joi.string().pattern(new RegExp("^[a-zA-Z0-9]{2,15}$")).required(),
  nickname: Joi.string().min(2).max(15).required(),
  password: Joi.string().pattern(new RegExp("^[a-zA-Z0-9]{5,20}$")).required(),
});

// 회원 가입 API
membersRouter.post("/sign-up", async (req, res, next) => {
  try {
    // 여기서 유효성 검사.
    const { username, nickname, password } = await memberSchema.validateAsync(
      req.body
    );
    // 에러 처리 부분.
    if (password.includes(username)) throw { name: "Duplication" };
    if (!nickname || !password || !username) throw { name: "ValidationError" };
    const isExistMember = await prisma.Members.findFirst({
      where: { username },
    });
    if (isExistMember) throw { name: "ExistMember" };
    const isExistNickName = await prisma.Members.findFirst({
      where: { nickname },
    });
    if (isExistNickName) throw { name: "ExistNickName" };

    const salt = bcrypt.genSaltSync(parseInt(process.env.BCRYPT_SALT));
    const hash_password = bcrypt.hashSync(password, salt);

    // 여기서 최종적으로 디비에 저장.
    const member = await prisma.Members.create({
      data: {
        username,
        nickname,
        password: hash_password,
      },
    });
    return res
      .status(200)
      .json({ message: " 회원 가입이 완료 되었습니다. ", data: member });
  } catch (err) {
    next(err);
  }
});

// 로그인 API
membersRouter.post("/sign-in", async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // 에러 처리 부분.
    if (!username || !password) throw { name: "ValidationError" };

    const member = await prisma.Members.findFirst({ where: { username } });
    if (!member) throw { name: "NoneData" };

    if (username !== member.username) throw { name: "nameError" };
    // 해쉬화 된 비밀번호 일치 하는지 확인.
    const checkPassword = await bcrypt.compare(password, member.password);
    if (!checkPassword) {
      return res
        .status(400)
        .json({ errorMessage: " 비밀번호가 일치 하지 않습니다. " });
    }

    const accessToken = createAccessToken(member.username);

    const refreshToken = createRefreshToken(member.username);

    const salt = bcrypt.genSaltSync(parseInt(process.env.BCRYPT_SALT));
    const hashedRefreshToken = bcrypt.hashSync(refreshToken, salt);

    await prisma.Members.update({
      where: { userId: member.userId },
      data: {
        hashedRefreshToken,
      },
    });

    res.cookie("refreshToken", `Bearer ${refreshToken}`, {
      secure: true,
    });

    return res
      .status(200)
      .json({ message: "로그인 성공.", data: { accessToken, refreshToken } });
  } catch (err) {
    next(err);
  }
});

// 로그아웃 API
membersRouter.post("/sign-out", memberMiddleware, async (req, res, next) => {
  try {
    if (!req.member) throw { name: "NoneData" };

    await prisma.Members.update({
      where: { userId: req.member.userId },
      data: {
        hashedRefreshToken: null,
      },
    });
    return res.status(200).json({ message: "로그아웃." });
  } catch (err) {
    next(err);
  }
});

// 비밀번호 변경 API
// 비밀번호 바디에 받고 -> 확인
// 맞으면 변경.
membersRouter.patch("/pwupdate", memberMiddleware, async (req, res, next) => {
  try {
    if (!req.member) throw { name: "NoneData" };
    const { password, newPassword } = req.body;

    console.log(password, newPassword);

    const findUser = await prisma.Members.findFirst({
      where: { username: req.member.username },
    });

    const checkPassword = await bcrypt.compare(password, findUser.password);
    if (!checkPassword) {
      return res
        .status(400)
        .json({ errorMessage: " 비밀번호가 일치 하지 않습니다. " });
    }

    const salt = bcrypt.genSaltSync(parseInt(process.env.BCRYPT_SALT));

    const hashPassword = bcrypt.hashSync(newPassword, salt);

    console.log(hashPassword);

    await prisma.Members.update({
      where: { userId: findUser.userId },
      data: {
        password: hashPassword,
      },
    });
    return res.status(200).json({ message: " 비밀번호가 변경 되었습니다. " });
  } catch (err) {
    next(err);
  }
});

membersRouter.post("/refresh", async (req, res, next) => {
  try {
    const { accessToken, refreshToken } = req.body;

    if (!refreshToken || !accessToken) {
      throw new Error(" 로그인이 필요한 서비스 입니다. ");
    }

    const decodedInfo = decodedAccessToken(accessToken);

    const member = await prisma.Members.findFirst({
      where: { username: decodedInfo.username },
    });

    if (!member) {
      throw new Error(" 토큰 사용자가 존재 하지 않습니다. ");
    }

    const verifyRefreshToken = validateRefreshToken(
      refreshToken,
      member.hashedRefreshToken
    );

    if (verifyRefreshToken == "invalid token") {
      await prisma.Members.update({
        where: { userId: member.userId },
        data: {
          hashedRefreshToken: null,
        },
      });

      return res
        .status(401)
        .json({ message: "토큰이 인증에 실패 하였습니다." });
    }

    if (verifyRefreshToken == "jwt expired") {
      await prisma.Members.update({
        where: { userId: member.userId },
        data: {
          hashedRefreshToken: null,
        },
      });

      throw new Error(" 로그인이 필요한 서비스 입니다. ");
    }

    const myNewAccessToken = createAccessToken(member.username);
    const myNewRefreshToken = createRefreshToken(member.username);

    const salt = bcrypt.genSaltSync(parseInt(process.env.BCRYPT_SALT));
    const hashedRefreshToken = bcrypt.hashSync(myNewRefreshToken, salt);

    await prisma.Members.update({
      where: { userId: member.userId },
      data: {
        hashedRefreshToken,
      },
    });

    return res.status(200).json({
      message: "토큰 재발급.",
      data: { myNewAccessToken, myNewRefreshToken },
    });
  } catch (err) {
    next(err);
  }
});

export function createAccessToken(username) {
  const accessToken = jwt.sign(
    { username }, // JWT 데이터
    process.env.JWT_ACCESS_SECRET_KEY, // Access Token의 비밀 키
    { expiresIn: "1h" } // Access Token이 10초 뒤에 만료되도록 설정.
  );

  return accessToken;
}

// Refresh Token을 생성하는 함수
export function createRefreshToken(username) {
  const refreshToken = jwt.sign(
    { username }, // JWT 데이터
    process.env.JWT_REFRESH_SECRET_KEY, // Refresh Token의 비밀 키
    { expiresIn: "7d" } // Refresh Token이 7일 뒤에 만료되도록 설정.
  );

  return refreshToken;
}

async function validateRefreshToken(refreshToken, hashedRefreshToken) {
  try {
    const [tokenType, token] = refreshToken.split(" ");

    if (tokenType !== "Bearer")
      throw new Error(" 로그인이 필요한 서비스 입니다. ");

    const checkRefreshToken = await bcrypt.compare(token, hashedRefreshToken);

    if (!checkRefreshToken) {
      return res.status(400).json({ errorMessage: "잘못된 접근입니다. " });
    }
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET_KEY);
  } catch (error) {
    return error.message;
  }
}

async function decodedAccessToken(accessToken) {
  try {
    const [tokenType, token] = refreshToken.split(" ");
    return jwt.decode(token, process.env.JWT_ACCESS_SECRET_KEY);
  } catch (error) {
    return error.message;
  }
}

export default membersRouter;
