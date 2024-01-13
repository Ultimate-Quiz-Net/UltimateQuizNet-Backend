import AWS, { Inspector } from "aws-sdk";
import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";

AWS.config.update({
  region: "ap-northeast-2",
  accessKeyId: process.env.ACCESS_KEY,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3();

// AWS 업로드 설정 부분.
const storage = multerS3({
    s3, // AWS S3 connect
    acl: "public-read", // 버킷 읽기 권한 부여
    bucket: "quizzes-assets", // 버킷 이룸.
    contentType: multerS3.AUTO_CONTENT_TYPE, // 파일 MIME Type 자동 지정.
  key: (req, file, cb) => {
    // 파일 이름 생성 및 반환
    const extentsion = path.extname(file.originalname);
    cb(null, `image/${Date.now()}_${extentsion}`);
  },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    defaultValue: { path: "", mimetype: "" },
});

export default upload