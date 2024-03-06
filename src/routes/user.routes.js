import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, updateAccountDetails, updateUserAvatar, updateCoverImage, getUser, getUserChannelProfile, getWatchHistory } from "../controllers/user.controller.js"
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
router.post('/logout', authentiacate, logoutUser);
router.post("/refresh-token", refreshAccessToken);
router.post("/change-password", authentiacate, changeCurrentPassword);
router.get("/current-user", authentiacate, getUser);
router.patch("/update-account", authentiacate, updateAccountDetails);
router.patch("/avatar", authentiacate, upload.single("avatar"), updateUserAvatar);
router.patch("/cover-image", authentiacate, upload.single("coverImage"), updateCoverImage);
router.get("/channel/:username", authentiacate, getUserChannelProfile);
router.get("/watch-history", authentiacate, getWatchHistory)


export default router