import jwt from "jsonwebtoken";
import { prisma } from "../utils/index.js";
import {
  createAccessToken,
  createRefreshToken,
} from "../routes/members.router.js";

export default async function (req, res, next) {
  try {
    const { accessToken, refreshToken } = req.cookies;

    const verifyAccessToken = validateAccesstoken(accessToken);

    if (verifyAccessToken == "invalid token") {
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      return res
        .status(401)
        .json({ message: "토큰이 인증에 실패 하였습니다." });
    }

    if (verifyAccessToken == "jwt expired") {

      const decodedInfo = decodedAccessToken(accessToken);

      const member = await prisma.Members.findFirst({
        where: { username: decodedInfo.username },
      });

      if (!member) {
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        throw new Error(" 토큰 사용자가 존재 하지 않습니다. ");
      }

      const verifyRefreshToken = validateRefreshToken(
        refreshToken,
        member.hashedRefreshToken
      );

      if (verifyRefreshToken == "invalid token") {
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        return res
          .status(401)
          .json({ message: "토큰이 인증에 실패 하였습니다." });
      }

      if (verifyRefreshToken == "jwt expired") {
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        throw new Error(" 로그인이 필요한 서비스 입니다. ");
      }

      const myNewAccessToken = createAccessToken(decodedInfo.username);
      res.cookie("accessToken", `Bearer ${myNewAccessToken}`);

      req.member = member; 

      next();
    }

    const username = verifyAccessToken.username;

    const member = await prisma.Members.findFirst({
      where: { username },
    });

    if (!member) {
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      throw new Error(" 토큰 사용자가 존재 하지 않습니다. ");
    }

    const verifyRefreshToken = validateRefreshToken(
      refreshToken,
      member.hashedRefreshToken
    );

    if (verifyRefreshToken == "invalid token") {
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      return res
        .status(401)
        .json({ message: "토큰이 인증에 실패 하였습니다." });
    }

    if (verifyRefreshToken == "jwt expired") {
      const myNewRefreshToken = createRefreshToken(member.username);
      res.cookie("refreshToken", `Bearer ${myNewRefreshToken}`);

      const salt = bcrypt.genSaltSync(parseInt(process.env.BCRYPT_SALT));
      const hashedRefreshToken = bcrypt.hashSync(myNewRefreshToken, salt);

      await prisma.Members.update({
        where: { username },
        data: {
          hashedRefreshToken: hashedRefreshToken,
        },
      });
    }

    req.member = member; 

    next();
  } catch (error) {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    switch (error.name) {
      case "TokenExpiredError":
        return res.status(401).json({ message: "토큰이 만료 되었습니다." });
      case "JsonWebTokenError":
        return res
          .status(401)
          .json({ message: "토큰이 인증에 실패 하였습니다." });
      default:
        return res
          .status(401)
          .json({ message: error.message ?? "비정상적인 요청입니다." });
    }
  }
}

function validateAccesstoken(accessToken) {
  try {
    const [tokenType, token] = accessToken.split(" ");

    if (tokenType !== "Bearer")
      throw new Error(" 로그인이 필요한 서비스 입니다. ");


    return jwt.verify(token, process.env.JWT_ACCESS_SECRET_KEY);
  } catch (error) {
    return error.message;
  }
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

  const [tokenType, token] = refreshToken.split(" ");
  return jwt.decode(token, process.env.JWT_ACCESS_SECRET_KEY);
}