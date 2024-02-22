import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
        // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)   
        // this is used to genrate random name for the file
        cb(null, file.originalname)
        // file gives multiple method to set the file name we can read it in the documentation of multer or from chatgpt
    }
})

export const upload = multer({ storage })