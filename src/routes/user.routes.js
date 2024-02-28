import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken } from "../controllers/user.controller.js"
import { upload } from '../middlewares/multer.middleware.js'
import { authentiacate } from "../middlewares/auth.middleware.js";

const router = Router()

router.post('/register',
    upload.fields([
        {
            name: "avatar",
            maxcount: 1
        },
        {
            name: "coverImage",
            maxcount: 1
        }
    ]),
    registerUser)

router.post('/login', loginUser);
router.get('/logout', authentiacate, logoutUser);
router.post("/refresh-token", refreshAccessToken)


export default router