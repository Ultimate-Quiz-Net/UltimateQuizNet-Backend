import express from "express"

const app = express()
const port = 3000

app.use(express.json())

const router = express.Router()

router.get('/home', (req, res) => {
    return res.json({ message: "hello world" })
})

app.listen(port, () => {
    console.log(port, "서버가 열렸습니다.")
})