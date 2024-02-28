import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from '../models/user.model.js'
import { ApiError } from '../utils/ApiError.js'
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


const genrateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findOne({ userId })
        const accessToken = await user.genrateAccessToken()
        const refreshToken = await user.genrateRefreshToken()

        user.refershToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while genrating referesh and access token");
    }
}



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
    // step 1. => sending details of user
    // step 2. => checking user does not exits in db with the same username or email
    // step 3. => creating jwt using name, username, email, id
    // step 4. => encrypting the password to store it in the db using bycrpt
    // step 5. => sending back the response using Berrear jwt token for future login 
})

const loginUser = asyncHandler(async (req, res) => {
    // step 1. take input username, password, or email, password
    // step 2. check if the username or email exists on db and match password with db 
    // step 3. access and referesh token
    // step 4. send cookie

    const { email, username, password } = req.body

    if (!username || !email) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User not registered")
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(400, "Password is incorrect");
    }


    const { accessToken, refreshToken } = await genrateAccessTokenAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const option = {
        httpOnly: true,
        secure: true
    }

    res
        .status(200)
        .cookie("accessToken", accessToken, option)
        .cookie("refreshToken", refreshToken, option)
        .json(
            new ApiResponse(200,
                {
                    user: loggedInUser, accessToken,
                    refreshToken
                }, "user logged In Successfully"
            )
        )


})

const logoutUser = asyncHandler(async (req, res) => {

    await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        })

    const option = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", option)
        .clearCookie("refreshToken", option)
        .json(
            new ApiResponse(200, "", "user loged out sucessfully")
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized refresh token")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (incomingRefreshToken !== user?.refershToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const option = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await genrateAccessTokenAndRefreshToken(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, option)
            .cookie("refreshToken", newRefreshToken, option)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken, refreshToken: newRefreshToken
                    },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }

})

export { registerUser, loginUser, logoutUser, refreshAccessToken }

