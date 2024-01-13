import jwt from "jsonwebtoken";
import { prisma } from "../utils/index.js";

// 여기서 쿠키/토큰에 대한 검증들이 이루어짐.
export default async function (req, res, next) {
  try {
    const { authorization } = req.cookies;
    const [tokenType, token] = authorization.split(" ");
    if (tokenType !== "Bearer")
      throw new Error(" 로그인이 필요한 서비스 입니다. ");

    // 토큰에 저장한 값을 키로 디코드해서 정보를 가져옴.
    const decodedToken = jwt.verify(token, process.env.JWT_ACCESS_SECRET_KEY);
    const id = decodedToken.id;

    const member = await prisma.Members.findFirst({
      where: { id },
    });
    if (!member) {
      res.clearCookie("authorization");
      throw new Error(" 토큰 사용자가 존재 하지 않습니다. ");
    }
    req.member = member; // 담긴 값을 req.member 를 통해 사용 할 수 있음.

    next();
  } catch (error) {
    res.clearCookie("authorization");
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
