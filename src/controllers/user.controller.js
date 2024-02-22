import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from '../models/user.model.js'
import { ApiError } from '../utils/ApiError.js'
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req, res) => {
    const { fullname, email, username, password } = req.body

    if ([fullname, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "all field are required")
    }

    const exitingUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (exitingUser) {
        throw new ApiError(409, "Username or email already exits")
    }

    const avatarLocal = req.files?.avatar[0]?.path;
    console.log(req.files?.avatar[0]?.path);
    // const coverImageLocal = req.files?.coverImage[0]?.path;

    let coverImageLocal;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocal = req.files.coverImage[0].path
    }

    if (!avatarLocal) {
        throw new ApiError(400, "Avatar file is missing in the request or not properly uploaded");
    }

    const avatar = await uploadOnCloudinary(avatarLocal);
    const coverImage = await uploadOnCloudinary(coverImageLocal)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(400, "Avatar file is required")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User refistered suscessfully")
    )

})

export default registerUser
// step 1. => sending details of user
// step 2. => checking user does not exits in db with the same username or email
// step 3. => creating jwt using name, username, email, id
// step 4. => encrypting the password to store it in the db using bycrpt
// step 5. => sending back the response using Berrear jwt token for future login 